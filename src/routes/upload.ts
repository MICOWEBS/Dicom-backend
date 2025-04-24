import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppDataSource } from '../ormconfig';
import { DicomFile } from '../entities/DicomFile';
import { authenticateToken } from '../middlewares/auth';
import { TypedRequest, TypedResponse } from '../types/express';

interface FileUploadRequest extends TypedRequest {
  file?: Express.Multer.File;
  params: {
    id?: string;
  };
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const dicomFileRepository = AppDataSource.getRepository(DicomFile);

// Upload DICOM file
router.post(
  '/',
  authenticateToken,
  upload.single('file'),
  (req: FileUploadRequest, res: TypedResponse, next) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, buffer } = req.file;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'dicom-files',
        resource_type: 'raw',
        public_id: `${Date.now()}-${originalname}`,
      },
      async (error, result) => {
        if (error || !result) {
          return next(error || new Error('Upload failed'));
        }

        try {
          // Create DICOM file record
          const dicomFile = dicomFileRepository.create({
            filename: originalname,
            cloudinaryPublicId: result.public_id,
            cloudinarySecureUrl: result.secure_url,
            userId,
            metadata: {},
            aiResults: {},
          });

          await dicomFileRepository.save(dicomFile);

          return res.status(201).json({
            message: 'File uploaded successfully',
            fileId: dicomFile.id,
          });
        } catch (error) {
          return next(error);
        }
      }
    );

    uploadStream.end(buffer);
    return undefined;
  }
);

// Get all DICOM files for current user
router.get('/', authenticateToken, (req: TypedRequest, res: TypedResponse, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return dicomFileRepository.find({
    where: { userId: req.user.id },
    order: { createdAt: 'DESC' },
  })
    .then((files) => {
      return res.json(files);
    })
    .catch((error) => {
      return next(error);
    });
});

// Delete DICOM file
router.delete('/:id', authenticateToken, (req: TypedRequest, res: TypedResponse, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return dicomFileRepository.findOne({
    where: { 
      id: req.params.id,
      userId: req.user.id 
    }
  })
    .then(async (file) => {
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Delete from Cloudinary
      if (file.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: 'raw' });
      }

      await dicomFileRepository.remove(file);
      return res.json({ message: 'File deleted successfully' });
    })
    .catch((error) => {
      return next(error);
    });
});

export default router;