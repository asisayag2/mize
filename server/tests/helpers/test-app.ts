import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import { deviceTokenMiddleware } from '../../src/middleware/deviceToken.js';
import { publicRoutes } from '../../src/routes/public.js';
import { adminRoutes } from '../../src/routes/admin.js';

/**
 * Creates a test Express app with all middleware and routes configured.
 * Useful for integration testing with supertest.
 */
export function createTestApp(prisma: PrismaClient): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cookieParser());

  // Session for admin authentication
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
      },
    })
  );

  // Device token middleware for public routes
  app.use('/api', deviceTokenMiddleware);

  // Routes
  app.use('/api', publicRoutes(prisma));
  app.use('/api/admin', adminRoutes(prisma));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

/**
 * Creates an admin-authenticated agent for testing protected routes.
 * Use this with supertest agent to maintain session cookies.
 */
export async function authenticateAdmin(
  agent: any,
  password = 'test-admin-password'
) {
  return agent.post('/api/admin/login').send({ password });
}

