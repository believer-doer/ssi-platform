type ApiCallOptions = {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  jwt?: string;
  tenantId?: string;
  driver?: string;
};

function resolvePath(path: string, { params, driver }: Pick<ApiCallOptions, 'params' | 'driver'> = {}) {
  let resolvedPath = path;
  const remainingParams: Record<string, string> = {};

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) {
      remainingParams[key] = String(value);
    }
  }

  const placeholders = resolvedPath.match(/{[^}]+}/g) || [];
  for (const placeholder of placeholders) {
    const key = placeholder.slice(1, -1);
    if (key === 'driver' && driver) {
      resolvedPath = resolvedPath.replace(placeholder, encodeURIComponent(driver));
      continue;
    }

    if (remainingParams[key] !== undefined) {
      resolvedPath = resolvedPath.replace(placeholder, encodeURIComponent(remainingParams[key]));
      delete remainingParams[key];
    }
  }

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(remainingParams)) {
    qs.set(key, value);
  }

  return {
    resolvedPath,
    queryString: qs.toString(),
  };
}

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:4000/v1'
  ).replace(/\/$/, '');
}

async function parseApiResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.error_description || payload?.message || payload?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return payload;
}

async function serverSideApiFetch(resolvedPath: string, method: string, { body, jwt, tenantId }: ApiCallOptions) {
  const url = `${getBackendBaseUrl()}${resolvedPath}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  return parseApiResponse(res);
}

async function clientSideApiFetch(resolvedPath: string, method: string, { body }: ApiCallOptions) {
  const res = await fetch(`/api/backend${resolvedPath}`, {
    method: method.toUpperCase(),
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
    cache: 'no-store',
  });

  return parseApiResponse(res);
}

export async function apiFetch<T = unknown>(
  path: string,
  method: string,
  opts: ApiCallOptions = {}
): Promise<T> {
  const { resolvedPath, queryString } = resolvePath(path, opts);
  const pathWithQuery = queryString ? `${resolvedPath}?${queryString}` : resolvedPath;

  if (typeof window === 'undefined') {
    return serverSideApiFetch(pathWithQuery, method, opts) as Promise<T>;
  }

  return clientSideApiFetch(pathWithQuery, method, opts) as Promise<T>;
}

export async function apiGet<T = unknown>(
  path: string,
  opts: Omit<ApiCallOptions, 'body'> = {}
) {
  return apiFetch<T>(path, 'get', opts);
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  opts: Omit<ApiCallOptions, 'body'> = {}
) {
  return apiFetch<T>(path, 'post', { ...opts, body });
}
