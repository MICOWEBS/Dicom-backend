import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { DicomFile } from '../entities/DicomFile';
import { AppDataSource } from '../ormconfig';
import { User, SubscriptionTier } from '../entities/User';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: SubscriptionTier;
  };
  params: {
    id?: string;
  };
}

interface AuthResponse extends Response {
  headers: { [key: string]: string | string[] | undefined };
}

const router = Router();
const dicomRepository = AppDataSource.getRepository(DicomFile);

// Start inference on a DICOM file
const startInference = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    const fileId = req.params.id;
    if (!fileId) {
      res.status(400).json({ message: 'File ID is required' });
      return;
    }

    const file = await dicomRepository.findOne({
      where: { 
        id: fileId,
        userId: req.user?.id 
      }
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Update file status to processing
    file.aiResults = {
      ...file.aiResults,
      status: 'processing',
      startedAt: new Date().toISOString()
    };
    await dicomRepository.save(file);

    // TODO: Start actual inference process here
    // This is a placeholder for the actual inference logic

    res.json({ 
      message: 'Inference started',
      fileId: file.id
    });
  } catch (error) {
    console.error('Start inference error:', error);
    res.status(500).json({ message: 'Error starting inference' });
  }
};

// Get inference status for a DICOM file
const getInferenceStatus = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    const fileId = req.params.id;
    if (!fileId) {
      res.status(400).json({ message: 'File ID is required' });
      return;
    }

    const file = await dicomRepository.findOne({
      where: { 
        id: fileId,
        userId: req.user?.id 
      }
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    res.json({
      fileId: file.id,
      status: file.aiResults?.status || 'pending',
      startedAt: file.aiResults?.startedAt,
      completedAt: file.aiResults?.completedAt,
      results: file.aiResults?.predictions || []
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ message: 'Error getting inference status' });
  }
};

// Apply auth middleware to protected routes
router.post('/:id', authenticateToken, startInference);
router.get('/status/:id', authenticateToken, getInferenceStatus);

export default router; 