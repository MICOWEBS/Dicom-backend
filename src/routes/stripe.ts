import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { AppDataSource } from '../ormconfig';
import { User, SubscriptionTier } from '../entities/User';
import { authenticateToken } from '../middlewares/auth';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: SubscriptionTier;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  body: {
    tier: SubscriptionTier;
  };
}

interface AuthResponse extends Response {
  headers: { [key: string]: string | string[] | undefined };
}

const router = Router();

// Initialize Stripe with best practices configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',  // Latest stable version
  typescript: true,          // Better TypeScript support
  timeout: 20000,           // 20 second timeout
  maxNetworkRetries: 3,     // Better error handling
  telemetry: true,          // Help Stripe improve their service
});

const SUBSCRIPTION_PRICES = {
  pro: 'price_pro_id', // Replace with actual Stripe price IDs
  enterprise: 'price_enterprise_id'
};

router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res: AuthResponse) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { tier } = req.body;
    if (!SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES]) {
      return res.status(400).json({ message: 'Invalid subscription tier' });
    }

    // Create or get Stripe customer
    let customer: string;
    if (req.user.stripeCustomerId) {
      customer = req.user.stripeCustomerId;
    } else {
      const customerData = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id
        }
      });
      customer = customerData.id;

      // Update user with Stripe customer ID
      await AppDataSource.getRepository(User).update(req.user.id, {
        stripeCustomerId: customer
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer,
      line_items: [
        {
          price: SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: req.user.id,
        tier
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/webhook', async (req: Request & { body: any }, res: Response) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as SubscriptionTier;

        if (userId && tier) {
          await AppDataSource.getRepository(User).update(userId, {
            subscriptionTier: tier,
            stripeSubscriptionId: session.subscription as string
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await AppDataSource.getRepository(User).findOne({
          where: { stripeSubscriptionId: subscription.id }
        });

        if (user) {
          await AppDataSource.getRepository(User).update(user.id, {
            subscriptionTier: 'free' as SubscriptionTier,
            stripeSubscriptionId: undefined
          });
        }
        break;
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ 
      message: 'Webhook error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/subscription', authenticateToken, async (req: AuthRequest, res: AuthResponse) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.user.stripeSubscriptionId) {
      return res.json({ subscription: null });
    }

    const subscription = await stripe.subscriptions.retrieve(req.user.stripeSubscriptionId);
    return res.json({ subscription });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      message: 'Error fetching subscription',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/cancel', authenticateToken, async (req: AuthRequest, res: AuthResponse) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.user.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription' });
    }

    await stripe.subscriptions.cancel(req.user.stripeSubscriptionId);
    return res.json({ message: 'Subscription cancelled' });
  } catch (error) {
    console.error('Cancellation error:', error);
    return res.status(500).json({ 
      message: 'Error cancelling subscription',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 