import { formatChips } from '../utils/cardUtils';

interface ChipStackProps {
  amount: number;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
}

export default function ChipStack({ amount, size = 'medium', animate = false }: ChipStackProps) {
  const sizeClasses = {
    small: 'w-12 h-12 text-xs',
    medium: 'w-16 h-16 text-sm',
    large: 'w-24 h-24 text-lg',
  };

  return (
    <div className={`relative ${animate ? 'animate-chip-grow' : ''}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 border-4 border-white shadow-2xl flex items-center justify-center font-bold text-white relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-white/10 rounded-full border-2 border-white/30 m-1"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full"></div>
        <span className="relative z-10">{formatChips(amount)}</span>
      </div>
      <div
        className={`absolute top-1 left-1 ${sizeClasses[size]} rounded-full bg-red-900/50 -z-10 blur-sm`}
      ></div>
    </div>
  );
}
