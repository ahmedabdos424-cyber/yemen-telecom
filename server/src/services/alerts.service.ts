import type { QueryResult } from 'pg';
import { query } from '../db';
import { sendPushToTokens, getManagerTokens, getAgentAndManagerTokens, isFcmEnabled } from './fcm.service';
import { broadcastEvent } from './realtime.service';
import { logger } from '../logger';

export interface Queryable {
  query(text: string, params?: unknown[]): Promise<QueryResult<any>>;
}

export type AlertPriority = 'high' | 'medium' | 'low';

export interface CreateAlertInput {
  title: string;
  description: string;
  priority?: AlertPriority;
  category?: string;
  userId?: number | null;
}

// Which roles should receive a push for a given alert category.
const PUSH_RECIPIENTS: Record<string, 'managers' | 'managersAndAgents'> = {
  'مخزون': 'managersAndAgents',
  'security': 'managers',
  'نظام': 'managers',
};

async function broadcastPush(input: CreateAlertInput): Promise<void> {
  if (!isFcmEnabled()) return;
  try {
    const recipients = PUSH_RECIPIENTS[input.category ?? ''] ?? 'managers';
    const tokens = recipients === 'managersAndAgents'
      ? await getAgentAndManagerTokens()
      : await getManagerTokens();
    if (tokens.length === 0) return;
    const { sent } = await sendPushToTokens(tokens, {
      title: input.title,
      body: input.description,
      data: { category: input.category ?? 'alert', priority: input.priority ?? 'low', alertType: 'system' },
    });
    if (sent > 0) logger.info(`[FCM] Push sent to ${sent} device(s) for alert: ${input.title}`);
  } catch (err) {
    // Push must never break the alert write path.
    logger.error('[FCM] broadcast failed:', err);
  }
}

// Centralized alert writer. Accepts an optional db handle (pool or transaction
// client) so callers can keep alerts inside the same transaction as the
// operation that produced them.
export async function createAlert(input: CreateAlertInput, db: Queryable = { query }): Promise<void> {
  await db.query(
    `INSERT INTO alerts (title, description, priority, time, category, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.title,
      input.description,
      input.priority ?? 'low',
      new Date().toLocaleString('ar-YE'),
      input.category ?? 'مخزون',
      input.userId ?? null,
    ]
  );
  // Fire-and-forget push after the DB write succeeds (not awaited so it
  // never slows down or breaks the request that created the alert).
  void broadcastPush(input);
  // Live realtime update so open dashboards show the alert instantly.
  broadcastEvent({
    type: 'alert.created',
    entity: 'alert',
    title: input.title,
    description: input.description,
    priority: input.priority ?? 'low',
    category: input.category ?? 'مخزون',
  });
}
