import cors from 'cors';
import { config } from '@/shared/config';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (config.server.environment === 'development') {
      return callback(null, true);
    }
    
    // Check allowed origins
    const allowedOrigins = config.cors.origins;
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
});