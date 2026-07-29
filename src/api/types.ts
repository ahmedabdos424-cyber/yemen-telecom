import type { Operator } from '../types';

// ==================== Common ====================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ==================== Auth ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface ApiLoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    role: string;
    phone: string;
    region: string;
  };
}

export interface ApiMeResponse {
  id: number;
  username: string;
  displayName: string;
  role: string;
  phone: string;
  region: string;
  lastLogin: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RenewTokenResponse {
  token: string;
  refreshToken: string;
}

// ==================== SIMs ====================
export interface SimRow {
  id: number;
  phone: string;
  iccid: string;
  provider: string;
  status: string;
  owner: string;
  date_added: string;
  package_type: string;
  assigned_to: number | null;
  contract_image: string | null;
  customer_name: string | null;
  customer_id: string | null;
  created_at: string;
}

export interface CreateSimRequest {
  iccid: string;
  phone?: string;
  provider?: string;
  status?: string;
  owner?: string;
  package_type?: string;
}

export interface UpdateSimRequest {
  phone?: string;
  iccid?: string;
  provider?: string;
  status?: string;
  owner?: string;
  package_type?: string;
}

// ==================== Agents ====================
export interface AgentRow {
  id: number;
  user_id: number | null;
  name: string;
  region: string;
  phone: string;
  email: string;
  sellers_count: number;
  sims_count: number;
  status: string;
  created_at: string;
}

export interface CreateAgentRequest {
  name: string;
  region?: string;
  phone?: string;
  sellers_count?: number;
  sims_count?: number;
  status?: string;
  username?: string;
  password?: string;
}

export interface CreateAgentResponse {
  agent: AgentRow;
  credentials: { username: string; password: string };
}

export interface UpdateAgentRequest {
  name?: string;
  region?: string;
  phone?: string;
  sellers_count?: number;
  sims_count?: number;
  status?: string;
}

// ==================== Sellers ====================
export interface MappedSeller {
  id: string;
  sellerId: string;
  name: string;
  storeName: string;
  idNumber: string;
  phone: string;
  region: string;
  regionCode: string;
  status: string;
  totalSales: number;
  currentStock: number;
  efficiency: number;
  simsCount: number;
  sales30Days: number;
  salesGrowth: number;
  activityRate: number;
  creationDate: string;
  lastLogin: string;
  avatar: string;
  agent_name: string;
}

export interface CreateSellerRequest {
  name: string;
  username?: string;
  password?: string;
  storeName?: string;
  idNumber?: string;
  phone?: string;
  region?: string;
  regionCode?: string;
  status?: string;
  agent_name?: string;
  seller_id?: string;
  sellerId?: string;
  store_name?: string;
  id_number?: string;
  region_code?: string;
}

export interface CreateSellerResponse {
  seller: MappedSeller;
  credentials: { username: string; password: string };
}

export interface UpdateSellerRequest {
  name?: string;
  store_name?: string;
  storeName?: string;
  id_number?: string;
  idNumber?: string;
  phone?: string;
  region?: string;
  region_code?: string;
  regionCode?: string;
  status?: string;
}

export interface UpdateSellerBalanceRequest {
  amount: number;
  invoiceImage?: string;
}

export interface ApiResetPasswordResponse {
  message: string;
  credentials: { username: string; password: string };
}

// ==================== Operations ====================
export interface MappedOperation {
  id: string;
  type: string;
  target: string;
  operator: string;
  date: string;
  time: string;
  status: string;
}

export interface CreateOperationRequest {
  type: string;
  target: string;
  operator?: string;
  status?: string;
}

export interface QueryOperationsRequest {
  type?: string;
  target?: string;
  operator?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
}

// ==================== Inventories ====================
export interface MappedInventory {
  operator: string;
  available: number;
  remaining: number;
  periodDays: number;
}

export interface UpdateInventoryItem {
  operator: string;
  available: number;
  remaining: number;
}

// ==================== Alerts ====================
export interface AlertRow {
  id: number;
  title: string;
  description: string;
  priority: string;
  time: string;
  category: string;
  is_read: boolean;
  created_at?: string;
  created_by?: number | null;
}

// ==================== Admin ====================
export interface AdminSettingsRow {
  key: string;
  value: string;
}

export interface AdminSettingsResponse {
  twoFAEnabled: boolean | null;
  email2FAEnabled: boolean | null;
  trustedDevicesEnabled: boolean | null;
  sessionTimeout: string | null;
  passwordSpecialRequired: boolean | null;
  passwordExpiry90Days: boolean | null;
  passwordNoReuse5: boolean | null;
  maintenanceMode: boolean | null;
  language: string | null;
  emailAlertsEnabled: boolean | null;
  smsAlertsEnabled: boolean | null;
  appNotificationsEnabled: boolean | null;
  stockShortageThreshold: number | null;
  inactiveSimsThreshold: number | null;
  maxFailedLoginsThreshold: number | null;
  highRiskDuplicatesThreshold: number | null;
  identityRemindersEnabled: boolean | null;
  identityRemindersFrequency: string | null;
}

export interface UpdateSettingsRequest {
  [key: string]: string | number | boolean | null;
}

export interface MappedTransaction {
  id: string;
  clientName: string;
  provider: string;
  simsCount: number;
  status: string;
  relativeTime: string;
}

export interface DuplicateIdentityRow {
  idNo: string;
  name: string;
  simsCount: number;
  duplicatesCount: number;
  risk: string;
  region: string;
  avatarInitials: string;
  flagged: boolean;
  blocked: boolean;
  reviewStatus: string;
}

export interface AuditLogEntry {
  id: string;
  type: string;
  title: string;
  user: string;
  time: string;
  status: string;
}

export interface ApiBackupResponse {
  success: true;
  filename: string;
  size: number;
  sizeFormatted: string;
  tables: number;
  records: number;
  downloadUrl: string;
}

export interface ApiLockdownResponse {
  success: true;
  locked: boolean;
  message: string;
}

export interface AdminChangePasswordRequest {
  userId: number;
  newPassword: string;
}

// ==================== Users ====================
export interface UpdateProfileRequest {
  displayName?: string;
  phone?: string;
  region?: string;
  avatar?: string;
}

// ==================== Stats ====================
export interface StatsResponse {
  [key: string]: unknown;
}

// ==================== Customers ====================
export interface CustomerRow {
  id: number;
  full_name: string;
  id_number: string;
  phone: string;
  region: string;
  sims_count: number;
  first_activation: string;
  last_activation: string;
  created_at: string;
  activated_by: number | null;
  created_by: number | null;
}

// ==================== Distributions ====================
export interface DistributionRequestRow {
  id: number;
  request_id: string;
  agent_id: number | null;
  seller_id: number | null;
  operator: string;
  count: number;
  status: string;
  created_at: string;
  approved_by: number | null;
  approved_at: string | null;
  notes: string;
  created_by: number | null;
  agent_name: string | null;
  seller_name: string | null;
}

export interface CreateDistributionRequest {
  agent_id?: number;
  seller_id?: number;
  operator: string;
  count: number;
  notes?: string;
}

// ==================== Upload ====================
export interface UploadResponse {
  url: string;
  filename: string;
  [key: string]: unknown;
}

// ==================== App Update ====================
export interface AppVersionResponse {
  version: string;
  versionCode: number;
  apkUrl: string;
  sha256: string;
  size: number;
  notes: string[];
  required: boolean;
  checkedAt: string;
}
