import { Home, PlusCircle, UserPlus, Users, Cpu, UserCircle, type LucideIcon } from 'lucide-react';
import { ViewType } from '../../types';

// عنصر تنقل موحّد: المعرّف + التسمية العربية + أيقونة Material Symbols (لشريط
// التنقل السفلي) + أيقونة lucide (للقائمة الجانبية). يُستهلك من NavBar لإزالة
// تكرار قوائم العناصر بين الوكيل والبائع.
export interface NavItemLucide {
  id: string;
  label: string;
  iconMat: string;
  Icon: LucideIcon;
}

export const agentNavItems: NavItemLucide[] = [
  { id: 'home', label: 'الرئيسية', iconMat: 'home', Icon: Home },
  { id: 'activate', label: 'تفعيل شريحة', iconMat: 'add_circle', Icon: PlusCircle },
  { id: 'add_seller', label: 'إضافة بائع', iconMat: 'person_add', Icon: UserPlus },
  { id: 'sellers', label: 'البائعين', iconMat: 'group', Icon: Users },
  { id: 'my_sims', label: 'شرائحي', iconMat: 'sim_card', Icon: Cpu },
  { id: 'account', label: 'بيانات الحساب', iconMat: 'account_circle', Icon: UserCircle },
];

export const sellerNavItems: NavItemLucide[] = [
  { id: 'home', label: 'الرئيسية', iconMat: 'home', Icon: Home },
  { id: 'activate', label: 'تفعيل شريحة', iconMat: 'add_circle', Icon: PlusCircle },
  { id: 'my_sims', label: 'شرائحي', iconMat: 'sim_card', Icon: Cpu },
  { id: 'account', label: 'بيانات الحساب', iconMat: 'account_circle', Icon: UserCircle },
];

// عناصر شريط التنقل السفلي للمدير (Material Symbols).
export const managerNavItems: { id: string; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'الرئيسية', icon: 'home' },
  { id: 'agents', label: 'الوكلاء', icon: 'groups' },
  { id: 'sims', label: 'شرائحي', icon: 'sim_card' },
  { id: 'reports', label: 'التقارير', icon: 'analytics' },
  { id: 'settings', label: 'الإعدادات', icon: 'settings' },
  { id: 'more', label: 'المزيد', icon: 'apps' },
];

// عناوين الواجهات حسب نوع العرض (تستهلكها TopBar بدل خريطة getTitle المحلية).
export const viewTitles: Record<string, string> = {
  dashboard: 'لوحة التحكم المركزية',
  sims: 'إدارة الشرائح والمخزون',
  agents: 'إدارة الوكلاء المعتمدين',
  sellers: 'إدارة ومتابعة البائعين',
  alerts: 'تنبيهات النظام والمراقبة الفورية',
  'duplicate-identities': 'مراقبة الهويات المتكررة والمخاطر',
  reports: 'مركز التقارير المتقدمة',
  settings: 'إعدادات النظام والأمان',
  'add-agent': 'إضافة وكيل نظام جديد',
};

export const DEFAULT_VIEW_TITLE = 'نظام توزيع الشرائح';

export type { ViewType };
