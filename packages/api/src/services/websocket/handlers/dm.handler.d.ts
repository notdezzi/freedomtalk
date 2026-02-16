import { Socket } from 'socket.io';
export declare function registerDMChannelHandlers(socket: Socket): void;
declare const _default: {
    registerDMChannelHandlers: typeof registerDMChannelHandlers;
    DM_EVENTS: {
        readonly CREATE: "dm_channel:create";
        readonly UPDATE: "dm_channel:update";
        readonly DELETE: "dm_channel:delete";
        readonly RECIPIENT_ADD: "dm_channel:recipient_add";
        readonly RECIPIENT_REMOVE: "dm_channel:recipient_remove";
        readonly ERROR: "dm_channel:error";
    };
};
export default _default;
//# sourceMappingURL=dm.handler.d.ts.map