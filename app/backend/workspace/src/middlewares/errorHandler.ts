import { Request, Response, NextFunction } from 'express';

// Custom error interface
export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  code?: string | number;
  details?: unknown;
  isOperational?: boolean;
}

// Normalized error response shape
interface NormalizedError {
  success: false;
  message: string;
  statusCode: number;
  error?: string;
  code?: string | number;
  details?: unknown;
  stack?: string;
}

const isProd = process.env.NODE_ENV === 'production';

function normalizeError(err: unknown): NormalizedError {
  let error: AppError;

  if (err instanceof Error) {
    error = err as AppError;
  } else {
    error = new Error('Unknown error') as AppError;
  }

  const statusCode = (typeof (error as AppError).statusCode === 'number'
    ? (error as AppError).statusCode
    : 500) as number;

  const message = error.message || 'Internal Server Error';

  const normalized: NormalizedError = {
    success: false,
    message,
    statusCode,
  };

  if (error.name) {
    normalized.error = error.name;
  }

  if ((error as AppError).code !== undefined) {
    normalized.code = (error as AppError).code;
  }

  if ((error as AppError).details !== undefined) {
    normalized.details = (error as AppError).details;
  }

  if (!isProd && error.stack) {
    normalized.stack = error.stack;
  }

  return normalized;
}

// Global error handling middleware
// Must have 4 args to be recognized by Express
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const normalized = normalizeError(err);

  if (normalized.statusCode === 500 && isProd) {
    normalized.message = 'Internal Server Error';
    delete normalized.stack;
    delete normalized.details;
  }

  res.status(normalized.statusCode).json(normalized);
}

// Helper to wrap async route handlers
export const asyncHandler = <P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<any>
) => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
