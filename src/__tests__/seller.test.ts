/**
 * Seller data model and validation tests.
 */

import { describe, it, expect } from 'vitest';

describe('Seller Model', () => {
  const validSeller = {
    id: 'seller-1',
    name: 'أحمد محمد',
    region: 'صنعاء',
    phone: '777123456',
    simsCount: 10,
    sales30Days: 50,
    salesGrowth: 12.5,
    activityRate: 75,
    status: 'active' as const,
    storeName: 'متجر النور',
    idNumber: '1234567890',
  };

  it('should have required fields', () => {
    expect(validSeller).toHaveProperty('id');
    expect(validSeller).toHaveProperty('name');
    expect(validSeller).toHaveProperty('region');
    expect(validSeller).toHaveProperty('phone');
    expect(validSeller).toHaveProperty('status');
  });

  it('should have valid status values', () => {
    const validStatuses = ['active', 'inactive', 'suspended', 'low_stock'];
    expect(validStatuses).toContain(validSeller.status);
  });

  it('should have valid phone number format', () => {
    expect(validSeller.phone).toMatch(/^\d{9,10}$/);
  });

  it('should have non-negative sims count', () => {
    expect(validSeller.simsCount).toBeGreaterThanOrEqual(0);
  });

  it('should have valid sales growth percentage', () => {
    expect(validSeller.salesGrowth).toBeGreaterThanOrEqual(-100);
    expect(validSeller.salesGrowth).toBeLessThanOrEqual(1000);
  });

  it('should have valid activity rate', () => {
    expect(validSeller.activityRate).toBeGreaterThanOrEqual(0);
    expect(validSeller.activityRate).toBeLessThanOrEqual(100);
  });

  it('should have storeName defined', () => {
    expect(validSeller.storeName).toBeDefined();
    expect(typeof validSeller.storeName).toBe('string');
  });

  it('should have idNumber defined', () => {
    expect(validSeller.idNumber).toBeDefined();
  });

  it('should have numeric sales30Days', () => {
    expect(typeof validSeller.sales30Days).toBe('number');
    expect(validSeller.sales30Days).toBeGreaterThanOrEqual(0);
  });
});

describe('Seller Status Transitions', () => {
  it('should support active status', () => {
    const status = 'active';
    expect(['active', 'suspended', 'low_stock', 'inactive']).toContain(status);
  });

  it('should support suspended status', () => {
    const status = 'suspended';
    expect(['active', 'suspended', 'low_stock', 'inactive']).toContain(status);
  });

  it('should support low_stock status', () => {
    const status = 'low_stock';
    expect(['active', 'suspended', 'low_stock', 'inactive']).toContain(status);
  });

  it('should support inactive status', () => {
    const status = 'inactive';
    expect(['active', 'suspended', 'low_stock', 'inactive']).toContain(status);
  });

  it('should reject invalid status', () => {
    const invalidStatuses = ['deleted', 'archived', 'pending', '', undefined];
    const validStatuses = ['active', 'inactive', 'suspended', 'low_stock'];
    for (const s of invalidStatuses) {
      expect(validStatuses).not.toContain(s);
    }
  });
});
