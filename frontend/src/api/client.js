import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
} from "../utils/tokenStorage";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

let sessionExpiredHandler = null;

// Registered by AuthContext so the interceptor can hand control back to React
// state/routing instead of forcing a hard page reload.
export function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
}

const AUTH_ENDPOINTS = ["/login", "/register", "/refresh"];

let pendingRefresh = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post(
    `${API_BASE_URL}/refresh`,
    null,
    { params: { refresh_token: refreshToken } }
  );

  setAccessToken(response.data.access_token);
  return response.data.access_token;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    if (!response || !config) {
      return Promise.reject(error);
    }

    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => config.url?.startsWith(path));

    if (response.status === 401 && !config._retried && !isAuthEndpoint) {
      config._retried = true;

      try {
        if (!pendingRefresh) {
          pendingRefresh = refreshAccessToken().finally(() => {
            pendingRefresh = null;
          });
        }

        const newAccessToken = await pendingRefresh;
        config.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(config);
      } catch (refreshError) {
        clearTokens();
        sessionExpiredHandler?.();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
