import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class CircularDependencyError extends Error {
  constructor(message = 'A movie cannot depend on itself directly or indirectly.') {
    super(message);
    this.name = 'CircularDependencyError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle Circular Dependency Error (HTTP 409)
  if (err instanceof CircularDependencyError) {
    return res.status(409).json({
      error: 'CIRCULAR_DEPENDENCY',
      message: err.message,
    });
  }

  // Handle Zod Validation Error (HTTP 400)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request payload or query parameters',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle Prisma Unique Constraint Error (HTTP 409)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(', ')
        : 'field';
      return res.status(409).json({
        error: 'DUPLICATE_RESOURCE',
        message: `A resource with this ${target} already exists.`,
      });
    }
  }

  // Generic unhandled internal errors
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[Unhandled Error]', err);

  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message,
  });
}
