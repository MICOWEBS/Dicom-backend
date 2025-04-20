import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

// Create a new cache instance
const cache = new NodeCache({
  stdTTL: 3600, // Cache for 1 hour
  checkperiod: 600, // Check for expired entries every 10 minutes
});

// Cache middleware
export const cacheMiddleware = (duration: number) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return next();
    }

    // Store the response in cache
    cache.set(key, true, duration);
    next();
  };
};

// Clear cache for specific route
export const clearCache = (req: Request, next: NextFunction) => {
  const key = `__express__${req.originalUrl || req.url}`;
  cache.del(key);
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