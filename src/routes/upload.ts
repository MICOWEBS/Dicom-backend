import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppDataSource } from '../ormconfig';
import { DicomFile } from '../entities/DicomFile';
import { auth, checkSubscription } from '../middlewares/auth';
import { User } from '../entities/User';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createGzip } from 'zlib';

const pipelineAsync = promisify(pipeline);

interface AuthRequest extends Request {
  user?: User;
}

interface ChunkedUploadRequest extends AuthRequest {
  body: {
    chunkIndex: number;
    totalChunks: number;
    originalFilename: string;
  };
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for chunked uploads
const storage = multer.diskStorage({
  destination: './uploads/chunks',
  filename: (req, file, cb) => {
    const { chunkIndex, originalFilename } = (req as ChunkedUploadRequest).body;
    cb(null, `${originalFilename}-${chunkIndex}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/dicom') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DICOM files are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per chunk
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

// Upload chunk
router.post('/chunk', auth, checkSubscription, upload.single('chunk'), async (req: ChunkedUploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No chunk uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { chunkIndex, totalChunks, originalFilename } = req.body;
    
    // Set timeout for the request
    req.setTimeout(300000); // 5 minutes timeout

    res.json({
      message: 'Chunk uploaded successfully',
      chunkIndex,
      totalChunks
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ message: 'Error uploading chunk' });
  }
});

// Complete upload and merge chunks
router.post('/complete', auth, checkSubscription, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { originalFilename, totalChunks } = req.body;
    const chunksDir = './uploads/chunks';
    const mergedFilePath = path.join('./uploads', originalFilename);

    // Set timeout for the request
    req.setTimeout(600000); // 10 minutes timeout for merging

    // Merge chunks
    const writeStream = fs.createWriteStream(mergedFilePath);
    const gzip = createGzip();

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, `${originalFilename}-${i}`);
      const readStream = fs.createReadStream(chunkPath);
      
      await pipelineAsync(readStream, gzip, writeStream);
      
      // Clean up chunk
      fs.unlinkSync(chunkPath);
    }

    // Upload to Cloudinary with retry logic
    const result = await retryOperation(async () => {
      return await cloudinary.uploader.upload(mergedFilePath, {
        resource_type: 'raw',
        public_id: `dicom/${req.user!.id}/${Date.now()}-${originalFilename}`,
        access_mode: 'authenticated'
      });
    });

    // Create DICOM file record
    const dicomFile = dicomRepository.create({
      filename: originalFilename,
      cloudinaryPublicId: result.public_id,
      cloudinarySecureUrl: result.secure_url,
      userId: req.user.id,
      metadata: {},
      aiResults: {}
    });

    await dicomRepository.save(dicomFile);

    // Clean up merged file
    fs.unlinkSync(mergedFilePath);

    res.status(201).json(dicomFile);
  } catch (error: unknown) {
    console.error('Upload completion error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEDOUT') {
      res.status(408).json({ message: 'Request timeout' });
    } else {
      res.status(500).json({ message: 'Error completing upload' });
    }
  }
});

// Get all uploaded files
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const dicomFiles = await dicomRepository.find({
      where: { userId: req.user.id },
      order: { createdAt: 'DESC' }
    });

    res.json(dicomFiles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching files' });
  }
});

// Delete file
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
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

    // Delete from Cloudinary with retry logic
    await retryOperation(async () => {
      return await cloudinary.uploader.destroy(dicomFile.cloudinaryPublicId, {
        resource_type: 'raw'
      });
    });

    // Delete from database
    await dicomRepository.remove(dicomFile);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting file' });
  }
});

export default router; 