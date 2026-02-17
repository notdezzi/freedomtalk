export declare class ServerIndexer {
    indexServer(server: {
        id: string;
        name: string;
        description?: string | null;
        iconUrl?: string | null;
        memberCount: number;
        category?: string | null;
        isDiscoverable: boolean;
    }): Promise<void>;
    updateServer(server: {
        id: string;
        name: string;
        description?: string | null;
        iconUrl?: string | null;
        memberCount: number;
        category?: string | null;
        isDiscoverable: boolean;
    }): Promise<void>;
    updateMemberCount(serverId: string, memberCount: number): Promise<void>;
    removeFromIndex(serverId: string): Promise<void>;
    bulkIndex(servers: Array<{
        id: string;
        name: string;
        description?: string | null;
        iconUrl?: string | null;
        memberCount: number;
        category?: string | null;
        isDiscoverable: boolean;
    }>): Promise<number>;
}
export declare const serverIndexer: ServerIndexer;
//# sourceMappingURL=server.indexer.d.ts.map