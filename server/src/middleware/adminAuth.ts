import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    isAdmin: boolean;
  }
}

/**
 * Admin Authentication Middleware
 * 
 * Checks if the current session has admin privileges.
 * Used to protect all admin routes.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session.isAdmin) {
    res.status(401).json({ 
      error: 'לא מורשה', 
      message: 'נדרשת התחברות כמנהל' 
    });
    return;
  }
  next();
}

