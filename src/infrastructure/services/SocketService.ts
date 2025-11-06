import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { JwtService } from './JwtService';

export class SocketService {
  private io: SocketIOServer | null = null;
  private jwtService: JwtService;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(jwtService: JwtService) {
    this.jwtService = jwtService;
  }

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log('🔌 Socket connected:', socket.id);

      // Authenticate user
      socket.on('authenticate', async (token: string) => {
        try {
          // Verify token without issuer/audience for user tokens
          const jwt = require('jsonwebtoken');
          const secretKey = process.env.JWT_SECRET || 'popseed_jwt_secret_key_2024';
          const decoded: any = jwt.verify(token, secretKey);
          const userId = decoded.userId;
          
          if (userId) {
            this.userSockets.set(userId, socket.id);
            socket.data.userId = userId;
            socket.join(`user:${userId}`);
            console.log(`✅ User ${userId} authenticated and joined room`);
            
            socket.emit('authenticated', { success: true, userId });
          } else {
            console.error('No userId in token');
            socket.emit('authenticated', { success: false, error: 'Invalid token format' });
          }
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
      });

      socket.on('disconnect', () => {
        const userId = socket.data.userId;
        if (userId) {
          this.userSockets.delete(userId);
          console.log(`🔌 User ${userId} disconnected`);
        }
      });
    });

    console.log('✅ Socket.io initialized');
  }

  // Send notification to specific user
  sendNotificationToUser(userId: string, notification: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('new_notification', notification);
      console.log(`📨 Notification sent to user ${userId}`);
    }
  }

  // Send notification to multiple users
  sendNotificationToUsers(userIds: string[], notification: any): void {
    if (this.io) {
      userIds.forEach(userId => {
        this.io?.to(`user:${userId}`).emit('new_notification', notification);
      });
      console.log(`📨 Notification sent to ${userIds.length} users`);
    }
  }

  // Broadcast task update to organization
  broadcastTaskUpdate(organizationId: string, taskId: string, update: any): void {
    if (this.io) {
      this.io.to(`org:${organizationId}`).emit('task_updated', {
        taskId,
        update
      });
      console.log(`📡 Task update broadcasted to organization ${organizationId}`);
    }
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }
}
