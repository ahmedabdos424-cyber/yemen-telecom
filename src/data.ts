/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SIM, Agent, Seller, SystemAlert, Transaction, AuditLog, SystemSettings } from './types';

export const INITIAL_SIMS: SIM[] = [
  {
    id: '1',
    phone: '777123456',
    iccid: '8996701123456789012',
    provider: 'Yemen Mobile',
    status: 'available',
    owner: 'المركز الرئيسي',
    dateAdded: '2023/10/25',
    packageType: 'باقة مزايا الشهرية'
  },
  {
    id: '2',
    phone: '711987654',
    iccid: '8996702233445566778',
    provider: 'Sabafon',
    status: 'sold',
    owner: 'محمد سالم (بائع)',
    dateAdded: '2023/10/24',
    packageType: 'باقة البيانات 10GB'
  },
  {
    id: '3',
    phone: '733554433',
    iccid: '8996703344556677889',
    provider: 'YOU',
    status: 'reserved',
    owner: 'وكالة الأمل',
    dateAdded: '2023/10/24',
    packageType: 'باقة هلا الفضية'
  },
  {
    id: '4',
    phone: '770987654',
    iccid: '8996700012345678901',
    provider: 'Yemen Mobile',
    status: 'available',
    owner: 'أحمد محمد الصنعاني (بائع)',
    dateAdded: '2023/10/25',
    packageType: 'باقة مزايا الشهرية'
  },
  {
    id: '5',
    phone: '775432109',
    iccid: '8996700012345678902',
    provider: 'Yemen Mobile',
    status: 'available',
    owner: 'أحمد محمد الصنعاني (بائع)',
    dateAdded: '2023/10/24',
    packageType: 'باقة البيانات 10GB'
  },
  {
    id: '6',
    phone: '712345678',
    iccid: '8996700012345678903',
    provider: 'Sabafon',
    status: 'reserved',
    owner: 'أحمد محمد الصنعاني (بائع)',
    dateAdded: '2023/10/24',
    packageType: 'باقة هلا الفضية'
  },
  {
    id: '7',
    phone: '731111222',
    iccid: '8996700012345678904',
    provider: 'YOU',
    status: 'inactive',
    owner: 'أحمد محمد الصنعاني (بائع)',
    dateAdded: '2023/10/22',
    packageType: 'باقة مزايا الشهرية'
  }
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'محمد عبدالله الصبري',
    region: 'أمانة العاصمة',
    phone: '1012398455',
    sellersCount: 45,
    simsCount: 1240,
    status: 'active'
  },
  {
    id: '2',
    name: 'خالد ناصر الحميري',
    region: 'عدن - كريتر',
    phone: '2039485761',
    sellersCount: 12,
    simsCount: 340,
    status: 'inactive'
  },
  {
    id: '3',
    name: 'صالح علي القحطاني',
    region: 'تعز - الحوبان',
    phone: '4012394844',
    sellersCount: 28,
    simsCount: 890,
    status: 'active'
  },
  {
    id: '4',
    name: 'يسر محسن علوي',
    region: 'حضرموت - المكلا',
    phone: '5012384742',
    sellersCount: 19,
    simsCount: 620,
    status: 'active'
  }
];

export const INITIAL_SELLERS: Seller[] = [
  {
    id: 'SLR-99021',
    name: 'أحمد محمد الصنعاني',
    region: 'صنعاء - الأمانة',
    phone: '775323953',
    simsCount: 452,
    sales30Days: 1820,
    salesGrowth: 5,
    activityRate: 94,
    status: 'active'
  },
  {
    id: 'SLR-88124',
    name: 'سارة سالم اليافعي',
    region: 'عدن - خورمكسر',
    phone: '711904533',
    simsCount: 12,
    sales30Days: 0,
    salesGrowth: 0,
    activityRate: 0,
    status: 'suspended'
  },
  {
    id: 'SLR-11054',
    name: 'خالد عبدالله تعز',
    region: 'تعز - الجوبان',
    phone: '735912445',
    simsCount: 1204,
    sales30Days: 3421,
    salesGrowth: 12,
    activityRate: 98,
    status: 'active'
  }
];

