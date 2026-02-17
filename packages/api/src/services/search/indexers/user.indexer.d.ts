export declare class UserIndexer {
    indexUser(user: {
        id: string;
        username: string;
        displayName?: string | null;
        avatarUrl?: string | null;
    }): Promise<void>;
    updateUser(user: {
        id: string;
        username: string;
        displayName?: string | null;
        avatarUrl?: string | null;
    }): Promise<void>;
    removeFromIndex(userId: string): Promise<void>;
    bulkIndex(users: Array<{
        id: string;
        username: string;
        displayName?: string | null;
        avatarUrl?: string | null;
    }>): Promise<number>;
}
export declare const userIndexer: UserIndexer;
//# sourceMappingURL=user.indexer.d.ts.map