import { describe, it, expect } from 'vitest';
import { detectCycle, calculateRewatchOrder, MovieNode } from './rewatch.js';

describe('Movie Rewatch Algorithms', () => {
  // Assessment canonical MCU sample dataset
  const mcuCatalog: MovieNode[] = [
    {
      id: 'm1',
      title: 'Iron Man',
      releaseYear: 2008,
      runtimeMinutes: 126,
      watched: true,
      prerequisiteIds: [],
    },
    {
      id: 'm2',
      title: 'Captain America: The First Avenger',
      releaseYear: 2011,
      runtimeMinutes: 124,
      watched: true,
      prerequisiteIds: [],
    },
    {
      id: 'm3',
      title: 'The Avengers',
      releaseYear: 2012,
      runtimeMinutes: 143,
      watched: true,
      prerequisiteIds: ['m1', 'm2'],
    },
    {
      id: 'm4',
      title: 'Captain America: Civil War',
      releaseYear: 2016,
      runtimeMinutes: 147,
      watched: false,
      prerequisiteIds: ['m3'],
    },
    {
      id: 'm5',
      title: 'Thor: Ragnarok',
      releaseYear: 2017,
      runtimeMinutes: 130,
      watched: false,
      prerequisiteIds: [],
    },
    {
      id: 'm6',
      title: 'Avengers: Infinity War',
      releaseYear: 2018,
      runtimeMinutes: 149,
      watched: false,
      prerequisiteIds: ['m4', 'm5'],
    },
    {
      id: 'm7',
      title: 'Avengers: Endgame',
      releaseYear: 2019,
      runtimeMinutes: 181,
      watched: false,
      prerequisiteIds: ['m6'],
    },
    {
      id: 'm8',
      title: 'Avengers: Doomsday',
      releaseYear: 2026,
      runtimeMinutes: 180,
      watched: false,
      prerequisiteIds: ['m7'],
    },
  ];

  describe('detectCycle', () => {
    it('detects a direct self-loop (A -> A)', () => {
      const hasCycle = detectCycle(mcuCatalog, 'm1', ['m1']);
      expect(hasCycle).toBe(true);
    });

    it('detects an indirect cycle: making Endgame (m7) a prerequisite of Iron Man (m1)', () => {
      // Iron Man -> Endgame -> Infinity War -> Civil War -> Avengers -> Iron Man
      const hasCycle = detectCycle(mcuCatalog, 'm1', ['m7']);
      expect(hasCycle).toBe(true);
    });

    it('detects multi-hop circular dependencies (A -> B -> C -> A)', () => {
      const graph: MovieNode[] = [
        { id: 'A', title: 'A', releaseYear: 2000, runtimeMinutes: 100, watched: false, prerequisiteIds: [] },
        { id: 'B', title: 'B', releaseYear: 2001, runtimeMinutes: 100, watched: false, prerequisiteIds: ['A'] },
        { id: 'C', title: 'C', releaseYear: 2002, runtimeMinutes: 100, watched: false, prerequisiteIds: ['B'] },
      ];

      // Setting A's prerequisite to C would close the loop: A -> C -> B -> A
      expect(detectCycle(graph, 'A', ['C'])).toBe(true);
    });

    it('returns false when no cycle is introduced', () => {
      // Adding Thor: Ragnarok (m5) as a prerequisite of Avengers: Doomsday (m8) is valid DAG
      expect(detectCycle(mcuCatalog, 'm8', ['m7', 'm5'])).toBe(false);
    });

    it('returns false when prerequisites list is empty', () => {
      expect(detectCycle(mcuCatalog, 'm1', [])).toBe(false);
    });
  });

  describe('calculateRewatchOrder', () => {
    it('returns an empty list for a movie with no prerequisites (Thor: Ragnarok)', () => {
      const result = calculateRewatchOrder(mcuCatalog, 'm5');
      expect(result.orderedMovies).toEqual([]);
      expect(result.totalMovies).toBe(0);
      expect(result.watchedCount).toBe(0);
      expect(result.unwatchedCount).toBe(0);
      expect(result.totalUnwatchedRuntimeMinutes).toBe(0);
    });

    it('correctly orders prerequisites for Captain America: Civil War (m4)', () => {
      const result = calculateRewatchOrder(mcuCatalog, 'm4');
      const titles = result.orderedMovies.map((m) => m.title);

      // Both Iron Man and The First Avenger must precede The Avengers
      const ironManIdx = titles.indexOf('Iron Man');
      const capIdx = titles.indexOf('Captain America: The First Avenger');
      const avengersIdx = titles.indexOf('The Avengers');

      expect(ironManIdx).toBeGreaterThanOrEqual(0);
      expect(capIdx).toBeGreaterThanOrEqual(0);
      expect(avengersIdx).toBeGreaterThan(ironManIdx);
      expect(avengersIdx).toBeGreaterThan(capIdx);
      // Target itself must not be in the list
      expect(titles).not.toContain('Captain America: Civil War');
    });

    it('computes full rewatch order for Avengers: Doomsday (all 7 other movies, target excluded)', () => {
      const result = calculateRewatchOrder(mcuCatalog, 'm8');
      const titles = result.orderedMovies.map((m) => m.title);

      expect(result.totalMovies).toBe(7);
      expect(titles).not.toContain('Avengers: Doomsday');

      // Verify topological validity
      expect(titles.indexOf('The Avengers')).toBeGreaterThan(titles.indexOf('Iron Man'));
      expect(titles.indexOf('The Avengers')).toBeGreaterThan(titles.indexOf('Captain America: The First Avenger'));
      expect(titles.indexOf('Captain America: Civil War')).toBeGreaterThan(titles.indexOf('The Avengers'));
      expect(titles.indexOf('Avengers: Infinity War')).toBeGreaterThan(titles.indexOf('Captain America: Civil War'));
      expect(titles.indexOf('Avengers: Infinity War')).toBeGreaterThan(titles.indexOf('Thor: Ragnarok'));
      expect(titles.indexOf('Avengers: Endgame')).toBeGreaterThan(titles.indexOf('Avengers: Infinity War'));

      // Check watched metrics (m1, m2, m3 are watched = 3, unwatched = 4)
      expect(result.watchedCount).toBe(3);
      expect(result.unwatchedCount).toBe(4);

      // Total unwatched runtime: Civil War (147) + Ragnarok (130) + Infinity War (149) + Endgame (181) = 607 mins
      expect(result.totalUnwatchedRuntimeMinutes).toBe(147 + 130 + 149 + 181);
    });

    it('handles Diamond Dependency (D -> B, C; B -> A; C -> A) and includes A exactly once', () => {
      const diamondCatalog: MovieNode[] = [
        { id: 'A', title: 'Movie A', releaseYear: 2010, runtimeMinutes: 100, watched: true, prerequisiteIds: [] },
        { id: 'B', title: 'Movie B', releaseYear: 2012, runtimeMinutes: 110, watched: false, prerequisiteIds: ['A'] },
        { id: 'C', title: 'Movie C', releaseYear: 2013, runtimeMinutes: 120, watched: true, prerequisiteIds: ['A'] },
        { id: 'D', title: 'Movie D', releaseYear: 2015, runtimeMinutes: 130, watched: false, prerequisiteIds: ['B', 'C'] },
      ];

      const result = calculateRewatchOrder(diamondCatalog, 'D');
      const titles = result.orderedMovies.map((m) => m.title);

      expect(titles).toHaveLength(3);
      expect(titles[0]).toBe('Movie A'); // A must come first
      expect(titles).toContain('Movie B');
      expect(titles).toContain('Movie C');
      expect(titles).not.toContain('Movie D'); // Target excluded

      // Verified A appears only ONCE
      expect(titles.filter((t) => t === 'Movie A')).toHaveLength(1);
    });

    it('never includes the target movie even if graph contains corrupted cyclic reference back to target', () => {
      const corruptGraph: MovieNode[] = [
        { id: 'T', title: 'Target', releaseYear: 2024, runtimeMinutes: 120, watched: false, prerequisiteIds: ['P1'] },
        { id: 'P1', title: 'Prereq 1', releaseYear: 2020, runtimeMinutes: 100, watched: true, prerequisiteIds: ['T'] }, // Bad cyclic link to T
      ];

      const result = calculateRewatchOrder(corruptGraph, 'T');
      const ids = result.orderedMovies.map((m) => m.id);

      expect(ids).not.toContain('T');
      expect(ids).toContain('P1');
    });

    it('gracefully ignores missing or non-existent prerequisite IDs', () => {
      const graphWithMissing: MovieNode[] = [
        { id: 'M1', title: 'Real Movie', releaseYear: 2020, runtimeMinutes: 90, watched: true, prerequisiteIds: ['ghost-id-999'] },
      ];

      const result = calculateRewatchOrder(graphWithMissing, 'M1');
      expect(result.orderedMovies).toHaveLength(0);
    });
  });
});
