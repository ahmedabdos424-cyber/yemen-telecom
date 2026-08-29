import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import { requireRole } from '../middleware/auth';
import { query } from '../db';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const router = Router();

function isHttps(url: string): boolean {
  return /^https:\/\//i.test(url);
}

// Generate a short-lived (1h) signed URL from Supabase Storage so the APK link
// cannot be shared/reused indefinitely. Falls back to a static APP_APK_URL.
async function resolveApkUrl(): Promise<string> {
  const bucket = process.env.APP_APK_BUCKET || 'uploads';
  const object = process.env.APP_APK_OBJECT;
  if (object && supabase) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(object, 60 * 60); // 1 hour
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  const staticUrl = process.env.APP_APK_URL || '';
  return staticUrl;
}

// GET /api/app-version — public, no auth, no-store cache.
router.get('/app-version', async (_req, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let apkUrl = await resolveApkUrl();

  // Security: never serve a plaintext-http APK link.
  if (apkUrl && !isHttps(apkUrl)) {
    logger.warn('[app-version] refusing to serve non-https APK url');
    apkUrl = '';
  }

  const versionCode = process.env.APP_VERSION_CODE
    ? parseInt(process.env.APP_VERSION_CODE, 10)
    : 0;

  res.status(200).json({
    version: process.env.APP_VERSION || '1.0.0',
    versionCode,
    apkUrl,
    sha256: process.env.APP_APK_SHA256 || '',
    size: process.env.APP_APK_SIZE ? parseInt(process.env.APP_APK_SIZE, 10) : 0,
    notes: (process.env.APP_UPDATE_NOTES || '').split('|').filter(Boolean),
    required: process.env.APP_UPDATE_REQUIRED === 'true',
    checkedAt: new Date().toISOString(),
  });
});

// POST /api/app-update-installed — record a successful install.
// deviceId + version + time let the operator know who updated and who didn't.
router.post('/app-update-installed', async (req: Request, res: Response) => {
  const deviceId = String(req.body?.deviceId || req.body?.device_id || 'unknown').slice(0, 128);
  const version = String(req.body?.version || '').slice(0, 32);
  const versionCode = parseInt(req.body?.versionCode, 10) || 0;
  if (!version) {
    return res.status(400).json({ error: 'version required' });
  }
  try {
    await query(
      `INSERT INTO app_update_installs (device_id, version, version_code)
       VALUES ($1, $2, $3)`,
      [deviceId, version, versionCode]
    );
    logger.info('[app-update] installed', { deviceId, version, versionCode });
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('[app-update] failed to record install:', err);
    res.status(500).json({ error: 'Failed to record install' });
  }
});

// GET /api/app-update-stats (manager only) — counts per version.
// Mounted behind JWT auth in index.ts; role guard is enforced here.
router.get('/app-update-stats', requireRole('manager'), async (_req, res: Response) => {
  try {
    const result = await query(`
      SELECT version, COUNT(*) AS count
      FROM app_update_installs
      GROUP BY version
      ORDER BY version DESC
    `);
    const byVersion: Record<string, number> = {};
    let total = 0;
    for (const row of result.rows) {
      byVersion[row.version] = parseInt(row.count);
      total += parseInt(row.count);
    }
    res.status(200).json({ total, byVersion });
  } catch (err) {
    logger.error('[app-update] failed to fetch stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
