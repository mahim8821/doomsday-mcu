/**
 * Movie poster asset registry, CDN links, local storage overrides,
 * and deterministic procedural fallback generators.
 */

export interface MoviePosterMeta {
  localPath: string;
  cdnUrl: string;
  accentColor: string;
  secondaryColor: string;
}

// Canonical 8 MCU movies mapping
export const CANONICAL_POSTERS: Record<string, MoviePosterMeta> = {
  'iron man': {
    localPath: '/posters/iron-man.svg',
    cdnUrl: 'https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
    accentColor: '#e11d48',
    secondaryColor: '#ca8a04',
  },
  'captain america: the first avenger': {
    localPath: '/posters/captain-america.svg',
    cdnUrl: 'https://image.tmdb.org/t/p/w500/vSNxAJTlD0r02V9sPYpqjqDbe4v.jpg',
    accentColor: '#38bdf8',
    secondaryColor: '#dc2626',
  },
  'the avengers': {
    localPath: '/posters/the-avengers.svg',
    cdnUrl: 'https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
    accentColor: '#f59e0b',
    secondaryColor: '#38bdf8',
  },
  'captain america: civil war': {
    localPath: '/posters/civil-war.svg',
    cdnUrl: 'https://image.tmdb.org/t/p/w500/rAG2NTityOX09Q09nEZt7pQe58Q.jpg',
    accentColor: '#ef4444',
    secondaryColor: '#3b82f6',
  },
  'thor: ragnarok': {
    localPath: '/posters/thor-ragnarok.svg',
    cdnUrl: 'https://image.tmdb.org/t/p/w500/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg',
    accentColor: '#2dd4bf',
    secondaryColor: '#f43f5e',
  },
  'avengers: infinity war': {
    localPath: '/posters/infinity-war.svg',
    cdnUrl: 'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
    accentColor: '#a855f7',
    secondaryColor: '#facc15',
  },
  'avengers: endgame': {
    localPath: '/posters/endgame.svg',
    cdnUrl: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    accentColor: '#38bdf8',
    secondaryColor: '#f59e0b',
  },
  'avengers: doomsday': {
    localPath: '/posters/doomsday.jpg',
    cdnUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYaT6IHyHfx89hyFLymUyZRrgbvUOur2LlhsPLN7IxjA&s=10',
    accentColor: '#10b981',
    secondaryColor: '#059669',
  },
};

const LOCAL_STORAGE_KEY = 'doomsday_movie_posters_v1';

/**
 * Returns user-specified custom poster URL from localStorage if present
 */
export function getCustomPoster(movieId: string): string | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[movieId] || null;
  } catch {
    return null;
  }
}

/**
 * Persists user-specified custom poster URL to localStorage
 */
export function setCustomPoster(movieId: string, url: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[movieId] = url;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save custom poster to localStorage', err);
  }
}

/**
 * Normalizes title for lookup
 */
export function normalizeMovieTitle(title: string): string {
  return title.trim().toLowerCase();
}

/**
 * Looks up canonical poster metadata by movie title
 */
export function getCanonicalPoster(title: string): MoviePosterMeta | null {
  const normalized = normalizeMovieTitle(title);
  if (CANONICAL_POSTERS[normalized]) {
    return CANONICAL_POSTERS[normalized];
  }

  // Substring match fallback (e.g. "Doomsday" -> "avengers: doomsday")
  for (const [key, meta] of Object.entries(CANONICAL_POSTERS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return meta;
    }
  }

  return null;
}

/**
 * Generates a deterministic high-contrast gradient palette from any string title
 */
export function getDeterministicGradient(title: string): {
  from: string;
  to: string;
  accent: string;
} {
  const palettes = [
    { from: '#1e1b4b', to: '#090d16', accent: '#818cf8' }, // Indigo / Obsidian
    { from: '#022c22', to: '#061a14', accent: '#34d399' }, // Emerald / Dark Forest
    { from: '#3b0764', to: '#0f051d', accent: '#c084fc' }, // Cosmic Purple
    { from: '#450a0a', to: '#130404', accent: '#f87171' }, // Crimson Blood
    { from: '#0c4a6e', to: '#021827', accent: '#38bdf8' }, // Deep Cyan
    { from: '#422006', to: '#140b02', accent: '#f59e0b' }, // Gold / Bronze
    { from: '#134e4a', to: '#041716', accent: '#2dd4bf' }, // Teal
    { from: '#172554', to: '#040b1e', accent: '#60a5fa' }, // Blue
  ];

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}
