import express, { Router } from 'express';
import cors from 'cors';
import { json, urlencoded } from 'express';
import { AppDataSource } from './ormconfig';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import dicomRoutes from './routes/dicom';
import inferenceRoutes from './routes/inference';
import stripeRoutes from './routes/stripe';
import subscriptionRoutes from './routes/subscription';
import healthRoutes from './routes/health';
import viewerRoutes from './routes/viewer';
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
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes as Router);
app.use('/api/upload', uploadRoutes as Router);
app.use('/api/dicom', dicomRoutes as Router);
app.use('/api/inference', inferenceRoutes as Router);
app.use('/api/stripe', stripeRoutes as Router);
app.use('/api/subscription', subscriptionRoutes as Router);
app.use('/api/health', healthRoutes as Router);
app.use('/api/viewer', viewerRoutes as Router);

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