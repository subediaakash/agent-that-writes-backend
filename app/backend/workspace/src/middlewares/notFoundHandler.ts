import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: 'The requested resource could not be found',
    path: req.originalUrl,
  });
};
