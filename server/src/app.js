import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config, hasCloudinary } from './config/env.js';
import routes from './routes/index.js';
import { sanitizeRequest } from './middleware/validate.js';
import { errorHandler, notFound } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render/Railway sit behind one proxy; needed for per-IP rate limits.
  app.disable('x-powered-by');
  app.use(
    helmet({
      // Audio and images are fetched by the Vercel-hosted client from this origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: false,
    }),
  );
  if (config.logRequests) app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  app.use(sanitizeRequest);

  // Local uploads are served only when Cloudinary is not configured (development and demos).
  if (!hasCloudinary())
    app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d', fallthrough: false }));

  app.get('/health', (_req, res) => res.json({ success: true, data: { ok: true } }));
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
