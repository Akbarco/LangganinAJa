import { API_URL } from "@/constants";
import { useAuthStore } from "@/store/authStore";
import { ApiResponse } from "@/types";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions {
  method?: HttpMethod;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Fetch wrapper that auto-attaches the auth token
 * and handles JSON parsing + error extraction.
 */
export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {} } = options;

  // Get token from store
  const token = useAuthStore.getState().token;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, config);
  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// Convenience methods
export const apiGet = <T>(endpoint: string) => api<T>(endpoint, { method: "GET" });

export const apiPost = <T>(endpoint: string, body: Record<string, unknown>) =>
  api<T>(endpoint, { method: "POST", body });

export const apiPut = <T>(endpoint: string, body: Record<string, unknown>) =>
  api<T>(endpoint, { method: "PUT", body });

export const apiDelete = <T>(endpoint: string) =>
  api<T>(endpoint, { method: "DELETE" });
