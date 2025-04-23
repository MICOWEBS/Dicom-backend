import { Request } from 'express';

declare global {
  namespace Express {
    interface AuthRequest extends Request {
      user?: {
        id: string;
        email: string;
      };
      header: (name: string) => string | undefined;
      body: any;
      params: any;
      file?: any;
      setTimeout?: (ms: number) => void;
    }

    interface ChunkedUploadRequest extends Request {
      file?: any;
      setTimeout?: (ms: number) => void;
    }
  }
} 