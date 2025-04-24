import { Request, Response, NextFunction } from '../types/express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../ormconfig';
import { User, SubscriptionTier } from '../entities/User';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: SubscriptionTier;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { 
      id: string; 
      email: string;
      subscriptionTier: SubscriptionTier;
    };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token.' });
  }
};

export const checkSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (req.user.subscriptionTier === 'free') {
      // Check if user has exceeded free tier limits
      const dicomRepository = AppDataSource.getRepository('DicomFile');
      const uploadCount = await dicomRepository.count({
        where: { userId: req.user.id }
      });

      if (uploadCount >= 5) {
        res.status(403).json({ message: 'Free tier limit exceeded. Please upgrade your subscription.' });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ message: 'Error checking subscription' });
  }
}; 