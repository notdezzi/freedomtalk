/**
 * Minimal Socket.IO v4 (engine.io protocol EIO=4) client for k6,
 * implemented on top of the core `k6/ws` WebSocket module.
 *
 * WHY THIS EXISTS
 * ---------------
 * `k6/experimental/socketio` (as referenced in some older blog posts) does not
 * exist in any released version of k6: it is absent from the grafana/k6 source
 * tree, from all release notes (v0.1 -> v2.x), and from the official docs.
 * Rather than depend on a module that cannot be imported, this shim speaks the
 * exact wire protocol that FreedomTalk's server (socket.io v4.8) uses, so the
 * load scripts exercise the real event contracts.
 *
 * WIRE PROTOCOL (engine.io EIO=4 + socket.io v4, websocket transport)
 * -------------------------------------------------------------------
 *   0{...}                      engine.io OPEN (server -> client)
 *   2 / 3                       engine.io PING / PONG (we auto-reply 3)
 *   40{json}                    socket.io CONNECT to default namespace
 *                               (json = handshake.auth, we send {"token": jwt})
 *   40{json}                    namespace CONNECT ack (server -> client)
 *   41                          namespace DISCONNECT
 *   44{json}                    namespace CONNECT_ERROR (e.g. auth failure)
 *   42["event", ...args]        EVENT
 *   42<id>["event", ...args]    EVENT with client-side ack id
 *   43<id>[...args]             ACK reply for our ack id
 *
 * Handshake order: ws open -> server "0" -> client "40{token}" -> server "40"
 * (auth middleware runs between; failure yields "44").
 *
 * USAGE
 * -----
 * IMPORTANT: the handler given to withSio() MUST be a plain synchronous
 * callback. k6 suspends promise continuations and JS timers (k6/timers)
 * inside ws.connect callbacks — an `await client.ready()` stalls until the
 * next websocket frame happens to pump the event loop (verified on k6
 * v2.3.0: a 25s stall until the engine.io ping arrived). Use the callback
 * API instead:
 *
 *   const state = withSio({ baseUrl, token, origin }, (client) => {
 *     client.onConnect(() => {
 *       client.emit('room:join', { roomType: 'channel', roomId });
 *       client.expect('room:joined', (arg, err) => { ... });
 *     });
 *     client.onConnectError(() => { ... });
 *     client.setTimeout(() => client.close(), 30000); // works: k6 socket timer
 *   });
 *   if (state.error) { ... }
 *
 * NOTE: k6's ws.connect blocks the VU until the socket closes, so
 * withSio() only returns AFTER the handler closed the socket.
 */

import ws from 'k6/ws';
import { setTimeout, clearTimeout } from 'k6/timers';

const DEFAULT_PATH = '/socket.io/';

/** Build the engine.io websocket URL (token also passed as query fallback:
 *  the server's auth middleware accepts auth.token, header, or query.token). */
function buildUrl(opts) {
  let url = String(opts.baseUrl).replace(/^http/i, 'ws').replace(/\/+$/, '');
  url += opts.path || DEFAULT_PATH;
  url += '?EIO=4&transport=websocket';
  if (opts.token) {
    url += '&token=' + encodeURIComponent(opts.token);
  }
  return url;
}

export class SioSocket {
  constructor(k6Socket, authPayload) {
    this._k6 = k6Socket;
    this._auth = authPayload || {};
    this._handlers = {};      // event -> [cb]
    this._pendingAcks = {};   // ackId -> { resolve, reject, timer }
    this._waiters = [];       // one-shot event waiters
    this._closeWaiters = [];  // waiters rejected on disconnect
    this._nextAckId = 0;
    this._closed = false;
    this.namespaceConnected = false;
    this.sentCount = 0;
    this.recvCount = 0;

    const self = this;
    k6Socket.on('message', (raw) => {
      try {
        self._onFrame(String(raw));
      } catch (e) {
        // never let a frame parse error kill the VU silently
        self._dispatch('_error', e);
      }
    });
    k6Socket.on('close', () => {
      self._closed = true;
      self.namespaceConnected = false;
      self._dispatch('_disconnect', {});
      self._rejectAllPending(new Error('socket closed'));
    });
  }

