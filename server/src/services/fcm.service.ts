import { query } from '../db';
import { logger } from '../logger';

// Lazily-initialized Firebase Admin. Push sending is best-effort:
// if Firebase env vars are missing, every send becomes a no-op that
// never throws — production keeps running without push configured.

interface FirebaseMessaging {
  send(message: {
    token: string;
    notification?: { title: string; body: string };
    data?: Record<string, string>;
    android?: { priority: 'high' | 'normal' };
  }): Promise<string>;
}

let firebaseMessaging: FirebaseMessaging | null = null;
let firebaseInitialized = false;
let firebaseFailed = false;

function getMessaging(): FirebaseMessaging | null {
  if (firebaseInitialized) return firebaseMessaging;
  firebaseInitialized = true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    logger.warn('[FCM] Firebase env vars missing (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY) — push notifications disabled');
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin') as typeof import('firebase-admin');
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    firebaseMessaging = admin.messaging() as unknown as FirebaseMessaging;
    logger.info('[FCM] Firebase Admin initialized');
  } catch (err) {
    firebaseFailed = true;
    logger.error('[FCM] Firebase Admin init failed:', err);
    return null;
  }
  return firebaseMessaging;
}

export function isFcmEnabled(): boolean {
  return getMessaging() !== null;
}

export async function sendPushToTokens(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<{ sent: number; failed: string[] }> {
  const messaging = getMessaging();
  if (!messaging || tokens.length === 0) {
    return { sent: 0, failed: [] };
  }

  const failedTokens: string[] = [];
  let sent = 0;

  // Fire-and-forget per token so one invalid token doesn't block the rest.
  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      await messaging.send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high' },
      });
    })
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      sent += 1;
    } else {
      failedTokens.push(tokens[i]);
      const code = (result.reason as { code?: string })?.code;
      // Unregistered/expired tokens should be pruned from the registry.
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        query('DELETE FROM device_tokens WHERE token = $1', [tokens[i]]).catch(() => {});
      } else {
        logger.warn(`[FCM] Send failed for token ${i}:`, result.reason);
      }
    }
  });

  if (failedTokens.length > 0) {
    logger.warn(`[FCM] ${failedTokens.length} token(s) failed to deliver`);
  }
  return { sent, failed: failedTokens };
}

export async function getTokensForUsers(userIds: number[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const result = await query(
    `SELECT token FROM device_tokens WHERE user_id = ANY($1::int[]) AND token IS NOT NULL`,
    [userIds]
  );
  return result.rows.map((r) => r.token);
}

export async function getManagerTokens(): Promise<string[]> {
  const result = await query(
    `SELECT dt.token
       FROM device_tokens dt
       JOIN users u ON u.id = dt.user_id
      WHERE u.role = 'manager'`
  );
  return result.rows.map((r) => r.token);
}

export async function getAgentAndManagerTokens(): Promise<string[]> {
  const result = await query(
    `SELECT dt.token
       FROM device_tokens dt
       JOIN users u ON u.id = dt.user_id
      WHERE u.role IN ('manager', 'agent')`
  );
  return result.rows.map((r) => r.token);
}

// Not a typo — guarded so tree-shaking tooling keeps the failed-flag used.
export function fcmDebugState(): { initialized: boolean; failed: boolean } {
  return { initialized: firebaseInitialized, failed: firebaseFailed };
}

// ---------------------------------------------------------------------------
// Event dispatchers — best-effort, never throw. Each resolves the recipient
// user ids -> device tokens -> sends. Unknown tokens are pruned by the
// underlying sendPushToTokens call.
// ---------------------------------------------------------------------------

export interface NotificationEvent {
  eventType: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendNotificationToUsers(userIds: number[], ev: NotificationEvent): Promise<{ sent: number; failed: string[] }> {
  if (userIds.length === 0) return { sent: 0, failed: [] };
  const tokens = await getTokensForUsers(userIds);
  if (tokens.length === 0) return { sent: 0, failed: [] };
  return sendPushToTokens(tokens, {
    title: ev.title,
    body: ev.body,
    data: ev.data ?? {},
  });
}

// Notify an agent/seller that a new SIM batch was assigned to their stock.
export async function notifyBatchAssigned(
  recipientUserIds: number[],
  data: { count: number; provider: string; iccidRange: string }
): Promise<void> {
  await sendNotificationToUsers(recipientUserIds, {
    eventType: 'BATCH_ASSIGNED',
    title: 'تعيين دفعة شرائح جديدة',
    body: `تم تعيين ${data.count} شريحة ${data.provider} (${data.iccidRange}) إلى مخزنك.`,
    data: {
      eventType: 'BATCH_ASSIGNED',
      count: String(data.count),
      provider: data.provider,
    },
  });
}

// Notify the requester/agent that a distribution request was approved.
export async function notifyDistributionApproved(
  recipientUserIds: number[],
  data: { requestId: string; operator: string; count: number }
): Promise<void> {
  await sendNotificationToUsers(recipientUserIds, {
    eventType: 'DISTRIBUTION_APPROVED',
    title: 'تمت الموافقة على طلب التوزيع',
    body: `تمت الموافقة على طلب ${data.requestId} لـ ${data.count} شريحة ${data.operator}.`,
    data: {
      eventType: 'DISTRIBUTION_APPROVED',
      requestId: data.requestId,
      count: String(data.count),
      operator: data.operator,
    },
  });
}
