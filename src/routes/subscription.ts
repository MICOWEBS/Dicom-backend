import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { User, SubscriptionTier } from '../entities/User';
import { AppDataSource } from '../ormconfig';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: SubscriptionTier;
  };
  body: {
    tier: SubscriptionTier;
  };
}

interface AuthResponse extends Response {
  headers: { [key: string]: string | string[] | undefined };
}

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// Get current subscription
const getSubscription = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await userRepository.findOne({
      where: { id: req.user.id },
      select: ['id', 'email', 'subscriptionTier']
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      tier: user.subscriptionTier,
      limits: {
        uploads: user.subscriptionTier === 'free' ? 10 : user.subscriptionTier === 'pro' ? 50 : 1000
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Error getting subscription' });
  }
};

// Update subscription
const updateSubscription = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { tier } = req.body;
    if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
      res.status(400).json({ message: 'Invalid subscription tier' });
      return;
    }

    const user = await userRepository.findOne({
      where: { id: req.user.id }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.subscriptionTier = tier;
    await userRepository.save(user);

    res.json({
      message: 'Subscription updated successfully',
      tier: user.subscriptionTier,
      limits: {
        uploads: tier === 'free' ? 10 : tier === 'pro' ? 50 : 1000
      }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Error updating subscription' });
  }
};

// Apply auth middleware to protected routes
router.get('/', authenticateToken, getSubscription);
router.put('/', authenticateToken, updateSubscription);

export default router; 