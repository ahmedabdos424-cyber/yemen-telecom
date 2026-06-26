/**
 * @vitest-environment node
 *
 * P0-07 Regression tests: no hardcoded credentials in production code.
 * Checks that schema.sql does not contain known bcrypt hashes
 * and that seed.ts uses env-controlled passwords.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../schema.sql');
const seedPath = path.resolve(__dirname, '../seed.ts');

describe('P0-07 No Hardcoded Credentials', () => {
  describe('schema.sql', () => {
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    it('should not contain a valid bcrypt hash for seed users', () => {
      const bcryptHashRegex = /\$2[abxy]\$\d+\$[A-Za-z0-9./]{53}/;
      const matches = schema.match(bcryptHashRegex);
      // If any bcrypt hash exists, verify it's only in comments or as a placeholder
      if (matches) {
        for (const hash of matches) {
          const lineNum = schema.split('\n').findIndex(line => line.includes(hash)) + 1;
          // Accept only if it's in a comment (-- or /*)
          const line = schema.split('\n')[lineNum - 1];
          if (!line.trim().startsWith('--') && !line.trim().startsWith('/*')) {
            expect(`Line ${lineNum}: ${line.trim()}`).toBe('no-hardcoded-bcrypt-hash');
          }
        }
      }
    });

    it('should use a placeholder password_hash string (not a real hash)', () => {
      // The INSERT INTO users should use 'SEED_REQUIRED_RUN_NPM_RUN_DB_SEED' placeholder
      const insertMatch = schema.match(/INSERT INTO users.*password_hash[^;]+;/s);
      if (insertMatch) {
        expect(schema).toContain('SEED_REQUIRED_RUN_NPM_RUN_DB_SEED');
      }
    });
  });

  describe('seed.ts', () => {
    const seed = fs.readFileSync(seedPath, 'utf-8');

    it('should not contain hardcoded plaintext password', () => {
      // Should not have '123456' as a hardcoded bcrypt argument
      expect(seed).not.toContain("bcrypt.hash('123456'");
      expect(seed).not.toContain('bcrypt.hash("123456"');
    });

    it('should read per-user passwords from SEED_PASSWORD_* env vars', () => {
      expect(seed).toContain('SEED_PASSWORD_MANAGER');
      expect(seed).toContain('SEED_PASSWORD_AGENT');
      expect(seed).toContain('SEED_PASSWORD_SELLER');
    });

    it('should fall back to a random generated password per user', () => {
      expect(seed).toContain('crypto.randomBytes');
    });
  });
});
