import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/users/sync: Sync authenticated user to database
router.post('/sync', requireAuth, async (req: any, res) => {
  const { clerkId, email, name, avatarUrl } = req.body;
  
  if (!clerkId || !email) {
    return res.status(400).json({ error: 'clerkId and email are required' });
  }

  // Domain validation
  const allowedDomain = process.env.EXPO_PUBLIC_ALLOWED_DOMAIN;
  if (allowedDomain) {
    const emailDomain = email.split('@')[1];
    if (emailDomain !== allowedDomain) {
      return res.status(403).json({ error: `Dhaav is exclusive to @${allowedDomain} accounts.` });
    }
  }

  try {
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { email, name, avatarUrl },
      create: {
        clerkId,
        email,
        name,
        avatarUrl,
      },
    });
    res.json(user);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Database sync error' });
  }
});

// GET /api/users/profile: Fetch current user profile (merged data)
router.get('/profile', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: req.userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// PATCH /api/users/profile: Update name, bio, avatarUrl
router.patch('/profile', requireAuth, async (req: any, res) => {
  const { name, bio, avatarUrl } = req.body;
  try {
    const user = await prisma.user.update({
      where: { clerkId: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Database update error' });
  }
});

// PATCH /api/users/fcm-token: Save FCM push token
router.patch('/fcm-token', requireAuth, async (req: any, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return res.status(400).json({ error: 'fcmToken is required' });
  }
  try {
    const user = await prisma.user.update({
      where: { clerkId: req.userId },
      data: { fcmToken },
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ error: 'Database token update error' });
  }
});

export default router;
