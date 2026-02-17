import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION, DEFAULTS } from '@freedomtalk/shared';
class RoleService {
    async createRole(input) {
        const server = await db('servers').where('id', input.serverId).first();
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        const roleCount = await db('roles').where('server_id', input.serverId).count('id as count').first();
        if (roleCount && parseInt(roleCount.count, 10) >= VALIDATION.ROLE.MAX_ROLES_PER_SERVER) {
            throw new AppError(400, 'ROLE_LIMIT_REACHED', `Server has reached the maximum of ${VALIDATION.ROLE.MAX_ROLES_PER_SERVER} roles`);
        }
        if (input.name.length < VALIDATION.ROLE.MIN_NAME_LENGTH || input.name.length > VALIDATION.ROLE.MAX_NAME_LENGTH) {
            throw new AppError(400, 'INVALID_NAME', `Role name must be between ${VALIDATION.ROLE.MIN_NAME_LENGTH} and ${VALIDATION.ROLE.MAX_NAME_LENGTH} characters`);
        }
        if (input.color !== undefined && (input.color < 0 || input.color > 16777215)) {
            throw new AppError(400, 'INVALID_COLOR', 'Color must be between 0 and 16777215');
        }
        const maxPosition = await db('roles')
            .where('server_id', input.serverId)
            .max('position as max')
            .first();
        const position = (maxPosition?.max || 0) + 1;
        const roleId = generateSnowflakeId();
        const [role] = await db('roles')
            .insert({
            id: roleId,
            server_id: input.serverId,
            name: input.name,
            color: input.color || 0,
            hoist: input.hoist || false,
            icon: input.icon || null,
            position,
            permissions: (input.permissions || DEFAULTS.ROLE.PERMISSIONS).toString(),
            managed: false,
            mentionable: input.mentionable !== undefined ? input.mentionable : true,
        })
            .returning('*');
        return role;
    }
    async getRole(roleId) {
        const role = await db('roles').where('id', roleId).first();
        return role || null;
    }
    async getServerRoles(serverId) {
        const roles = await db('roles')
            .where('server_id', serverId)
            .orderBy('position', 'desc');
        return roles;
    }
    async updateRole(roleId, input) {
        const role = await this.getRole(roleId);
        if (!role) {
            throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
        }
        if (role.name === '@everyone' && input.name !== undefined) {
            throw new AppError(400, 'CANNOT_MODIFY_EVERYONE', 'Cannot rename the @everyone role');
        }
        const updateData = {
            updated_at: new Date(),
        };
        if (input.name !== undefined) {
            if (input.name.length < VALIDATION.ROLE.MIN_NAME_LENGTH || input.name.length > VALIDATION.ROLE.MAX_NAME_LENGTH) {
                throw new AppError(400, 'INVALID_NAME', `Role name must be between ${VALIDATION.ROLE.MIN_NAME_LENGTH} and ${VALIDATION.ROLE.MAX_NAME_LENGTH} characters`);
            }
            updateData.name = input.name;
        }
        if (input.permissions !== undefined) {
            updateData.permissions = input.permissions.toString();
        }
        if (input.color !== undefined) {
            if (input.color < 0 || input.color > 16777215) {
                throw new AppError(400, 'INVALID_COLOR', 'Color must be between 0 and 16777215');
            }
            updateData.color = input.color;
        }
        if (input.hoist !== undefined) {
            updateData.hoist = input.hoist;
        }
        if (input.icon !== undefined) {
            updateData.icon = input.icon;
        }
        if (input.mentionable !== undefined) {
            updateData.mentionable = input.mentionable;
        }
        if (input.position !== undefined) {
            updateData.position = input.position;
        }
        const [updated] = await db('roles')
            .where('id', roleId)
            .update(updateData)
            .returning('*');
        return updated;
    }
    async deleteRole(roleId) {
        const role = await this.getRole(roleId);
        if (!role) {
            throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
        }
        if (role.name === '@everyone') {
            throw new AppError(400, 'CANNOT_DELETE_EVERYONE', 'Cannot delete the @everyone role');
        }
        await db('member_roles')
            .where('role_id', roleId)
            .delete();
        await db('roles').where('id', roleId).delete();
    }
    async updateRolePositions(serverId, positions) {
        await db.transaction(async (trx) => {
            for (const { id, position } of positions) {
                await trx('roles')
                    .where('id', id)
                    .where('server_id', serverId)
                    .update({ position, updated_at: new Date() });
            }
        });
        return this.getServerRoles(serverId);
    }
    async getEveryoneRole(serverId) {
        const role = await db('roles')
            .where('server_id', serverId)
            .where('name', '@everyone')
            .first();
        return role || null;
    }
    async calculateMemberPermissions(serverId, userId) {
        const server = await db('servers').where('id', serverId).first();
        if (!server) {
            return 0n;
        }
        if (server.owner_id === userId) {
            const { ALL_PERMISSIONS } = await import('@freedomtalk/shared');
            return ALL_PERMISSIONS;
        }
        const memberRoles = await db('member_roles')
            .where('server_id', serverId)
            .where('user_id', userId)
            .pluck('role_id');
        const everyoneRole = await this.getEveryoneRole(serverId);
        let permissions = everyoneRole ? BigInt(everyoneRole.permissions) : 0n;
        if (memberRoles.length > 0) {
            const roles = await db('roles')
                .whereIn('id', memberRoles)
                .where('server_id', serverId);
            for (const role of roles) {
                permissions |= BigInt(role.permissions);
            }
        }
        return permissions;
    }
}
export const roleService = new RoleService();
//# sourceMappingURL=role.service.js.map