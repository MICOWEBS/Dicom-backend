import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../ormconfig';
import { User } from '../entities/User';

interface AuthRequest extends Request {
  user?: User;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

export const checkSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    if (req.user.subscriptionTier === 'free') {
      // Check if user has exceeded free tier limits
      const dicomRepository = AppDataSource.getRepository('DicomFile');
      const uploadCount = await dicomRepository.count({
        where: { userId: req.user.id }
      });

      if (uploadCount >= 5) {
        return res.status(403).json({
          message: 'Free tier limit reached. Please upgrade to continue uploading.'
        });
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
}; 