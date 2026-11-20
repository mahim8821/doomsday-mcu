# Permanent Workspace Rules: Doomsday Ready

## 1. Project Overview & Architecture
"Doomsday Ready" is a full-stack MCU rewatch planner and cinema watch-party booking application.

### Tech Stack
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL + Zod + Vitest
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Lucide React + React Router
- **DevOps**: Docker Compose

---

## 2. Strict Rules & Prohibitions

1. **NO Third-Party Algorithm Libraries**:
   - **NEVER** install, import, or use any third-party graph, topological sort, DAG, cycle detection, or coin-change / knapsack / dynamic programming solving libraries (e.g. `toposort`, `graphlib`, `directed-graph`, `coinchange`, `knapsack-js`, etc.).
   - All graph traversals, cycle detection, topological sorting, and bundle optimization calculations must be written from scratch without algorithmic helper packages.

2. **Custom Handcrafted Algorithm Implementations**:
   - The implementations in:
     - `backend/src/algorithms/rewatch.ts`
     - `backend/src/algorithms/booking.ts`
   - are handcrafted from scratch using DFS/Topological sort and Dynamic Programming (unbounded knapsack). They must NEVER be replaced by third-party solver packages.

---

## 3. API Specification

All API endpoints must be prefixed with `/api`.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/movies` | Create a movie |
| `GET` | `/api/movies` | List all movies with their prerequisite relationships |
| `PATCH` | `/api/movies/:id` | Update a movie (including `watched` flag and `prerequisites`) |
| `GET` | `/api/movies/:id/rewatch-order` | Compute rewatch order, watched count, and unwatched runtime |
| `POST` | `/api/cinemas` | Create a cinema |
| `GET` | `/api/cinemas` | List all cinemas |
| `GET` | `/api/cinemas/:id/booking?groupSize=6` | Compute optimal opening-night group bundle quote |
| `GET` | `/api/health` | Service health check |

---

## 4. Validation & Error Handling Rules

### Movies
- **Title**: Must be unique. Duplicate titles must return `HTTP 409 Conflict`.
- **Runtime**: `runtimeMinutes` must be an integer between `1` and `300`.
- **Release Year**: `releaseYear` must be a valid integer.
- **Watched**: Defaults to `false`. Can be updated at any time.
- **Prerequisites**: Optional array of movie IDs. Editable at any time.
- **Circular Dependency**: Any direct or indirect circular dependency (e.g. A -> B -> A, or A -> A) MUST return `HTTP 409 Conflict` with the exact JSON structure:
  ```json
  {
    "error": "CIRCULAR_DEPENDENCY",
    "message": "A movie cannot depend on itself directly or indirectly."
  }
  ```

### Cinemas & Bookings
- **Cinema Name**: Must be unique. Duplicate names must return `HTTP 409 Conflict`.
- **Bundle Sizes**: `bundleSizes` must contain between `1` and `10` distinct integers, each between `1` and `500`.
- **Booking Group Size**: Query parameter `groupSize` must be an integer between `1` and `10000`. Returns fewest bundles whose seats add up to exactly `groupSize`. If no exact combination exists, return indication that it is not possible.
