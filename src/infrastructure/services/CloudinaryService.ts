import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';

interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  original_filename: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  created_at: string;
}

export class CloudinaryService {
  private isConfigured: boolean = false;

  constructor() {
    this.initializeCloudinary();
  }

  private initializeCloudinary(): void {
    const config: CloudinaryConfig = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
      api_key: process.env.CLOUDINARY_API_KEY || '',
      api_secret: process.env.CLOUDINARY_API_SECRET || ''
    };

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.warn('Cloudinary configuration missing. File uploads will be disabled.');
      this.isConfigured = false;
      return;
    }

    try {
      cloudinary.config(config);
      this.isConfigured = true;
      console.log('Cloudinary configured successfully');
    } catch (error) {
      console.error('Failed to configure Cloudinary:', error);
      this.isConfigured = false;
    }
  }

  public async uploadFile(
    filePath: string,
    options: {
      folder?: string;
      public_id?: string;
      resource_type?: 'auto' | 'image' | 'video' | 'raw';
      tags?: string[];
      context?: { [key: string]: string };
    } = {}
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not properly configured');
    }

    try {
      const uploadOptions = {
        folder: options.folder || 'task_uploads',
        resource_type: options.resource_type || 'auto' as const,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options
      };

      const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, uploadOptions);

      // Clean up temporary file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        original_filename: result.original_filename || 'unknown',
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        created_at: result.created_at
      };
    } catch (error) {
      // Clean up temporary file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      console.error('Cloudinary upload failed:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteFile(publicId: string): Promise<{ result: string }> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not properly configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return { result: result.result };
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public isReady(): boolean {
    return this.isConfigured;
  }

  public generateSignedUrl(publicId: string, options: { width?: number; height?: number; crop?: string } = {}): string {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not properly configured');
    }

    return cloudinary.url(publicId, {
      secure: true,
      ...options
    });
  }
}

export default new CloudinaryService();