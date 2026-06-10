import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req[source] = result.data;
    next();
  };
}

// Helper to strip HTML/script tags from strings (XSS prevention)
function stripHtml(v: string): string {
  return v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
}

function s(min = 1, max = 200) {
  return z.string().min(min).max(max).transform(v => stripHtml(v));
}

function so(max = 200) {
  return z.string().max(max).optional().transform(v => v ? stripHtml(v) : v);
}

// Auth
export const loginSchema = z.object({
  username: s(1, 100),
  password: z.string().min(1, 'Password is required').max(200),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Users
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const updateProfileSchema = z.object({
  displayName: so(200),
  phone: z.string().max(50).optional(),
  region: so(200),
  avatar: z.string().max(500).optional(),
});

// SIMs
export const createSimSchema = z.object({
  iccid: z.string().min(1, 'ICCID is required').max(50),
  phone: z.string().max(50).optional().default(''),
  provider: z.enum(['Yemen Mobile', 'Sabafon', 'YOU']).optional().default('Yemen Mobile'),
  status: z.enum(['available', 'sold', 'reserved', 'inactive', 'suspended']).optional().default('available'),
  owner: so(200).default('المركز الرئيسي'),
  package_type: so(100).default('باقة مزايا الشهرية'),
});

export const updateSimSchema = z.object({
  phone: z.string().max(50).optional(),
  iccid: z.string().max(50).optional(),
  provider: z.enum(['Yemen Mobile', 'Sabafon', 'YOU']).optional(),
  status: z.enum(['available', 'sold', 'reserved', 'inactive', 'suspended']).optional(),
  owner: so(200),
  package_type: so(100),
});

// Agents
export const createAgentSchema = z.object({
  name: s(1, 200),
  region: so(200).default(''),
  phone: z.string().max(50).optional().default(''),
  sellers_count: z.number().int().min(0).optional().default(0),
  sims_count: z.number().int().min(0).optional().default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  username: z.string().max(100).optional(),
  password: z.string().max(200).optional(),
});

export const updateAgentSchema = z.object({
  name: so(200),
  region: so(200),
  phone: z.string().max(50).optional(),
  sellers_count: z.number().int().min(0).optional(),
  sims_count: z.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// Sellers
export const createSellerSchema = z.object({
  name: s(1, 200),
  store_name: so(200).default(''),
  storeName: so(200),
  id_number: z.string().max(50).optional().default(''),
  idNumber: z.string().max(50).optional(),
  phone: z.string().max(50).optional().default(''),
  region: so(200).default(''),
  region_code: z.string().max(50).optional().default(''),
  regionCode: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'low_stock']).optional().default('active'),
  username: z.string().max(100).optional(),
  password: z.string().max(200).optional(),
  agent_name: so(200),
  seller_id: z.string().max(50).optional(),
  sellerId: z.string().max(50).optional(),
});

export const updateSellerSchema = z.object({
  name: so(200),
  store_name: so(200),
  storeName: so(200),
  id_number: z.string().max(50).optional(),
  idNumber: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  region: so(200),
  region_code: z.string().max(50).optional(),
  regionCode: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'low_stock']).optional(),
});

export const updateSellerBalanceSchema = z.object({
  amount: z.number().refine(v => !isNaN(v), 'Numeric amount is required'),
});

// Operations
export const createOperationSchema = z.object({
  type: z.enum(['activate', 'recharge']).refine(v => v, 'Operation type is required'),
  target: s(1, 100),
  operator: z.string().max(50).optional().default(''),
  status: z.enum(['success', 'failed', 'pending']).optional().default('success'),
});

// Inventories
export const updateInventoriesSchema = z.array(z.object({
  operator: z.string().min(1),
  available: z.number().int().min(0),
  remaining: z.number().int().min(0),
})).min(1);

// Admin settings
export const updateSettingsSchema = z.object({
  twoFAEnabled: z.boolean().optional(),
  email2FAEnabled: z.boolean().optional(),
  trustedDevicesEnabled: z.boolean().optional(),
  sessionTimeout: z.string().optional(),
  passwordSpecialRequired: z.boolean().optional(),
  passwordExpiry90Days: z.boolean().optional(),
  passwordNoReuse5: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  language: z.string().optional(),
  emailAlertsEnabled: z.boolean().optional(),
  smsAlertsEnabled: z.boolean().optional(),
  appNotificationsEnabled: z.boolean().optional(),
  stockShortageThreshold: z.number().int().optional(),
  inactiveSimsThreshold: z.number().int().optional(),
  maxFailedLoginsThreshold: z.number().int().optional(),
  highRiskDuplicatesThreshold: z.number().int().optional(),
  identityRemindersEnabled: z.boolean().optional(),
  identityRemindersFrequency: z.enum(['daily', 'weekly']).optional(),
});

// Customers
export const createCustomerSchema = z.object({
  full_name: s(1, 200),
  fullName: s(1, 200).optional(),
  id_number: z.string().min(1, 'ID number is required').max(50),
  idNumber: z.string().min(1).max(50).optional(),
  phone: z.string().max(50).optional().default(''),
  region: so(200).default(''),
  sims_count: z.number().int().min(0).optional().default(1),
  activated_by: z.number().int().optional(),
});

// Distribution requests
export const createDistributionSchema = z.object({
  seller_id: z.number().int().optional(),
  sellerId: z.number().int().optional(),
  seller_name: so(200),
  operator: z.string().min(1).max(50),
  count: z.number().int().min(1, 'Count must be at least 1').max(10000),
  notes: so(200).default(''),
});

export const approveDistributionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: so(200),
});
