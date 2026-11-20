import express from 'express';
import cors, { CorsOptions } from 'cors';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();

// Configure CORS for cloud deployment (accepts comma-separated origins, with safe fallback)
const rawCorsOrigin = process.env.CORS_ORIGIN?.trim();

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // If no CORS_ORIGIN is specified or non-browser request (e.g. curl/healthcheck), allow
    if (!rawCorsOrigin || !origin) {
      return callback(null, true);
    }

    const allowedOrigins = rawCorsOrigin
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean);

    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Mount all API endpoints under /api
app.use('/api', apiRouter);

// Central JSON error handler middleware
app.use(errorHandler);
