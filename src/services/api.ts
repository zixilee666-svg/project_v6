import type { ApiResponse } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface RequestConfig {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

// Get token from authStore
async function getToken(): Promise<string | null> {
  try {
    return JSON.parse(localStorage.getItem('joan_auth_token') || 'null');
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = config;
  const token = await getToken();

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Token expired, clear auth
    localStorage.removeItem('joan_auth_token');
    localStorage.removeItem('joan_academic_user');
    window.location.hash = '#/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  return data;
}

// Export convenience methods
export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: any) => request<T>(url, { method: 'POST', body }),
  put: <T>(url: string, body?: any) => request<T>(url, { method: 'PUT', body }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export { API_BASE, getToken };
