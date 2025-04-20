import { Router } from 'express';
import { auth } from '../middlewares/auth';

const router = Router();

// Protected routes
router.use(auth);

// Get current subscription
router.get('/', (req, res) => {
  res.json({ message: 'Subscription route' });
});

export default router; 