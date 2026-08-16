/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'manager' | 'agent' | 'seller';

export type SimStatus = 'available' | 'assigned' | 'activated' | 'allocated' | 'sold' | 'reserved' | 'inactive' | 'suspended';
export type SimProvider = 'Yemen Mobile' | 'Sabafon' | 'YOU';
export type Operator = 'yemen_mobile' | 'sabafon' | 'you' | SimProvider;

export interface ISim {
  id: string;
  iccid: string;
  provider: SimProvider;
  /** Alias for provider — auto-set by helper */
  operator?: Operator;
  status: SimStatus;
  dateAdded: string;
  phone?: string;
  owner?: string;
  packageType?: string;
  category?: string;
  contract_image?: string;
  customer_name?: string;
  customer_id?: string;
  assigned_to?: number | null;
}

export function setSimOperator(sim: ISim): ISim {
  return { ...sim, operator: toOperator(sim.provider) };
}

export function simProvider(o: Operator): SimProvider {
  if (o === 'yemen_mobile') return 'Yemen Mobile';
  if (o === 'sabafon') return 'Sabafon';
  if (o === 'you') return 'YOU';
  return o;
}

export function toOperator(p: SimProvider): Operator {
  if (p === 'Yemen Mobile') return 'yemen_mobile';
  if (p === 'Sabafon') return 'sabafon';
  if (p === 'YOU') return 'you';
  return p;
}

// Legacy aliases
export type SIM = ISim;
export type Sim = ISim;

export interface Agent {
  id: string;
  name: string;
  fullName?: string;
  region: string;
  phone: string;
  sellersCount: number;
  simsCount: number;
  status: 'active' | 'inactive';
}

export interface Seller {
  id: string;
  name: string;
  region: string;
  phone: string;
  simsCount: number;
  sales30Days: number;
  salesGrowth: number;
  activityRate: number;
  status: 'active' | 'inactive' | 'suspended' | 'low_stock';
  
  // Fields from zip details
  storeName?: string;
  idNumber?: string;
  regionCode?: string;
  totalSales?: number;
  currentStock?: number;
  efficiency?: number; // percentage
  creationDate?: string;
  lastLogin?: string;
  avatar?: string;
  username?: string;
  password?: string;
  agent_name?: string;
}

export interface SystemAlert {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  time: string;
  category: string;
  read?: boolean;
}

export interface Transaction {
  id: string;
  clientName: string;
  provider: 'Yemen Mobile' | 'Sabafon' | 'YOU';
  simsCount: number;
  status: 'completed' | 'pending';
  relativeTime: string;
}

export interface AuditLog {
  id: string;
  type: string;
  title: string;
  user: string;
  time: string;
  status: 'blocked' | 'verified' | 'analyzing' | 'normal';
}

export interface SystemSettings {
  twoFAEnabled: boolean;
  email2FAEnabled: boolean;
  trustedDevicesEnabled: boolean;
  sessionTimeout: string;
  passwordSpecialRequired: boolean;
  passwordExpiry90Days: boolean;
  passwordNoReuse5: boolean;
  maintenanceMode: boolean;
  language: string;
  emailAlertsEnabled: boolean;
  smsAlertsEnabled: boolean;
  appNotificationsEnabled: boolean;
  // Alert Thresholds
  stockShortageThreshold: number;
  inactiveSimsThreshold: number;
  maxFailedLoginsThreshold: number;
  highRiskDuplicatesThreshold: number;
  // Identity Reminders Settings
  identityRemindersEnabled: boolean;
  identityRemindersFrequency: 'daily' | 'weekly';
}

export type ViewType =
  | 'dashboard'
  | 'sims'
  | 'agents'
  | 'sellers'
  | 'alerts'
  | 'duplicate-identities'
  | 'reports'
  | 'settings'
  | 'add-agent';

export interface Operation {
  id: string;
  type: 'activate' | 'recharge';
  target: string; // phone or reference
  operator: 'yemen_mobile' | 'sabafon' | 'you' | 'Yemen Mobile' | 'Sabafon' | 'YOU';
  date: string;
  time: string;
  status: 'success' | 'failed' | 'pending';
}

export interface OperatorInventory {
  operator: 'yemen_mobile' | 'sabafon' | 'you' | 'Yemen Mobile' | 'Sabafon' | 'YOU';
  available: number;
  remaining: number;
  periodDays: number;
}
