import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { requireAdmin } from '../middleware/adminAuth.js';

/**
 * Admin API Routes
 * Protected by session-based authentication
 */
export function adminRoutes(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/admin/login
   * Authenticate admin with password
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { password } = req.body;

      if (!password) {
        res.status(400).json({ error: 'נא להזין סיסמה' });
        return;
      }

      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        console.error('ADMIN_PASSWORD not configured');
        res.status(500).json({ error: 'שגיאת תצורה' });
        return;
      }

      // Compare with hashed password or plain text (for dev)
      const isValid =
        password === adminPassword ||
        (await bcrypt.compare(password, adminPassword).catch(() => false));

      if (!isValid) {
        res.status(401).json({ error: 'סיסמה שגויה' });
        return;
      }

      req.session.isAdmin = true;
      res.json({ success: true, message: 'התחברת בהצלחה' });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * POST /api/admin/logout
   */
  router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'שגיאה בהתנתקות' });
        return;
      }
      res.json({ success: true });
    });
  });

  /**
   * GET /api/admin/session
   * Check if current session is authenticated
   */
  router.get('/session', (req: Request, res: Response) => {
    res.json({ isAdmin: !!req.session.isAdmin });
  });

  // All routes below require admin authentication
  router.use(requireAdmin);

  // ==================== CONTENDERS ====================

  /**
   * GET /api/admin/contenders
   * List all contenders with stats
   */
  router.get('/contenders', async (_req: Request, res: Response) => {
    try {
      const contenders = await prisma.contender.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: {
              loves: true,
              guesses: true,
              voteSelections: true,
            },
          },
        },
      });

      // Transform to include loveCount and guessCount at top level
      const result = contenders.map((c) => ({
        ...c,
        loveCount: c._count.loves,
        guessCount: c._count.guesses,
        voteCount: c._count.voteSelections,
      }));

      res.json(result);
    } catch (error) {
      console.error('Error fetching contenders:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * POST /api/admin/contenders
   * Create a new contender
   */
  router.post('/contenders', async (req: Request, res: Response) => {
    try {
      const { nickname, imagePublicId, videos, status } = req.body;

      if (!nickname || typeof nickname !== 'string') {
        res.status(400).json({ error: 'נא להזין כינוי' });
        return;
      }

      if (!imagePublicId || typeof imagePublicId !== 'string') {
        res.status(400).json({ error: 'נא להזין מזהה תמונה' });
        return;
      }

      // Validate status if provided
      const validStatuses = ['active', 'inactive', 'hidden'];
      if (status && !validStatuses.includes(status)) {
        res.status(400).json({ error: 'סטטוס לא תקין' });
        return;
      }

      const contender = await prisma.contender.create({
        data: {
          nickname: nickname.trim(),
          imagePublicId: imagePublicId.trim(),
          videos: videos || [],
          status: status || 'active',
        },
      });

      res.status(201).json(contender);
    } catch (error) {
      console.error('Error creating contender:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * PUT /api/admin/contenders/:id
   * Update a contender
   */
  router.put('/contenders/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { nickname, imagePublicId, videos, status } = req.body;

      const existing = await prisma.contender.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'מתמודד לא נמצא' });
        return;
      }

      // Validate status if provided
      const validStatuses = ['active', 'inactive', 'hidden'];
      if (status !== undefined && !validStatuses.includes(status)) {
        res.status(400).json({ error: 'סטטוס לא תקין' });
        return;
      }

      const contender = await prisma.contender.update({
        where: { id },
        data: {
          ...(nickname && { nickname: nickname.trim() }),
          ...(imagePublicId && { imagePublicId: imagePublicId.trim() }),
          ...(videos !== undefined && { videos }),
          ...(status !== undefined && { status }),
        },
      });

      res.json(contender);
    } catch (error) {
      console.error('Error updating contender:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * DELETE /api/admin/contenders/:id
   * Delete a contender
   */
  router.delete('/contenders/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.contender.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'מתמודד לא נמצא' });
        return;
      }

      await prisma.contender.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting contender:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * GET /api/admin/contenders/:id/guesses
   * Get all guesses for a contender
   */
  router.get('/contenders/:id/guesses', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const guesses = await prisma.guess.findMany({
        where: { contenderId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          guessText: true,
          createdAt: true,
        },
      });

      res.json(guesses);
    } catch (error) {
      console.error('Error fetching guesses:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * GET /api/admin/contenders/:id/stats
   * Get contender stats including guesses and love count
   */
  router.get('/contenders/:id/stats', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const contender = await prisma.contender.findUnique({
        where: { id },
        include: {
          _count: {
            select: { loves: true },
          },
          guesses: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              displayName: true,
              guessText: true,
              createdAt: true,
            },
          },
        },
      });

      if (!contender) {
        res.status(404).json({ error: 'מתמודד לא נמצא' });
        return;
      }

      res.json({
        id: contender.id,
        nickname: contender.nickname,
        loveCount: contender._count.loves,
        guesses: contender.guesses,
      });
    } catch (error) {
      console.error('Error fetching contender stats:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  // ==================== GUESSES ====================

  /**
   * PUT /api/admin/guesses/:id
   * Update a guess (edit guessText)
   */
  router.put('/guesses/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { guessText } = req.body;

      if (!guessText || typeof guessText !== 'string' || guessText.trim().length === 0) {
        res.status(400).json({ error: 'נא להזין טקסט ניחוש' });
        return;
      }

      const guess = await prisma.guess.update({
        where: { id },
        data: { guessText: guessText.trim() },
      });

      res.json(guess);
    } catch (error) {
      console.error('Error updating guess:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * DELETE /api/admin/guesses/:id
   * Delete a guess
   */
  router.delete('/guesses/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.guess.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting guess:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  // ==================== VOTE CYCLES ====================

  /**
   * GET /api/admin/cycles
   * List all vote cycles with computed status
   */
  router.get('/cycles', async (_req: Request, res: Response) => {
    try {
      const cycles = await prisma.voteCycle.findMany({
        orderBy: { startAt: 'desc' },
        include: {
          _count: {
            select: { votes: true },
          },
        },
      });

      const now = new Date();
      
      // Transform to include computed status and voteCount
      const result = cycles.map((cycle) => {
        let status: 'scheduled' | 'active' | 'ended' | 'closed';
        
        if (cycle.closedAt) {
          status = 'closed';
        } else if (new Date(cycle.startAt) > now) {
          status = 'scheduled';
        } else if (new Date(cycle.endAt) <= now) {
          status = 'ended';
        } else {
          status = 'active';
        }

        return {
          id: cycle.id,
          startAt: cycle.startAt,
          endAt: cycle.endAt,
          closedAt: cycle.closedAt,
          effectiveEndAt: cycle.closedAt || cycle.endAt,
          maxVotesPerUser: cycle.maxVotesPerUser,
          voteCount: cycle._count.votes,
          status,
          createdAt: cycle.createdAt,
        };
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * POST /api/admin/cycles
   * Create a new vote cycle
   */
  router.post('/cycles', async (req: Request, res: Response) => {
    try {
      const { startAt, endAt, maxVotesPerUser } = req.body;

      if (!startAt || !endAt) {
        res.status(400).json({ error: 'נא להזין תאריכי התחלה וסיום' });
        return;
      }

      const start = new Date(startAt);
      const end = new Date(endAt);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({ error: 'תאריכים לא תקינים' });
        return;
      }

      if (end <= start) {
        res.status(400).json({ error: 'תאריך סיום חייב להיות אחרי תאריך התחלה' });
        return;
      }

      // Check for overlapping cycles
      const overlapping = await prisma.voteCycle.findFirst({
        where: {
          closedAt: null,
          OR: [
            { startAt: { lte: end }, endAt: { gte: start } },
          ],
        },
      });

      if (overlapping) {
        res.status(400).json({ error: 'קיים מחזור חופף בתאריכים אלה' });
        return;
      }

      const cycle = await prisma.voteCycle.create({
        data: {
          startAt: start,
          endAt: end,
          maxVotesPerUser: maxVotesPerUser || 3,
        },
      });

      res.status(201).json(cycle);
    } catch (error) {
      console.error('Error creating cycle:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * PUT /api/admin/cycles/:id
   * Update a vote cycle
   */
  router.put('/cycles/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { startAt, endAt, maxVotesPerUser } = req.body;

      const existing = await prisma.voteCycle.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'מחזור לא נמצא' });
        return;
      }

      const updateData: Record<string, unknown> = {};

      if (startAt) {
        const start = new Date(startAt);
        if (isNaN(start.getTime())) {
          res.status(400).json({ error: 'תאריך התחלה לא תקין' });
          return;
        }
        updateData.startAt = start;
      }

      if (endAt) {
        const end = new Date(endAt);
        if (isNaN(end.getTime())) {
          res.status(400).json({ error: 'תאריך סיום לא תקין' });
          return;
        }
        updateData.endAt = end;
      }

      if (maxVotesPerUser !== undefined) {
        updateData.maxVotesPerUser = maxVotesPerUser;
      }

      const cycle = await prisma.voteCycle.update({
        where: { id },
        data: updateData,
      });

      res.json(cycle);
    } catch (error) {
      console.error('Error updating cycle:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * POST /api/admin/cycles/:id/close
   * Manually close a vote cycle
   */
  router.post('/cycles/:id/close', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.voteCycle.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'מחזור לא נמצא' });
        return;
      }

      if (existing.closedAt) {
        res.status(400).json({ error: 'המחזור כבר סגור' });
        return;
      }

      const cycle = await prisma.voteCycle.update({
        where: { id },
        data: { closedAt: new Date() },
      });

      res.json(cycle);
    } catch (error) {
      console.error('Error closing cycle:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * DELETE /api/admin/cycles/:id
   * Delete a vote cycle
   */
  router.delete('/cycles/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.voteCycle.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'מחזור לא נמצא' });
        return;
      }

      await prisma.voteCycle.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting cycle:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * GET /api/admin/cycles/:id/results
   * Get vote results with drilldown
   */
  router.get('/cycles/:id/results', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const cycle = await prisma.voteCycle.findUnique({
        where: { id },
        include: {
          votes: {
            include: {
              selections: {
                include: {
                  contender: {
                    select: { id: true, nickname: true, imagePublicId: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!cycle) {
        res.status(404).json({ error: 'מחזור לא נמצא' });
        return;
      }

      // Aggregate vote counts per contender
      const contenderVotes: Record<
        string,
        { contender: { id: string; nickname: string; imagePublicId: string }; count: number; voters: string[] }
      > = {};

      for (const vote of cycle.votes) {
        for (const selection of vote.selections) {
          const cid = selection.contenderId;
          if (!contenderVotes[cid]) {
            contenderVotes[cid] = {
              contender: selection.contender,
              count: 0,
              voters: [],
            };
          }
          contenderVotes[cid].count++;
          contenderVotes[cid].voters.push(vote.displayName);
        }
      }

      // Sort by count descending
      const results = Object.values(contenderVotes).sort((a, b) => b.count - a.count);

      res.json({
        cycle: {
          id: cycle.id,
          startAt: cycle.startAt,
          endAt: cycle.endAt,
          closedAt: cycle.closedAt,
          maxVotesPerUser: cycle.maxVotesPerUser,
        },
        totalVotes: cycle.votes.length,
        results,
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  return router;
}
