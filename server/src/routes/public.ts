import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  hashFingerprint,
  validateFingerprintSignals,
  FingerprintSignals,
} from '../services/fingerprint.js';

/**
 * Public API Routes
 * All routes automatically receive device token from middleware
 */
export function publicRoutes(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * GET /api/config
   * Returns active cycle info and configuration
   */
  router.get('/config', async (_req: Request, res: Response) => {
    try {
      const now = new Date();

      // Find active cycle (started, not ended, not manually closed)
      const activeCycle = await prisma.voteCycle.findFirst({
        where: {
          startAt: { lte: now },
          endAt: { gt: now },
          closedAt: null,
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          maxVotesPerUser: true,
        },
      });

      // Get app config (create if doesn't exist) - fail gracefully if table doesn't exist
      let showLikeButton = true;
      try {
        const appConfig = await prisma.appConfig.upsert({
          where: { id: 'singleton' },
          create: { id: 'singleton', showLikeButton: true },
          update: {},
        });
        showLikeButton = appConfig.showLikeButton;
      } catch (configError) {
        console.warn('AppConfig table may not exist yet, using defaults:', configError);
      }

      res.json({
        activeCycle,
        hasActiveCycle: !!activeCycle,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        showLikeButton,
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * GET /api/contenders/:id
   * Returns single contender with guess word frequencies for word cloud
   */
  router.get('/contenders/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deviceToken = req.deviceToken;

      const contender = await prisma.contender.findUnique({
        where: { id },
        include: {
          guesses: {
            select: { guessText: true },
          },
          _count: {
            select: { loves: true },
          },
          loves: {
            where: { deviceToken },
            select: { id: true },
          },
        },
      });

      if (!contender || contender.status === 'hidden') {
        res.status(404).json({ error: 'מתמודד לא נמצא' });
        return;
      }

      // Aggregate guesses into word frequencies
      const guessFrequencies = new Map<string, number>();
      for (const guess of contender.guesses) {
        const text = guess.guessText.trim();
        if (text) {
          guessFrequencies.set(text, (guessFrequencies.get(text) || 0) + 1);
        }
      }

      const guessWords = Array.from(guessFrequencies.entries())
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value);

      res.json({
        id: contender.id,
        nickname: contender.nickname,
        status: contender.status,
        imagePublicId: contender.imagePublicId,
        videos: contender.videos,
        loveCount: contender._count.loves,
        isLovedByUser: contender.loves.length > 0,
        guessWords,
      });
    } catch (error) {
      console.error('Error fetching contender detail:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * GET /api/contenders
   * Returns all contenders with love counts
   */
  router.get('/contenders', async (req: Request, res: Response) => {
    try {
      const deviceToken = req.deviceToken;

      const contenders = await prisma.contender.findMany({
        where: { status: { not: 'hidden' } },
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: { loves: true },
          },
          loves: {
            where: { deviceToken },
            select: { id: true },
          },
        },
      });

      // Transform to include loveCount and isLovedByUser
      const result = contenders.map((c) => ({
        id: c.id,
        nickname: c.nickname,
        status: c.status,
        imagePublicId: c.imagePublicId,
        videos: c.videos,
        loveCount: c._count.loves,
        isLovedByUser: c.loves.length > 0,
      }));

      res.json(result);
    } catch (error) {
      console.error('Error fetching contenders:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * POST /api/contenders/:id/love
   * Add love to a contender (toggle - creates if not exists)
   */
  router.post('/contenders/:id/love', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deviceToken = req.deviceToken;
      const { fingerprint } = req.body;

      // Validate fingerprint
      if (!validateFingerprintSignals(fingerprint)) {
        res.status(400).json({ error: 'חסרים נתוני מכשיר' });
        return;
      }

      const fingerprintHash = hashFingerprint(fingerprint as FingerprintSignals);

      // Check if contender exists and is not hidden
      const contender = await prisma.contender.findUnique({
        where: { id },
      });

      if (!contender || contender.status === 'hidden') {
        res.status(404).json({ error: 'מתמודד לא נמצא' });
        return;
      }

      // Check if already loved
      const existingLove = await prisma.love.findUnique({
        where: {
          contenderId_deviceToken: {
            contenderId: id,
            deviceToken,
          },
        },
      });

      if (existingLove) {
        // Remove love (toggle off)
        await prisma.love.delete({
          where: { id: existingLove.id },
        });

        const count = await prisma.love.count({
          where: { contenderId: id },
        });

        res.json({ loved: false, loveCount: count });
        return;
      }

      // Create new love
      await prisma.love.create({
        data: {
          contenderId: id,
          deviceToken,
          fingerprintHash,
        },
      });

      const count = await prisma.love.count({
        where: { contenderId: id },
      });

      res.json({ loved: true, loveCount: count });
    } catch (error) {
      console.error('Error toggling love:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * POST /api/contenders/:id/guess
   * Submit a guess for who the contender really is
   */
  router.post('/contenders/:id/guess', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deviceToken = req.deviceToken;
      const { displayName, guessText, fingerprint } = req.body;

      // Validate input
      if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
        res.status(400).json({ error: 'נא להזין שם' });
        return;
      }

      if (!guessText || typeof guessText !== 'string' || guessText.trim().length === 0) {
        res.status(400).json({ error: 'נא להזין ניחוש' });
        return;
      }

      if (!validateFingerprintSignals(fingerprint)) {
        res.status(400).json({ error: 'חסרים נתוני מכשיר' });
        return;
      }

      const fingerprintHash = hashFingerprint(fingerprint as FingerprintSignals);

      // Check if contender exists and is not hidden
      const contender = await prisma.contender.findUnique({
        where: { id },
      });

      if (!contender || contender.status === 'hidden') {
        res.status(404).json({ error: 'מתמודד לא נמצא' });
        return;
      }

      // Create guess
      await prisma.guess.create({
        data: {
          contenderId: id,
          displayName: displayName.trim(),
          guessText: guessText.trim(),
          deviceToken,
          fingerprintHash,
        },
      });

      res.json({ success: true, message: 'הניחוש נשמר!' });
    } catch (error) {
      console.error('Error submitting guess:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * GET /api/vote
   * Check if user has voted in the active cycle
   */
  router.get('/vote', async (req: Request, res: Response) => {
    try {
      const deviceToken = req.deviceToken;
      const now = new Date();

      // Find active cycle
      const activeCycle = await prisma.voteCycle.findFirst({
        where: {
          startAt: { lte: now },
          endAt: { gt: now },
          closedAt: null,
        },
      });

      if (!activeCycle) {
        res.json({ activeCycle: null, hasVoted: false, vote: null });
        return;
      }

      // Check if user already voted in this cycle
      const existingVote = await prisma.vote.findFirst({
        where: {
          cycleId: activeCycle.id,
          deviceToken,
        },
        include: {
          selections: {
            include: {
              contender: {
                select: { id: true, nickname: true, imagePublicId: true },
              },
            },
          },
        },
      });

      res.json({
        activeCycle: {
          id: activeCycle.id,
          startAt: activeCycle.startAt,
          endAt: activeCycle.endAt,
          maxVotesPerUser: activeCycle.maxVotesPerUser,
        },
        hasVoted: !!existingVote,
        vote: existingVote
          ? {
              id: existingVote.id,
              selections: existingVote.selections.map((s) => ({
                id: s.contender.id,
                nickname: s.contender.nickname,
                imagePublicId: s.contender.imagePublicId,
              })),
            }
          : null,
      });
    } catch (error) {
      console.error('Error checking vote status:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  /**
   * POST /api/vote
   * Submit vote selections for the active cycle
   */
  router.post('/vote', async (req: Request, res: Response) => {
    try {
      const deviceToken = req.deviceToken;
      const { displayName, selections, fingerprint } = req.body;
      const now = new Date();

      // Validate input
      if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
        res.status(400).json({ error: 'נא להזין שם' });
        return;
      }

      if (!Array.isArray(selections) || selections.length === 0) {
        res.status(400).json({ error: 'נא לבחור לפחות מתמודד אחד' });
        return;
      }

      if (!validateFingerprintSignals(fingerprint)) {
        res.status(400).json({ error: 'חסרים נתוני מכשיר' });
        return;
      }

      const fingerprintHash = hashFingerprint(fingerprint as FingerprintSignals);

      // Find active cycle
      const activeCycle = await prisma.voteCycle.findFirst({
        where: {
          startAt: { lte: now },
          endAt: { gt: now },
          closedAt: null,
        },
      });

      if (!activeCycle) {
        res.status(400).json({ error: 'אין מחזור הצבעה פעיל כרגע' });
        return;
      }

      // Validate selection count
      if (selections.length > activeCycle.maxVotesPerUser) {
        res.status(400).json({
          error: `ניתן לבחור עד ${activeCycle.maxVotesPerUser} מתמודדים`,
        });
        return;
      }

      // Check if user already voted (by device token)
      const existingVoteByToken = await prisma.vote.findUnique({
        where: {
          cycleId_deviceToken: {
            cycleId: activeCycle.id,
            deviceToken,
          },
        },
      });

      // Check if user already voted (by fingerprint) - for new votes only
      if (!existingVoteByToken) {
        const existingVoteByFingerprint = await prisma.vote.findFirst({
          where: {
            cycleId: activeCycle.id,
            fingerprintHash,
          },
        });

        if (existingVoteByFingerprint) {
          res.status(403).json({ error: 'כבר הצבעת ממכשיר זה' });
          return;
        }
      }

      // Validate all selections are active contenders (status = 'active')
      const validContenders = await prisma.contender.findMany({
        where: {
          id: { in: selections },
          status: 'active',
        },
        select: { id: true },
      });

      if (validContenders.length !== selections.length) {
        res.status(400).json({ error: 'חלק מהמתמודדים שנבחרו אינם זמינים להצבעה' });
        return;
      }

      // Create or update vote in a transaction
      const isUpdate = !!existingVoteByToken;
      
      const vote = await prisma.$transaction(async (tx) => {
        // If updating, delete the old vote and its selections
        if (existingVoteByToken) {
          await tx.voteSelection.deleteMany({
            where: { voteId: existingVoteByToken.id },
          });
          await tx.vote.delete({
            where: { id: existingVoteByToken.id },
          });
        }

        // Create new vote
        const newVote = await tx.vote.create({
          data: {
            cycleId: activeCycle.id,
            displayName: displayName.trim(),
            deviceToken,
            fingerprintHash,
          },
        });

        await tx.voteSelection.createMany({
          data: selections.map((contenderId: string) => ({
            voteId: newVote.id,
            contenderId,
          })),
        });

        return newVote;
      });

      res.json({
        success: true,
        message: isUpdate ? 'ההצבעה עודכנה בהצלחה!' : 'ההצבעה נקלטה בהצלחה!',
        voteId: vote.id,
        updated: isUpdate,
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  return router;
}
