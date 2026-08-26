import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Managed by Nginx proxy in production
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString(), service: 'GVPIHLR Admissions API' });
});

// API Routes
app.use('/api/v1', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Global Error:', err);
  const message = err.message || 'Internal Server Error';
  res.status(err.status || 500).json({ success: false, error: message });
});

app.listen(PORT, () => {
  console.log(`🚀 GVPIHLR Backend API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

export default app;
