import catalogData from '../data/catalog.json';

const TOKEN_KEY = 'dramakhana_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

function resolveFallback<T>(path: string): T {
  const url = new URL(path, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/api/home') {
    return catalogData.home as unknown as T;
  }

  if (pathname.startsWith('/api/dramas/')) {
    const slug = decodeURIComponent(pathname.replace('/api/dramas/', ''));
    const drama = catalogData.dramas.find((d: any) => d.slug === slug || d._id === slug) || catalogData.dramas[0];
    const episodes = catalogData.videos
      .filter((v: any) => v.dramaId === drama._id)
      .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);
    const relatedDramas = catalogData.dramas.filter((d: any) => d._id !== drama._id).slice(0, 6);
    return { drama, episodes, relatedDramas } as unknown as T;
  }

  if (pathname === '/api/dramas') {
    return { dramas: catalogData.dramas, total: catalogData.dramas.length } as unknown as T;
  }

  if (pathname.startsWith('/api/videos/')) {
    const videoId = decodeURIComponent(pathname.replace('/api/videos/', ''));
    const video = catalogData.videos.find((v: any) => v._id === videoId || v.youtubeVideoId === videoId) || catalogData.videos[0];
    const drama = catalogData.dramas.find((d: any) => d._id === video.dramaId) || catalogData.dramas[0];
    const episodes = catalogData.videos
      .filter((v: any) => v.dramaId === drama._id)
      .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);
    const relatedDramas = catalogData.dramas.filter((d: any) => d._id !== drama._id).slice(0, 6);
    return { video, drama, episodes, relatedDramas } as unknown as T;
  }

  if (pathname === '/api/videos') {
    return {
      videos: catalogData.videos,
      total: catalogData.videos.length,
      page: 1,
      totalPages: 1,
    } as unknown as T;
  }

  if (pathname.startsWith('/api/categories')) {
    return { categories: catalogData.categories } as unknown as T;
  }

  if (pathname.startsWith('/api/channels')) {
    return { channels: catalogData.channels } as unknown as T;
  }

  if (pathname.startsWith('/api/search')) {
    const q = url.searchParams.get('q')?.toLowerCase() || '';
    const dramas = catalogData.dramas.filter(
      (d: any) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.actors.some((a: string) => a.toLowerCase().includes(q))
    );
    const videos = catalogData.videos.filter(
      (v: any) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    );
    return { dramas, videos } as unknown as T;
  }

  if (pathname.startsWith('/api/watchlist')) {
    return { watchlist: [] } as unknown as T;
  }

  if (pathname.startsWith('/api/auth/me')) {
    return { user: { username: 'jasmin', name: 'Jasmin', role: 'admin' } } as unknown as T;
  }

  return {} as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(path, { ...init, headers });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
  } catch {
    // network or host offline -> graceful client fallback
  }

  return resolveFallback<T>(path);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  uploadFiles: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${Math.round(views / 1_000)}K views`;
  return `${views} views`;
}
