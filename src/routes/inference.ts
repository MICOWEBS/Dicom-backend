import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AppDataSource } from '../ormconfig';
import { DicomFile } from '../entities/DicomFile';
import { auth } from '../middlewares/auth';
import { User } from '../entities/User';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();
const dicomRepository = AppDataSource.getRepository(DicomFile);

router.post('/:id', auth, async (req: AuthRequest, res: Response) => {
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

    // Call AI service
    const aiResponse = await axios.post(
      `${process.env.AI_API_URL}/inference`,
      {
        imageUrl: dicomFile.cloudinarySecureUrl,
        metadata: dicomFile.metadata
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update DICOM file with AI results
    dicomFile.aiResults = aiResponse.data as {
      predictions?: any[];
      annotations?: any[];
      [key: string]: any;
    };
    await dicomRepository.save(dicomFile);

    return res.json(dicomFile.aiResults);
  } catch (error) {
    console.error('AI inference error:', error);
    return res.status(500).json({ 
      message: 'Error processing AI inference',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/status/:id', auth, async (req: AuthRequest, res: Response) => {
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

    if (!dicomFile.aiResults || Object.keys(dicomFile.aiResults).length === 0) {
      return res.json({ status: 'pending' });
    }

    return res.json({
      status: 'completed',
      results: dicomFile.aiResults
    });
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ 
      message: 'Error checking inference status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 