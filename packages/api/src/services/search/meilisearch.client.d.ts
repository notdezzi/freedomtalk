import { MeiliSearch } from 'meilisearch';
export declare function getMeilisearchClient(): MeiliSearch;
export declare function initializeMeilisearchIndices(): Promise<void>;
export declare function closeMeilisearch(): void;
export declare const INDICES: {
    readonly MESSAGES: "messages";
    readonly USERS: "users";
    readonly SERVERS: "servers";
};
export type { MeiliSearch };
//# sourceMappingURL=meilisearch.client.d.ts.map