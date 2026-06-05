import { Seller, Sim, Operation, OperatorInventory } from './types';

export const INITIAL_SELLERS: Seller[] = [
  {
    id: '99283',
    name: 'أحمد محمد',
    storeName: 'مؤسسة الاتصالات الحديثة',
    idNumber: '1092837465',
    phone: '0501234512',
    region: 'الرياض، العليا',
    regionCode: 'riyadh',
    status: 'active',
    totalSales: 1248,
    currentStock: 252,
    efficiency: 85,
    creationDate: '2023/10/12',
    lastLogin: 'اليوم، 10:45 ص',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgz0srZX-fPTwrxphx6G-akOy2GKiaTrQYzHnp-47B3NYt2mOSmwRFetXfAXjkf47AGQwrVI7G6DK9bUagM6bRnQSANx7qimdKsdaA0EN8E6LCNHGgA8yQyx52j35ju6Koq_DAbeLPyKtMyX_V7FrARDH8pKlnSxB2D9iI7kriW-BylMZGFWZ513V_p0b7hFvnMxxpB13I9qjAgvyTY428duG4S_kNTi8m7wsUh-pcXE3VvCSRGQC5tXx87uBlg8XxFTURrPDKtKc'
  },
  {
    id: '99014',
    name: 'محمد علي',
    storeName: 'مركز الصقر للاتصالات',
    idNumber: '1084293041',
    phone: '0554938210',
    region: 'منطقة مكة المكرمة',
    regionCode: 'makkah',
    status: 'active',
    totalSales: 1540,
    currentStock: 150,
    efficiency: 85,
    creationDate: '2023/05/20',
    lastLogin: 'أمس، 09:15 م',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtS5G-fN6VJjRK1kgrbKIIfJ5_Tz2oMsawBQsVTzEnQTHsGF7oR3Fu6-MAst2ITgyGo0mBMADgqt1cuqbpW0a1txt77LpNLoIkeIr574vE8nrkNzHIrlRAdnf5OB_c3ksXuWpgKVjXlNI-2g4sjik0RT6dW6WqAZ5X-QxgkWiioqeYy62dQEJi6SpBNtkQKI6lCUCY3EtdZt6iDLPySlFLY-5S49T7npKYgNJO3FjJZJgvA-AMZfk1unXWbIPMYfaLJLMQ4iEDipA'
  },
  {
    id: '99052',
    name: 'متجر اتصالات الشرق',
    storeName: 'مؤسسة اتصالات الفجر',
    idNumber: '1073829104',
    phone: '0538920194',
    region: 'منطقة المدينة المنورة',
    regionCode: 'madinah',
    status: 'low_stock',
    totalSales: 890,
    currentStock: 45,
    efficiency: 20,
    creationDate: '2024/01/15',
    lastLogin: 'منذ ساعتين',
    avatar: '' // store fallback
  },
  {
    id: '99088',
    name: 'خالد عمر',
    storeName: 'سوبر ماركت الهدى',
    idNumber: '1029384756',
    phone: '0562910482',
    region: 'المنطقة الشرقية',
    regionCode: 'eastern',
    status: 'inactive',
    totalSales: 420,
    currentStock: 12,
    efficiency: 5,
    creationDate: '2022/11/02',
    lastLogin: 'منذ أسبوع',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9hEiGBZLQzVZP4scYfo4sA80Ab8uKRYSP_bNQcLqRoHw4Q07TqXqRhc4tf_VN6dDT7rQDBO1BgNrEen7e8tNGT3o95su2G5mtFX7cjFo2-a7TpgqINjMwEygao3cgIyS24rfhdIip4JBZC3iQGMiEwtZaZRFf6MTaqnOuxp5Vt316wbaFNJ93vk8oE1fkjK-4P4-330UzYu28FQVb6yKEGG8KXvTC297y0K_P6zYIPvvn2Yi-p7wROhrchJY15Pdy0FoIZcH87v8'
  }
];

export const INITIAL_SIMS: Sim[] = [
  {
    id: 'sim1',
    iccid: '8996600123456789012',
    operator: 'yemen_mobile',
    category: 'Prepaid Gold',
    status: 'available',
    dateAdded: '2023/10/12'
  },
  {
    id: 'sim2',
    iccid: '8996600123456789045',
    operator: 'you',
    category: 'Postpaid Basic',
    status: 'sold',
    dateAdded: '2023/10/12'
  },
  {
    id: 'sim3',
    iccid: '8996600123456789088',
    operator: 'sabafon',
    category: 'Data Only',
    status: 'reserved',
    dateAdded: '2023/10/14'
  },
  {
    id: 'sim4',
    iccid: '8996600123456789256',
    operator: 'yemen_mobile',
    category: 'Prepaid Gold',
    status: 'inactive',
    dateAdded: '2023/10/15'
  },
  {
    id: 'sim5',
    iccid: '8996600123456789301',
    operator: 'you',
    category: 'Prepaid Premium',
    status: 'available',
    dateAdded: '2023/10/18'
  },
  {
    id: 'sim6',
    iccid: '8996600123456789355',
    operator: 'sabafon',
    category: 'Prepaid Gold',
    status: 'available',
    dateAdded: '2023/10/19'
  },
  {
    id: 'sim7',
    iccid: '8996620548123985714',
    operator: 'yemen_mobile',
    category: 'Postpaid Premium',
    status: 'available',
    dateAdded: '2023/10/20'
  }
];

export const INITIAL_OPERATIONS: Operation[] = [
  {
    id: 'op1',
    type: 'activate',
    target: '0504938210',
    operator: 'yemen_mobile',
    date: '2026/05/31',
    time: '١٠:٤٥ ص',
    status: 'success'
  },
  {
    id: 'op2',
    type: 'recharge',
    target: '#INV-8821',
    operator: 'you',
    date: '2026/05/31',
    time: '٠٩:١٢ ص',
    status: 'success'
  },
  {
    id: 'op3',
    type: 'activate',
    target: '0504938255',
    operator: 'sabafon',
    date: '2026/05/31',
    time: '٠٨:٥٠ ص',
    status: 'failed'
  }
];

export const INITIAL_INVENTORIES: OperatorInventory[] = [
  {
    operator: 'yemen_mobile',
    available: 542,
    remaining: 48,
    periodDays: 12
  },
  {
    operator: 'you',
    available: 412,
    remaining: 62,
    periodDays: 18
  },
  {
    operator: 'sabafon',
    available: 330,
    remaining: 20,
    periodDays: 5
  }
];
