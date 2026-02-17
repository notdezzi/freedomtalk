/**
 * Voice Client Service
 * Handles WebRTC communication with mediasoup server
 */

import { Device } from 'mediasoup-client';
import { Socket } from 'socket.io-client';

interface TransportOptions {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
}

interface ProducerData {
  producerId: string;
  kind: 'audio' | 'video';
  sessionId: string;
  appData?: any;
}

export class VoiceClient {
  private socket: Socket;
  private channelId: string | null = null;
  private sessionId: string | null = null;
  private device: Device | null = null;
  private sendTransport: any = null;
  private recvTransport: any = null;
  private audioProducer: any = null;
  private videoProducer: any = null;
  private screenProducer: any = null;
  private consumers: Map<string, any> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private rtpCapabilities: any = null;

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

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupSocketHandlers();
  }

  /**
   * Setup socket event handlers for voice events
   */
  private setupSocketHandlers(): void {
    this.socket.on('voice:user_joined', (data: { userId: string; sessionId: string }) => {
      this.onUserJoined?.(data.userId, data.sessionId);
    });

    this.socket.on('voice:user_left', (data: { sessionId: string }) => {
      this.onUserLeft?.(data.sessionId);
    });

    this.socket.on('voice:user_state', (data: { sessionId: string; selfMute?: boolean; selfDeaf?: boolean; selfVideo?: boolean; selfStream?: boolean }) => {
      this.onUserStateChange?.(data.sessionId, data);
    });

    this.socket.on('voice:user_speaking', (data: { sessionId: string; speaking: boolean }) => {
      this.onUserSpeaking?.(data.sessionId, data.speaking);
    });

    this.socket.on('voice:new_producer', async (data: ProducerData) => {
      await this.consumeProducer(data.producerId, data.kind, data.sessionId);
      this.onProducerCreated?.(data.producerId, data.kind, data.sessionId);
    });
  }

  /**
   * Join a voice channel
   */
  async joinChannel(channelId: string): Promise<void> {
    this.channelId = channelId;

    return new Promise((resolve, reject) => {
      this.socket.emit('voice:join', { channelId }, async (response: any) => {
        if (!response.success) {
          this.onError?.(response.error || 'Failed to join voice channel');
          reject(new Error(response.error));
          return;
        }

        try {
          this.sessionId = response.data.sessionId;
          this.rtpCapabilities = response.data.rtpCapabilities;

          // Create mediasoup device
          this.device = new Device();
          await this.device.load({ routerRtpCapabilities: this.rtpCapabilities });

          // Create send transport
          await this.createSendTransport();

          // Create receive transport
          await this.createRecvTransport();

          // Consume existing producers
          for (const producer of response.data.producers || []) {
            await this.consumeProducer(producer.producerId, producer.kind, producer.sessionId);
          }

          this.onConnected?.();
          resolve();
        } catch (error: any) {
          console.error('Error initializing voice:', error);
          this.onError?.(error.message || 'Failed to initialize voice');
          reject(error);
        }
      });
    });
  }

  /**
   * Leave the current voice channel
   */
  async leaveChannel(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('voice:leave', async (response: any) => {
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
          try {
            await new Promise<void>((res, rej) => {
              this.socket.emit('voice:connect_transport', {
                transportId: this.sendTransport.id,
                dtlsParameters,
              }, (resp: any) => {
                if (resp.success) res();
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
            const resp = await new Promise<any>((res, rej) => {
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

        this.recvTransport = this.device!.createRecvTransport({
          id: transportOptions.id,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates,
          dtlsParameters: transportOptions.dtlsParameters,
        });

        this.recvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
          try {
            await new Promise<void>((res, rej) => {
              this.socket.emit('voice:connect_transport', {
                transportId: this.recvTransport.id,
                dtlsParameters,
              }, (resp: any) => {
                if (resp.success) res();
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
   * Start producing audio from microphone
   */
  async startAudio(deviceId?: string): Promise<void> {
    if (!this.sendTransport || this.audioProducer) return;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });

      const audioTrack = this.localStream.getAudioTracks()[0];
      if (!audioTrack) throw new Error('No audio track available');

      this.audioProducer = await this.sendTransport.produce({
        track: audioTrack,
        codecOptions: {
          opusStereo: 1,
          opusDtx: 1,
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

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Start producing video from camera
   */
  async startVideo(deviceId?: string): Promise<void> {
    if (!this.sendTransport || this.videoProducer) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { width: 1280, height: 720 },
      });

      const videoTrack = stream.getVideoTracks()[0];
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
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (!this.sendTransport || this.screenProducer) return;

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const videoTrack = this.screenStream.getVideoTracks()[0];
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
      const audioTrack = this.screenStream.getAudioTracks()[0];
      if (audioTrack) {
        // Screen audio uses a separate producer marked as screen audio
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

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
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

    // Update server state
    this.socket.emit('voice:state_update', { selfMute: muted });
  }

  /**
   * Consume a producer from another participant
   */
  private async consumeProducer(producerId: string, kind: 'audio' | 'video', _sessionId: string): Promise<void> {
    if (!this.recvTransport || !this.device) return;

    try {
      const consumer = await this.recvTransport.consume({
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
        paused: true,
      });

      this.consumers.set(consumer.id, consumer);

      // Resume the consumer
      await new Promise<void>((resolve, reject) => {
        this.socket.emit('voice:resume_consumer', { consumerId: consumer.id }, (response: any) => {
          if (response.success) resolve();
          else reject(new Error(response.error));
        });
      });

      await consumer.resume();

      consumer.on('transportclose', () => {
        this.consumers.delete(consumer.id);
      });

      consumer.on('trackended', () => {
        this.consumers.delete(consumer.id);
      });
    } catch (error: any) {
      console.error('Error consuming producer:', error);
    }
  }

  /**
   * Get consumer track for audio/video element
   */
  getConsumerTrack(consumerId: string): MediaStreamTrack | null {
    const consumer = this.consumers.get(consumerId);
    return consumer?.track || null;
  }

  /**
   * Get all consumer streams
   */
  getConsumerStreams(): Map<string, MediaStream> {
    const streams = new Map<string, MediaStream>();

    for (const [id, consumer] of this.consumers) {
      const stream = new MediaStream([consumer.track]);
      streams.set(id, stream);
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
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();

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
  }

  /**
   * Get current channel ID
   */
  getChannelId(): string | null {
    return this.channelId;
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

export function createVoiceClient(socket: Socket): VoiceClient {
  if (voiceClientInstance) {
    voiceClientInstance.cleanup();
  }
  voiceClientInstance = new VoiceClient(socket);
  return voiceClientInstance;
}

export function getVoiceClient(): VoiceClient | null {
  return voiceClientInstance;
}
