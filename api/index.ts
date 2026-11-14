import type { Request, Response } from 'express';
import express from 'express';
import { initDatabase } from '../server/db.js';
import apiRouter from '../server/routes/api.js';

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Set CORS and security headers for API
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Mount the API router
app.use('/api', apiRouter);
app.use('/', apiRouter);

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureDb() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = initDatabase()
      .then(() => {
        initialized = true;
      })
      .catch((err) => {
        console.warn('Database initialization warning on serverless:', err);
      });
  }
  await initPromise;
}

export default async function handler(req: Request, res: Response) {
  await ensureDb();
  return app(req, res);
}
