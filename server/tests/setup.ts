import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_PASSWORD = 'test-admin-password';

// Reset all mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