  _onFrame(s) {
    if (!s || s.length === 0) return;
    const t = s[0];

    // engine.io OPEN -> join default namespace with auth payload
    if (t === '0') {
      const authJson = Object.keys(this._auth).length ? JSON.stringify(this._auth) : '';
      this._send('40' + authJson);
      return;
    }
    // engine.io PING -> PONG
    if (t === '2') {
      this._send('3');
      return;
    }
    if (t === '3') return; // engine.io PONG

    if (t !== '4') return; // unknown engine.io packet type

    const sub = s[1];
    const rest = s.slice(2);

    if (sub === '0') {
      // namespace CONNECT ack
      this.namespaceConnected = true;
      this._dispatch('_connect', {});
    } else if (sub === '1') {
      // server disconnected us from the namespace
      this.namespaceConnected = false;
      this._dispatch('_disconnect', {});
      this._rejectAllPending(new Error('server disconnected namespace'));
      this.close();
    } else if (sub === '4') {
      // CONNECT_ERROR (e.g. "Authentication token required")
      let payload = rest;
      try {
        payload = JSON.parse(rest);
      } catch (e) { /* keep raw */ }
      const err = new Error('connect_error: ' + JSON.stringify(payload));
      err.payload = payload;
      this.namespaceConnected = false;
      this._dispatch('_connect_error', err);
      this._rejectAllPending(err);
    } else if (sub === '2') {
      // EVENT, optionally with an ack id the *server* expects us to answer
      const m = /^(\d*)([\s\S]*)$/.exec(rest);
      let args = [];
      try {
        args = JSON.parse(m[2] || '[]');
      } catch (e) {
        this._dispatch('_error', new Error('bad EVENT frame: ' + s));
        return;
      }
      const event = args[0];
      const eventArgs = args.slice(1);
      this.recvCount++;
      if (typeof event === 'string') {
        this._dispatch(event, eventArgs.length === 1 ? eventArgs[0] : eventArgs);
      }
    } else if (sub === '3') {
      // ACK for one of our emitWithCallback calls
      const m = /^(\d*)([\s\S]*)$/.exec(rest);
      const id = m[1];
      const entry = this._pendingAcks[id];
      if (entry) {
        delete this._pendingAcks[id];
        this._clearTimeout(entry.timerId);
        let args = [];
        try {
          args = JSON.parse(m[2] || '[]');
        } catch (e) { entry.cb(m[2], null); return; }
        entry.cb(args.length === 1 ? args[0] : args, null);
      }
    }
  }

  _send(frame) {
    if (this._closed) return;
    try {
      this._k6.send(frame);
    } catch (e) { /* socket already dead */ }
  }

  _dispatch(event, arg) {
    const cbs = this._handlers[event];
    if (cbs) {
      for (let i = 0; i < cbs.length; i++) {
        try {
          cbs[i](arg);
        } catch (e) { /* handler error must not break dispatch */ }
      }
    }
    // one-shot waiters
    for (let i = this._waiters.length - 1; i >= 0; i--) {
      const w = this._waiters[i];
      if (w.event === event) {
        this._waiters.splice(i, 1);
        const j = this._closeWaiters.indexOf(w);
        if (j >= 0) this._closeWaiters.splice(j, 1);
        clearTimeout(w.timer);
        try {
          w.resolve(arg);
        } catch (e) { /* ignore */ }
      }
    }
  }

  _rejectAllPending(err) {
    const acks = this._pendingAcks;
    this._pendingAcks = {};
    Object.keys(acks).forEach((id) => {
      this._clearTimeout(acks[id].timerId);
      try {
        acks[id].cb(undefined, err);
      } catch (e) { /* ignore */ }
    });
    const closeWaiters = this._closeWaiters.slice();
    this._closeWaiters = [];
    closeWaiters.forEach((w) => {
      const i = this._waiters.indexOf(w);
      if (i >= 0) this._waiters.splice(i, 1);
      clearTimeout(w.timer);
      try {
        w.reject(err);
      } catch (e) { /* ignore */ }
    });
  }

