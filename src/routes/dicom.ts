import { Router } from 'express';
import { auth } from '../middlewares/auth';

const router = Router();

// Protected routes
router.use(auth);

// Get DICOM files
router.get('/', (req, res) => {
  res.json({ message: 'DICOM route' });
});

export default router; 