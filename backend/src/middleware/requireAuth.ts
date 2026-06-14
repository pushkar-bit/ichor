import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Use Clerk's built-in express middleware to validate the session token
  const authMiddleware = ClerkExpressRequireAuth();
  
  (authMiddleware as any)(req, res, (err: any) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized', details: err });
    }
    next();
  });
};

// Extend express Request type to include auth
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string;
        sessionId: string;
        getToken: () => Promise<string>;
        claims: Record<string, any>;
      };
    }
  }
}
