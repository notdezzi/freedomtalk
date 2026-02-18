/**
 * Voice Client Service
 * Handles WebRTC communication with mediasoup server
 * Refactored to follow SFU debug page patterns
 */

import { Device } from 'mediasoup-client';
import { Socket } from 'socket.io-client';

interface TransportOptions {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
}

interface ProducerInfo {
  producerId: string;
  kind: 'audio' | 'video';
  sessionId: string;
  appData?: any;
}

interface RemoteStream {
  audio?: MediaStream;
  video?: MediaStream;
  screen?: MediaStream;
}

export class VoiceClient {
  private socket: Socket;
  private channelId: string | null = null;
  private sessionId: string | null = null;
  private device: Device | null = null;
  private sendTransport: any = null;
  private recvTransport: any = null;

  // Producers
  private audioProducer: any = null;
  private videoProducer: any = null;
  private screenProducer: any = null;

  // Consumers mapped by consumerId, with sessionId tracking
  private consumers: Map<string, { consumer: any; sessionId: string }> = new Map();

  // Local streams
  private _localAudioStream: MediaStream | null = null;
  private _localVideoStream: MediaStream | null = null;
  private _localScreenStream: MediaStream | null = null;

  // RTP capabilities
  private rtpCapabilities: any = null;

  // State guards
  private isJoining: boolean = false;
  private socketHandlersSetup: boolean = false;
  private isConsuming: boolean = false;
  private pendingProducers: ProducerInfo[] = [];
  private sendTransportConnected: boolean = false;
  private recvTransportConnected: boolean = false;

