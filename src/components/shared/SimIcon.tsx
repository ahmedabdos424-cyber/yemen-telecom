interface SimIconProps {
  size?: string;
  className?: string;
}

export default function SimIcon({ size = 'text-sm', className = '' }: SimIconProps) {
  return (
    <span className={`material-symbols-outlined ${size} ${className}`}>sim_card</span>
  );
}
