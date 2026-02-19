'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { getStoredAccessToken } from '@/lib/api-client';

interface LogEntry {
  id: number;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
  data?: unknown;
}

interface ProducerInfo {
  producerId: string;
  kind: 'audio' | 'video';
  sessionId: string;
}

export default function SFUDebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [rtpCapabilities, setRtpCapabilities] = useState<unknown>(null);
  const [sendTransport, setSendTransport] = useState<any>(null);
  const [recvTransport, setRecvTransport] = useState<any>(null);

  // Video state
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [videoProducer, setVideoProducer] = useState<any>(null);

  // Audio state
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  const [audioProducer, setAudioProducer] = useState<any>(null);

  // Consumers
  const [consumers, setConsumers] = useState<Map<string, any>>(new Map());

  // Other state
  const [channelId, setChannelId] = useState<string>('');
  const [existingProducers, setExistingProducers] = useState<ProducerInfo[]>([]);
  const [isConsuming, setIsConsuming] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const logIdRef = useRef(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Refs to access current state in event handlers
  const deviceRef = useRef<Device | null>(null);
  const recvTransportRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const isConsumingRef = useRef(false);
  const consumersRef = useRef<Map<string, any>>(new Map());
  const logRef = useRef<((type: LogEntry['type'], message: string, data?: unknown) => void) | null>(null);

  const log = useCallback((type: LogEntry['type'], message: string, data?: unknown) => {
    const id = ++logIdRef.current;
    setLogs(prev => [...prev, { id, type, message, data }]);
  }, []);

  // Keep refs in sync
  useEffect(() => { deviceRef.current = device; }, [device]);
  useEffect(() => { recvTransportRef.current = recvTransport; }, [recvTransport]);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { isConsumingRef.current = isConsuming; }, [isConsuming]);
  useEffect(() => { consumersRef.current = consumers; }, [consumers]);
  useEffect(() => { logRef.current = log; }, [log]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Function to consume a producer
  const consumeProducer = useCallback(async (producerId: string, kind: 'audio' | 'video') => {
    const currentSocket = socketRef.current;
    const currentDevice = deviceRef.current;
    const currentRecvTransport = recvTransportRef.current;

    if (!currentSocket || !currentDevice || !currentRecvTransport) {
      logRef.current?.('warn', 'Cannot consume yet - transport not ready', { producerId });
      return;
    }

    logRef.current?.('info', `Consuming ${kind} producer`, { producerId });

    currentSocket.emit('voice:consume', {
      producerId,
      rtpCapabilities: currentDevice.rtpCapabilities,
    }, async (response: any) => {
      if (!response.success) {
        logRef.current?.('error', 'Failed to consume', response);
        return;
      }

      const { consumerId, kind: respKind, rtpParameters } = response.data;
      logRef.current?.('info', 'Server created consumer', { consumerId, kind: respKind });

      try {
        const consumer = await currentRecvTransport.consume({
          id: consumerId,
          producerId,
          kind: respKind,
          rtpParameters,
        });

        logRef.current?.('info', 'Local consumer created', { consumerId: consumer.id, kind: consumer.kind });

        // Resume the consumer via server
        currentSocket.emit('voice:resume_consumer', { consumerId: consumer.id }, async (resumeResp: any) => {
          if (!resumeResp.success) {
            logRef.current?.('error', 'Failed to resume consumer on server', resumeResp);
            return;
          }

          await consumer.resume();

          // Add to consumers map
          consumersRef.current.set(consumer.id, consumer);
          setConsumers(new Map(consumersRef.current));

          // Attach to appropriate element
          if (consumer.kind === 'video' && remoteVideoRef.current) {
            const stream = new MediaStream([consumer.track]);
            remoteVideoRef.current.srcObject = stream;
            logRef.current?.('success', 'Attached remote video stream', { consumerId: consumer.id });
          } else if (consumer.kind === 'audio' && remoteAudioRef.current) {
            const stream = new MediaStream([consumer.track]);
            remoteAudioRef.current.srcObject = stream;
            logRef.current?.('success', 'Attached remote audio stream', { consumerId: consumer.id });
          }

          logRef.current?.('success', 'Consumer ready', { consumerId: consumer.id, kind: consumer.kind });
        });
      } catch (error: any) {
        logRef.current?.('error', 'Failed to create local consumer', { message: error.message });
      }
    });
  }, []);

  // Connect to socket on mount
  useEffect(() => {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const token = getStoredAccessToken();

    if (!token) {
      log('error', 'No access token found. Please login first.');
      return;
    }

    log('info', 'Connecting to socket...', { url: WS_URL });

    const newSocket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      log('success', 'Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      log('warn', 'Socket disconnected', { reason });
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      log('error', 'Socket connection error', { message: error.message });
    });

    newSocket.on('ping', () => {
      newSocket.emit('pong', { timestamp: Date.now() });
    });

    newSocket.on('voice:new_producer', async (data: ProducerInfo) => {
      log('info', 'New producer event received', data);

      if (isConsumingRef.current && recvTransportRef.current) {
        await consumeProducer(data.producerId, data.kind);
      } else {
        log('info', 'Not ready to consume yet, queuing producer', {
          producerId: data.producerId,
          isConsuming: isConsumingRef.current,
          hasRecvTransport: !!recvTransportRef.current
        });
        setExistingProducers(prev => [...prev, data]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [log, consumeProducer]);

  // ============================================
  // COMMON STEPS (Shared for both audio & video)
  // ============================================

  // Step 1: Join Channel (Get RTP Capabilities)
  const joinChannel = async () => {
    if (!socket || !connected) {
      log('error', 'Socket not connected');
      return;
    }

    if (!channelId) {
      log('error', 'Please enter a voice channel ID first');
      return;
    }

    try {
      log('info', 'Joining voice channel...', { channelId });

      socket.emit('voice:join', { channelId }, (response: any) => {
        if (!response.success) {
          log('error', 'Failed to join voice channel', response);
          return;
        }

        setSessionId(response.data.sessionId);
        setRtpCapabilities(response.data.rtpCapabilities);
        setExistingProducers(response.data.producers || []);
        log('success', 'Joined channel', {
          sessionId: response.data.sessionId,
          rtpCapabilities: response.data.rtpCapabilities,
          existingProducers: response.data.producers,
        });
      });
    } catch (error: any) {
      log('error', 'Failed to join channel', { message: error.message });
    }
  };

  // Step 2: Create Device
  const createDeviceHandler = async () => {
    if (!rtpCapabilities) {
      log('error', 'No RTP capabilities. Join channel first.');
      return;
    }

    try {
      log('info', 'Creating mediasoup device...');
      const newDevice = new Device();
      await newDevice.load({ routerRtpCapabilities: rtpCapabilities as any });
      setDevice(newDevice);
      log('success', 'Device created and loaded', {
        loaded: newDevice.loaded,
      });
    } catch (error: any) {
      log('error', 'Failed to create device', { message: error.message });
    }
  };

  // Step 3: Create Send Transport
  const createSendTransportHandler = async () => {
    if (!socket || !device || !sessionId) {
      log('error', 'Prerequisites not met. Join channel and create device first.');
      return;
    }

    try {
      log('info', 'Creating send transport...');

      socket.emit('voice:create_transport', { direction: 'send' }, (response: any) => {
        if (!response.success) {
          log('error', 'Failed to create send transport', response);
          return;
        }

        const transportOptions = response.data.transport;
        log('info', 'Got transport options from server', transportOptions);

        const newSendTransport = device.createSendTransport({
          id: transportOptions.id,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates,
          dtlsParameters: transportOptions.dtlsParameters,
        });

        newSendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
          log('info', 'Send transport connect event triggered');
          socket.emit('voice:connect_transport', {
            transportId: newSendTransport.id,
            dtlsParameters,
          }, (resp: any) => {
            if (resp.success) {
              log('success', 'Send transport connected');
              callback();
            } else {
              log('error', 'Failed to connect send transport', resp);
              errback(new Error(resp.error));
            }
          });
        });

        newSendTransport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
          log('info', 'Send transport produce event triggered', { kind });
          socket.emit('voice:produce', {
            kind,
            rtpParameters,
            appData,
          }, (resp: any) => {
            if (resp.success) {
              log('success', 'Producer created', { producerId: resp.data.producerId });
              callback({ id: resp.data.producerId });
            } else {
              log('error', 'Failed to produce', resp);
              errback(new Error(resp.error));
            }
          });
        });

        setSendTransport(newSendTransport);
        log('success', 'Send transport created', { id: newSendTransport.id });
      });
    } catch (error: any) {
      log('error', 'Failed to create send transport', { message: error.message });
    }
  };

  // Step 4: Create Recv Transport
  const createRecvTransportHandler = async () => {
    if (!socket || !device || !sessionId) {
      log('error', 'Prerequisites not met. Join channel and create device first.');
      return;
    }

    try {
      log('info', 'Creating receive transport...');

      socket.emit('voice:create_transport', { direction: 'recv' }, (response: any) => {
        if (!response.success) {
          log('error', 'Failed to create receive transport', response);
          return;
        }

        const transportOptions = response.data.transport;
        log('info', 'Got transport options from server', transportOptions);

        const newRecvTransport = device.createRecvTransport({
          id: transportOptions.id,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates,
          dtlsParameters: transportOptions.dtlsParameters,
        });

        newRecvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
          log('info', 'Recv transport connect event triggered');
          socket.emit('voice:connect_transport', {
            transportId: newRecvTransport.id,
            dtlsParameters,
          }, (resp: any) => {
            if (resp.success) {
              log('success', 'Recv transport connected');
              callback();
            } else {
              log('error', 'Failed to connect recv transport', resp);
              errback(new Error(resp.error));
            }
          });
        });

        setRecvTransport(newRecvTransport);
        log('success', 'Receive transport created', { id: newRecvTransport.id });
      });
    } catch (error: any) {
      log('error', 'Failed to create receive transport', { message: error.message });
    }
  };

  // Step 5: Start Consuming
  const startConsuming = async () => {
    if (!socket || !device || !recvTransport || !sessionId) {
      log('error', 'Prerequisites not met. Complete all setup steps first.');
      return;
    }

    setIsConsuming(true);
    log('info', 'Starting consumption...');
    log('info', 'Existing producers to consume', { count: existingProducers.length, producers: existingProducers });

    for (const producer of existingProducers) {
      await consumeProducer(producer.producerId, producer.kind);
    }

    log('success', 'Ready to consume. Waiting for new producers...');
  };

  // ============================================
  // VIDEO OPERATIONS
  // ============================================

  const getLocalVideo = async () => {
    try {
      log('info', 'Requesting local video...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });

      setLocalVideoStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      log('success', 'Got local video stream', {
        tracks: stream.getTracks().map(t => ({ kind: t.kind, label: t.label })),
      });
    } catch (error: any) {
      log('error', 'Failed to get local video', { message: error.message });
    }
  };

  const produceVideo = async () => {
    if (!sendTransport || !localVideoStream) {
      log('error', 'Send transport or local video not ready.');
      return;
    }

    try {
      log('info', 'Producing video...');

      const videoTrack = localVideoStream.getVideoTracks()[0];
      if (!videoTrack) {
        log('error', 'No video track available');
        return;
      }

      const producer = await sendTransport.produce({
        track: videoTrack,
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });

      setVideoProducer(producer);
      log('success', 'Video producer created', {
        id: producer.id,
        kind: producer.kind,
        paused: producer.paused,
      });
    } catch (error: any) {
      log('error', 'Failed to produce video', { message: error.message });
    }
  };

  // ============================================
  // AUDIO OPERATIONS
  // ============================================

  const getLocalAudio = async () => {
    try {
      log('info', 'Requesting local audio...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setLocalAudioStream(stream);
      log('success', 'Got local audio stream', {
        tracks: stream.getTracks().map(t => ({ kind: t.kind, label: t.label })),
      });
    } catch (error: any) {
      log('error', 'Failed to get local audio', { message: error.message });
    }
  };

  const produceAudio = async () => {
    if (!sendTransport) {
      log('error', 'Send transport not ready.');
      return;
    }

    if (!localAudioStream) {
      log('error', 'Get local audio first.');
      return;
    }

    try {
      log('info', 'Producing audio...');

      const audioTrack = localAudioStream.getAudioTracks()[0];
      if (!audioTrack) {
        log('error', 'No audio track available');
        return;
      }

      const producer = await sendTransport.produce({
        track: audioTrack,
      });

      setAudioProducer(producer);
      log('success', 'Audio producer created', {
        id: producer.id,
        kind: producer.kind,
        paused: producer.paused,
      });
    } catch (error: any) {
      log('error', 'Failed to produce audio', { message: error.message });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localVideoStream) {
        localVideoStream.getTracks().forEach(t => t.stop());
      }
      if (localAudioStream) {
        localAudioStream.getTracks().forEach(t => t.stop());
      }
      if (videoProducer) {
        videoProducer.close();
      }
      if (audioProducer) {
        audioProducer.close();
      }
      consumers.forEach(c => c.close());
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  // Count producers by kind
  const videoConsumers = Array.from(consumers.values()).filter(c => c.kind === 'video').length;
  const audioConsumers = Array.from(consumers.values()).filter(c => c.kind === 'audio').length;

  return (
    <div style={{
      fontFamily: 'monospace',
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#1a1a2e',
      minHeight: '100vh',
      color: '#eee',
    }}>
      <h1 style={{ marginBottom: '20px', color: '#00d9ff' }}>SFU Debug Page</h1>

      {/* Video Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ border: '2px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px', backgroundColor: '#16213e', borderBottom: '1px solid #333' }}>
            <strong>Local Video</strong>
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '250px', backgroundColor: '#000' }}
          />
        </div>

        <div style={{ border: '2px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px', backgroundColor: '#16213e', borderBottom: '1px solid #333' }}>
            <strong>Remote Video</strong>
          </div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '250px', backgroundColor: '#000' }}
          />
        </div>
      </div>

      {/* Hidden audio element for remote audio */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Channel ID Input */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
      }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Voice Channel ID:
        </label>
        <input
          type="text"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="Enter a voice channel ID"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontFamily: 'monospace',
          }}
        />
      </div>

      {/* Status */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
      }}>
        <div>
          <strong>Socket:</strong>{' '}
          <span style={{ color: connected ? '#00ff88' : '#ff4444' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div><strong>Session:</strong> {sessionId ? sessionId.slice(0, 8) + '...' : 'Not joined'}</div>
        <div><strong>Device:</strong> {device ? 'Loaded' : 'Not created'}</div>
        <div><strong>Send Transport:</strong> {sendTransport ? '✓' : '✗'}</div>
        <div><strong>Recv Transport:</strong> {recvTransport ? '✓' : '✗'}</div>
        <div><strong>Video Producer:</strong> {videoProducer ? '✓' : '✗'}</div>
        <div><strong>Audio Producer:</strong> {audioProducer ? '✓' : '✗'}</div>
        <div><strong>Video Consumers:</strong> {videoConsumers}</div>
        <div><strong>Audio Consumers:</strong> {audioConsumers}</div>
      </div>

      {/* Common Setup Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#00d9ff', marginBottom: '10px' }}>Common Setup (Required for both Video & Audio)</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}>
          <button onClick={joinChannel} style={buttonStyle(!connected || !channelId)} disabled={!connected || !channelId}>
            1. Join Channel
          </button>
          <button onClick={createDeviceHandler} style={buttonStyle(!rtpCapabilities)} disabled={!rtpCapabilities}>
            2. Create Device
          </button>
          <button onClick={createSendTransportHandler} style={buttonStyle(!device)} disabled={!device}>
            3. Create Send Transport
          </button>
          <button onClick={createRecvTransportHandler} style={buttonStyle(!device)} disabled={!device}>
            4. Create Recv Transport
          </button>
          <button onClick={startConsuming} style={buttonStyle(!recvTransport || isConsuming)} disabled={!recvTransport || isConsuming}>
            5. Start Consuming {isConsuming ? '(Active)' : ''}
          </button>
        </div>
      </div>

      {/* Video Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#ff6b6b', marginBottom: '10px' }}>Video Operations</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}>
          <button onClick={getLocalVideo} style={{ ...buttonStyle(), backgroundColor: '#5c2d2d' }}>
            Get Local Video
          </button>
          <button onClick={produceVideo} style={buttonStyle(!sendTransport || !localVideoStream)} disabled={!sendTransport || !localVideoStream}>
            Produce Video
          </button>
        </div>
      </div>

      {/* Audio Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#4ecdc4', marginBottom: '10px' }}>Audio Operations</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}>
          <button onClick={getLocalAudio} style={{ ...buttonStyle(), backgroundColor: '#1d4a47' }}>
            Get Local Audio
          </button>
          <button onClick={produceAudio} style={buttonStyle(!sendTransport || !localAudioStream)} disabled={!sendTransport || !localAudioStream}>
            Produce Audio
          </button>
        </div>
      </div>

      {/* Logs */}
      <div style={{
        backgroundColor: '#0f0f23',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px',
          backgroundColor: '#16213e',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <strong>Debug Logs</strong>
          <button onClick={clearLogs} style={{ ...buttonStyle(), padding: '5px 10px', fontSize: '12px' }}>
            Clear
          </button>
        </div>
        <div
          ref={logContainerRef}
          style={{
            padding: '10px',
            height: '350px',
            overflowY: 'auto',
            fontSize: '12px',
          }}
        >
          {logs.map(logEntry => (
            <div
              key={logEntry.id}
              style={{
                marginBottom: '8px',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: logEntry.type === 'error' ? '#2d1f1f' :
                  logEntry.type === 'success' ? '#1f2d1f' :
                    logEntry.type === 'warn' ? '#2d2d1f' : '#1f1f2d',
                borderLeft: `3px solid ${
                  logEntry.type === 'error' ? '#ff4444' :
                    logEntry.type === 'success' ? '#44ff44' :
                      logEntry.type === 'warn' ? '#ffff44' : '#4488ff'
                }`,
              }}
            >
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#888' }}>[{logEntry.id}]</span>
                <span style={{
                  color: logEntry.type === 'error' ? '#ff4444' :
                    logEntry.type === 'success' ? '#44ff44' :
                      logEntry.type === 'warn' ? '#ffff44' : '#4488ff',
                  fontWeight: 'bold',
                  minWidth: '60px',
                }}>
                  {logEntry.type.toUpperCase()}
                </span>
                <span>{logEntry.message}</span>
              </div>
              {logEntry.data ? (
                <pre style={{
                  margin: '8px 0 0 80px',
                  padding: '8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxWidth: '100%',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {JSON.stringify(logEntry.data as object, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
          {logs.length === 0 && (
            <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No logs yet. Click a button to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const buttonBaseStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: 'bold',
  backgroundColor: '#0f3460',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.2s, opacity 0.2s',
};

function buttonStyle(disabled?: boolean): React.CSSProperties {
  return {
    ...buttonBaseStyle,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
