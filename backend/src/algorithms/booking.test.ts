import { describe, it, expect } from 'vitest';
import { calculateBookingQuote } from './booking.js';

describe('calculateBookingQuote', () => {
  describe('Assessment Example Test Cases', () => {
    it('handles the greedy trap: [1, 3, 4] with groupSize 6 -> returns 2 bundles (3 x 2)', () => {
      const result = calculateBookingQuote([1, 3, 4], 6);

      expect(result.possible).toBe(true);
      expect(result.totalBundles).toBe(2);
      expect(result.breakdown).toEqual([{ size: 3, count: 2 }]);
    });

    it('optimizes [2, 5] with groupSize 11 -> returns 4 bundles (5 x 1, 2 x 3)', () => {
      const result = calculateBookingQuote([2, 5], 11);

      expect(result.possible).toBe(true);
      expect(result.totalBundles).toBe(4);
      expect(result.breakdown).toEqual([
        { size: 5, count: 1 },
        { size: 2, count: 3 },
      ]);
    });

    it('optimizes [6, 9, 20] with groupSize 44 -> returns 4 bundles (20 x 1, 9 x 2, 6 x 1)', () => {
      const result = calculateBookingQuote([6, 9, 20], 44);

      expect(result.possible).toBe(true);
      expect(result.totalBundles).toBe(4);
      expect(result.breakdown).toEqual([
        { size: 20, count: 1 },
        { size: 9, count: 2 },
        { size: 6, count: 1 },
      ]);
    });

    it('returns impossible for [4, 6] with groupSize 7', () => {
      const result = calculateBookingQuote([4, 6], 7);

      expect(result.possible).toBe(false);
      expect(result.message).toBe('Not possible');
      expect(result.totalBundles).toBeUndefined();
      expect(result.breakdown).toBeUndefined();
    });
  });

  describe('Edge Cases and Guard Clauses', () => {
    it('returns impossible for [2, 4] with odd groupSize 5', () => {
      const result = calculateBookingQuote([2, 4], 5);
      expect(result.possible).toBe(false);
      expect(result.message).toBe('Not possible');
    });

    it('returns impossible when bundle sizes array is empty', () => {
      const result = calculateBookingQuote([], 10);
      expect(result.possible).toBe(false);
    });

    it('returns impossible when groupSize is zero or negative', () => {
      expect(calculateBookingQuote([2, 5], 0).possible).toBe(false);
      expect(calculateBookingQuote([2, 5], -6).possible).toBe(false);
    });

    it('returns impossible when groupSize is non-integer', () => {
      expect(calculateBookingQuote([2, 5], 5.5).possible).toBe(false);
    });

    it('sanitizes duplicate and invalid bundle sizes (negatives, zeros, non-integers)', () => {
      const result = calculateBookingQuote([3, 3, -1, 0, 3.5, 4], 6);
      expect(result.possible).toBe(true);
      expect(result.totalBundles).toBe(2);
      expect(result.breakdown).toEqual([{ size: 3, count: 2 }]);
    });

    it('handles exact single-bundle matches', () => {
      const result = calculateBookingQuote([5], 15);
      expect(result.possible).toBe(true);
      expect(result.totalBundles).toBe(3);
      expect(result.breakdown).toEqual([{ size: 5, count: 3 }]);
    });

    it('handles maximum allowed group size (10,000) efficiently', () => {
      const start = performance.now();
      const result = calculateBookingQuote([6, 9, 20], 10000);
      const duration = performance.now() - start;

      expect(result.possible).toBe(true);
      expect(result.totalBundles).toBe(500); // 20 * 500 = 10,000
      expect(result.breakdown).toEqual([{ size: 20, count: 500 }]);
      expect(duration).toBeLessThan(100); // Fast DP execution
    });
  });
});
