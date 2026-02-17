import * as mediasoup from 'mediasoup';
type Router = mediasoup.types.Router;
type Transport = mediasoup.types.Transport;
type Producer = mediasoup.types.Producer;
type Consumer = mediasoup.types.Consumer;
type RtpCapabilities = mediasoup.types.RtpCapabilities;
export interface MediasoupConfig {
    numWorkers: number;
    announcedIp?: string;
    rtcMinPort: number;
    rtcMaxPort: number;
}
export interface VoiceRoom {
    router: Router;
    channelId: string;
    participants: Map<string, Participant>;
}
export interface Participant {
    userId: string;
    sessionId: string;
    sendTransport?: Transport;
    recvTransport?: Transport;
    audioProducer?: Producer;
    videoProducer?: Producer;
    screenProducer?: Producer;
    consumers: Map<string, Consumer>;
}
export interface TransportOptions {
    id: string;
    iceParameters: any;
    iceCandidates: any[];
    dtlsParameters: any;
}
declare class MediasoupService {
    private workers;
    private nextWorkerIndex;
    private rooms;
    private initialized;
    initialize(): Promise<void>;
    private getNextWorker;
    getOrCreateRoom(channelId: string): Promise<VoiceRoom>;
    getRoom(channelId: string): VoiceRoom | undefined;
    closeRoom(channelId: string): Promise<void>;
    getRouterRtpCapabilities(channelId: string): Promise<RtpCapabilities>;
    addParticipant(channelId: string, userId: string, sessionId: string): Participant;
    removeParticipant(channelId: string, sessionId: string): Promise<void>;
    getParticipant(channelId: string, sessionId: string): Participant | undefined;
    createTransport(channelId: string, sessionId: string, direction: 'send' | 'recv'): Promise<TransportOptions>;
    connectTransport(channelId: string, sessionId: string, transportId: string, dtlsParameters: any): Promise<void>;
    produce(channelId: string, sessionId: string, kind: 'audio' | 'video', rtpParameters: any, appData?: any): Promise<{
        producerId: string;
    }>;
    consume(channelId: string, sessionId: string, producerId: string, rtpCapabilities: RtpCapabilities): Promise<{
        consumerId: string;
        producerId: string;
        kind: 'audio' | 'video';
        rtpParameters: any;
    }>;
    resumeConsumer(channelId: string, sessionId: string, consumerId: string): Promise<void>;
    closeProducer(channelId: string, sessionId: string, producerId: string): Promise<void>;
    closeConsumer(channelId: string, sessionId: string, consumerId: string): Promise<void>;
    getRoomProducers(channelId: string): Array<{
        producerId: string;
        kind: 'audio' | 'video';
        sessionId: string;
        appData: any;
    }>;
    private broadcastNewProducer;
    getRoomStats(): {
        rooms: number;
        participants: number;
    };
    close(): Promise<void>;
}
export declare const mediasoupService: MediasoupService;
export {};
//# sourceMappingURL=mediasoup.service.d.ts.map