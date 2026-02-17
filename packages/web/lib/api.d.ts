declare class ApiClient {
    private client;
    constructor();
    setTokens(accessToken: string, refreshToken: string): void;
    private getAccessToken;
    private getRefreshToken;
    private updateAccessToken;
    clearTokens(): void;
    hasTokens(): boolean;
    private setupInterceptors;
    get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
    post<T>(url: string, data?: unknown): Promise<T>;
    put<T>(url: string, data?: unknown): Promise<T>;
    patch<T>(url: string, data?: unknown): Promise<T>;
    delete<T>(url: string): Promise<T>;
    upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T>;
}
export declare const api: ApiClient;
export default api;
//# sourceMappingURL=api.d.ts.map