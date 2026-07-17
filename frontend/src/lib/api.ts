import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { auth } from './firebase';

// Create a configured Axios instance pointing to the Edge Gateway API root
const api = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to track token refresh status
let isRefreshing = false;

// Queue to hold requests failed with 401 while refreshing the token
type FailedRequest = {
  resolve: (token: string) => void;
  reject: (error: any) => void;
};
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

/**
 * Request Interceptor: Proactively attach Firebase ID Token to outgoing requests.
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Pass false to get cached token if valid, or auto-refresh if expired
        const token = await currentUser.getIdToken(false);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error('[Request Interceptor] Error obtaining Firebase token proactively:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Handle silent recovery for 401 status.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Catch 401 errors
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // If token refresh is already in progress, queue the request until refresh finishes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark request as retryable to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing = true;

      const currentUser = auth.currentUser;
      if (!currentUser) {
        // No user authenticated locally, route to login page
        isRefreshing = false;
        handleLogoutRedirect();
        return Promise.reject(error);
      }

      return new Promise((resolve, reject) => {
        // Force an immediate token refresh bypassing cache
        currentUser.getIdToken(true)
          .then((token) => {
            // Update default headers and original request headers
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            
            // Resolve queued requests with the fresh token
            processQueue(null, token);
            
            // Re-execute original request
            resolve(api(originalRequest));
          })
          .catch((err) => {
            // Reject queued requests
            processQueue(err, null);
            
            // On refresh failure (e.g. revoked session), log out user
            handleLogoutRedirect();
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Helper to handle session expiration fallback
 */
function handleLogoutRedirect() {
  console.warn('[API Auth Engine] Session expired or refresh token revoked. Cleaning state and redirecting to login...');
  try {
    auth.signOut();
    // Redirect to login page
    window.location.href = '/login';
  } catch (err) {
    console.error('[API Auth Engine] Error during logout redirect:', err);
  }
}

export default api;
