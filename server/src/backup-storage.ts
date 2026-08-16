import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ENDPOINT = process.env.BACKUP_S3_ENDPOINT || '';
const REGION = process.env.BACKUP_S3_REGION || 'us-east-1';
const ACCESS_KEY = process.env.BACKUP_S3_ACCESS_KEY_ID || '';
const SECRET_KEY = process.env.BACKUP_S3_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.BACKUP_S3_BUCKET || '';
const PREFIX = 'yemen-telecom-backups/';

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

export async function uploadBackup(data: Record<string, unknown[]>): Promise<{ url: string; filename: string; size: number }> {
  if (!configured) {
    throw new Error('S3-compatible backup storage not configured. Set BACKUP_S3_ENDPOINT, BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY, and BACKUP_S3_BUCKET.');
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json`;
  const key = `${PREFIX}${filename}`;
  const body = JSON.stringify(data, null, 2);

  const c = getClient();
  await c.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  }));

  const url = await getSignedUrl(c, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
  return { url, filename, size: Buffer.byteLength(body) };
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
