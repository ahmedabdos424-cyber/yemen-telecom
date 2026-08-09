export interface DailySalesRow {
  day: string;
  activations: string;
  unique_customers: string;
  operator: string | null;
}

export interface AgentPerformanceRow {
  id: number;
  agent_name: string | null;
  region: string | null;
  seller_count: string;
  total_sims: string;
  sales_30_days: string;
  avg_efficiency: string;
}

export interface OperatorDistributionRow {
  operator: string | null;
  count: string;
  status: string | null;
}

export interface SellerPerformanceRow {
  id: number;
  name: string;
  store_name: string | null;
  region: string | null;
  sims_count: number;
  sales_30_days: number;
  sales_growth: number;
  efficiency: number;
  activity_rate: number;
  status: string | null;
  avatar: string | null;
  id_number: string | null;
  phone: string | null;
  agent_name: string | null;
}

export interface ActivationsReportRow {
  op_id: string;
  type: string;
  target: string | null;
  operator: string | null;
  date: string | null;
  time: string | null;
  status: string | null;
  customer_name: string | null;
  customer_id: string | null;
  contract_image: string | null;
  iccid: string | null;
  created_at: string | Date | null;
  actor_name: string;
  actor_role: string;
  agent_name: string;
  seller_name: string;
}

export interface SellersRegistryRow {
  id: number;
  seller_id: string | null;
  name: string;
  store_name: string | null;
  id_number: string | null;
  phone: string | null;
  region: string | null;
  region_code: string | null;
  status: string | null;
  avatar: string | null;
  creation_date: string | null;
  last_login: string | null;
  total_sales: number;
  current_stock: number;
  efficiency: number;
  sims_count: number;
  sales_30_days: number;
  sales_growth: number;
  activity_rate: number;
  agent_name: string | null;
}

export interface AgentIdRow {
  id: number;
}
