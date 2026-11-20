import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { Readable, Duplex } from 'stream';
import { app } from '../src/app.js';

// Mock Prisma client
vi.mock('../src/lib/prisma.js', () => {
  return {
    prisma: {
      movie: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      cinema: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

import { prisma } from '../src/lib/prisma.js';

/**
 * In-memory HTTP request simulator that bypasses TCP socket binding (sandbox friendly).
 */
function simulateRequest(
  method: string,
  url: string,
  body?: any
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const jsonStr = body !== undefined ? JSON.stringify(body) : undefined;
    const req = new Readable({
      read() {
        if (jsonStr) {
          this.push(Buffer.from(jsonStr));
        }
        this.push(null);
      },
    }) as any;

    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': jsonStr ? Buffer.byteLength(jsonStr).toString() : '0',
    };
    const socket = new Duplex({
      read() {},
      write(_chunk, _encoding, callback) {
        callback();
      },
    }) as any;
    socket.remoteAddress = '127.0.0.1';
    req.socket = socket;

    let resBody = '';
    const headers: Record<string, string> = {};

    const res = new EventEmitter() as any;
    res.statusCode = 200;
    res.setHeader = (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    };
    res.getHeader = (name: string) => headers[name.toLowerCase()];

    res.write = (chunk: any) => {
      if (chunk) resBody += chunk.toString();
      return true;
    };

    res.end = (chunk?: any) => {
      if (chunk) resBody += chunk.toString();
      let parsed = resBody;
      try {
        parsed = JSON.parse(resBody);
      } catch {
        // Not JSON
      }
      resolve({ status: res.statusCode, body: parsed, headers });
    };

    try {
      app.handle(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

describe('API Endpoints In-Memory Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns 200 with service health status', async () => {
      const res = await simulateRequest('GET', '/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('doomsday-ready-backend');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/movies', () => {
    it('creates a movie successfully (201)', async () => {
      vi.mocked(prisma.movie.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.movie.create).mockResolvedValue({
        id: 'uuid-1',
        title: 'Iron Man',
        releaseYear: 2008,
        runtimeMinutes: 126,
        watched: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        prerequisites: [],
      } as any);

      const res = await simulateRequest('POST', '/api/movies', {
        title: 'Iron Man',
        releaseYear: 2008,
        runtimeMinutes: 126,
      });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Iron Man');
      expect(res.body.runtimeMinutes).toBe(126);
    });

    it('rejects duplicate movie title with 409', async () => {
      vi.mocked(prisma.movie.findUnique).mockResolvedValue({
        id: 'uuid-1',
        title: 'Iron Man',
      } as any);

      const res = await simulateRequest('POST', '/api/movies', {
        title: 'Iron Man',
        releaseYear: 2008,
        runtimeMinutes: 126,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('DUPLICATE_RESOURCE');
    });

    it('rejects invalid runtime with 400', async () => {
      const res = await simulateRequest('POST', '/api/movies', {
        title: 'Invalid Movie',
        releaseYear: 2024,
        runtimeMinutes: 350, // exceeds 300
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/movies/:id - Cycle Detection', () => {
    it('rejects circular dependencies with 409 CIRCULAR_DEPENDENCY', async () => {
      vi.mocked(prisma.movie.findUnique).mockResolvedValue({
        id: 'm1',
        title: 'Iron Man',
      } as any);

      vi.mocked(prisma.movie.findMany).mockResolvedValue([
        { id: 'm1', title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126, watched: false, prerequisites: [] },
        { id: 'm3', title: 'Avengers', releaseYear: 2012, runtimeMinutes: 143, watched: false, prerequisites: [{ id: 'm1' }] },
        { id: 'm7', title: 'Endgame', releaseYear: 2019, runtimeMinutes: 181, watched: false, prerequisites: [{ id: 'm3' }] },
      ] as any);

      const res = await simulateRequest('PATCH', '/api/movies/m1', {
        prerequisiteIds: ['m7'],
      });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: 'CIRCULAR_DEPENDENCY',
        message: 'A movie cannot depend on itself directly or indirectly.',
      });
    });

    it('allows valid prerequisite updates (200)', async () => {
      vi.mocked(prisma.movie.findUnique).mockResolvedValue({
        id: 'm3',
        title: 'The Avengers',
      } as any);

      vi.mocked(prisma.movie.findMany).mockResolvedValue([
        { id: 'm1', title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126, watched: false, prerequisites: [] },
        { id: 'm3', title: 'The Avengers', releaseYear: 2012, runtimeMinutes: 143, watched: false, prerequisites: [] },
      ] as any);

      vi.mocked(prisma.movie.update).mockResolvedValue({
        id: 'm3',
        title: 'The Avengers',
        releaseYear: 2012,
        runtimeMinutes: 143,
        watched: false,
        prerequisites: [{ id: 'm1', title: 'Iron Man' }],
      } as any);

      const res = await simulateRequest('PATCH', '/api/movies/m3', {
        prerequisiteIds: ['m1'],
      });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('m3');
    });
  });

  describe('GET /api/movies/:id/rewatch-order', () => {
    it('computes topological rewatch order for target movie', async () => {
      vi.mocked(prisma.movie.findUnique).mockResolvedValue({
        id: 'm3',
        title: 'The Avengers',
        releaseYear: 2012,
        runtimeMinutes: 143,
        watched: false,
      } as any);

      vi.mocked(prisma.movie.findMany).mockResolvedValue([
        { id: 'm1', title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126, watched: true, prerequisites: [] },
        { id: 'm2', title: 'Captain America', releaseYear: 2011, runtimeMinutes: 124, watched: false, prerequisites: [] },
        { id: 'm3', title: 'The Avengers', releaseYear: 2012, runtimeMinutes: 143, watched: false, prerequisites: [{ id: 'm1' }, { id: 'm2' }] },
      ] as any);

      const res = await simulateRequest('GET', '/api/movies/m3/rewatch-order');

      expect(res.status).toBe(200);
      expect(res.body.targetMovie.title).toBe('The Avengers');
      expect(res.body.totalMovies).toBe(2);
      expect(res.body.watchedCount).toBe(1);
      expect(res.body.unwatchedCount).toBe(1);
      expect(res.body.totalUnwatchedRuntimeMinutes).toBe(124);
      expect(res.body.orderedMovies.map((m: any) => m.title)).toEqual([
        'Iron Man',
        'Captain America',
      ]);
    });
  });

  describe('Cinemas & Booking Quote Endpoints', () => {
    it('creates cinema with valid bundle sizes (201)', async () => {
      vi.mocked(prisma.cinema.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cinema.create).mockResolvedValue({
        id: 'c1',
        name: 'Stark IMAX',
        bundleSizes: [1, 3, 4],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await simulateRequest('POST', '/api/cinemas', {
        name: 'Stark IMAX',
        bundleSizes: [1, 3, 4],
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Stark IMAX');
      expect(res.body.bundleSizes).toEqual([1, 3, 4]);
    });

    it('rejects duplicate cinema name with 409', async () => {
      vi.mocked(prisma.cinema.findUnique).mockResolvedValue({ id: 'c1', name: 'Stark IMAX' } as any);

      const res = await simulateRequest('POST', '/api/cinemas', {
        name: 'Stark IMAX',
        bundleSizes: [2, 5],
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('DUPLICATE_RESOURCE');
    });

    it('rejects duplicate values in bundleSizes with 400', async () => {
      const res = await simulateRequest('POST', '/api/cinemas', {
        name: 'Invalid Cinema',
        bundleSizes: [2, 2, 5],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('computes booking quote: [1, 3, 4] for 6 seats returns 2 bundles (3 x 2)', async () => {
      vi.mocked(prisma.cinema.findUnique).mockResolvedValue({
        id: 'c1',
        name: 'Stark IMAX',
        bundleSizes: [1, 3, 4],
      } as any);

      const res = await simulateRequest('GET', '/api/cinemas/c1/booking?groupSize=6');

      expect(res.status).toBe(200);
      expect(res.body.possible).toBe(true);
      expect(res.body.totalBundles).toBe(2);
      expect(res.body.breakdown).toEqual([{ size: 3, count: 2 }]);
    });

    it('returns "Not possible" when no exact seat combination exists', async () => {
      vi.mocked(prisma.cinema.findUnique).mockResolvedValue({
        id: 'c2',
        name: 'Wakanda Cinema',
        bundleSizes: [4, 6],
      } as any);

      const res = await simulateRequest('GET', '/api/cinemas/c2/booking?groupSize=7');

      expect(res.status).toBe(200);
      expect(res.body.possible).toBe(false);
      expect(res.body.message).toBe('Not possible');
    });
  });
});
