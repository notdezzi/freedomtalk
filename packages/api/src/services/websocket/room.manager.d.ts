import { Socket } from 'socket.io';
export declare enum RoomType {
    CHANNEL = "channel",
    SERVER = "server",
    DM = "dm"
}
declare class RoomManager {
    private readonly ROOM_TTL;
    getRoomName(type: RoomType, id: string): string;
    joinRoom(socket: Socket, roomType: RoomType, roomId: string): Promise<void>;
    leaveRoom(socket: Socket, roomType: RoomType, roomId: string): Promise<void>;
    getRoomMembers(roomName: string): Promise<Set<string>>;
    getUserRooms(userId: string): Promise<string[]>;
    broadcastToRoom(roomName: string, event: string, data: any): void;
    private addRoomMember;
    private removeRoomMember;
}
export declare const roomManager: RoomManager;
export {};
//# sourceMappingURL=room.manager.d.ts.map