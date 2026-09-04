/**
 * Privacy-safe dataset persistence (lib/persist.ts) tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadDataset, saveDataset, DATASET_TTL_MS } from './persist';

beforeEach(() => {
  localStorage.clear();
});

describe('saveDataset / loadDataset', () => {
  it('strips PII fields but keeps operational fields', () => {
    const rows = [
      {
        id: '1',
        iccid: '8996700000000000001',
        status: 'available',
        phone: '777123456',
        customer_name: 'اسم العميل',
        customer_id: '1234567890',
        contract_image: 'https://example.com/contract.jpg',
        idNumber: '0987654321',
        password: 'should-never-be-here',
      },
    ];
    saveDataset('tele_sims', rows);

    const raw = JSON.parse(localStorage.getItem('tele_sims') as string);
    expect(raw.v).toBe(1);
    expect(typeof raw.savedAt).toBe('number');
    const saved = raw.rows[0];
    // Operational fields survive
    expect(saved.id).toBe('1');
    expect(saved.iccid).toBe('8996700000000000001');
    expect(saved.status).toBe('available');
    expect(saved.phone).toBe('777123456');
    // PII is gone
    expect(saved).not.toHaveProperty('customer_name');
    expect(saved).not.toHaveProperty('customer_id');
    expect(saved).not.toHaveProperty('contract_image');
    expect(saved).not.toHaveProperty('idNumber');
    expect(saved).not.toHaveProperty('password');
  });

  it('round-trips fresh data', () => {
    saveDataset('tele_sellers', [{ id: 's1', name: 'بائع', phone: '777000000' }]);
    expect(loadDataset('tele_sellers', [] as unknown[])).toEqual([
      { id: 's1', name: 'بائع', phone: '777000000' },
    ]);
  });

  it('returns fallback after TTL expiry', () => {
    saveDataset('tele_sims', [{ id: '1' }]);
    const raw = JSON.parse(localStorage.getItem('tele_sims') as string);
    raw.savedAt = Date.now() - DATASET_TTL_MS - 1000;
    localStorage.setItem('tele_sims', JSON.stringify(raw));
    expect(loadDataset('tele_sims', 'FALLBACK')).toBe('FALLBACK');
  });

  it('accepts legacy plain-array format', () => {
    localStorage.setItem('admin_alerts', JSON.stringify([{ id: 1 }]));
    expect(loadDataset('admin_alerts', [] as unknown[])).toEqual([{ id: 1 }]);
  });

  it('returns fallback on corrupted content', () => {
    localStorage.setItem('tele_sims', '{not-json');
    expect(loadDataset('tele_sims', 'FALLBACK')).toBe('FALLBACK');
  });

  it('never throws on quota errors and drops the key', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');
    expect(() => saveDataset('tele_sims', [{ id: '1' }])).not.toThrow();
    expect(removeSpy).toHaveBeenCalledWith('tele_sims');
    spy.mockRestore();
    removeSpy.mockRestore();
  });
});
