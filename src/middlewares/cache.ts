import { Request, Response, NextFunction } from '../types/express';
import NodeCache from 'node-cache';

// Create a new cache instance
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Cache middleware
export const cacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    next();
    return;
  }

  const key = req.originalUrl || req.url;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    res.json(cachedResponse);
    return;
  }

  // Store the original json method
  const originalJson = res.json;

  // Override the json method
  res.json = function(body: any): Response {
    // Cache the response
    cache.set(key, body);
    // Call the original json method
    return originalJson.call(this, body);
  };

  next();
};

// Clear cache for specific route
export const clearCache = (req: Request, res: Response, next: NextFunction): void => {
  // Clear cache on file upload
  if (req.file) {
    cache.flushAll();
  }
  next();
};

// Image optimization middleware
export const optimizeImage = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  try {
    // Add image optimization logic here
    // This could include:
    // - Resizing
    // - Compression
    // - Format conversion
    // - Quality adjustment

    next();
  } catch (error) {
    next(error);
  }
}; 