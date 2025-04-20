import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { AppDataSource } from '../ormconfig';
import { DicomFile } from '../entities/DicomFile';
import { auth } from '../middlewares/auth';
import { User } from '../entities/User';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();
const dicomRepository = AppDataSource.getRepository(DicomFile);

router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
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

    // Generate signed URL for secure access
    const signedUrl = cloudinary.utils.private_download_url(
      dicomFile.cloudinaryPublicId,
      'raw',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 } // URL expires in 1 hour
    );

    res.json({
      ...dicomFile,
      signedUrl
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching file' });
  }
});

router.get('/:id/metadata', auth, async (req: AuthRequest, res: Response) => {
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

    res.json(dicomFile.metadata);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching metadata' });
  }
});

router.get('/:id/ai-results', auth, async (req: AuthRequest, res: Response) => {
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

    res.json(dicomFile.aiResults);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching AI results' });
  }
});

export default router; 