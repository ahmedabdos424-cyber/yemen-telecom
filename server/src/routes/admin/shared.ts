import { formatDbTimestamp } from '../../helpers';

// نوع صف سجل التدقيق في قاعدة البيانات
export interface DbAuditLogRow {
  log_id: unknown;
  type: string;
  title: string;
  username: string;
  time: unknown;
  status: string;
  device_name?: string | null;
  ip_address?: string | null;
  mac_address?: string | null;
  login_at?: string | Date | null;
  logout_at?: string | Date | null;
  session_status?: string | null;
}

// تحويل صف audit_logs إلى الشكل المتوقع للواجهة (مشترك بين سجلات التدقيق وجلسات البائعين)
export function mapAuditRow(r: DbAuditLogRow) {
  return {
    id: r.log_id,
    type: r.type,
    title: r.title,
    user: r.username,
    time: r.time,
    status: r.status,
    deviceName: r.device_name || '',
    ipAddress: r.ip_address || '',
    macAddress: r.mac_address || '',
    loginAt: formatDbTimestamp(r.login_at),
    logoutAt: formatDbTimestamp(r.logout_at),
    sessionStatus: r.session_status || (r.logout_at ? 'closed' : r.type === 'login' ? 'active' : ''),
  };
}
