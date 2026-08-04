import { transaction } from './db';

// Tables cleared by a system reset. Order matters (children before parents).
// `users` is handled separately to keep manager/admin accounts alive.
const CLEAR_TABLES = [
  'sims',
  'distribution_requests',
  'customers',
  'operations',
  'transactions',
  'alerts',
  'audit_logs',
  'identity_risk_actions',
  'duplicate_identities',
  'token_blacklist',
  'sellers',
  'agents',
];

// Tables whose serial id sequences are restarted after the wipe.
const SEQUENCE_TABLES = [...CLEAR_TABLES, 'users'];

export interface ResetSummary {
  deleted: Record<string, number>;
}

/**
 * Wipes all inventory and relational data (SIMs, agents, sellers, notifications,
 * audit logs, operations, customers, distribution requests, duplicate identities,
 * risk actions and blacklisted tokens) inside a single transaction.
 *
 * Keeps: user accounts with role `manager` (system admin), system_settings and
 * operator inventory rows (zeroed out). Sequences are restarted so fresh test
 * data starts at id 1.
 */
export async function resetSystemData(): Promise<ResetSummary> {
  return transaction(async (client) => {
    const deleted: Record<string, number> = {};

    for (const table of CLEAR_TABLES) {
      // Table names come from a fixed allowlist above — no dynamic input.
      const result = await client.query(`DELETE FROM ${table}`);
      deleted[table] = result.rowCount ?? 0;
    }

    // Remove all non-admin accounts (agent/seller logins) — cascades nothing
    // because their relational rows were deleted above.
    const usersResult = await client.query(`DELETE FROM users WHERE role IN ('agent', 'seller')`);
    deleted.users = usersResult.rowCount ?? 0;

    // Zero out operator capacities — rows stay, counters show 0.
    await client.query(`UPDATE inventories SET available = 0, remaining = 0`);

    // Restart serial sequences so the next insert starts at id 1.
    for (const table of SEQUENCE_TABLES) {
      const seqInfo = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [table]);
      const seqName = seqInfo.rows[0]?.seq as string | undefined;
      if (seqName) {
        await client.query(`SELECT setval($1::regclass, 1, false)`, [seqName]);
      }
    }

    return { deleted };
  });
}
