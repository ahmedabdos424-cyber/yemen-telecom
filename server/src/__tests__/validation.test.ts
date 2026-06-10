import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createSellerSchema,
  createSimSchema,
  createAgentSchema,
  createCustomerSchema,
  createOperationSchema,
  updatePasswordSchema,
  updateProfileSchema,
  refreshTokenSchema,
  updateSellerSchema,
  updateSimSchema,
  updateAgentSchema,
  createDistributionSchema,
  approveDistributionSchema,
  updateInventoriesSchema,
  updateSettingsSchema,
} from '../validation';

describe('Validation — Login Schema', () => {
  it('should accept valid login data', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '' });
    expect(result.success).toBe(false);
  });

  it('should strip HTML from username (XSS prevention)', () => {
    const result = loginSchema.safeParse({ username: '<script>alert("xss")</script>', password: 'secret123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).not.toContain('<script>');
      expect(result.data.username).not.toContain('>');
    }
  });

  it('should reject username exceeding max length', () => {
    const result = loginSchema.safeParse({ username: 'a'.repeat(101), password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('should strip HTML from password (should NOT — password is raw)', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '</b>secret123' });
    expect(result.success).toBe(true);
  });

  it('should strip angle brackets from username', () => {
    const result = loginSchema.safeParse({ username: 'admin>test', password: 'secret' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).not.toContain('>');
    }
  });
});

