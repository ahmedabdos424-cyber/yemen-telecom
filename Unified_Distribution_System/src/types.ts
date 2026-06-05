export type Role = 'manager' | 'agent' | 'seller';

export type Operator = 'yemen_mobile' | 'sabafon' | 'you';

export interface Seller {
  id: string;
  name: string;
  storeName: string;
  idNumber: string;
  phone: string;
  region: string;
  regionCode: string;
  status: 'active' | 'low_stock' | 'inactive';
  totalSales: number;
  currentStock: number;
  efficiency: number; // percentage
  creationDate: string;
  lastLogin: string;
  avatar?: string;
}

export interface Sim {
  id: string;
  iccid: string;
  operator: Operator;
  category: string;
  status: 'available' | 'sold' | 'reserved' | 'inactive';
  dateAdded: string;
}

export interface Operation {
  id: string;
  type: 'activate' | 'recharge';
  target: string; // phone or reference
  operator: Operator;
  date: string;
  time: string;
  status: 'success' | 'failed' | 'pending';
}

export interface OperatorInventory {
  operator: Operator;
  available: number;
  remaining: number;
  periodDays: number;
}
