import { vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Creates a deep mock of the Prisma client for testing.
 * All methods return empty promises by default and can be overridden.
 */
export function createMockPrismaClient() {
  const mockPrisma = {
    contender: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    love: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    guess: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    voteCycle: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    vote: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    voteSelection: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation(async (fn) => {
      if (typeof fn === 'function') {
        return fn(mockPrisma);
      }
      return Promise.all(fn);
    }),
  };

  return mockPrisma as unknown as PrismaClient;
}

/**
 * Test data factories
 */
export const testData = {
  contender: (overrides = {}) => ({
    id: 'contender-1',
    nickname: 'הזמרת המסתורית',
    isActive: true,
    imagePublicId: 'mize/contenders/singer1',
    videos: [{ title: 'הופעה ראשונה', publicId: 'mize/videos/singer1-ep1' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  love: (overrides = {}) => ({
    id: 'love-1',
    contenderId: 'contender-1',
    deviceToken: 'device-token-123',
    fingerprintHash: 'fp-hash-abc',
    createdAt: new Date(),
    ...overrides,
  }),

  voteCycle: (overrides = {}) => ({
    id: 'cycle-1',
    startAt: new Date('2024-01-01T00:00:00Z'),
    endAt: new Date('2024-12-31T23:59:59Z'),
    closedAt: null,
    maxVotesPerUser: 3,
    createdAt: new Date(),
    ...overrides,
  }),

  vote: (overrides = {}) => ({
    id: 'vote-1',
    cycleId: 'cycle-1',
    displayName: 'יוסי',
    deviceToken: 'device-token-123',
    fingerprintHash: 'fp-hash-abc',
    createdAt: new Date(),
    ...overrides,
  }),

  guess: (overrides = {}) => ({
    id: 'guess-1',
    contenderId: 'contender-1',
    displayName: 'יוסי',
    guessText: 'אייל גולן',
    deviceToken: 'device-token-123',
    fingerprintHash: 'fp-hash-abc',
    createdAt: new Date(),
    ...overrides,
  }),
};

