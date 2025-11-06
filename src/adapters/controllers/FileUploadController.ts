import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import cloudinaryService from '../../infrastructure/services/CloudinaryService';

// Extend Request interface to include files
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadDir = path.join(__dirname, '../../../uploads/temp');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter for allowed file types
const fileFilter = (req: any, file: any, cb: FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

export class FileUploadController {
  
  /**
   * Upload task files to Cloudinary
   */
  public async uploadTaskFiles(req: MulterRequest, res: Response): Promise<void> {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files provided'
        });
        return;
      }

      // Check if Cloudinary is configured
      if (!cloudinaryService.isReady()) {
        // Clean up uploaded files
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });

        res.status(500).json({
          success: false,
          error: 'File upload service is not configured. Please check Cloudinary credentials.'
        });
        return;
      }

      const { taskId, projectId, fileCategory = 'attachment' } = req.body;

      // Validate required fields
      if (!projectId) {
        // Clean up uploaded files
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });

        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      const uploadResults = [];
      const errors = [];

      // Upload each file to Cloudinary
      for (const file of files) {
        try {
          const uploadOptions = {
            folder: `popseed/${fileCategory}`,
            tags: [fileCategory, 'task_upload'],
            context: {
              projectId: projectId,
              ...(taskId && { taskId }),
              original_filename: file.originalname,
              uploaded_at: new Date().toISOString()
            }
          };

          const result = await cloudinaryService.uploadFile(file.path, uploadOptions);
          
          uploadResults.push({
            ...result,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });

        } catch (error) {
          console.error(`Upload failed for file ${file.originalname}:`, error);
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Upload failed'
          });

          // Clean up file on error
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      // Return results
      if (uploadResults.length === 0) {
        res.status(500).json({
          success: false,
          error: 'All file uploads failed',
          details: errors
        });
        return;
      }

      const response: any = {
        success: true,
        data: uploadResults,
        message: `Successfully uploaded ${uploadResults.length} file(s)`
      };

      if (errors.length > 0) {
        response.partialSuccess = true;
        response.errors = errors;
        response.message += `, ${errors.length} failed`;
      }

      res.status(200).json(response);

    } catch (error) {
      console.error('File upload controller error:', error);
      
      // Clean up any remaining files
      const files = req.files;
      if (files) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error during file upload'
      });
    }
  }

  /**
   * Delete file from Cloudinary
   */
  public async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        res.status(400).json({
          success: false,
          error: 'Public ID is required'
        });
        return;
      }

      if (!cloudinaryService.isReady()) {
        res.status(500).json({
          success: false,
          error: 'File upload service is not configured'
        });
        return;
      }

      const result = await cloudinaryService.deleteFile(publicId);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
        data: result
      });

    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'File deletion failed'
      });
    }
  }

  /**
   * Upload single file to Cloudinary (frontend compatibility)
   */
  public async uploadSingleFile(req: MulterRequest, res: Response): Promise<void> {
    try {
      const file = req.file;
      
      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No file provided'
        });
        return;
      }

      // Check if Cloudinary is configured
      if (!cloudinaryService.isReady()) {
        // Clean up uploaded file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        res.status(500).json({
          success: false,
          error: 'File upload service is not configured. Please check Cloudinary credentials.'
        });
        return;
      }

      const { taskId, projectId, fileCategory = 'attachment' } = req.body;

      try {
        const uploadOptions = {
          folder: `popseed/${fileCategory}`,
          tags: [fileCategory, 'single_upload'],
          context: {
            ...(projectId && { projectId }),
            ...(taskId && { taskId }),
            original_filename: file.originalname,
            uploaded_at: new Date().toISOString()
          }
        };

        const result = await cloudinaryService.uploadFile(file.path, uploadOptions);
        
        // Format response to match frontend expectations
        res.status(200).json({
          success: true,
          data: {
            secure_url: result.secure_url,
            public_id: result.public_id,
            url: result.url,
            original_filename: result.original_filename,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            created_at: result.created_at
          },
          message: 'File uploaded successfully'
        });

      } catch (error) {
        console.error(`Upload failed for file ${file.originalname}:`, error);
        
        // Clean up file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }

    } catch (error) {
      console.error('Single file upload controller error:', error);
      
      // Clean up any remaining files
      const file = req.file;
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error during file upload'
      });
    }
  }

  /**
   * Get upload status/health check
   */
  public async getUploadStatus(req: Request, res: Response): Promise<void> {
    try {
      const isReady = cloudinaryService.isReady();
      
      res.status(200).json({
        success: true,
        data: {
          uploadServiceReady: isReady,
          maxFileSize: '10MB',
          maxFiles: 5,
          allowedTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ]
        }
      });
    } catch (error) {
      console.error('Upload status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upload status'
      });
    }
  }
}

export default new FileUploadController();