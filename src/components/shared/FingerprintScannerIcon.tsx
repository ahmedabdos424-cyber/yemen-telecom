interface FingerprintScannerIconProps {
  className?: string;
  strokeClassName?: string;
}

/**
 * FingerprintScannerIcon — أيقونة ماسح البصمة (خط فني نظيف + أقواس زوايا المسح).
 * مستوحاة من تخطيط ماسح البصمة في تطبيقات البنوك، بما يتوافق مع هوية يمن تليكوم الحمراء.
 */
export const FingerprintScannerIcon = ({
  className = "w-7 h-7",
  strokeClassName = "text-[#E10600]",
}: FingerprintScannerIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className} ${strokeClassName}`}
    aria-hidden="true"
  >
    {/* Corner Scanning Brackets */}
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />

    {/* Central Fingerprint Pattern */}
    <path d="M12 11a1.5 1.5 0 0 1 1.5 1.5c0 1.5-1 2.5-1.5 3.5" />
    <path d="M9.5 13.5A2.5 2.5 0 0 1 12 9a2.5 2.5 0 0 1 2.5 2.5c0 2-1.5 3.5-2.5 5" />
    <path d="M7.5 15.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 4.5 4.5c0 3-2 5-3.5 7" />
  </svg>
);
