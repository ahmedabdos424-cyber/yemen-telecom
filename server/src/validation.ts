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
  return v
    .replace(/<[^>]*>/g, '')     // Remove HTML tags
    .replace(/[<>]/g, '')        // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, '');  // Remove event handlers (onclick=, onerror=, etc.)
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
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

export const updateProfileSchema = z.object({
  displayName: so(200),
  phone: z.string().max(50).optional(),
  region: so(200),
  avatar: z.string().max(500).optional(),
});

// SIMs
export const SIM_STATUSES = ['available', 'assigned', 'activated', 'sold', 'reserved', 'inactive', 'suspended'] as const;

export const createSimSchema = z.object({
  iccid: z.string().min(1, 'ICCID is required').max(50),
  phone: z.string().max(50).optional().default(''),
  provider: z.enum(['Yemen Mobile', 'Sabafon', 'YOU']).optional().default('Yemen Mobile'),
  status: z.enum(SIM_STATUSES).optional().default('available'),
  owner: so(200).default('المركز الرئيسي'),
  package_type: so(100).default('باقة مزايا الشهرية'),
});

export const updateSimSchema = z.object({
  phone: z.string().max(50).optional(),
  iccid: z.string().max(50).optional(),
  provider: z.enum(['Yemen Mobile', 'Sabafon', 'YOU']).optional(),
  status: z.enum(SIM_STATUSES).optional(),
  owner: so(200),
  package_type: so(100),
  // Activation data (customer + contract image)
  customer_name: so(200),
  customerName: so(200),
  customer_id: z.string().max(50).optional(),
  customerId: z.string().max(50).optional(),
  contract_image: z.string().max(500).optional(),
  contractImage: z.string().max(500).optional(),
});

// SIM batch inventory — range-based ICCID insertion
const ICCID_RANGE_REGEX = /^\d+$/;

export const createSimBatchSchema = z.object({
  from_iccid: z.string().min(1, 'from_iccid is required').max(30).regex(ICCID_RANGE_REGEX, 'from_iccid must be numeric'),
  to_iccid: z.string().min(1, 'to_iccid is required').max(30).regex(ICCID_RANGE_REGEX, 'to_iccid must be numeric'),
  provider: z.enum(['Yemen Mobile', 'Sabafon', 'YOU']).optional().default('Yemen Mobile'),
  package_type: so(100).default('باقة مزايا الشهرية'),
  owner_role: z.enum(['admin', 'agent', 'seller']).optional().default('admin'),
  owner_id: z.number().int().positive().optional(),
});

export const activateSimSchema = z.object({
  iccid: z.string().min(1, 'ICCID is required').max(50),
  customer_name: so(200),
  customerName: so(200),
  customer_id: z.string().max(50).optional(),
  customerId: z.string().max(50).optional(),
  contract_image: z.string().max(500).optional(),
  contractImage: z.string().max(500).optional(),
});

// Agent → seller SIM range transfer
export const transferSimsSchema = z.object({
  seller_id: z.number().int().positive(),
  from_iccid: z.string().min(1, 'from_iccid is required').max(30).regex(ICCID_RANGE_REGEX, 'from_iccid must be numeric'),
  to_iccid: z.string().min(1, 'to_iccid is required').max(30).regex(ICCID_RANGE_REGEX, 'to_iccid must be numeric'),
});

// Admin system data reset (confirmation token required)
export const resetDataSchema = z.object({
  confirm: z.string().min(1, 'confirmation token is required').max(100),
});

// Agents
export const createAgentSchema = z.object({
  name: s(1, 200),
  full_name: s(1, 200).optional().default(''),
  region: so(200).default(''),
  phone: z.string().max(50).optional().default(''),
  sellers_count: z.number().int().min(0).optional().default(0),
  sims_count: z.number().int().min(0).optional().default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  username: z.string().max(100).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit').optional(),
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
  password: z.string().min(8, 'Password must be at least 8 characters').max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit').optional(),
  agent_name: so(200),
  seller_id: z.string().max(50).optional(),
  sellerId: z.string().max(50).optional(),
  // Identity/image: uploaded document URL (avatar) or raw identity capture
  avatar: z.string().max(500).optional(),
  id_document: z.string().max(500).optional(),
  idDocument: z.string().max(500).optional(),
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
  avatar: z.string().max(500).optional(),
  id_document: z.string().max(500).optional(),
  idDocument: z.string().max(500).optional(),
});

