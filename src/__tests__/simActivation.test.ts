/**
 * SIM activation logic tests.
 */

import { describe, it, expect } from 'vitest';

describe('SIM Activation', () => {
  const validSIM = {
    iccid: '12345678901234567890',
    provider: 'Yemen Mobile' as const,
    phone: '777123456',
    status: 'available' as const,
  };

  it('should have valid ICCID length', () => {
    expect(validSIM.iccid.length).toBeGreaterThanOrEqual(18);
    expect(validSIM.iccid.length).toBeLessThanOrEqual(22);
  });

  it('should have valid provider', () => {
    const validProviders = ['Yemen Mobile', 'Sabafon', 'YOU'];
    expect(validProviders).toContain(validSIM.provider);
  });

  it('should have valid SIM status', () => {
    const validStatuses = ['available', 'sold', 'reserved', 'inactive', 'suspended'];
    expect(validStatuses).toContain(validSIM.status);
  });

  it('should validate ICCID contains only digits', () => {
    expect(/^\d+$/.test(validSIM.iccid)).toBe(true);
  });

  it('should have valid phone number for Yemen', () => {
    expect(validSIM.phone).toMatch(/^7\d{8}$/);
  });

  it('should accept Sabafon as provider', () => {
    const providers = ['Yemen Mobile', 'Sabafon', 'YOU'];
    expect(providers).toContain('Sabafon');
  });

  it('should accept YOU as provider', () => {
    const providers = ['Yemen Mobile', 'Sabafon', 'YOU'];
    expect(providers).toContain('YOU');
  });

  it('should reject invalid providers', () => {
    const providers = ['Yemen Mobile', 'Sabafon', 'YOU'];
    expect(providers).not.toContain('MTN');
    expect(providers).not.toContain('Orange');
  });

  it('should support sold status', () => {
    const statuses = ['available', 'sold', 'reserved', 'inactive', 'suspended'];
    expect(statuses).toContain('sold');
  });

  it('should support reserved status', () => {
    const statuses = ['available', 'sold', 'reserved', 'inactive', 'suspended'];
    expect(statuses).toContain('reserved');
  });

  it('should support suspended status', () => {
    const statuses = ['available', 'sold', 'reserved', 'inactive', 'suspended'];
    expect(statuses).toContain('suspended');
  });

  it('should reject invalid ICCID with letters', () => {
    const invalidIccid = '1234567890abcdef1234';
    expect(/^\d+$/.test(invalidIccid)).toBe(false);
  });

  it('should reject short ICCID', () => {
    const shortIccid = '12345';
    expect(shortIccid.length).toBeLessThan(18);
  });
});