describe('Validation — Refresh Token Schema', () => {
  it('should accept valid refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'some-refresh-token-value' });
    expect(result.success).toBe(true);
  });

  it('should reject empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});

describe('Validation — Seller Schema', () => {
  it('should accept valid seller data', () => {
    const result = createSellerSchema.safeParse({ name: 'محمد أحمد', phone: '777123456' });
    expect(result.success).toBe(true);
  });

  it('should reject empty seller name', () => {
    const result = createSellerSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should strip HTML from seller name', () => {
    const result = createSellerSchema.safeParse({ name: 'محمد<img src=x onerror=alert(1)>' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).not.toContain('<img');
      expect(result.data.name).not.toContain('onerror');
    }
  });

  it('should apply defaults for optional fields', () => {
    const result = createSellerSchema.safeParse({ name: 'Test Seller' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
      expect(result.data.phone).toBe('');
      expect(result.data.region).toBe('');
    }
  });

  it('should accept seller with all optional fields', () => {
    const result = createSellerSchema.safeParse({
      name: 'Test Seller',
      store_name: 'متجر',
      id_number: '12345',
      phone: '777123456',
      region: 'صنعاء',
      status: 'low_stock',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid seller status', () => {
    const result = createSellerSchema.safeParse({ name: 'Test', status: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('Validation — Update Seller Schema', () => {
  it('should accept partial update', () => {
    const result = updateSellerSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should strip HTML from update fields', () => {
    const result = updateSellerSchema.safeParse({ name: '<b>Test</b>' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).not.toContain('<b>');
    }
  });

  it('should reject invalid status in update', () => {
    const result = updateSellerSchema.safeParse({ status: 'nonexistent' });
    expect(result.success).toBe(false);
  });
});

describe('Validation — SIM Schema', () => {
  it('should accept valid SIM data', () => {
    const result = createSimSchema.safeParse({ iccid: '8996701123456789012' });
    expect(result.success).toBe(true);
  });

  it('should reject empty ICCID', () => {
    const result = createSimSchema.safeParse({ iccid: '' });
    expect(result.success).toBe(false);
  });

  it('should apply defaults', () => {
    const result = createSimSchema.safeParse({ iccid: '8996701123456789012' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('Yemen Mobile');
      expect(result.data.status).toBe('available');
    }
  });

  it('should accept SIM with all fields', () => {
    const result = createSimSchema.safeParse({
      iccid: '8996701123456789012',
      phone: '777123456',
      provider: 'Sabafon',
      status: 'reserved',
      owner: 'مركز توزيع',
      package_type: 'باقة إنترنت',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider', () => {
    const result = createSimSchema.safeParse({ iccid: '8996701123456789012', provider: 'Unknown' });
    expect(result.success).toBe(false);
  });

  it('should strip HTML from SIM owner', () => {
    const result = createSimSchema.safeParse({ iccid: '8996701123456789012', owner: '<script>alert(1)</script>' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owner).not.toContain('<script>');
    }
  });
});

describe('Validation — Update SIM Schema', () => {
  it('should accept partial SIM update', () => {
    const result = updateSimSchema.safeParse({ phone: '777123456' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider in update', () => {
    const result = updateSimSchema.safeParse({ provider: 'Unknown' });
    expect(result.success).toBe(false);
  });
});

describe('Validation — Agent Schema', () => {
  it('should accept valid agent data', () => {
    const result = createAgentSchema.safeParse({ name: 'Test Agent' });
    expect(result.success).toBe(true);
  });

  it('should reject empty agent name', () => {
    const result = createAgentSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept agent with all fields', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      region: 'صنعاء',
      phone: '777123456',
      sellers_count: 5,
      sims_count: 100,
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('should strip HTML from agent name', () => {
    const result = createAgentSchema.safeParse({ name: '<a href="evil">Agent</a>' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).not.toContain('<a');
    }
  });

  it('should reject negative sellers count', () => {
    const result = createAgentSchema.safeParse({ name: 'Agent', sellers_count: -1 });
    expect(result.success).toBe(false);
  });
});

describe('Validation — Update Agent Schema', () => {
  it('should accept partial agent update', () => {
    const result = updateAgentSchema.safeParse({ name: 'Updated Agent' });
    expect(result.success).toBe(true);
  });

  it('should strip HTML from update', () => {
    const result = updateAgentSchema.safeParse({ name: '<em>Agent</em>' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).not.toContain('<em>');
    }
  });
});

describe('Validation — Customer Schema', () => {
  it('should accept valid customer data', () => {
    const result = createCustomerSchema.safeParse({ full_name: 'عميل تجربة', id_number: '1092837465' });
    expect(result.success).toBe(true);
  });

  it('should strip HTML from customer name', () => {
    const result = createCustomerSchema.safeParse({
      full_name: '<b>عميل</b>',
      id_number: '1092837465',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).not.toContain('<b>');
      expect(result.data.full_name).not.toContain('</b>');
    }
  });

  it('should reject empty ID number', () => {
    const result = createCustomerSchema.safeParse({ full_name: 'عميل', id_number: '' });
    expect(result.success).toBe(false);
  });

  it('should accept customer with optional fields', () => {
    const result = createCustomerSchema.safeParse({
      full_name: 'عميل',
      id_number: '12345',
      phone: '777123456',
      region: 'عدن',
      sims_count: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe('Validation — Operation Schema', () => {
  it('should accept valid operation', () => {
    const result = createOperationSchema.safeParse({ type: 'activate', target: '777123456' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid operation type', () => {
    const result = createOperationSchema.safeParse({ type: 'invalid', target: '777123456' });
    expect(result.success).toBe(false);
  });

  it('should accept recharge operation', () => {
    const result = createOperationSchema.safeParse({ type: 'recharge', target: '777123456' });
    expect(result.success).toBe(true);
  });

  it('should strip HTML from operation target', () => {
    const result = createOperationSchema.safeParse({ type: 'activate', target: '<b>777</b>' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target).not.toContain('<b>');
    }
  });
});

describe('Validation — Password Schema', () => {
  it('should accept valid password', () => {
    const result = updatePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'newPass123' });
    expect(result.success).toBe(true);
  });

  it('should reject short new password', () => {
    const result = updatePasswordSchema.safeParse({ currentPassword: 'old', newPassword: '1234567' });
    expect(result.success).toBe(false);
  });

  it('should reject empty current password', () => {
    const result = updatePasswordSchema.safeParse({ currentPassword: '', newPassword: 'newPass123' });
    expect(result.success).toBe(false);
  });

  it('should accept password at exact min length', () => {
    const result = updatePasswordSchema.safeParse({ currentPassword: 'old', newPassword: '12345678' });
    expect(result.success).toBe(true);
  });
});

describe('Validation — Profile Schema', () => {
  it('should accept valid profile update', () => {
    const result = updateProfileSchema.safeParse({ displayName: 'New Name', phone: '777123456', region: 'صنعاء' });
    expect(result.success).toBe(true);
  });

  it('should strip HTML from display name', () => {
    const result = updateProfileSchema.safeParse({ displayName: '<img src=x>Name' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).not.toContain('<img');
    }
  });

  it('should accept empty profile update', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('Validation — Distribution Schema', () => {
  it('should accept valid distribution request', () => {
    const result = createDistributionSchema.safeParse({ seller_name: 'بائع', operator: 'Yemen Mobile', count: 10 });
    expect(result.success).toBe(true);
  });

  it('should reject count less than 1', () => {
    const result = createDistributionSchema.safeParse({ seller_name: 'بائع', operator: 'Yemen Mobile', count: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject count over max', () => {
    const result = createDistributionSchema.safeParse({ seller_name: 'بائع', operator: 'Yemen Mobile', count: 10001 });
    expect(result.success).toBe(false);
  });

  it('should reject empty operator', () => {
    const result = createDistributionSchema.safeParse({ seller_name: 'بائع', operator: '', count: 10 });
    expect(result.success).toBe(false);
  });

  it('should accept distribution with notes', () => {
    const result = createDistributionSchema.safeParse({ seller_name: 'بائع', operator: 'Sabafon', count: 5, notes: 'توزيع عاجل' });
    expect(result.success).toBe(true);
  });
});

describe('Validation — Approve Distribution Schema', () => {
  it('should accept approved status', () => {
    const result = approveDistributionSchema.safeParse({ status: 'approved', notes: 'موافق' });
    expect(result.success).toBe(true);
  });

  it('should accept rejected status', () => {
    const result = approveDistributionSchema.safeParse({ status: 'rejected', notes: 'مرفوض' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = approveDistributionSchema.safeParse({ status: 'pending', notes: '' });
    expect(result.success).toBe(false);
  });

  it('should strip HTML from approval notes', () => {
    const result = approveDistributionSchema.safeParse({ status: 'approved', notes: '<script>hack</script>' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).not.toContain('<script>');
    }
  });
});

describe('Validation — Inventory Schema', () => {
  it('should accept valid inventory update', () => {
    const result = updateInventoriesSchema.safeParse([{ operator: 'Yemen Mobile', available: 100, remaining: 50 }]);
    expect(result.success).toBe(true);
  });

  it('should reject empty inventory array', () => {
    const result = updateInventoriesSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('should reject negative available count', () => {
    const result = updateInventoriesSchema.safeParse([{ operator: 'Yemen Mobile', available: -1, remaining: 0 }]);
    expect(result.success).toBe(false);
  });

  it('should accept multiple inventory items', () => {
    const result = updateInventoriesSchema.safeParse([
      { operator: 'Yemen Mobile', available: 100, remaining: 50 },
      { operator: 'Sabafon', available: 200, remaining: 150 },
    ]);
    expect(result.success).toBe(true);
  });
});

describe('Validation — Settings Schema', () => {
  it('should accept partial settings update', () => {
    const result = updateSettingsSchema.safeParse({ twoFAEnabled: true });
    expect(result.success).toBe(true);
  });

  it('should accept all settings fields', () => {
    const result = updateSettingsSchema.safeParse({
      twoFAEnabled: true,
      maintenanceMode: false,
      stockShortageThreshold: 10,
      language: 'ar',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid language', () => {
    const result = updateSettingsSchema.safeParse({ language: 123 });
    expect(result.success).toBe(false);
  });

  it('should accept empty settings object', () => {
    const result = updateSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
