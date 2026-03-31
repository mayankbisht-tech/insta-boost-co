const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

type ApiOptions = RequestInit & {
  body?: unknown;
};

const buildHeaders = (headers?: HeadersInit, hasJsonBody?: boolean) => {
  const resolved = new Headers(headers);

  if (hasJsonBody && !resolved.has('Content-Type')) {
    resolved.set('Content-Type', 'application/json');
  }

  return resolved;
};

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    credentials: 'include',
    headers: buildHeaders(options.headers, hasJsonBody),
    body: hasJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | null | undefined),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || 'Request failed.');
  }

  return data as T;
};

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