  // Callbacks
  public onProducerCreated?: (producerId: string, kind: 'audio' | 'video', sessionId: string) => void;
  public onProducerClosed?: (producerId: string) => void;
  public onUserJoined?: (userId: string, sessionId: string) => void;
  public onUserLeft?: (sessionId: string) => void;
  public onUserStateChange?: (sessionId: string, state: any) => void;
  public onUserSpeaking?: (sessionId: string, speaking: boolean) => void;
  public onError?: (error: string) => void;
  public onConnected?: () => void;
  public onDisconnected?: () => void;
  public onRemoteStreamChanged?: (sessionId: string, kind: 'audio' | 'video' | 'screen', stream: MediaStream | null) => void;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupSocketHandlers();
  }

  /**
   * Setup socket event handlers for voice events
   */
  private setupSocketHandlers(): void {
    if (this.socketHandlersSetup) return;
    this.socketHandlersSetup = true;

    // Heartbeat handler - critical for keeping connection alive
    this.socket.on('ping', () => {
      this.socket.emit('pong', { timestamp: Date.now() });
    });

    this.socket.on('voice:user_joined', (data: { userId: string; sessionId: string }) => {
      this.onUserJoined?.(data.userId, data.sessionId);
    });

    this.socket.on('voice:user_left', (data: { sessionId: string }) => {
      // Clean up consumers for this session
      for (const [consumerId, { consumer, sessionId }] of this.consumers) {
        if (sessionId === data.sessionId) {
          consumer.close();
          this.consumers.delete(consumerId);
        }
      }
      this.onUserLeft?.(data.sessionId);
    });

    this.socket.on('voice:user_state', (data: { sessionId: string; selfMute?: boolean; selfDeaf?: boolean; selfVideo?: boolean; selfStream?: boolean }) => {
      this.onUserStateChange?.(data.sessionId, data);
    });

    this.socket.on('voice:user_speaking', (data: { sessionId: string; speaking: boolean }) => {
      this.onUserSpeaking?.(data.sessionId, data.speaking);
    });

    this.socket.on('voice:new_producer', async (data: ProducerInfo) => {
      if (this.isConsuming && this.recvTransport) {
        await this.consumeProducer(data.producerId, data.kind, data.sessionId, data.appData);
      } else {
        // Queue for later consumption
        this.pendingProducers.push(data);
      }
      this.onProducerCreated?.(data.producerId, data.kind, data.sessionId);
    });
  }

  /**
   * Join a voice channel with auto-setup
   */
  async joinChannel(channelId: string): Promise<void> {
    // If already joining, wait a bit and check again (handles race conditions)
    if (this.isJoining) {
      console.log('VoiceClient: Already joining a channel, waiting...');
      // Wait for the ongoing join to complete or fail
      let attempts = 0;
      while (this.isJoining && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      // After waiting, if we're now in this channel, return success
      if (this.channelId === channelId && this.sessionId) {
        console.log('VoiceClient: Join completed while waiting');
        return;
      }
      // Otherwise, proceed with a new join attempt
    }

    if (this.channelId && this.channelId !== channelId) {
      console.log('VoiceClient: Leaving previous channel before joining new one');
      await this.leaveChannel();
    }

    if (this.channelId === channelId && this.device) {
      console.log('VoiceClient: Already in this channel');
      return;
    }

    this.isJoining = true;
    this.channelId = channelId;

    return new Promise((resolve, reject) => {
      // Track if this join request has been aborted
      let joinAborted = false;

      const joinHandler = async (response: any) => {
        // Check if cleanup was called during the socket emit
        if (joinAborted || !this.isJoining) {
          console.log('[VoiceClient] Join was aborted during socket emit');
          // Still need to leave on the server side
          if (response.success) {
            this.socket.emit('voice:leave', () => {});
          }
          reject(new Error('Join aborted'));
          return;
        }

        if (!response.success) {
          this.isJoining = false;
          this.onError?.(response.error || 'Failed to join voice channel');
          reject(new Error(response.error));
          return;
        }

        try {
          this.sessionId = response.data.sessionId;
          this.rtpCapabilities = response.data.rtpCapabilities;
          console.log('[VoiceClient] Got sessionId:', this.sessionId);

          // Step 2: Create Device
          this.device = new Device();
          await this.device.load({ routerRtpCapabilities: this.rtpCapabilities });

          // Step 3: Create Send Transport
          await this.createSendTransport();

          // Step 4: Create Recv Transport
          await this.createRecvTransport();

          // Step 5: Start Consuming existing producers
          this.isConsuming = true;
          const existingProducers = response.data.producers || [];
          for (const producer of existingProducers) {
            await this.consumeProducer(
              producer.producerId,
              producer.kind,
              producer.sessionId,
              producer.appData
            );
          }

          // Consume any pending producers that came in during setup
          for (const producer of this.pendingProducers) {
            await this.consumeProducer(
              producer.producerId,
              producer.kind,
              producer.sessionId,
              producer.appData
            );
          }
          this.pendingProducers = [];

          // Step 6-7: Auto get local audio and produce
          try {
            await this.startAudio();
          } catch (audioError: any) {
            // Audio failure is non-fatal - user can manually enable
            console.warn('[VoiceClient] Could not auto-start audio:', audioError.message);
          }

          console.log('[VoiceClient] Join complete, sessionId:', this.sessionId);
          this.onConnected?.();
          this.isJoining = false;
          resolve();
        } catch (error: any) {
          console.error('[VoiceClient] Error initializing voice:', error);
          // Reset state on failure so we can retry
          this.isJoining = false;
          this.sessionId = null;
          this.channelId = null;
          this.onError?.(error.message || 'Failed to initialize voice');
          reject(error);
        }
      };

      // Emit with the handler
      this.socket.emit('voice:join', { channelId }, joinHandler);

      // Store abort function for cleanup
      this.abortJoin = () => {
        joinAborted = true;
        this.isJoining = false;
      };
    });
  }

  // Abort function for ongoing join
  private abortJoin: (() => void) | null = null;

  /**
   * Leave the current voice channel
   */
  async leaveChannel(): Promise<void> {
    // Abort any ongoing join
    if (this.abortJoin) {
      this.abortJoin();
      this.abortJoin = null;
    }

    this.isJoining = false;
    this.isConsuming = false;

    return new Promise((resolve) => {
      this.socket.emit('voice:leave', async (_response: any) => {
        await this.cleanup();
        this.onDisconnected?.();
        resolve();
      });
    });
  }

  /**
   * Create send transport for producing media
   */
  private async createSendTransport(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('voice:create_transport', { direction: 'send' }, async (response: any) => {
        if (!response.success) {
          reject(new Error(response.error));
          return;
        }

        const transportOptions: TransportOptions = response.data.transport;

        this.sendTransport = this.device!.createSendTransport({
          id: transportOptions.id,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates,
          dtlsParameters: transportOptions.dtlsParameters,
        });

        this.sendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
          // Guard against duplicate connect calls
          if (this.sendTransportConnected) {
            callback();
            return;
          }

          try {
            await new Promise<void>((res, rej) => {
              this.socket.emit('voice:connect_transport', {
                transportId: this.sendTransport.id,
                dtlsParameters,
              }, (resp: any) => {
                if (resp.success) {
                  this.sendTransportConnected = true;
                  res();
                }
                else rej(new Error(resp.error));
              });
            });
            callback();
          } catch (error: any) {
            errback(error);
          }
        });

        this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
          try {
            const resp = await new Promise<any>((res) => {
              this.socket.emit('voice:produce', {
                kind,
                rtpParameters,
                appData,
              }, (r: any) => res(r));
            });

            if (!resp.success) {
              throw new Error(resp.error);
            }

            callback({ id: resp.data.producerId });
          } catch (error: any) {
            errback(error);
          }
        });

        resolve();
      });
    });
  }

  /**
   * Create receive transport for consuming media
   */
  private async createRecvTransport(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('voice:create_transport', { direction: 'recv' }, async (response: any) => {
        if (!response.success) {
          reject(new Error(response.error));
          return;
        }

        const transportOptions: TransportOptions = response.data.transport;

        if (!transportOptions || !transportOptions.id) {
          reject(new Error('Invalid transport options: missing id'));
          return;
        }

        this.recvTransport = this.device!.createRecvTransport({
          id: transportOptions.id,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates,
          dtlsParameters: transportOptions.dtlsParameters,
        });

        this.recvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
          // Guard against duplicate connect calls
          if (this.recvTransportConnected) {
            callback();
            return;
          }

          try {
            await new Promise<void>((res, rej) => {
              this.socket.emit('voice:connect_transport', {
                transportId: this.recvTransport.id,
                dtlsParameters,
              }, (resp: any) => {
                if (resp.success) {
                  this.recvTransportConnected = true;
                  res();
                }
                else rej(new Error(resp.error));
              });
            });
            callback();
          } catch (error: any) {
            errback(error);
          }
        });

        resolve();
      });
    });
  }

  /**
   * Consume a producer from another participant
   * Key fix: Map consumerId to id for mediasoup-client
   */
  private async consumeProducer(
    producerId: string,
    kind: 'audio' | 'video',
    sessionId: string,
    appData?: any
  ): Promise<void> {
    if (!this.recvTransport || !this.device) {
      console.warn('Cannot consume: recvTransport or device not ready');
      return;
    }

    try {
      const response = await new Promise<any>((resolve) => {
        this.socket.emit('voice:consume', {
          producerId,
          rtpCapabilities: this.device!.rtpCapabilities,
        }, (r: any) => resolve(r));
      });

      if (!response.success) {
        console.error('Failed to consume:', response);
        return;
      }

      const { consumerId, kind: respKind, rtpParameters } = response.data;

      // Critical fix: Map consumerId to id for mediasoup-client
      const consumer = await this.recvTransport.consume({
        id: consumerId,  // This is the key fix!
        producerId,
        kind: respKind,
        rtpParameters,
      });

      // Store consumer with sessionId for stream mapping
      this.consumers.set(consumer.id, { consumer, sessionId });

      // Resume the consumer via server
      await new Promise<void>((resolve, reject) => {
        this.socket.emit('voice:resume_consumer', { consumerId: consumer.id }, (resp: any) => {
          if (resp.success) resolve();
          else reject(new Error(resp.error));
        });
      });

      await consumer.resume();

      // Create stream and notify
      const stream = new MediaStream([consumer.track]);
      const streamKind = appData?.type === 'screen' ? 'screen' : respKind;
      this.onRemoteStreamChanged?.(sessionId, streamKind, stream);

      consumer.on('transportclose', () => {
        this.consumers.delete(consumer.id);
        this.onRemoteStreamChanged?.(sessionId, streamKind, null);
      });

      consumer.on('trackended', () => {
        this.consumers.delete(consumer.id);
        this.onRemoteStreamChanged?.(sessionId, streamKind, null);
      });

    } catch (error: any) {
      console.error('Error consuming producer:', error);
    }
  }

  /**
   * Start producing audio from microphone
   */
  async startAudio(deviceId?: string): Promise<void> {
    if (!this.sendTransport || this.audioProducer) return;

    try {
      // High quality audio capture settings
      this._localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? {
          deviceId: { exact: deviceId },
          // High quality settings for specified device
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : {
          // High quality default settings
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          latency: 0.02, // 20ms latency for real-time communication
        },
      });

      const audioTrack = this._localAudioStream.getAudioTracks()[0];
      if (!audioTrack) throw new Error('No audio track available');

      this.audioProducer = await this.sendTransport.produce({
        track: audioTrack,
        codecOptions: {
          // High quality OPUS encoding options
          opusStereo: 1,
          opusDtx: 1,
          opusFec: 1,           // Enable FEC for packet loss resilience
          opusNack: 1,          // Enable NACK for retransmissions
          opusMaxAverageBitrate: 128000, // 128 kbps
        },
      });

      this.audioProducer.on('transportclose', () => {
        this.audioProducer = null;
      });

      this.audioProducer.on('trackended', () => {
        this.stopAudio();
      });
    } catch (error: any) {
      console.error('Error starting audio:', error);
      this.onError?.(error.message || 'Failed to start audio');
      throw error;
    }
  }

  /**
   * Stop producing audio
   */
  async stopAudio(): Promise<void> {
    if (this.audioProducer) {
      this.audioProducer.close();
      this.audioProducer = null;
    }

    if (this._localAudioStream) {
      this._localAudioStream.getAudioTracks().forEach(track => track.stop());
      this._localAudioStream = null;
    }
  }

  /**
   * Start producing video from camera
   */
  async startVideo(deviceId?: string): Promise<void> {
    if (!this.sendTransport || this.videoProducer) return;

    try {
      this._localVideoStream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { width: 1280, height: 720 },
      });

      const videoTrack = this._localVideoStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('No video track available');

      this.videoProducer = await this.sendTransport.produce({
        track: videoTrack,
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });

      this.videoProducer.on('transportclose', () => {
        this.videoProducer = null;
      });

      this.videoProducer.on('trackended', () => {
        this.stopVideo();
      });
    } catch (error: any) {
      console.error('Error starting video:', error);
      this.onError?.(error.message || 'Failed to start video');
      throw error;
    }
  }

  /**
   * Stop producing video
   */
  async stopVideo(): Promise<void> {
    if (this.videoProducer) {
      this.videoProducer.close();
      this.videoProducer = null;
    }

    if (this._localVideoStream) {
      this._localVideoStream.getVideoTracks().forEach(track => track.stop());
      this._localVideoStream = null;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (!this.sendTransport || this.screenProducer) return;

    try {
      this._localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const videoTrack = this._localScreenStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('No screen video track available');

      this.screenProducer = await this.sendTransport.produce({
        track: videoTrack,
        appData: { type: 'screen' },
      });

      this.screenProducer.on('transportclose', () => {
        this.screenProducer = null;
      });

      this.screenProducer.on('trackended', () => {
        this.stopScreenShare();
      });

      // Also produce audio if available
      const audioTrack = this._localScreenStream.getAudioTracks()[0];
      if (audioTrack) {
        await this.sendTransport.produce({
          track: audioTrack,
          appData: { type: 'screen-audio' },
        });
      }
    } catch (error: any) {
      console.error('Error starting screen share:', error);
      this.onError?.(error.message || 'Failed to start screen share');
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }

    if (this._localScreenStream) {
      this._localScreenStream.getTracks().forEach(track => track.stop());
      this._localScreenStream = null;
    }
  }

  /**
   * Mute/unmute audio
   */
  setMuted(muted: boolean): void {
    if (this.audioProducer) {
      if (muted) {
        this.audioProducer.pause();
      } else {
        this.audioProducer.resume();
      }
    }

    this.socket.emit('voice:state_update', { selfMute: muted });
  }

  /**
   * Get local audio stream
   */
  getLocalAudioStream(): MediaStream | null {
    return this._localAudioStream;
  }

  /**
   * Get local video stream
   */
  getLocalVideoStream(): MediaStream | null {
    return this._localVideoStream;
  }

  /**
   * Get local screen stream
   */
  getLocalScreenStream(): MediaStream | null {
    return this._localScreenStream;
  }

  /**
   * Get remote streams mapped by sessionId
   */
  getRemoteStreams(): Map<string, RemoteStream> {
    const streams = new Map<string, RemoteStream>();

    for (const { consumer, sessionId } of this.consumers.values()) {
      const stream = new MediaStream([consumer.track]);
      const kind = consumer.appData?.type === 'screen' ? 'screen' : consumer.kind;

      if (!streams.has(sessionId)) {
        streams.set(sessionId, {});
      }

      const userStreams = streams.get(sessionId)!;
      if (kind === 'audio') {
        userStreams.audio = stream;
      } else if (kind === 'video') {
        userStreams.video = stream;
      } else if (kind === 'screen') {
        userStreams.screen = stream;
      }
    }

    return streams;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Stop producing
    await this.stopAudio();
    await this.stopVideo();
    await this.stopScreenShare();

    // Close consumers
    for (const { consumer } of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();
    this.pendingProducers = [];

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }

    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Reset state
    this.device = null;
    this.channelId = null;
    this.sessionId = null;
    this.rtpCapabilities = null;
    this.isJoining = false;
    this.isConsuming = false;
    this.sendTransportConnected = false;
    this.recvTransportConnected = false;
    this.abortJoin = null;
  }

  /**
   * Get current channel ID
   */
  getChannelId(): string | null {
    return this.channelId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected to a voice channel
   */
  isConnected(): boolean {
    return this.channelId !== null && this.device !== null;
  }

  /**
   * Check if audio is being produced
   */
  isAudioProducing(): boolean {
    return this.audioProducer !== null && !this.audioProducer.paused;
  }

  /**
   * Check if video is being produced
   */
  isVideoProducing(): boolean {
    return this.videoProducer !== null && !this.videoProducer.paused;
  }

  /**
   * Check if screen is being shared
   */
  isScreenSharing(): boolean {
    return this.screenProducer !== null && !this.screenProducer.paused;
  }
}

// Singleton instance
let voiceClientInstance: VoiceClient | null = null;
let currentSocketId: string | null = null;

export function createVoiceClient(socket: Socket): VoiceClient {
  // If socket changed or no existing instance, create new
  if (voiceClientInstance && currentSocketId !== socket.id) {
    voiceClientInstance.cleanup();
    voiceClientInstance = null;
  }

  if (!voiceClientInstance) {
    voiceClientInstance = new VoiceClient(socket);
    currentSocketId = socket.id ?? null;
  }

  return voiceClientInstance;
}

export function getVoiceClient(): VoiceClient | null {
  return voiceClientInstance;
}

export function resetVoiceClient(): void {
  if (voiceClientInstance) {
    voiceClientInstance.cleanup();
    voiceClientInstance = null;
  }
  currentSocketId = null;
}
