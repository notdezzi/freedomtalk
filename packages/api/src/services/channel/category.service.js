import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION } from '@freedomtalk/shared';
class CategoryService {
    async createCategory(input) {
        const server = await db('servers').where('id', input.serverId).first();
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        if (input.name.length < VALIDATION.CATEGORY_NAME.MIN_LENGTH ||
            input.name.length > VALIDATION.CATEGORY_NAME.MAX_LENGTH) {
            throw new AppError(400, 'INVALID_NAME', `Category name must be between ${VALIDATION.CATEGORY_NAME.MIN_LENGTH} and ${VALIDATION.CATEGORY_NAME.MAX_LENGTH} characters`);
        }
        const maxPosition = await db('channel_categories')
            .where('server_id', input.serverId)
            .max('position as max')
            .first();
        const position = input.position ?? ((maxPosition?.max || -1) + 1);
        const categoryId = generateSnowflakeId();
        const [category] = await db('channel_categories')
            .insert({
            id: categoryId,
            server_id: input.serverId,
            name: input.name,
            position,
            nsfw: input.nsfw || false,
        })
            .returning('*');
        return category;
    }
    async getCategory(categoryId) {
        const category = await db('channel_categories').where('id', categoryId).first();
        return category || null;
    }
    async getServerCategories(serverId) {
        const categories = await db('channel_categories')
            .where('server_id', serverId)
            .orderBy('position', 'asc');
        return categories;
    }
    async updateCategory(categoryId, input) {
        const category = await this.getCategory(categoryId);
        if (!category) {
            throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
        }
        const updateData = {
            updated_at: new Date(),
        };
        if (input.name !== undefined) {
            if (input.name.length < VALIDATION.CATEGORY_NAME.MIN_LENGTH ||
                input.name.length > VALIDATION.CATEGORY_NAME.MAX_LENGTH) {
                throw new AppError(400, 'INVALID_NAME', `Category name must be between ${VALIDATION.CATEGORY_NAME.MIN_LENGTH} and ${VALIDATION.CATEGORY_NAME.MAX_LENGTH} characters`);
            }
            updateData.name = input.name;
        }
        if (input.position !== undefined) {
            updateData.position = input.position;
        }
        if (input.nsfw !== undefined) {
            updateData.nsfw = input.nsfw;
        }
        const [updated] = await db('channel_categories')
            .where('id', categoryId)
            .update(updateData)
            .returning('*');
        return updated;
    }
    async deleteCategory(categoryId) {
        const category = await this.getCategory(categoryId);
        if (!category) {
            throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
        }
        await db.transaction(async (trx) => {
            await trx('channels')
                .where('category_id', categoryId)
                .update({ category_id: null, updated_at: new Date() });
            await trx('channel_categories').where('id', categoryId).delete();
        });
    }
    async updateCategoryPositions(serverId, positions) {
        await db.transaction(async (trx) => {
            for (const { id, position } of positions) {
                await trx('channel_categories')
                    .where('id', id)
                    .where('server_id', serverId)
                    .update({ position, updated_at: new Date() });
            }
        });
        return this.getServerCategories(serverId);
    }
}
export const categoryService = new CategoryService();
//# sourceMappingURL=category.service.js.map