import { Socket } from 'socket.io';
declare class VoiceHandler {
    private pendingRequests;
    private initialized;
    initialize(): Promise<void>;
    private handleResponse;
    private sendRequest;
    registerHandlers(socket: Socket): void;
    close(): Promise<void>;
}
export declare const voiceHandler: VoiceHandler;
export {};
//# sourceMappingURL=voice.handler.d.ts.map