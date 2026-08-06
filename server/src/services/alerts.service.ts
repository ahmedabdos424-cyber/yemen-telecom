import type { QueryResult } from 'pg';
import { query } from '../db';

export interface Queryable {
  query(text: string, params?: any[]): Promise<QueryResult<any>>;
}

export type AlertPriority = 'high' | 'medium' | 'low';

export interface CreateAlertInput {
  title: string;
  description: string;
  priority?: AlertPriority;
  category?: string;
  userId?: number | null;
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
}
