export interface RoleData {
    id: string;
    server_id: string;
    name: string;
    color: number;
    hoist: boolean;
    icon: string | null;
    position: number;
    permissions: string;
    managed: boolean;
    mentionable: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface CreateRoleInput {
    serverId: string;
    name: string;
    permissions?: bigint;
    color?: number;
    hoist?: boolean;
    icon?: string;
    mentionable?: boolean;
}
export interface UpdateRoleInput {
    name?: string;
    permissions?: bigint;
    color?: number;
    hoist?: boolean;
    icon?: string | null;
    mentionable?: boolean;
    position?: number;
}
declare class RoleService {
    createRole(input: CreateRoleInput): Promise<RoleData>;
    getRole(roleId: string): Promise<RoleData | null>;
    getServerRoles(serverId: string): Promise<RoleData[]>;
    updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleData>;
    deleteRole(roleId: string): Promise<void>;
    updateRolePositions(serverId: string, positions: {
        id: string;
        position: number;
    }[]): Promise<RoleData[]>;
    getEveryoneRole(serverId: string): Promise<RoleData | null>;
    calculateMemberPermissions(serverId: string, userId: string): Promise<bigint>;
}
export declare const roleService: RoleService;
export {};
//# sourceMappingURL=role.service.d.ts.map