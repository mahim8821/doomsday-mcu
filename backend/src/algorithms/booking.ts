
/**
 * Cinema Watch-Party Group Ticket Booking Algorithm.
 *
 * Computes optimal group ticket bundle quotes using dynamic programming
 * to find the minimum number of seat bundles that sum to exactly groupSize.
 */

export interface BundleAllocation {
  size: number;
  count: number;
}

export interface BookingQuoteResult {
  possible: boolean;
  groupSize: number;
  totalBundles?: number;
  breakdown?: BundleAllocation[];
  message?: string;
}

/**
 * Computes the minimum number of ticket bundles whose seats add up to exactly the group size.
 */
export function calculateBookingQuote(
  bundleSizes: number[],
  groupSize: number
): BookingQuoteResult {

  // 1. Sanitize and sort bundle sizes
  const sizes = [...new Set(bundleSizes)]
    .filter(size => Number.isInteger(size) && size > 0)
    .sort((a, b) => b - a);

  // 2. Guard clauses
  if (
    !Number.isInteger(groupSize) ||
    groupSize <= 0 ||
    sizes.length === 0
  ) {
    return {
      possible: false,
      groupSize,
      message: "Not possible"
    };
  }

  // 3. Initialize DP arrays
  const dp: number[] = new Array(groupSize + 1).fill(Infinity);
  const lastBundle: number[] = new Array(groupSize + 1).fill(-1);

  // Base case: 0 seats require 0 bundles
  dp[0] = 0;

  // 4. Bottom-Up Dynamic Programming
  for (let seats = 1; seats <= groupSize; seats++) {

    for (const size of sizes) {

      if (seats >= size && dp[seats - size] !== Infinity) {

        const candidate = dp[seats - size] + 1;

        if (candidate < dp[seats]) {
          dp[seats] = candidate;
          lastBundle[seats] = size;
        }
      }
    }
  }

  // 5. Check if exact combination exists
  if (dp[groupSize] === Infinity) {
    return {
      possible: false,
      groupSize,
      message: "Not possible"
    };
  }

  // 6. Reconstruct bundle allocation
  const counts = new Map<number, number>();

  let remaining = groupSize;

  while (remaining > 0) {

    const usedSize = lastBundle[remaining];

    // Safety check
    if (usedSize === -1) {
      return {
        possible: false,
        groupSize,
        message: "Not possible"
      };
    }

    counts.set(
      usedSize,
      (counts.get(usedSize) ?? 0) + 1
    );

    remaining -= usedSize;
  }

  // 7. Format breakdown
  const breakdown: BundleAllocation[] = Array.from(
    counts,
    ([size, count]) => ({
      size,
      count
    })
  ).sort((a, b) => b.size - a.size);

  // 8. Return booking quote
  return {
    possible: true,
    groupSize,
    totalBundles: dp[groupSize],
    breakdown
  };
}
