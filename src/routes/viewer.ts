import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { AppDataSource } from '../ormconfig';
import { DicomFile } from '../entities/DicomFile';
import { authenticateToken } from '../middlewares/auth';
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

// Get DICOM file for viewing
const getDicomFile = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const file = await dicomRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Generate signed URL for secure access
    const signedUrl = cloudinary.utils.private_download_url(
      file.cloudinaryPublicId,
      'raw',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 } // URL expires in 1 hour
    );

    res.json({
      ...file,
      signedUrl
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Error retrieving file' });
  }
};

// Apply auth middleware to protected routes
router.get('/:id', authenticateToken, getDicomFile);

router.get('/:id/metadata', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const dicomFile = await dicomRepository.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!dicomFile) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.json(dicomFile.metadata);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching metadata' });
  }
});

router.get('/:id/ai-results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const dicomFile = await dicomRepository.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!dicomFile) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.json(dicomFile.aiResults);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching AI results' });
  }
});

export default router; 