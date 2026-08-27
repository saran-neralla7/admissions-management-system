import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import routes from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');

// Ensure local storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// CORS setup supporting credentials (cookies)
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString(), service: 'GVP Admissions API' });
});

// Primary V1 API Routes
app.use('/api/v1', routes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 GVP Backend API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

export default app;
