import yemenMobileLogo from '../../assets/logos/Yemen_Mobile.png';
import youLogo from '../../assets/logos/YOU.jpeg';
import sabafonLogo from '../../assets/logos/Sabafon.jpeg';

const logoMap: Record<string, string> = {
  'yemen_mobile': yemenMobileLogo,
  'Yemen Mobile': yemenMobileLogo,
  'you': youLogo,
  'YOU': youLogo,
  'sabafon': sabafonLogo,
  'Sabafon': sabafonLogo,
};

const bgClassMap: Record<string, string> = {
  'yemen_mobile': 'bg-op-ym',
  'Yemen Mobile': 'bg-op-ym',
  'you': 'bg-op-you',
  'YOU': 'bg-op-you',
  'sabafon': 'bg-op-sf',
  'Sabafon': 'bg-op-sf',
};

type LogoSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

interface OperatorLogoProps {
  provider: string;
  size?: LogoSize;
  className?: string;
  alt?: string;
  plain?: boolean;
}

export default function OperatorLogo({ provider, size = 'sm', className = '', alt, plain }: OperatorLogoProps) {
  const src = logoMap[provider];
  if (!src) return null;
  const px = sizeMap[size];
  const bgClass = bgClassMap[provider] || 'bg-slate-700';
  if (plain) {
    return (
      <img
        src={src}
        alt={alt || provider}
        className={`shrink-0 ${className}`}
        style={{ width: px, height: px, objectFit: 'contain' }}
        draggable={false}
      />
    );
  }
  return (
    <div
      className={`rounded-full ${bgClass} flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{ width: px, height: px, aspectRatio: '1/1' }}
    >
      <img
        src={src}
        alt={alt || provider}
        className="w-full h-full"
        style={{ objectFit: 'contain' }}
        draggable={false}
      />
    </div>
  );
}
