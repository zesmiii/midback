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
  (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Возвращаем URL изображения
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  }
);

// Роут для статических файлов (изображения) - будет настроен в server.ts

export default router;

