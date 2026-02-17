/**
 * Category Service
 * Handles channel category management
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION } from '@freedomtalk/shared';

export interface CategoryData {
  id: string;
  server_id: string;
  name: string;
  position: number;
  nsfw: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryInput {
  serverId: string;
  name: string;
  position?: number;
  nsfw?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  position?: number;
  nsfw?: boolean;
}

class CategoryService {
  /**
   * Create a new category
   */
  async createCategory(input: CreateCategoryInput): Promise<CategoryData> {
    // Verify server exists
    const server = await db('servers').where('id', input.serverId).first();
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    // Validate name
    if (input.name.length < VALIDATION.CATEGORY_NAME.MIN_LENGTH ||
        input.name.length > VALIDATION.CATEGORY_NAME.MAX_LENGTH) {
      throw new AppError(400, 'INVALID_NAME',
        `Category name must be between ${VALIDATION.CATEGORY_NAME.MIN_LENGTH} and ${VALIDATION.CATEGORY_NAME.MAX_LENGTH} characters`);
    }

    // Get next position
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

  /**
   * Get category by ID
   */
  async getCategory(categoryId: string): Promise<CategoryData | null> {
    const category = await db('channel_categories').where('id', categoryId).first();
    return category || null;
  }

  /**
   * Get all categories for a server
   */
  async getServerCategories(serverId: string): Promise<CategoryData[]> {
    const categories = await db('channel_categories')
      .where('server_id', serverId)
      .orderBy('position', 'asc');

    return categories;
  }

  /**
   * Update a category
   */
  async updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<CategoryData> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) {
      if (input.name.length < VALIDATION.CATEGORY_NAME.MIN_LENGTH ||
          input.name.length > VALIDATION.CATEGORY_NAME.MAX_LENGTH) {
        throw new AppError(400, 'INVALID_NAME',
          `Category name must be between ${VALIDATION.CATEGORY_NAME.MIN_LENGTH} and ${VALIDATION.CATEGORY_NAME.MAX_LENGTH} characters`);
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

  /**
   * Delete a category
   * Channels in the category will have their category_id set to null
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    await db.transaction(async (trx) => {
      // Remove category reference from channels
      await trx('channels')
        .where('category_id', categoryId)
        .update({ category_id: null, updated_at: new Date() });

      // Delete category
      await trx('channel_categories').where('id', categoryId).delete();
    });
  }

  /**
   * Update category positions
   */
  async updateCategoryPositions(
    serverId: string,
    positions: { id: string; position: number }[]
  ): Promise<CategoryData[]> {
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
