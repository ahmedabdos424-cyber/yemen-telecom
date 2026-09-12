/**
 * @vitest-environment node
 *
 * F4 regression: any migration that self-registers its own row in
 * schema_migrations must record only its actual on-disk filename. Migration 036
 * previously embedded the phantom '035_add_missing_performance_indexes.sql',
 * which blocked a future real 035_* migration and misreported applied state.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

describe('F4 — schema_migrations self-registration consistency', () => {
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  it('has migration files to verify', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const embeddedValues = [...sql.matchAll(/INSERT INTO schema_migrations[^;]+?VALUES\s*\(\s*'([^']+)'[,)]/gi)]
      .map((m) => m[1]);
    if (embeddedValues.length === 0) continue;

    it(`${file} registers only its own filename in schema_migrations (F4)`, () => {
      expect(embeddedValues).toContain(file);
      expect(embeddedValues.every((v) => v === file)).toBe(true);
    });
  }
});