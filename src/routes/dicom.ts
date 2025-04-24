import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { DicomFile } from '../entities/DicomFile';
import { AppDataSource } from '../ormconfig';
import { User, SubscriptionTier } from '../entities/User';
import multer from 'multer';
import path from 'path';

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Upload DICOM file
const uploadDicom = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const dicomFile = dicomRepository.create({
      filename: req.file.filename,
      cloudinaryPublicId: req.file.filename, // Using filename as public ID for now
      cloudinarySecureUrl: `/uploads/${req.file.filename}`, // Using local path for now
      userId: req.user?.id,
      metadata: {},
      aiResults: {}
    });

    await dicomRepository.save(dicomFile);
    res.status(201).json(dicomFile);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
};

// Get all DICOM files for current user
const getDicomFiles = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    const files = await dicomRepository.find({
      where: { userId: req.user?.id },
      order: { createdAt: 'DESC' }
    });
    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Error retrieving files' });
  }
};

// Get single DICOM file
const getDicomFile = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    const file = await dicomRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user?.id 
      }
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    res.json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Error retrieving file' });
  }
};

// Delete DICOM file
const deleteDicomFile = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    const file = await dicomRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user?.id 
      }
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    await dicomRepository.remove(file);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
};

// Apply auth middleware to protected routes
router.post('/upload', authenticateToken, upload.single('file'), uploadDicom);
router.get('/files', authenticateToken, getDicomFiles);
router.get('/files/:id', authenticateToken, getDicomFile);
router.delete('/files/:id', authenticateToken, deleteDicomFile);

export default router; 