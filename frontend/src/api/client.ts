export interface Movie {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisites: Array<{
    id: string;
    title: string;
    releaseYear: number;
    runtimeMinutes: number;
    watched: boolean;
  }>;
}

export interface RewatchMovieSummary {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
}

export interface RewatchOrderResponse {
  targetMovie: {
    id: string;
    title: string;
    releaseYear: number;
    runtimeMinutes: number;
    watched: boolean;
  };
  orderedMovies: RewatchMovieSummary[];
  totalMovies: number;
  watchedCount: number;
  unwatchedCount: number;
  totalUnwatchedRuntimeMinutes: number;
}

export interface Cinema {
  id: string;
  name: string;
  bundleSizes: number[];
}

export interface BundleAllocation {
  size: number;
  count: number;
}

export interface BookingQuoteResponse {
  cinema: Cinema;
  possible: boolean;
  groupSize: number;
  totalBundles?: number;
  breakdown?: BundleAllocation[];
  message?: string;
}

// Base URL configured for cloud deployment (Vercel -> Render) while defaulting to relative /api for local dev & Docker Compose
const rawBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const API_BASE = rawBase
  ? rawBase.endsWith('/api')
    ? rawBase
    : `${rawBase}/api`
  : '/api';

export async function fetchMovies(): Promise<Movie[]> {
  const res = await fetch(`${API_BASE}/movies`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch movies');
  }
  return res.json();
}

export async function createMovie(payload: {
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched?: boolean;
  prerequisiteIds?: string[];
}): Promise<Movie> {
  const res = await fetch(`${API_BASE}/movies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || 'Failed to create movie') as any;
    error.code = data.error;
    error.details = data.details;
    throw error;
  }

  return data;
}

export async function updateMovie(
  id: string,
  payload: {
    title?: string;
    releaseYear?: number;
    runtimeMinutes?: number;
    watched?: boolean;
    prerequisiteIds?: string[];
  }
): Promise<Movie> {
  const res = await fetch(`${API_BASE}/movies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || 'Failed to update movie') as any;
    error.code = data.error;
    error.details = data.details;
    throw error;
  }

  return data;
}

export async function fetchRewatchOrder(targetMovieId: string): Promise<RewatchOrderResponse> {
  const res = await fetch(`${API_BASE}/movies/${targetMovieId}/rewatch-order`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to calculate rewatch order');
  }
  return res.json();
}

export async function fetchCinemas(): Promise<Cinema[]> {
  const res = await fetch(`${API_BASE}/cinemas`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch cinemas');
  }
  return res.json();
}

export async function createCinema(payload: {
  name: string;
  bundleSizes: number[];
}): Promise<Cinema> {
  const res = await fetch(`${API_BASE}/cinemas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || 'Failed to create cinema') as any;
    error.code = data.error;
    error.details = data.details;
    throw error;
  }

  return data;
}

export async function fetchBookingQuote(cinemaId: string, groupSize: number): Promise<BookingQuoteResponse> {
  const res = await fetch(`${API_BASE}/cinemas/${cinemaId}/booking?groupSize=${groupSize}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to compute booking quote');
  }

  return data;
}
