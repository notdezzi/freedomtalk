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
declare class CategoryService {
    createCategory(input: CreateCategoryInput): Promise<CategoryData>;
    getCategory(categoryId: string): Promise<CategoryData | null>;
    getServerCategories(serverId: string): Promise<CategoryData[]>;
    updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<CategoryData>;
    deleteCategory(categoryId: string): Promise<void>;
    updateCategoryPositions(serverId: string, positions: {
        id: string;
        position: number;
    }[]): Promise<CategoryData[]>;
}
export declare const categoryService: CategoryService;
export {};
//# sourceMappingURL=category.service.d.ts.map