export const updateSellerBalanceSchema = z.object({
  amount: z.number().finite('Numeric amount is required'),
  invoiceImage: z.string().max(1000).optional(),
});

// Operator normalization — accepts both snake_case and Title Case, normalizes to snake_case
const OPERATOR_MAP: Record<string, string> = {
  'yemen_mobile': 'yemen_mobile',
  'Yemen Mobile': 'yemen_mobile',
  'sabafon': 'sabafon',
  'Sabafon': 'sabafon',
  'you': 'you',
  'YOU': 'you',
};
const VALID_OPERATORS = ['yemen_mobile', 'sabafon', 'you'] as const;

// Provider ID validation (for new provider_id FK usage)
const VALID_PROVIDER_IDS = [1, 2, 3] as const; // yemen_mobile=1, sabafon=2, you=3

export function normalizeOperator(v: string): string {
  return OPERATOR_MAP[v] || v;
}

function isValidOperator(v: string): boolean {
  return (VALID_OPERATORS as readonly string[]).includes(v);
}

// Required operator field (distributions, inventories) — accepts slug or provider_id
function requiredOperator() {
  return z.union([
    z.string().min(1).max(50)
      .transform(v => normalizeOperator(v))
      .refine(v => isValidOperator(v), {
        message: 'Invalid operator. Expected one of: yemen_mobile, sabafon, you',
      }),
    z.number().int().positive().refine(v => VALID_PROVIDER_IDS.includes(v as typeof VALID_PROVIDER_IDS[number]), {
      message: 'Invalid provider_id. Must be 1, 2, or 3',
    }),
  ]);
}

// Optional operator field (operations — empty string allowed)
function optionalOperator() {
  return z.union([
    z.string().max(50).optional().default('')
      .transform(v => v ? normalizeOperator(v) : v)
      .refine(v => v === '' || isValidOperator(v), {
        message: 'Invalid operator. Expected one of: yemen_mobile, sabafon, you',
      }),
    z.number().int().positive().optional(),
  ]);
}

// Helper to resolve operator string to provider_id
export function resolveProviderId(_db: any, operatorOrId: string | number): number {
  if (typeof operatorOrId === 'number') return operatorOrId;
  const normalized = normalizeOperator(operatorOrId);
  const providers: Record<string, number> = {
    'yemen_mobile': 1,
    'sabafon': 2,
    'you': 3,
  };
  return providers[normalized] || 1;
}

// Helper to resolve provider_id to display_name
export function resolveProviderDisplayName(_db: any, providerId: number): string {
  const names: Record<number, string> = {
    1: 'Yemen Mobile',
    2: 'Sabafon',
    3: 'YOU',
  };
  return names[providerId] || 'Unknown';
}

// Helper to resolve provider_id to slug
export function resolveProviderSlug(_db: any, providerId: number): string {
  const slugs: Record<number, string> = {
    1: 'yemen_mobile',
    2: 'sabafon',
    3: 'you',
  };
  return slugs[providerId] || 'unknown';
}

// Operations
export const createOperationSchema = z.object({
  type: z.enum(['activate', 'recharge']).refine(v => v, 'Operation type is required'),
  target: s(1, 100),
  operator: optionalOperator(),
  status: z.enum(['success', 'failed', 'pending']).optional().default('success'),
  // Customer data + contract image so activations carry full evidence
  customer_name: so(200),
  customerName: so(200),
  customer_id: z.string().max(50).optional(),
  customerId: z.string().max(50).optional(),
  contract_image: z.string().max(500).optional(),
  contractImage: z.string().max(500).optional(),
  iccid: z.string().max(30).optional(),
});

// Inventories
export const updateInventoriesSchema = z.array(z.object({
  operator: requiredOperator(),
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
  id_type: z.string().max(50).optional().default(''),
  idType: z.string().max(50).optional(),
  id_issue_date: z.string().max(20).optional().default(''),
  idIssueDate: z.string().max(20).optional(),
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
  operator: requiredOperator(),
  count: z.number().int().min(1, 'Count must be at least 1').max(10000),
  notes: so(200).default(''),
});

export const approveDistributionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: so(200),
});
