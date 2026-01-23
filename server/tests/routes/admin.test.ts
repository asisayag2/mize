import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { createMockPrismaClient, testData } from '../helpers/prisma-mock.js';

describe('Admin API Routes', () => {
  let app: ReturnType<typeof createTestApp>;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    app = createTestApp(mockPrisma);
    agent = request.agent(app);
  });

  async function loginAsAdmin() {
    await agent.post('/api/admin/login').send({ password: 'test-admin-password' });
  }

  describe('POST /api/admin/login', () => {
    it('should return 400 when password is missing', async () => {
      const res = await request(app).post('/api/admin/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא להזין סיסמה');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('סיסמה שגויה');
    });

    it('should login successfully with correct password', async () => {
      const res = await agent
        .post('/api/admin/login')
        .send({ password: 'test-admin-password' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/session', () => {
    it('should return isAdmin: false when not logged in', async () => {
      const res = await request(app).get('/api/admin/session');

      expect(res.status).toBe(200);
      expect(res.body.isAdmin).toBe(false);
    });

    it('should return isAdmin: true when logged in', async () => {
      await loginAsAdmin();

      const res = await agent.get('/api/admin/session');

      expect(res.status).toBe(200);
      expect(res.body.isAdmin).toBe(true);
    });
  });

  describe('POST /api/admin/logout', () => {
    it('should clear session on logout', async () => {
      await loginAsAdmin();

      // Verify logged in
      let res = await agent.get('/api/admin/session');
      expect(res.body.isAdmin).toBe(true);

      // Logout
      res = await agent.post('/api/admin/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify logged out
      res = await agent.get('/api/admin/session');
      expect(res.body.isAdmin).toBe(false);
    });
  });

  describe('Protected Routes - Unauthorized Access', () => {
    it('should return 401 for GET /api/admin/contenders without auth', async () => {
      const res = await request(app).get('/api/admin/contenders');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('לא מורשה');
    });

    it('should return 401 for GET /api/admin/cycles without auth', async () => {
      const res = await request(app).get('/api/admin/cycles');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/contenders', () => {
    it('should return all contenders with stats', async () => {
      await loginAsAdmin();

      const contender = {
        ...testData.contender(),
        _count: { loves: 10, guesses: 5, voteSelections: 3 },
      };
      mockPrisma.contender.findMany = vi.fn().mockResolvedValue([contender]);

      const res = await agent.get('/api/admin/contenders');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]._count).toEqual({
        loves: 10,
        guesses: 5,
        voteSelections: 3,
      });
    });
  });

  describe('POST /api/admin/contenders', () => {
    it('should return 400 when nickname is missing', async () => {
      await loginAsAdmin();

      const res = await agent
        .post('/api/admin/contenders')
        .send({ imagePublicId: 'img/test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא להזין כינוי');
    });

    it('should return 400 when imagePublicId is missing', async () => {
      await loginAsAdmin();

      const res = await agent
        .post('/api/admin/contenders')
        .send({ nickname: 'הזמר המסתורי' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא להזין מזהה תמונה');
    });

    it('should create contender successfully', async () => {
      await loginAsAdmin();

      const newContender = testData.contender();
      mockPrisma.contender.create = vi.fn().mockResolvedValue(newContender);

      const res = await agent.post('/api/admin/contenders').send({
        nickname: 'הזמר המסתורי',
        imagePublicId: 'mize/contenders/singer1',
        videos: [{ title: 'פרק 1', publicId: 'mize/videos/ep1' }],
      });

      expect(res.status).toBe(201);
      expect(mockPrisma.contender.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nickname: 'הזמר המסתורי',
          imagePublicId: 'mize/contenders/singer1',
        }),
      });
    });
  });

  describe('PUT /api/admin/contenders/:id', () => {
    it('should return 404 when contender not found', async () => {
      await loginAsAdmin();
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(null);

      const res = await agent
        .put('/api/admin/contenders/nonexistent')
        .send({ nickname: 'שם חדש' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('מתמודד לא נמצא');
    });

    it('should update contender successfully', async () => {
      await loginAsAdmin();

      const existing = testData.contender();
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(existing);
      mockPrisma.contender.update = vi
        .fn()
        .mockResolvedValue({ ...existing, nickname: 'שם חדש' });

      const res = await agent
        .put('/api/admin/contenders/contender-1')
        .send({ nickname: 'שם חדש', isActive: false });

      expect(res.status).toBe(200);
      expect(mockPrisma.contender.update).toHaveBeenCalledWith({
        where: { id: 'contender-1' },
        data: expect.objectContaining({ nickname: 'שם חדש', isActive: false }),
      });
    });
  });

  describe('DELETE /api/admin/contenders/:id', () => {
    it('should return 404 when contender not found', async () => {
      await loginAsAdmin();
      mockPrisma.contender.findUnique = vi.fn().mockResolvedValue(null);

      const res = await agent.delete('/api/admin/contenders/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should delete contender successfully', async () => {
      await loginAsAdmin();

      mockPrisma.contender.findUnique = vi
        .fn()
        .mockResolvedValue(testData.contender());
      mockPrisma.contender.delete = vi.fn().mockResolvedValue({});

      const res = await agent.delete('/api/admin/contenders/contender-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/contenders/:id/guesses', () => {
    it('should return guesses for contender', async () => {
      await loginAsAdmin();

      const guesses = [
        { id: '1', displayName: 'יוסי', guessText: 'אייל גולן', createdAt: new Date() },
        { id: '2', displayName: 'דנה', guessText: 'משה פרץ', createdAt: new Date() },
      ];
      mockPrisma.guess.findMany = vi.fn().mockResolvedValue(guesses);

      const res = await agent.get('/api/admin/contenders/contender-1/guesses');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/admin/cycles', () => {
    it('should return all cycles with vote counts', async () => {
      await loginAsAdmin();

      const cycles = [
        { ...testData.voteCycle(), _count: { votes: 25 } },
        { ...testData.voteCycle({ id: 'cycle-2' }), _count: { votes: 10 } },
      ];
      mockPrisma.voteCycle.findMany = vi.fn().mockResolvedValue(cycles);

      const res = await agent.get('/api/admin/cycles');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]._count.votes).toBe(25);
    });
  });

  describe('POST /api/admin/cycles', () => {
    it('should return 400 when dates are missing', async () => {
      await loginAsAdmin();

      const res = await agent.post('/api/admin/cycles').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('נא להזין תאריכי התחלה וסיום');
    });

    it('should return 400 when endAt is before startAt', async () => {
      await loginAsAdmin();

      const res = await agent.post('/api/admin/cycles').send({
        startAt: '2024-12-31T00:00:00Z',
        endAt: '2024-01-01T00:00:00Z',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('תאריך סיום חייב להיות אחרי תאריך התחלה');
    });

    it('should return 400 for overlapping cycles', async () => {
      await loginAsAdmin();

      mockPrisma.voteCycle.findFirst = vi
        .fn()
        .mockResolvedValue(testData.voteCycle());

      const res = await agent.post('/api/admin/cycles').send({
        startAt: '2024-06-01T00:00:00Z',
        endAt: '2024-06-30T23:59:59Z',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('קיים מחזור חופף בתאריכים אלה');
    });

    it('should create cycle successfully', async () => {
      await loginAsAdmin();

      mockPrisma.voteCycle.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.voteCycle.create = vi
        .fn()
        .mockResolvedValue(testData.voteCycle());

      const res = await agent.post('/api/admin/cycles').send({
        startAt: '2025-01-01T00:00:00Z',
        endAt: '2025-01-31T23:59:59Z',
        maxVotesPerUser: 5,
      });

      expect(res.status).toBe(201);
      expect(mockPrisma.voteCycle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ maxVotesPerUser: 5 }),
      });
    });
  });

  describe('POST /api/admin/cycles/:id/close', () => {
    it('should return 404 when cycle not found', async () => {
      await loginAsAdmin();
      mockPrisma.voteCycle.findUnique = vi.fn().mockResolvedValue(null);

      const res = await agent.post('/api/admin/cycles/nonexistent/close');

      expect(res.status).toBe(404);
    });

    it('should return 400 when already closed', async () => {
      await loginAsAdmin();

      mockPrisma.voteCycle.findUnique = vi
        .fn()
        .mockResolvedValue(testData.voteCycle({ closedAt: new Date() }));

      const res = await agent.post('/api/admin/cycles/cycle-1/close');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('המחזור כבר סגור');
    });

    it('should close cycle successfully', async () => {
      await loginAsAdmin();

      mockPrisma.voteCycle.findUnique = vi
        .fn()
        .mockResolvedValue(testData.voteCycle());
      mockPrisma.voteCycle.update = vi
        .fn()
        .mockResolvedValue({ ...testData.voteCycle(), closedAt: new Date() });

      const res = await agent.post('/api/admin/cycles/cycle-1/close');

      expect(res.status).toBe(200);
      expect(mockPrisma.voteCycle.update).toHaveBeenCalledWith({
        where: { id: 'cycle-1' },
        data: { closedAt: expect.any(Date) },
      });
    });
  });

  describe('DELETE /api/admin/cycles/:id', () => {
    it('should delete cycle successfully', async () => {
      await loginAsAdmin();

      mockPrisma.voteCycle.findUnique = vi
        .fn()
        .mockResolvedValue(testData.voteCycle());
      mockPrisma.voteCycle.delete = vi.fn().mockResolvedValue({});

      const res = await agent.delete('/api/admin/cycles/cycle-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/cycles/:id/results', () => {
    it('should return 404 when cycle not found', async () => {
      await loginAsAdmin();
      mockPrisma.voteCycle.findUnique = vi.fn().mockResolvedValue(null);

      const res = await agent.get('/api/admin/cycles/nonexistent/results');

      expect(res.status).toBe(404);
    });

    it('should return aggregated results', async () => {
      await loginAsAdmin();

      const cycle = {
        ...testData.voteCycle(),
        votes: [
          {
            displayName: 'יוסי',
            selections: [
              { contenderId: 'c1', contender: { id: 'c1', nickname: 'זמר א', imagePublicId: 'img1' } },
              { contenderId: 'c2', contender: { id: 'c2', nickname: 'זמרת ב', imagePublicId: 'img2' } },
            ],
          },
          {
            displayName: 'דנה',
            selections: [
              { contenderId: 'c1', contender: { id: 'c1', nickname: 'זמר א', imagePublicId: 'img1' } },
            ],
          },
        ],
      };
      mockPrisma.voteCycle.findUnique = vi.fn().mockResolvedValue(cycle);

      const res = await agent.get('/api/admin/cycles/cycle-1/results');

      expect(res.status).toBe(200);
      expect(res.body.totalVotes).toBe(2);
      expect(res.body.results).toHaveLength(2);
      // c1 should be first with 2 votes
      expect(res.body.results[0].contender.id).toBe('c1');
      expect(res.body.results[0].count).toBe(2);
      expect(res.body.results[0].voters).toContain('יוסי');
      expect(res.body.results[0].voters).toContain('דנה');
      // c2 should have 1 vote
      expect(res.body.results[1].contender.id).toBe('c2');
      expect(res.body.results[1].count).toBe(1);
    });
  });
});

