import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  server: {
    port: parseInt(process.env.PORT || '8001', 10),
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME || 'popseed_database'
  },
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  },
  frontend: {
    baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['*']
  },
  session: {
    secret: process.env.SESSION_SECRET || 'popseed_signup_session_secret_key_2024',
    expiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10)
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URL',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}