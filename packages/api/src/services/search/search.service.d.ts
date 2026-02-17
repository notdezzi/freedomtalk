import type { SearchResponse } from 'meilisearch';
export interface MessageSearchOptions {
    channelId?: string;
    serverId?: string;
    authorId?: string;
    limit?: number;
    offset?: number;
}
export interface UserSearchOptions {
    limit?: number;
    offset?: number;
}
export interface ServerSearchOptions {
    category?: string;
    minMembers?: number;
    limit?: number;
    offset?: number;
}
export interface MessageSearchResult {
    id: string;
    content: string;
    author_id: string;
    channel_id: string | null;
    server_id: string | null;
    created_at: string;
}
export interface UserSearchResult {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
}
export interface ServerSearchResult {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    member_count: number;
    category: string | null;
}
export interface AutocompleteResult {
    id: string;
    text: string;
    type: 'message' | 'user' | 'server';
}
export declare class SearchService {
    searchMessages(query: string, options?: MessageSearchOptions): Promise<SearchResponse<MessageSearchResult>>;
    searchUsers(query: string, options?: UserSearchOptions): Promise<SearchResponse<UserSearchResult>>;
    searchServers(query: string, options?: ServerSearchOptions): Promise<SearchResponse<ServerSearchResult>>;
    autocomplete(type: 'messages' | 'users' | 'servers', prefix: string, limit?: number): Promise<AutocompleteResult[]>;
    private logSearch;
    getPopularQueries(searchType?: 'message' | 'user' | 'server', limit?: number): Promise<{
        query: string;
        count: number;
    }[]>;
    syncMessagesIndex(): Promise<number>;
    syncUsersIndex(): Promise<number>;
    syncServersIndex(): Promise<number>;
}
export declare const searchService: SearchService;
//# sourceMappingURL=search.service.d.ts.map