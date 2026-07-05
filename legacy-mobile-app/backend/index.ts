import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Webhook } from 'svix';
import { requireAuth } from './src/middleware/requireAuth';
import { prisma } from './src/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// ─── Clerk Webhook ────────────────────────────────────────────────────────────
// Needs raw body for Svix signature verification

app.post('/webhooks/clerk', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ success: false, message: 'Error: Missing svix headers' });
  }

  const payload = req.body;
  const body = payload.toString();

  let evt: any;

  try {
    const wh = new Webhook(SIGNING_SECRET);
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return res.status(400).json({ success: false, message: 'Error: Verification error' });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { email_addresses, first_name, last_name, image_url } = evt.data;
    const primaryEmail = email_addresses?.length > 0 ? email_addresses[0].email_address : '';
    const name = `${first_name || ''} ${last_name || ''}`.trim();

    try {
      await prisma.user.upsert({
        where: { clerkId: id },
        update: { email: primaryEmail, name, avatarUrl: image_url },
        create: { clerkId: id, email: primaryEmail, name, avatarUrl: image_url },
      });
      console.log(`[Dhaav] User ${id} upserted from webhook.`);
    } catch (error) {
      console.error('Error upserting user in webhook:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(200).json({ success: true, message: 'Webhook received' });
});

// ─── JSON middleware for all other routes ─────────────────────────────────────
app.use(express.json());

// ─── User Routes ──────────────────────────────────────────────────────────────

// Sync user after Clerk login (called by frontend)
app.post('/api/users/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth.userId;
    const { email, name, avatarUrl } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { email, name, avatarUrl },
      create: { clerkId, email, name, avatarUrl },
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error in /api/users/sync:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth.userId;
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        clan: {
          select: { id: true, name: true, tag: true, color: true },
        },
        badges: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error in /api/users/me:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/users/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth.userId;
    const { name, bio, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { clerkId },
      data: { name, bio, avatarUrl },
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error in PATCH /api/users/profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/users/fcm-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth.userId;
    const { fcmToken } = req.body;

    await prisma.user.update({
      where: { clerkId },
      data: { fcmToken },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/users/fcm-token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Dhaav', version: '1.0.0' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Dhaav API] Server running on port ${PORT}`);
});
