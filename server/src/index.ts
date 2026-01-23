import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { deviceTokenMiddleware } from './middleware/deviceToken.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Railway (needed for secure cookies behind proxy)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: isProduction 
    ? true  // Allow same-origin in production (frontend served from same server)
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Session for admin authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Device token middleware for public routes
app.use('/api', deviceTokenMiddleware);

// API Routes
app.use('/api', publicRoutes(prisma));
app.use('/api/admin', adminRoutes(prisma));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend in production
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  
  // Serve static files
  app.use(express.static(clientDistPath));
  
  // Handle client-side routing (SPA fallback)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🎭 Mi-ze server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };

