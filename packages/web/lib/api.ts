import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Helper to safely access localStorage
function getStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
}

function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

class ApiClient {
  private client: AxiosInstance;

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

  // Store tokens after login
  setTokens(accessToken: string, refreshToken: string) {
    setStorageItem(ACCESS_TOKEN_KEY, accessToken);
    setStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  // Get stored access token
  private getAccessToken(): string | null {
    return getStorageItem(ACCESS_TOKEN_KEY);
  }

  // Get stored refresh token
  private getRefreshToken(): string | null {
    return getStorageItem(REFRESH_TOKEN_KEY);
  }

  // Update access token after refresh
  private updateAccessToken(token: string) {
    setStorageItem(ACCESS_TOKEN_KEY, token);
  }

  // Clear tokens on logout
  clearTokens() {
    removeStorageItem(ACCESS_TOKEN_KEY);
    removeStorageItem(REFRESH_TOKEN_KEY);
  }

  // Check if user has tokens (for initial auth check)
  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  }

  private setupInterceptors() {
    // Request interceptor - add auth header
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown>>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const storedRefreshToken = this.getRefreshToken();
          if (storedRefreshToken) {
            try {
              const response = await this.client.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
                "/auth/refresh",
                { refresh_token: storedRefreshToken }
              );

              // Update stored tokens
              if (response.data.data?.accessToken) {
                this.updateAccessToken(response.data.data.accessToken);
                if (response.data.data.refreshToken) {
                  setStorageItem(REFRESH_TOKEN_KEY, response.data.data.refreshToken);
                }
              }

              // Retry original request with new token
              return this.client(originalRequest);
            } catch {
              // Refresh failed - clear tokens and redirect to login
              this.clearTokens();
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
            }
          } else {
            // No refresh token - redirect to login
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
          }
        }

        // Extract error message
        const errorMessage = error.response?.data?.error?.message ||
          error.message ||
          "An unexpected error occurred";

        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  // HTTP methods
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data.data as T;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data.data as T;
  }

  // File upload
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
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

    return response.data.data as T;
  }
}

export const api = new ApiClient();
export default api;
