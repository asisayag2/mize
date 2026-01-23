import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { deviceTokenMiddleware } from './deviceToken.js';

describe('Device Token Middleware', () => {
  const mockResponse = () => {
    const res: Partial<Response> = {
      setHeader: vi.fn(),
    };
    return res as Response;
  };

  const mockNext: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a new UUID token when none provided', () => {
    const req = { headers: {} } as Request;
    const res = mockResponse();

    deviceTokenMiddleware(req, res, mockNext);

    expect(req.deviceToken).toBeDefined();
    expect(req.deviceToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Device-Token', req.deviceToken);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use existing valid token from header', () => {
    const existingToken = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const req = {
      headers: { 'x-device-token': existingToken },
    } as unknown as Request;
    const res = mockResponse();

    deviceTokenMiddleware(req, res, mockNext);

    expect(req.deviceToken).toBe(existingToken);
    expect(res.setHeader).toHaveBeenCalledWith('X-Device-Token', existingToken);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate new token for invalid UUID format', () => {
    const invalidToken = 'not-a-valid-uuid';
    const req = {
      headers: { 'x-device-token': invalidToken },
    } as unknown as Request;
    const res = mockResponse();

    deviceTokenMiddleware(req, res, mockNext);

    expect(req.deviceToken).not.toBe(invalidToken);
    expect(req.deviceToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate new token for UUID that is not v4', () => {
    // UUID v1 (time-based) - should be rejected
    const v1Token = '550e8400-e29b-11d4-a716-446655440000';
    const req = {
      headers: { 'x-device-token': v1Token },
    } as unknown as Request;
    const res = mockResponse();

    deviceTokenMiddleware(req, res, mockNext);

    expect(req.deviceToken).not.toBe(v1Token);
    expect(req.deviceToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle empty string token', () => {
    const req = {
      headers: { 'x-device-token': '' },
    } as unknown as Request;
    const res = mockResponse();

    deviceTokenMiddleware(req, res, mockNext);

    expect(req.deviceToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should always call next()', () => {
    const req = { headers: {} } as Request;
    const res = mockResponse();

    deviceTokenMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should always set response header', () => {
    const req = { headers: {} } as Request;
    const res = mockResponse();

    deviceTokenMiddleware(req, res, mockNext);

    expect(res.setHeader).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('X-Device-Token', expect.any(String));
  });
});

