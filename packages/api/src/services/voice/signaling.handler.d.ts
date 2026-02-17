export interface SignalingMessage {
    type: string;
    channelId: string;
    sessionId?: string;
    userId?: string;
    data?: any;
    requestId?: string;
}
export interface SignalingResponse {
    requestId: string;
    success: boolean;
    data?: any;
    error?: string;
}
declare class SignalingHandler {
    private initialized;
    initialize(): Promise<void>;
    private handleMessage;
    private handleGetRouterRtpCapabilities;
    private handleCreateTransport;
    private handleConnectTransport;
    private handleProduce;
    private handleConsume;
    private handleResumeConsumer;
    private handleCloseProducer;
    private handleCloseConsumer;
    private handleJoinRoom;
    private handleLeaveRoom;
    private handleGetProducers;
    close(): Promise<void>;
}
export declare const signalingHandler: SignalingHandler;
export {};
//# sourceMappingURL=signaling.handler.d.ts.map