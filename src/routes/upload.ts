import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppDataSource } from '../ormconfig';
import { DicomFile } from '../entities/DicomFile';
import { authenticateToken } from '../middlewares/auth';
import { User, SubscriptionTier } from '../entities/User';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createGzip } from 'zlib';

const pipelineAsync = promisify(pipeline);

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: SubscriptionTier;
  };
  file?: Express.Multer.File;
  params: {
    id?: string;
  };
}

interface AuthResponse extends Response {
  headers: { [key: string]: string | string[] | undefined };
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

const router = Router();
const dicomRepository = AppDataSource.getRepository(DicomFile);

// Utility function to retry operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}

// Upload DICOM file
const uploadDicom = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const dicomFile = dicomRepository.create({
      filename: req.file.filename,
      cloudinaryPublicId: req.file.filename, // Using filename as public ID for now
      cloudinarySecureUrl: `/uploads/${req.file.filename}`, // Using local path for now
      userId: req.user.id,
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
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const files = await dicomRepository.find({
      where: { userId: req.user.id },
      order: { createdAt: 'DESC' }
    });
    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Error retrieving files' });
  }
};

// Delete DICOM file
const deleteDicomFile = async (req: AuthRequest, res: AuthResponse): Promise<void> => {
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

    await dicomRepository.remove(file);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
};

// Apply auth middleware to protected routes
router.post('/', authenticateToken, upload.single('file'), uploadDicom);
router.get('/', authenticateToken, getDicomFiles);
router.delete('/:id', authenticateToken, deleteDicomFile);

export default router; 