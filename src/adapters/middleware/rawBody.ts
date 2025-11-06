import { Request, Response, NextFunction } from 'express';

// Middleware to capture raw body for Stripe webhooks
export function rawBodyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.originalUrl === '/api/webhooks/stripe') {
    let data = '';
    
    req.setEncoding('utf8');
    
    req.on('data', (chunk) => {
      data += chunk;
    });
    
    req.on('end', () => {
      req.body = Buffer.from(data, 'utf8');
      next();
    });
  } else {
    next();
  }
}