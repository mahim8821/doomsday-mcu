import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { detectCycle, calculateRewatchOrder, MovieNode } from '../algorithms/rewatch.js';
import { CircularDependencyError } from '../middlewares/errorHandler.js';

export const movieRouter = Router();

const createMovieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  releaseYear: z.number().int('Release year must be an integer'),
  runtimeMinutes: z
    .number()
    .int('Runtime must be an integer')
    .min(1, 'Runtime must be at least 1 minute')
    .max(300, 'Runtime must be at most 300 minutes'),
  watched: z.boolean().optional().default(false),
  prerequisiteIds: z.array(z.string().min(1)).optional().default([]),
});

const updateMovieSchema = z.object({
  title: z.string().trim().min(1).optional(),
  releaseYear: z.number().int().optional(),
  runtimeMinutes: z.number().int().min(1).max(300).optional(),
  watched: z.boolean().optional(),
  prerequisiteIds: z.array(z.string().min(1)).optional(),
});

// Helper to load all movies as MovieNode[] for graph algorithms
async function loadMovieGraph(): Promise<MovieNode[]> {
  const movies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      releaseYear: true,
      runtimeMinutes: true,
      watched: true,
      prerequisites: {
        select: { id: true },
      },
    },
  });

  return movies.map((m) => ({
    id: m.id,
    title: m.title,
    releaseYear: m.releaseYear,
    runtimeMinutes: m.runtimeMinutes,
    watched: m.watched,
    prerequisiteIds: m.prerequisites.map((p) => p.id),
  }));
}

// POST /api/movies - Create movie
movieRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createMovieSchema.parse(req.body);

    // Check duplicate title explicitly for clean error handling
    const existing = await prisma.movie.findUnique({
      where: { title: validated.title },
    });
    if (existing) {
      return res.status(409).json({
        error: 'DUPLICATE_RESOURCE',
        message: `A movie with title "${validated.title}" already exists.`,
      });
    }

    const movie = await prisma.movie.create({
      data: {
        title: validated.title,
        releaseYear: validated.releaseYear,
        runtimeMinutes: validated.runtimeMinutes,
        watched: validated.watched,
        prerequisites: {
          connect: validated.prerequisiteIds.map((id) => ({ id })),
        },
      },
      include: {
        prerequisites: {
          select: {
            id: true,
            title: true,
            releaseYear: true,
            runtimeMinutes: true,
            watched: true,
          },
        },
      },
    });

    return res.status(201).json(movie);
  } catch (error) {
    return next(error);
  }
});

// GET /api/movies - List all movies
movieRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const movies = await prisma.movie.findMany({
      include: {
        prerequisites: {
          select: {
            id: true,
            title: true,
            releaseYear: true,
            runtimeMinutes: true,
            watched: true,
          },
        },
      },
      orderBy: [{ releaseYear: 'asc' }, { title: 'asc' }],
    });

    return res.status(200).json(movies);
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/movies/:id - Update movie (including watched and prerequisites)
movieRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateMovieSchema.parse(req.body);

    const existingMovie = await prisma.movie.findUnique({
      where: { id },
    });

    if (!existingMovie) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Movie with id "${id}" was not found.`,
      });
    }

    // Check duplicate title if updating title
    if (validated.title && validated.title !== existingMovie.title) {
      const duplicate = await prisma.movie.findUnique({
        where: { title: validated.title },
      });
      if (duplicate) {
        return res.status(409).json({
          error: 'DUPLICATE_RESOURCE',
          message: `A movie with title "${validated.title}" already exists.`,
        });
      }
    }

    // Cycle detection check if prerequisites are being updated
    if (validated.prerequisiteIds !== undefined) {
      const graph = await loadMovieGraph();
      const hasCycle = detectCycle(graph, id, validated.prerequisiteIds);

      if (hasCycle) {
        throw new CircularDependencyError();
      }
    }

    // Prepare update data
    const updateData: {
      title?: string;
      releaseYear?: number;
      runtimeMinutes?: number;
      watched?: boolean;
      prerequisites?: { set: { id: string }[] };
    } = {};

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.releaseYear !== undefined) updateData.releaseYear = validated.releaseYear;
    if (validated.runtimeMinutes !== undefined) updateData.runtimeMinutes = validated.runtimeMinutes;
    if (validated.watched !== undefined) updateData.watched = validated.watched;
    if (validated.prerequisiteIds !== undefined) {
      updateData.prerequisites = {
        set: validated.prerequisiteIds.map((prereqId) => ({ id: prereqId })),
      };
    }

    const updated = await prisma.movie.update({
      where: { id },
      data: updateData,
      include: {
        prerequisites: {
          select: {
            id: true,
            title: true,
            releaseYear: true,
            runtimeMinutes: true,
            watched: true,
          },
        },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
});

// GET /api/movies/:id/rewatch-order - Compute rewatch order for target movie
movieRouter.get('/:id/rewatch-order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const targetMovie = await prisma.movie.findUnique({
      where: { id },
      select: { id: true, title: true, releaseYear: true, runtimeMinutes: true, watched: true },
    });

    if (!targetMovie) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Movie with id "${id}" was not found.`,
      });
    }

    const graph = await loadMovieGraph();
    const rewatchOrder = calculateRewatchOrder(graph, id);

    return res.status(200).json({
      targetMovie,
      ...rewatchOrder,
    });
  } catch (error) {
    return next(error);
  }
});
