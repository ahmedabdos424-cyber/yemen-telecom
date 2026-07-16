import { Router, Response } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

const MAGIC_BYTES: Record<string, ((buf: Buffer) => boolean)[]> = {
  'image/jpeg': [(buf) => buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF],
  'image/png':  [(buf) => buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47],
  'image/gif':  [(buf) => buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38],
  'image/webp': [(buf) => buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
                          buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50],
};

function hasValidMagicBytes(buf: Buffer, mimetype: string): boolean {
  const validators = MAGIC_BYTES[mimetype];
  if (!validators) return false;
  return validators.some(v => v(buf));
}

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(file.originalname.toLowerCase().split('.').pop() || '');
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

async function saveToDisk(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
  const ext = EXT_BY_MIME[file.mimetype] || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return { url: `/uploads/${filename}`, filename };
}

function validateFileMagic(file: Express.Multer.File): boolean {
  return hasValidMagicBytes(file.buffer, file.mimetype);
}

router.post('/image', requireRole('manager', 'agent'), upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  if (!validateFileMagic(req.file)) {
    return res.status(400).json({ error: 'Invalid image file — content does not match expected format' });
  }
  try {
    const result = await saveToDisk(req.file);
    res.json(result);
  } catch (err) {
    logger.error('Error saving upload:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.post('/images', requireRole('manager', 'agent'), upload.array('images', 5), async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No image files provided' });
  }
  for (const f of files) {
    if (!validateFileMagic(f)) {
      return res.status(400).json({ error: `Invalid file: ${f.originalname} — content does not match expected format` });
    }
  }
  try {
    const results = await Promise.all(files.map(saveToDisk));
    res.json(results);
  } catch (err) {
    logger.error('Error saving uploads:', err);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

export default router;