export const INITIAL_ALERTS: SystemAlert[] = [
  {
    id: '1',
    title: 'نقص حاد في المخزون - فرع صنعاء',
    description: 'وصلت كمية شرائح SIM المتوفرة إلى أقل من 5% من الحد الأدنى المطلوب. يتطلب إجراء فوري.',
    priority: 'high',
    time: 'منذ دقيقتين',
    category: 'مخزون'
  },
  {
    id: '2',
    title: 'محاولة دخول غير مصرح بها',
    description: 'تم رصد محاولة دخول فاشلة متكررة من عنوان IP 192.168.1.1 على حساب مدير العمليات.',
    priority: 'medium',
    time: 'منذ 15 دقيقة',
    category: 'أمان'
  },
  {
    id: '3',
    title: 'تم إنشاء التقرير اليومي بنجاح',
    description: 'تم إنتاج تقرير مبيعات الشرائح والتحصيلات لليوم المنتهي بتاريخ 2023-10-24.',
    priority: 'low',
    time: 'منذ ساعة',
    category: 'نظام'
  }
];

export const RECENT_TRANSACTIONS: Transaction[] = [
  {
    id: 'T1',
    clientName: 'شركة الأمل للتجارة',
    provider: 'Yemen Mobile',
    simsCount: 5000,
    status: 'completed',
    relativeTime: 'منذ 10 د'
  },
  {
    id: 'T2',
    clientName: 'مركز الثقة للاتصالات',
    provider: 'Sabafon',
    simsCount: 1200,
    status: 'pending',
    relativeTime: 'منذ ساعة'
  },
  {
    id: 'T3',
    clientName: 'مؤسسة النجم للخدمات',
    provider: 'YOU',
    simsCount: 2500,
    status: 'completed',
    relativeTime: 'منذ 3 ساعات'
  }
];

export const AUDIT_LOGS: AuditLog[] = [
  {
    id: 'A1',
    type: 'security_alert',
    title: 'حظر الهوية رقم 1023485932',
    user: 'صالح القحطاني',
    time: 'منذ 15 دقيقة',
    status: 'blocked'
  },
  {
    id: 'A2',
    type: 'ai_analysis',
    title: 'بدء تحليل علاقة للعميل "عمر باسودان"',
    user: 'نظام التحليل التلقائي (AI)',
    time: 'منذ 45 دقيقة',
    status: 'analyzing'
  },
  {
    id: 'A3',
    type: 'normal_audit',
    title: 'تأكيد صحة بيانات الهوية رقم 3044123984',
    user: 'مريم الصبري',
    time: 'منذ ساعتين',
    status: 'verified'
  }
];

export const DEFAULT_SETTINGS: SystemSettings = {
  twoFAEnabled: true,
  email2FAEnabled: false,
  trustedDevicesEnabled: true,
  sessionTimeout: '30 دقيقة',
  passwordSpecialRequired: true,
  passwordExpiry90Days: true,
  passwordNoReuse5: false,
  maintenanceMode: false,
  language: 'العربية (المملكة العربية السعودية)',
  emailAlertsEnabled: true,
  smsAlertsEnabled: true,
  appNotificationsEnabled: false,
  stockShortageThreshold: 5,
  inactiveSimsThreshold: 90,
  maxFailedLoginsThreshold: 3,
  highRiskDuplicatesThreshold: 5,
  identityRemindersEnabled: true,
  identityRemindersFrequency: 'weekly'
};

export const DUPLICATE_IDENTITIES_MOCKS = [
  {
    idNo: '1023485932',
    name: 'صالح محمد العامري',
    simsCount: 14,
    duplicatesCount: 5,
    risk: 'مرتفع جداً',
    region: 'أمانة العاصمة',
    avatarInitials: 'ص م'
  },
  {
    idNo: '2094837501',
    name: 'نبيل حسن الوداعي',
    simsCount: 8,
    duplicatesCount: 3,
    risk: 'متوسط',
    region: 'محافظة عدن',
    avatarInitials: 'ن ح'
  },
  {
    idNo: '1088429103',
    name: 'فاطمة قاسم القدسي',
    simsCount: 22,
    duplicatesCount: 8,
    risk: 'مرتفع جداً',
    region: 'تعز - المدينة',
    avatarInitials: 'ف ق'
  },
  {
    idNo: '3014772154',
    name: 'عمر سالم باسودان',
    simsCount: 5,
    duplicatesCount: 2,
    risk: 'متوسط',
    region: 'حضرموت - المكلا',
    avatarInitials: 'ع س'
  }
];

export const STATS_HISTORY = {
  sales_weekly: 124500,
  sales_growth: 12.5,
  active_sellers: 1248,
  available_stock: 45820,
  total_sims: 1240500,
  sold_sims: 890000,
  remaining_sims: 350500,
  active_sims: 742100,
  total_agents: 142,
  total_sellers: 3150
};
