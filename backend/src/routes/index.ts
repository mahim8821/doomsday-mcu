import { Router, Request, Response } from 'express';
import { movieRouter } from './movie.routes.js';
import { cinemaRouter } from './cinema.routes.js';

export const apiRouter = Router();

// GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'doomsday-ready-backend',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use('/movies', movieRouter);
apiRouter.use('/cinemas', cinemaRouter);
