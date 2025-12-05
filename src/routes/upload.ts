import express, { Request, Response } from 'express';
import path from 'path';
import { upload } from '../config/multer';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Роут для загрузки изображений
router.post(
  '/image',
  authMiddleware,
  upload.single('image'),
  (req: AuthRequest, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Возвращаем URL изображения
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  },
  (error: any, req: Request, res: Response, next: express.NextFunction): void => {
    // Обработка ошибок multer
    if (error) {
      if (error.message === 'Only .png, .jpg, .jpeg, .webp images are allowed') {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size too large' });
        return;
      }
      res.status(400).json({ error: error.message || 'File upload error' });
      return;
    }
    next();
  }
);

export default router;

