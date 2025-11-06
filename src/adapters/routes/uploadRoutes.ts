import { Router } from 'express';
import fileUploadController, { upload } from '../controllers/FileUploadController';
import { userAuthMiddleware } from '../middleware/userAuthMiddleware';

const router = Router();

// Apply authentication middleware to all upload routes
router.use(userAuthMiddleware);

/**
 * @route POST /api/upload/task-files
 * @description Upload multiple files for a task
 * @access Private (authenticated users)
 */
router.post(
  '/task-files',
  upload.array('files', 5), // Accept up to 5 files with field name 'files'
  (req: any, res: any) => fileUploadController.uploadTaskFiles(req, res)
);

/**
 * @route DELETE /api/upload/file/:publicId
 * @description Delete a file by public ID
 * @access Private (authenticated users)
 */
router.delete(
  '/file/:publicId',
  (req: any, res: any) => fileUploadController.deleteFile(req, res)
);

/**
 * @route POST /api/upload
 * @description Simple upload endpoint for single file (frontend compatibility)
 * @access Private (authenticated users)
 */
router.post(
  '/',
  upload.single('file'), // Accept single file with field name 'file'
  (req: any, res: any) => fileUploadController.uploadSingleFile(req, res)
);

/**
 * @route GET /api/upload/status
 * @description Get upload service status and configuration
 * @access Private (authenticated users)
 */
router.get(
  '/status',
  (req: any, res: any) => fileUploadController.getUploadStatus(req, res)
);

export default router;