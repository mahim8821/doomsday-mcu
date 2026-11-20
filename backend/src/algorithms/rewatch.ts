/**
 * Movie Rewatch Order and Cycle Detection Algorithms.
 *
 * Provides cycle detection for directed prerequisite graphs
 * and topological sorting to determine optimal chronological rewatch order.
 */

export interface MovieNode {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisiteIds: string[];
}

export interface RewatchMovieSummary {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
}

export interface RewatchOrderResult {
  orderedMovies: RewatchMovieSummary[];
  totalMovies: number;
  watchedCount: number;
  unwatchedCount: number;
  totalUnwatchedRuntimeMinutes: number;
}

/**
 * Checks whether adding or updating candidate prerequisites creates a direct or indirect cycle.
 *
 * @param movies All known movies in the catalog as a graph of nodes.
 * @param targetMovieId The ID of the movie being created or updated.
 * @param candidatePrerequisiteIds The array of prerequisite movie IDs to validate.
 * @returns true if a cycle would be introduced, false otherwise.
 */
export function detectCycle(
  movies: MovieNode[],
  targetMovieId: string,
  candidatePrerequisiteIds: string[]
): boolean {
  // 1. Direct self-loop check
  if (candidatePrerequisiteIds.includes(targetMovieId)) {
    return true;
  }

  // 2. Build adjacency map
  const adjMap = new Map<string, string[]>();

  for (const movie of movies) {
    adjMap.set(movie.id, movie.prerequisiteIds);
  }

  // 3. Initialize DFS stack and visited set
  const visited = new Set<string>();
  const stack: string[] = [...candidatePrerequisiteIds];

  // 4. DFS traversal
  while (stack.length > 0) {
    const currentId = stack.pop()!;

    // Found a path back to target movie
    if (currentId === targetMovieId) {
      return true;
    }

    // Skip already visited movies
    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    // Get current movie prerequisites
    const prerequisites = adjMap.get(currentId) ?? [];

    // Add prerequisites to stack
    for (const prereqId of prerequisites) {
      stack.push(prereqId);
    }
  }

  // No circular dependency found
  return false;
}

/**
 * Computes the topological rewatch order of all recursive prerequisites for a target movie.
 *
 * The result excludes the target movie itself and contains every prerequisite
 * exactly once in an order where every movie comes after its prerequisites.
 *
 * @param movies All known movies in the catalog.
 * @param targetMovieId The movie being prepared for (e.g. Avengers: Doomsday).
 * @returns Ordered list of prerequisites with watched count and total unwatched runtime.
 */
export function calculateRewatchOrder(
  movies: MovieNode[],
  targetMovieId: string
): RewatchOrderResult {
  // Empty result helper
  const emptyResult: RewatchOrderResult = {
    orderedMovies: [],
    totalMovies: 0,
    watchedCount: 0,
    unwatchedCount: 0,
    totalUnwatchedRuntimeMinutes: 0
  };

  // 1. Build movie lookup map
  const movieMap = new Map<string, MovieNode>();

  for (const movie of movies) {
    movieMap.set(movie.id, movie);
  }

  // 2. Find target movie
  const targetMovie = movieMap.get(targetMovieId);

  if (!targetMovie || targetMovie.prerequisiteIds.length === 0) {
    return emptyResult;
  }

  // 3. Initialize DFS structures
  const visited = new Set<string>();
  visited.add(targetMovieId);
  const orderedMovies: RewatchMovieSummary[] = [];

  // Helper to sort prerequisite IDs chronologically by releaseYear, then title
  function sortPrerequisiteIds(ids: string[]): string[] {
    return [...ids].sort((a, b) => {
      const movieA = movieMap.get(a);
      const movieB = movieMap.get(b);

      if (!movieA) return 1;
      if (!movieB) return -1;

      return (
        movieA.releaseYear - movieB.releaseYear ||
        movieA.title.localeCompare(movieB.title)
      );
    });
  }

  // 4. Post-order DFS
  function dfs(movieId: string): void {
    // Prevent duplicates
    if (visited.has(movieId)) {
      return;
    }

    // Find movie
    const node = movieMap.get(movieId);

    // Skip missing movies
    if (!node) {
      return;
    }

    // Mark visited
    visited.add(movieId);

    // Sort prerequisites chronologically
    const sortedPrerequisites = sortPrerequisiteIds(node.prerequisiteIds);

    // Visit prerequisites first
    for (const prereqId of sortedPrerequisites) {
      dfs(prereqId);
    }

    // Add current movie after its prerequisites
    orderedMovies.push({
      id: node.id,
      title: node.title,
      releaseYear: node.releaseYear,
      runtimeMinutes: node.runtimeMinutes,
      watched: node.watched,
    });
  }

  // 5. Start DFS from target prerequisites
  const sortedTargetPrerequisites = sortPrerequisiteIds(targetMovie.prerequisiteIds);

  for (const prereqId of sortedTargetPrerequisites) {
    dfs(prereqId);
  }

  // 6. Calculate summary metrics
  const totalMovies = orderedMovies.length;

  const watchedCount = orderedMovies.filter(
    movie => movie.watched === true
  ).length;

  const unwatchedCount = totalMovies - watchedCount;

  const totalUnwatchedRuntimeMinutes = orderedMovies
    .filter(movie => movie.watched === false)
    .reduce(
      (total, movie) => total + movie.runtimeMinutes,
      0
    );

  // 7. Return result
  return {
    orderedMovies,
    totalMovies,
    watchedCount,
    unwatchedCount,
    totalUnwatchedRuntimeMinutes
  };
}
