import { Router, Response } from 'express';
import multer from 'multer';
import { getBucket } from '../firebase-admin';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';

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

async function uploadToFirebase(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
  const ext = file.originalname.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const bucket = getBucket();
  const blob = bucket.file(`uploads/${filename}`);
  const blobStream = blob.createWriteStream({
    metadata: { contentType: file.mimetype },
  });
  return new Promise((resolve, reject) => {
    blobStream.on('error', reject);
    blobStream.on('finish', async () => {
      const [url] = await blob.getSignedUrl({
        action: 'read',
        expires: Date.now() + 3600 * 1000,
      });
      resolve({ url, filename });
    });
    blobStream.end(file.buffer);
  });
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
    const result = await uploadToFirebase(req.file);
    res.json(result);
  } catch (err) {
    logger.error('Error uploading to Firebase:', err);
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
    const results = await Promise.all(files.map(uploadToFirebase));
    res.json(results);
  } catch (err) {
    logger.error('Error uploading to Firebase:', err);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

export default router;
