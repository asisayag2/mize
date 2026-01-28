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

      res.json({
        activeCycle,
        hasActiveCycle: !!activeCycle,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      });
    } catch (error) {
      console.error('Error fetching config:', error);
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
        where: { isVisible: true },
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
        isActive: c.isActive,
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

      // Check if contender exists and is visible
      const contender = await prisma.contender.findUnique({
        where: { id },
      });

      if (!contender || !contender.isVisible) {
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

      // Check if contender exists and is visible
      const contender = await prisma.contender.findUnique({
        where: { id },
      });

      if (!contender || !contender.isVisible) {
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

      if (existingVoteByToken) {
        res.status(403).json({ error: 'כבר הצבעת במחזור הזה' });
        return;
      }

      // Check if user already voted (by fingerprint) - anti-cheat
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

      // Validate all selections are active and visible contenders
      const validContenders = await prisma.contender.findMany({
        where: {
          id: { in: selections },
          isActive: true,
          isVisible: true,
        },
        select: { id: true },
      });

      if (validContenders.length !== selections.length) {
        res.status(400).json({ error: 'חלק מהמתמודדים שנבחרו אינם זמינים להצבעה' });
        return;
      }

      // Create vote with selections in a transaction
      const vote = await prisma.$transaction(async (tx) => {
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
        message: 'ההצבעה נקלטה בהצלחה!',
        voteId: vote.id,
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  return router;
}
