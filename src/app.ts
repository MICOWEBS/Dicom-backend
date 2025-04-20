import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from './ormconfig';
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscription';
import dicomRoutes from './routes/dicom';
import healthRoutes from './routes/health';
import { errorHandler, notFoundHandler } from './middlewares/security';
import fs from 'fs';
import path from 'path';

const app = express();

// Create upload directories if they don't exist
const uploadsDir = path.join(__dirname, '../uploads');
const chunksDir = path.join(uploadsDir, 'chunks');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/dicom', dicomRoutes);
app.use('/api', healthRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error) => {
    console.error('Error connecting to database:', error);
  });

export default app; 