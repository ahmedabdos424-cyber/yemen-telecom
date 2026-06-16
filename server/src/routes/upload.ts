import { Router, Response } from 'express';
import multer from 'multer';
import { getBucket } from '../firebase-admin';
import { requireRole, AuthRequest } from '../middleware/auth';

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
        expires: '01-01-2030',
      });
      resolve({ url, filename });
    });
    blobStream.end(file.buffer);
  });
}

router.post('/image', requireRole('manager', 'agent'), upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  try {
    const result = await uploadToFirebase(req.file);
    res.json(result);
  } catch (err) {
    console.error('Error uploading to Firebase:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.post('/images', requireRole('manager', 'agent'), upload.array('images', 5), async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No image files provided' });
  }
  try {
    const results = await Promise.all(files.map(uploadToFirebase));
    res.json(results);
  } catch (err) {
    console.error('Error uploading to Firebase:', err);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

export default router;
