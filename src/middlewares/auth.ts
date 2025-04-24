import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import { AppDataSource } from '../ormconfig';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: 'free' | 'pro' | 'enterprise';
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string };

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      select: ['id', 'email', 'subscriptionTier'],
    });

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    };

    next();
    return;
  } catch (error) {
    console.error('Token authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
};

export const checkSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (req.user.subscriptionTier === 'free') {
      const dicomRepository = AppDataSource.getRepository('DicomFile');
      const uploadCount = await dicomRepository.count({
        where: { userId: req.user.id },
      });

      if (uploadCount >= 5) {
        res.status(403).json({
          message: 'Free tier limit exceeded. Please upgrade your subscription.',
        });
        return;
      }
    }

    next();
    return;
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ message: 'Error checking subscription' });
    return;
  }
};
