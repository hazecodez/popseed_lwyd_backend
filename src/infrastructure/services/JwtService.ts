import jwt from 'jsonwebtoken';
import { config } from '@/shared/config';

export interface JwtPayload {
  adminId: string;
  email: string;
  organizationId: string;
  role: string;
}

export class JwtService {
  private readonly secretKey: string;
  private readonly expiresIn: string | number;

  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'popseed_jwt_secret_key_2024';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  generateToken(payload: JwtPayload): string {
    try {
      return jwt.sign(
        payload, 
        this.secretKey, 
        { 
          expiresIn: '24h',
          issuer: 'popseed.ai',
          audience: 'popseed-admin'
        }
      );
    } catch (error) {
      throw new Error('Failed to generate token');
    }
  }

  verifyToken(token: string): JwtPayload {
    try {
      const options: jwt.VerifyOptions = {
        issuer: 'popseed.ai',
        audience: 'popseed-admin'
      };
      
      const decoded = jwt.verify(token, this.secretKey, options) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}