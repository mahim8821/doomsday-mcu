import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { calculateBookingQuote } from '../algorithms/booking.js';

export const cinemaRouter = Router();

const createCinemaSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  bundleSizes: z
    .array(
      z
        .number()
        .int('Bundle size must be an integer')
        .min(1, 'Bundle size must be at least 1')
        .max(500, 'Bundle size cannot exceed 500')
    )
    .min(1, 'At least 1 bundle size is required')
    .max(10, 'At most 10 bundle sizes allowed')
    .refine((items) => new Set(items).size === items.length, {
      message: 'Bundle sizes must be distinct integers',
    }),
});

const bookingQuerySchema = z.object({
  groupSize: z.coerce
    .number()
    .int('Group size must be an integer')
    .min(1, 'Group size must be at least 1')
    .max(10000, 'Group size cannot exceed 10000'),
});

// POST /api/cinemas - Create cinema
cinemaRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createCinemaSchema.parse(req.body);

    const existing = await prisma.cinema.findUnique({
      where: { name: validated.name },
    });
    if (existing) {
      return res.status(409).json({
        error: 'DUPLICATE_RESOURCE',
        message: `A cinema with name "${validated.name}" already exists.`,
      });
    }

    const cinema = await prisma.cinema.create({
      data: {
        name: validated.name,
        bundleSizes: validated.bundleSizes,
      },
    });

    return res.status(201).json(cinema);
  } catch (error) {
    return next(error);
  }
});

// GET /api/cinemas - List all cinemas
cinemaRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cinemas = await prisma.cinema.findMany({
      orderBy: { name: 'asc' },
    });

    return res.status(200).json(cinemas);
  } catch (error) {
    return next(error);
  }
});

// GET /api/cinemas/:id/booking?groupSize=6 - Compute optimal opening-night group bundle quote
cinemaRouter.get('/:id/booking', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { groupSize } = bookingQuerySchema.parse(req.query);

    const cinema = await prisma.cinema.findUnique({
      where: { id },
    });

    if (!cinema) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Cinema with id "${id}" was not found.`,
      });
    }

    const quote = calculateBookingQuote(cinema.bundleSizes, groupSize);

    return res.status(200).json({
      cinema: {
        id: cinema.id,
        name: cinema.name,
        bundleSizes: cinema.bundleSizes,
      },
      ...quote,
    });
  } catch (error) {
    return next(error);
  }
});
