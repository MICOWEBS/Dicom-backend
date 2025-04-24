import { Request, Response } from 'express';
import { SubscriptionTier } from '../entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        subscriptionTier: 'free' | 'pro' | 'enterprise';
      };
      header: (name: string) => string | undefined;
      headers: { [key: string]: string | string[] | undefined };
      originalUrl: string;
      url: string;
      file?: any;
      method: string;
      secure: boolean;
    }

    interface Response extends Response {
      status(code: number): Response;
      json(body: any): Response;
      redirect(url: string): void;
      headers: { [key: string]: string | string[] | undefined };
    }

    interface NextFunction extends ExpressNextFunction {}
    interface Application extends ExpressApplication {}
  }
}

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      subscriptionTier: 'free' | 'pro' | 'enterprise';
    };
    header: (name: string) => string | undefined;
    headers: { [key: string]: string | string[] | undefined };
    originalUrl: string;
    url: string;
    file?: any;
    method: string;
    secure: boolean;
  }

  interface Response {
    status(code: number): Response;
    json(body: any): Response;
    redirect(url: string): void;
    headers: { [key: string]: string | string[] | undefined };
  }
}

export interface TypedRequest<T = any> extends Request {
  body: T;
}

export interface TypedResponse<T = any> extends Response {
  json: (body: T) => TypedResponse<T>;
}

export { ExpressRequest as Request, ExpressResponse as Response, ExpressNextFunction as NextFunction, ExpressApplication as Application }; 