import { Router, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import { requireRole, AuthRequest } from '../middleware/auth';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const UPLOAD_BUCKET = process.env.UPLOAD_BUCKET || 'uploads';
// Signed URLs expire after 7 days (Supabase storage maximum). Shorter than the
// max would break images viewed later; longer is not supported by the API.
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

async function uploadToSupabase(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
  if (!supabase) {
    throw new Error('Supabase storage is not configured (missing SUPABASE_ANON_KEY)');
  }
  const ext = EXT_BY_MIME[file.mimetype] || 'jpg';
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
      cacheControl: '86400',
    });
  if (error) {
    throw error;
  }
  // Never hand out permanent public URLs for contract / identity photos: the
  // bucket may be public, which would leak PII (an ID photo is guessable from
  // the URL if the bucket is listable). A 7-day signed URL limits exposure.
  const { data } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .createSignedUrl(filename, SIGNED_URL_TTL_SECONDS);
  return { url: data?.signedUrl || '', filename };
}

function resolveSignedUploadUrl(filename: string): Promise<string | null> {
  return supabase ? supabase.storage
    .from(UPLOAD_BUCKET)
    .createSignedUrl(filename, SIGNED_URL_TTL_SECONDS)
    .then(({ data }) => data?.signedUrl || null) : Promise.resolve(null);
}

function validateFileMagic(file: Express.Multer.File): boolean {
  return hasValidMagicBytes(file.buffer, file.mimetype);
}

router.post('/image', requireRole('manager', 'agent', 'seller'), upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  if (!validateFileMagic(req.file)) {
    return res.status(400).json({ error: 'Invalid image file — content does not match expected format' });
  }
  try {
    const result = await uploadToSupabase(req.file);
    res.json(result);
  } catch (err) {
    logger.error('Error uploading to Supabase Storage:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.post('/images', requireRole('manager', 'agent', 'seller'), upload.array('images', 5), async (req: AuthRequest, res: Response) => {
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
    const results = await Promise.all(files.map(uploadToSupabase));
    res.json(results);
  } catch (err) {
    logger.error('Error uploading to Supabase Storage:', err);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// GET /api/upload/signed/:filename — rehydrate a fresh signed URL for an
// already-stored image (files live ~7 days per signed URL; this lets the app
// recover a working link after expiry). Restrict to flat filenames only.
router.get('/signed/:filename', requireRole('manager', 'agent', 'seller'), async (req: AuthRequest, res: Response) => {
  const raw = req.params.filename || '';
  const filename = raw.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!filename || filename !== raw) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase storage is not configured' });
  }
  try {
    const url = await resolveSignedUploadUrl(filename);
    if (!url) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({ url, filename });
  } catch (err) {
    logger.error('Error generating signed URL:', err);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

export default router;
