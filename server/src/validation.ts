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

// Auth
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
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
  displayName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  region: z.string().max(200).optional(),
  avatar: z.string().max(500).optional(),
});

// SIMs
export const createSimSchema = z.object({
  iccid: z.string().min(1, 'ICCID is required').max(50),
  phone: z.string().max(50).optional().default(''),
  provider: z.enum(['Yemen Mobile', 'Sabafon', 'YOU']).optional().default('Yemen Mobile'),
  status: z.enum(['available', 'sold', 'reserved', 'inactive', 'suspended']).optional().default('available'),
  owner: z.string().max(200).optional().default('المركز الرئيسي'),
  package_type: z.string().max(100).optional().default('باقة مزايا الشهرية'),
});

export const updateSimSchema = z.object({
  phone: z.string().max(50).optional(),
  iccid: z.string().max(50).optional(),
  provider: z.enum(['Yemen Mobile', 'Sabafon', 'YOU']).optional(),
  status: z.enum(['available', 'sold', 'reserved', 'inactive', 'suspended']).optional(),
  owner: z.string().max(200).optional(),
  package_type: z.string().max(100).optional(),
});

// Agents
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(200),
  region: z.string().max(200).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  sellers_count: z.number().int().min(0).optional().default(0),
  sims_count: z.number().int().min(0).optional().default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  username: z.string().max(100).optional(),
  password: z.string().max(200).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().max(200).optional(),
  region: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  sellers_count: z.number().int().min(0).optional(),
  sims_count: z.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// Sellers
export const createSellerSchema = z.object({
  name: z.string().min(1, 'Seller name is required').max(200),
  store_name: z.string().max(200).optional().default(''),
  storeName: z.string().max(200).optional(),
  id_number: z.string().max(50).optional().default(''),
  idNumber: z.string().max(50).optional(),
  phone: z.string().max(50).optional().default(''),
  region: z.string().max(200).optional().default(''),
  region_code: z.string().max(50).optional().default(''),
  regionCode: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'low_stock']).optional().default('active'),
  username: z.string().max(100).optional(),
  password: z.string().max(200).optional(),
  agent_name: z.string().max(200).optional(),
  seller_id: z.string().max(50).optional(),
  sellerId: z.string().max(50).optional(),
});

export const updateSellerSchema = z.object({
  name: z.string().max(200).optional(),
  store_name: z.string().max(200).optional(),
  storeName: z.string().max(200).optional(),
  id_number: z.string().max(50).optional(),
  idNumber: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  region: z.string().max(200).optional(),
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
  target: z.string().min(1, 'Target is required').max(100),
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
  full_name: z.string().min(1, 'Customer name is required').max(200),
  fullName: z.string().min(1).max(200).optional(),
  id_number: z.string().min(1, 'ID number is required').max(50),
  idNumber: z.string().min(1).max(50).optional(),
  phone: z.string().max(50).optional().default(''),
  region: z.string().max(200).optional().default(''),
  sims_count: z.number().int().min(0).optional().default(1),
  activated_by: z.number().int().optional(),
});

// Distribution requests
export const createDistributionSchema = z.object({
  seller_id: z.number().int().optional(),
  sellerId: z.number().int().optional(),
  seller_name: z.string().max(200).optional(),
  operator: z.string().min(1).max(50),
  count: z.number().int().min(1, 'Count must be at least 1').max(10000),
  notes: z.string().optional().default(''),
});

export const approveDistributionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});
