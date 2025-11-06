import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/errors';
import { ApiResponse } from '@/shared/types';
import { config } from '@/shared/config';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle known app errors
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: err.message
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Mongoose/MongoDB errors
  if (err.name === 'ValidationError') {
    const response: ApiResponse = {
      success: false,
      error: 'Validation error: ' + err.message
    };

    res.status(400).json(response);
    return;
  }

  if (err.name === 'CastError') {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid ID format'
    };

    res.status(400).json(response);
    return;
  }

  if ((err as any).code === 11000) {
    const response: ApiResponse = {
      success: false,
      error: 'Duplicate entry error'
    };

    res.status(409).json(response);
    return;
  }

  // Generic error response
  const response: ApiResponse = {
    success: false,
    error: config.server.environment === 'production' 
      ? 'Internal server error' 
      : err.message
  };

  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  };

  res.status(404).json(response);
}