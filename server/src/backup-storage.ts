import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ENDPOINT = process.env.BACKUP_S3_ENDPOINT || '';
const REGION = process.env.BACKUP_S3_REGION || 'us-east-1';
const ACCESS_KEY = process.env.BACKUP_S3_ACCESS_KEY_ID || '';
const SECRET_KEY = process.env.BACKUP_S3_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.BACKUP_S3_BUCKET || '';
const PREFIX = 'yemen-telecom-backups/';
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || '';

const configured = !!(ENDPOINT && ACCESS_KEY && SECRET_KEY && BUCKET);

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: ENDPOINT,
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
      forcePathStyle: true,
    });
  }
  return client;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha512');
}

function encrypt(plaintext: string, password: string): Buffer {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: salt(16) + iv(12) + tag(16) + ciphertext
  return Buffer.concat([salt, iv, tag, encrypted]);
}

export function decrypt(data: Buffer, password: string): string {
  const salt = data.subarray(0, 16);
  const iv = data.subarray(16, 28);
  const tag = data.subarray(28, 44);
  const encrypted = data.subarray(44);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export async function uploadBackup(data: Record<string, unknown[]>): Promise<{ url: string; filename: string; size: number }> {
  if (!configured) {
    throw new Error('S3-compatible backup storage not configured. Set BACKUP_S3_ENDPOINT, BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY, and BACKUP_S3_BUCKET.');
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json.enc`;
  const key = `${PREFIX}${filename}`;
  const json = JSON.stringify(data, null, 2);

  const body = ENCRYPTION_KEY
    ? encrypt(json, ENCRYPTION_KEY)
    : Buffer.from(json, 'utf8');

  const c = getClient();
  await c.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: ENCRYPTION_KEY ? 'application/octet-stream' : 'application/json',
  }));

  const url = await getSignedUrl(c, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
  return { url, filename, size: body.length };
}

export async function downloadBackup(filename: string): Promise<string | null> {
  if (!configured) return null;
  const key = `${PREFIX}${filename}`;
  try {
    const c = getClient();
    const url = await getSignedUrl(c, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
    return url;
  } catch {
    return null;
  }
}

export function isConfigured(): boolean {
  return configured;
}
