import axios from "axios";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
function getStorageItem(key) {
    if (typeof window === "undefined")
        return null;
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function setStorageItem(key, value) {
    if (typeof window === "undefined")
        return;
    try {
        localStorage.setItem(key, value);
    }
    catch {
    }
}
function removeStorageItem(key) {
    if (typeof window === "undefined")
        return;
    try {
        localStorage.removeItem(key);
    }
    catch {
    }
}
class ApiClient {
    client;
    constructor() {
        this.client = axios.create({
            baseURL: `${API_BASE_URL}/api/v1`,
            withCredentials: true,
            headers: {
                "Content-Type": "application/json",
            },
        });
        this.setupInterceptors();
    }
    setTokens(accessToken, refreshToken) {
        setStorageItem(ACCESS_TOKEN_KEY, accessToken);
        setStorageItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    getAccessToken() {
        return getStorageItem(ACCESS_TOKEN_KEY);
    }
    getRefreshToken() {
        return getStorageItem(REFRESH_TOKEN_KEY);
    }
    updateAccessToken(token) {
        setStorageItem(ACCESS_TOKEN_KEY, token);
    }
    clearTokens() {
        removeStorageItem(ACCESS_TOKEN_KEY);
        removeStorageItem(REFRESH_TOKEN_KEY);
    }
    hasTokens() {
        return !!this.getAccessToken() && !!this.getRefreshToken();
    }
    setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            const token = this.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => response, async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                const storedRefreshToken = this.getRefreshToken();
                if (storedRefreshToken) {
                    try {
                        const response = await this.client.post("/auth/refresh", { refresh_token: storedRefreshToken });
                        if (response.data.data?.accessToken) {
                            this.updateAccessToken(response.data.data.accessToken);
                            if (response.data.data.refreshToken) {
                                setStorageItem(REFRESH_TOKEN_KEY, response.data.data.refreshToken);
                            }
                        }
                        return this.client(originalRequest);
                    }
                    catch {
                        this.clearTokens();
                        if (typeof window !== "undefined") {
                            window.location.href = "/login";
                        }
                    }
                }
                else {
                    if (typeof window !== "undefined") {
                        window.location.href = "/login";
                    }
                }
            }
            const errorMessage = error.response?.data?.error?.message ||
                error.message ||
                "An unexpected error occurred";
            return Promise.reject(new Error(errorMessage));
        });
    }
    async get(url, params) {
        const response = await this.client.get(url, { params });
        return response.data.data;
    }
    async post(url, data) {
        const response = await this.client.post(url, data);
        return response.data.data;
    }
    async put(url, data) {
        const response = await this.client.put(url, data);
        return response.data.data;
    }
    async patch(url, data) {
        const response = await this.client.patch(url, data);
        return response.data.data;
    }
    async delete(url) {
        const response = await this.client.delete(url);
        return response.data.data;
    }
    async upload(url, file, onProgress) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await this.client.post(url, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });
        return response.data.data;
    }
}
export const api = new ApiClient();
export default api;
//# sourceMappingURL=api.js.map