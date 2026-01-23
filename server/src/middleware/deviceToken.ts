import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      deviceToken: string;
    }
  }
}

/**
 * Device Token Middleware
 * 
 * Generates or validates device tokens for anti-cheat functionality.
 * - On first request without token: generates a new UUID token
 * - Returns token in response header for client storage
 * - Attaches token to request object for use in controllers
 */
export function deviceTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get token from header
  let deviceToken = req.headers['x-device-token'] as string | undefined;

  // Generate new token if not provided
  if (!deviceToken) {
    deviceToken = uuidv4();
  }

  // Validate token format (UUID v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(deviceToken)) {
    deviceToken = uuidv4();
  }

  // Attach to request
  req.deviceToken = deviceToken;

  // Always return the token in response header
  res.setHeader('X-Device-Token', deviceToken);

  next();
}

