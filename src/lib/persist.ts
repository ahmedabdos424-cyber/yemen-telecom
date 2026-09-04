/**
 * تخزين مجموعات البيانات مؤقتاً في localStorage — نسخة مُصلّحة للخصوصية.
 *
 * القواعد:
 * - تُحفظ الصفوف داخل مغلّف `{ v, savedAt, rows }` مع TTL (افتراضياً 24 ساعة).
 * - تُجرَّد الحقول الشخصية (PII) قبل الحفظ — لا أسماء عملاء، لا هويات وطنية،
 *   لا صور عقود/وثائق، لا كلمات مرور أو رموز. تُحفظ الحقول التشغيلية فقط
 *   (الحالة، المالك، الأرقام التشغيلية) التي لا يعمل التطبيق دون اتصال بدونها.
 * - التنسيق القديم (مصفوفة خام) يُقبَل عند القراءة للتوافق، ويُعاد حفظه
 *   بالتنسيق الجديد المُجرَّد عند أول كتابة.
 * - الكتابة لا ترمي استثناءً أبداً: عند امتلاء الحصة يُحذَف المفتاح
 *   (يُعاد الجلب من الشبكة) بدل كسر الواجهة.
 */

// حداثة النسخة المخزنة مؤقتاً — بعدها يُتجاهَل الكاش ويُعاد الجلب من الشبكة.
export const DATASET_TTL_MS = 24 * 60 * 60 * 1000;

// حقول الهوية والوثائق والأسرار — تُحذَف من أي صف قبل تخزينه محلياً.
// الأسماء وأسماء المستخدمين وأرقام الهواتف التشغيلية تُبقَى عمداً: الواجهة
// (مثل البحث الذاتي للبائع بالاسم) لا تعمل دون اتصال بدونها.
const PII_FIELDS: ReadonlySet<string> = new Set([
  // هوية العميل
  'customer_name',
  'customerName',
  'customer_id',
  'customerId',
  // الهويات الوطنية
  'id_number',
  'idNumber',
  'national_id',
  'nationalId',
  'identity_no',
  'identityNo',
  // الوثائق والصور (روابط موقعة أو data-URLs ضخمة تكسر الحصة أيضاً)
  'contract_image',
  'contractImage',
  'id_document',
  'idDocument',
  'avatar',
  'invoiceImage',
  'invoice_image',
  // أسرار (دفاع احترازي — لا يُفترض وجودها في هذه الصفوف أصلاً)
  'password',
  'password_hash',
  'passwordHash',
  'credentials',
  'token',
  'refreshToken',
  'device_token',
]);

function stripPii<T>(row: T): T {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const clean: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const field of PII_FIELDS) {
    if (field in clean) delete clean[field];
  }
  return clean as T;
}

interface DatasetEnvelope {
  v: number;
  savedAt: number;
  rows: unknown;
}

function isEnvelope(value: unknown): value is DatasetEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'rows' in (value as Record<string, unknown>)
  );
}

/** قراءة مجموعة بيانات مخزنة — تُعيد الاحتياطي عند انتهاء TTL أو فساد المحتوى. */
export function loadDataset<T>(key: string, fallback: T, ttlMs: number = DATASET_TTL_MS): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    // التنسيق القديم (مصفوفة خام): يُقبَل كما هو لتوافق الإصدارات السابقة.
    if (Array.isArray(parsed)) return parsed as T;
    if (isEnvelope(parsed)) {
      if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > ttlMs) {
        return fallback;
      }
      return parsed.rows as T;
    }
  } catch {
    /* محتوى فاسد — يُتجاهَل ويُعاد الجلب */
  }
  return fallback;
}

/** حفظ مجموعة بيانات بعد تجريد الحقول الشخصية — آمنة دائماً (لا ترمي). */
export function saveDataset(key: string, data: unknown): void {
  try {
    const rows = Array.isArray(data) ? data.map(stripPii) : stripPii(data);
    const envelope: DatasetEnvelope = { v: 1, savedAt: Date.now(), rows };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // امتلاء الحصة أو أي خطأ تخزين: إسقاط الكاش بدل كسر الواجهة.
    try {
      localStorage.removeItem(key);
    } catch {
      /* بيئة بلا تخزين — لا شيء يُفعَل */
    }
  }
}