  /** Register a listener: on('message:ack', (payload) => {...}) */
  on(event, cb) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(cb);
    return this;
  }

  /** Timer proxies onto the k6 socket. Unlike k6/timers these actually fire
   *  inside ws callbacks — use them for all in-scenario timeouts. */
  setTimeout(fn, ms) {
    return this._k6.setTimeout(fn, ms);
  }
  setInterval(fn, ms) {
    return this._k6.setInterval(fn, ms);
  }
  _clearTimeout(id) {
    if (id === undefined || id === null) return;
    try { this._k6.clearTimeout(id); } catch (e) { /* already fired */ }
  }

  /** Lifecycle sugar over the internal connect/disconnect/error events. */
  onConnect(cb) { return this.on('_connect', cb); }
  onDisconnect(cb) { return this.on('_disconnect', cb); }
  onConnectError(cb) { return this.on('_connect_error', cb); }

  /**
   * One-shot callback wait for a server->client event.
   * cb(arg, error): on timeout error = Error('timeout waiting for ...').
   */
  expect(event, cb, timeoutMs) {
    const self = this;
    const wrapper = (arg) => {
      self._clearTimeout(timerId);
      try { cb(arg, null); } catch (e) { /* handler errors stay local */ }
    };
    const timerId = self.setTimeout(() => {
      const arr = self._handlers[event] || [];
      const i = arr.indexOf(wrapper);
      if (i >= 0) arr.splice(i, 1);
      try { cb(undefined, new Error('timeout waiting for "' + event + '" after ' + (timeoutMs || 5000) + 'ms')); } catch (e) { /* local */ }
    }, timeoutMs || 5000);
    this.on(event, wrapper);
    return wrapper;
  }

  /**
   * One-shot callback wait for the first of several events.
   * cb(arg, error, eventName).
   */
  expectAny(events, cb, timeoutMs) {
    const self = this;
    let done = false;
    const wrappers = events.map((ev) => {
      const wrapper = (arg) => {
        if (done) return;
        done = true;
        wrappers.forEach((w) => {
          const arr = self._handlers[ev] || [];
          const i = arr.indexOf(w);
          if (i >= 0) arr.splice(i, 1);
        });
        self._clearTimeout(timerId);
        try { cb(arg, null, ev); } catch (e) { /* local */ }
      };
      self.on(ev, wrapper);
      return wrapper;
    });
    const timerId = self.setTimeout(() => {
      if (done) return;
      done = true;
      try { cb(undefined, new Error('timeout waiting for [' + events.join(', ') + '] after ' + (timeoutMs || 5000) + 'ms'), null); } catch (e) { /* local */ }
    }, timeoutMs || 5000);
  }

  /** Fire-and-forget emit (matches socket.io-client's no-callback usage). */
  emit(event, data) {
    this._send('42' + JSON.stringify(data === undefined ? [event] : [event, data]));
    this.sentCount++;
  }

  /**
   * Emit and receive the server-side socket.io acknowledgement callback via
   * cb(arg, error). args: array of payload args — for handlers declared
   * (data, callback) pass [{ ...data }]; for handlers declared (callback)
   * only, pass []. Resolves cb with the single callback arg (or array).
   */
  emitWithCallback(event, args, cb, timeoutMs) {
    const argList = args || [];
    const id = this._nextAckId++;
    this._send('42' + id + JSON.stringify([event].concat(argList)));
    this.sentCount++;
    const self = this;
    const timerId = self.setTimeout(() => {
      delete self._pendingAcks[id];
      try { cb(undefined, new Error('ack timeout for "' + event + '" after ' + (timeoutMs || 5000) + 'ms')); } catch (e) { /* local */ }
    }, timeoutMs || 5000);
    this._pendingAcks[id] = { cb: cb, timerId: timerId };
  }

  /** Cleanly disconnect: socket.io namespace disconnect then ws close. */
  close() {
    if (this._closed) return;
    this._send('41');
    this._closed = true;
    this.namespaceConnected = false;
    try {
      this._k6.close();
    } catch (e) { /* already closed */ }
  }
}

/**
 * Connect to the API's socket.io endpoint and run `handler(client)` inside the
 * live socket. BLOCKING: returns only after the socket has fully closed
 * (k6 ws.connect semantics). Returns { error } for the handler's failure.
 *
 * opts: {
 *   baseUrl:          'http://localhost:3001' (API origin, http(s))
 *   token:            JWT access token (sent as handshake.auth.token + query)
 *   origin:           Origin header value (must match the API's CORS_ORIGIN)
 *   path:             socket.io path, default '/socket.io/'
 *   connectTimeoutMs: namespace connect timeout, default 10000
 *   tag:              metric tag for the connection, default 'socket.io'
 * }
 */
export function withSio(opts, handler) {
  const url = buildUrl(opts);
  const params = {
    tags: { name: opts.tag || 'socket.io' },
  };
  if (opts.origin) {
    params.headers = { Origin: opts.origin };
  }
  const state = { error: null, client: null };

  const runHandler = (k6Socket) => {
    const client = new SioSocket(k6Socket, { token: opts.token || undefined });
    state.client = client;
    // handler is a plain sync callback — see the header note on why async
    // handlers (promises / k6/timers) stall inside ws.connect callbacks
    try {
      handler(client);
    } catch (e) {
      state.error = e;
      client.close();
    }
  };

  try {
    // k6 ws.connect takes exactly (url, params, callback) — a 4th argument
    // throws "invalid number of arguments to ws.connect" (verified k6 v2.3)
    ws.connect(url, params, runHandler);
  } catch (e) {
    // connection refused / DNS failure etc. — ws.connect throws synchronously
    state.error = e;
  }
  return state;
}
