import { Shield, Sparkles } from 'lucide-react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ variant = 'dark', size = 'md' }: BrandLogoProps) {
  const isDark = variant === 'dark';

  return (
    <div className="flex items-center gap-2.5">
      <div className={`relative flex items-center justify-center rounded-xl transition-all ${
        isDark
          ? 'bg-[#183c27] text-[#e6ede7] shadow-sm border border-[#24593b]'
          : 'bg-[#183c27] text-[#f6f4ee] shadow-sm'
      } ${
        size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9'
      }`}>
        <Shield size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} className="stroke-[2.2] text-[#8ea891]" />
        <Sparkles size={size === 'sm' ? 9 : 11} className="absolute -top-0.5 -right-0.5 text-[#e6ede7] animate-pulse" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-[#122b1c]'
          } ${
            size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg'
          }`}>
            NutriForge
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#24593b] text-[#d2ded3] border border-[#31744d]/40">
            AI
          </span>
        </div>
        <p className={`text-[10px] tracking-wide uppercase font-medium ${
          isDark ? 'text-[#8ea891]' : 'text-[#68856c]'
        }`}>
          Packaged Food Intelligence
        </p>
      </div>
    </div>
  );
}
