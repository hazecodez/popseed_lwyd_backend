import mongoose from 'mongoose';
import { config } from '@/shared/config';

export class DatabaseConnection {
  private static instance: DatabaseConnection;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = config.database.mongoUrl;
      
      // Configure connection options based on whether it's local or Atlas
      const connectionOptions: any = {
        dbName: config.database.dbName,
      };

      // If it's a local MongoDB connection, don't use SSL
      if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
        connectionOptions.ssl = false;
        connectionOptions.tls = false;
      }
      
      await mongoose.connect(mongoUri, connectionOptions);

      const connectionType = mongoUri.includes('localhost') ? 'Local MongoDB' : 'MongoDB Atlas';
      console.log(`✅ Connected to ${connectionType}`);
      
      // Set up connection event listeners
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }
}