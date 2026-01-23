import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { createMockPrismaClient, testData } from '../helpers/prisma-mock.js';

describe('Public API Routes', () => {
  let app: ReturnType<typeof createTestApp>;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  const validFingerprint = {
    userAgent: 'Mozilla/5.0',
    platform: 'Win32',
    language: 'he-IL',
    timezoneOffset: -120,
    screenWidth: 1920,
    screenHeight: 1080,
  };

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    app = createTestApp(mockPrisma);
  });

  describe('GET /api/config', () => {
    it('should return hasActiveCycle: false when no active cycle', async () => {
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        activeCycle: null,
        hasActiveCycle: false,
      });
    });

    it('should return active cycle info when one exists', async () => {
      const cycle = testData.voteCycle();
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);

      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body.hasActiveCycle).toBe(true);
      expect(res.body.activeCycle).toMatchObject({
        id: cycle.id,
        maxVotesPerUser: cycle.maxVotesPerUser,
      });
    });

    it('should set X-Device-Token header', async () => {
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/config');

      expect(res.headers['x-device-token']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('GET /api/contenders', () => {
    it('should return empty array when no contenders', async () => {
      mockPrisma.contender.findMany = vi.fn().mockResolvedValue([]);

      const res = await request(app).get('/api/contenders');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return contenders with love counts', async () => {
      const contender = {
        ...testData.contender(),
        _count: { loves: 42 },
        loves: [],
      };
      mockPrisma.contender.findMany = vi.fn().mockResolvedValue([contender]);

      const res = await request(app).get('/api/contenders');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: contender.id,
        nickname: contender.nickname,
        loveCount: 42,
        isLovedByUser: false,
      });
    });

    it('should indicate if user loved a contender', async () => {
      const contender = {
        ...testData.contender(),
        _count: { loves: 5 },
        loves: [{ id: 'love-1' }], // User has loved this
      };
      mockPrisma.contender.findMany = vi.fn().mockResolvedValue([contender]);

      const res = await request(app).get('/api/contenders');

      expect(res.status).toBe(200);
      expect(res.body[0].isLovedByUser).toBe(true);
    });
  });

  describe('POST /api/contenders/:id/love', () => {
    it('should return 400 when fingerprint is missing', async () => {
      const res = await request(app)
        .post('/api/contenders/contender-1/love')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('חסרים נתוני מכשיר');
    });

    it('should return 404 when contender not found', async () => {
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/contenders/nonexistent/love')
        .send({ fingerprint: validFingerprint });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('מתמודד לא נמצא');
    });

    it('should create love when not exists', async () => {
      const contender = testData.contender();
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(contender);
      mockPrisma.love.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.love.create = vi.fn().mockResolvedValue(testData.love());
      mockPrisma.love.count = vi.fn().mockResolvedValue(10);

      const res = await request(app)
        .post('/api/contenders/contender-1/love')
        .send({ fingerprint: validFingerprint });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ loved: true, loveCount: 10 });
      expect(mockPrisma.love.create).toHaveBeenCalled();
    });

    it('should remove love when already exists (toggle)', async () => {
      const contender = testData.contender();
      const existingLove = testData.love();
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(contender);
      mockPrisma.love.findUnique = vi.fn().mockResolvedValue(existingLove);
      mockPrisma.love.delete = vi.fn().mockResolvedValue({});
      mockPrisma.love.count = vi.fn().mockResolvedValue(9);

      const res = await request(app)
        .post('/api/contenders/contender-1/love')
        .send({ fingerprint: validFingerprint });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ loved: false, loveCount: 9 });
      expect(mockPrisma.love.delete).toHaveBeenCalled();
    });
  });

  describe('POST /api/contenders/:id/guess', () => {
    it('should return 400 when displayName is missing', async () => {
      const res = await request(app)
        .post('/api/contenders/contender-1/guess')
        .send({ guessText: 'אייל גולן', fingerprint: validFingerprint });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא להזין שם');
    });

    it('should return 400 when guessText is missing', async () => {
      const res = await request(app)
        .post('/api/contenders/contender-1/guess')
        .send({ displayName: 'יוסי', fingerprint: validFingerprint });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא להזין ניחוש');
    });

    it('should return 404 when contender not found', async () => {
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/contenders/nonexistent/guess')
        .send({
          displayName: 'יוסי',
          guessText: 'אייל גולן',
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('מתמודד לא נמצא');
    });

    it('should create guess successfully', async () => {
      const contender = testData.contender();
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(contender);
      mockPrisma.guess.create = vi.fn().mockResolvedValue(testData.guess());

      const res = await request(app)
        .post('/api/contenders/contender-1/guess')
        .send({
          displayName: 'יוסי',
          guessText: 'אייל גולן',
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'הניחוש נשמר!' });
      expect(mockPrisma.guess.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contenderId: 'contender-1',
          displayName: 'יוסי',
          guessText: 'אייל גולן',
        }),
      });
    });
  });

  describe('GET /api/vote', () => {
    it('should return hasActiveCycle: false when no active cycle', async () => {
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/vote');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ hasActiveCycle: false, hasVoted: false });
    });

    it('should return hasVoted: false when user has not voted', async () => {
      const cycle = testData.voteCycle();
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);
      mockPrisma.vote.findFirst = vi.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/vote');

      expect(res.status).toBe(200);
      expect(res.body.hasActiveCycle).toBe(true);
      expect(res.body.hasVoted).toBe(false);
    });

    it('should return vote details when user has voted', async () => {
      const cycle = testData.voteCycle();
      const vote = {
        ...testData.vote(),
        selections: [
          { contender: { id: 'c1', nickname: 'זמר א' } },
          { contender: { id: 'c2', nickname: 'זמרת ב' } },
        ],
      };
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);
      mockPrisma.vote.findFirst = vi.fn().mockResolvedValue(vote);

      const res = await request(app).get('/api/vote');

      expect(res.status).toBe(200);
      expect(res.body.hasVoted).toBe(true);
      expect(res.body.vote.displayName).toBe(vote.displayName);
      expect(res.body.vote.selections).toHaveLength(2);
    });
  });

  describe('POST /api/vote', () => {
    it('should return 400 when displayName is missing', async () => {
      const res = await request(app)
        .post('/api/vote')
        .send({
          selections: ['c1'],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא להזין שם');
    });

    it('should return 400 when selections is empty', async () => {
      const res = await request(app)
        .post('/api/vote')
        .send({
          displayName: 'יוסי',
          selections: [],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא לבחור לפחות מתמודד אחד');
    });

    it('should return 400 when no active cycle', async () => {
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/vote')
        .send({
          displayName: 'יוסי',
          selections: ['c1'],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('אין מחזור הצבעה פעיל כרגע');
    });

    it('should return 400 when too many selections', async () => {
      const cycle = testData.voteCycle({ maxVotesPerUser: 2 });
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);

      const res = await request(app)
        .post('/api/vote')
        .send({
          displayName: 'יוסי',
          selections: ['c1', 'c2', 'c3'],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ניתן לבחור עד 2 מתמודדים');
    });

    it('should return 403 when already voted (by token)', async () => {
      const cycle = testData.voteCycle();
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);
      mockPrisma.vote.findUnique = vi.fn().mockResolvedValue(testData.vote());

      const res = await request(app)
        .post('/api/vote')
        .send({
          displayName: 'יוסי',
          selections: ['c1'],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('כבר הצבעת במחזור הזה');
    });

    it('should return 403 when already voted (by fingerprint)', async () => {
      const cycle = testData.voteCycle();
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);
      mockPrisma.vote.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.vote.findFirst = vi.fn().mockResolvedValue(testData.vote());

      const res = await request(app)
        .post('/api/vote')
        .send({
          displayName: 'יוסי',
          selections: ['c1'],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('כבר הצבעת ממכשיר זה');
    });

    it('should return 400 when selection includes inactive contender', async () => {
      const cycle = testData.voteCycle();
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);
      mockPrisma.vote.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.vote.findFirst = vi.fn().mockResolvedValue(null);
      // Only 1 of 2 selections is valid
      mockPrisma.contender.findMany = vi.fn().mockResolvedValue([{ id: 'c1' }]);

      const res = await request(app)
        .post('/api/vote')
        .send({
          displayName: 'יוסי',
          selections: ['c1', 'c2'],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('חלק מהמתמודדים שנבחרו אינם פעילים');
    });

    it('should create vote successfully', async () => {
      const cycle = testData.voteCycle();
      const newVote = testData.vote();
      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(cycle);
      mockPrisma.vote.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.vote.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.contender.findMany = vi
        .fn()
        .mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);

      // Mock transaction
      mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
        const tx = {
          vote: { create: vi.fn().mockResolvedValue(newVote) },
          voteSelection: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        };
        return fn(tx);
      });

      const res = await request(app)
        .post('/api/vote')
        .send({
          displayName: 'יוסי',
          selections: ['c1', 'c2'],
          fingerprint: validFingerprint,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('ההצבעה נקלטה בהצלחה!');
      expect(res.body.voteId).toBe(newVote.id);
    });
  });
});

