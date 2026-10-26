import React from 'react';

export type BadgeVariant = 'forest' | 'sage' | 'ivory' | 'amber' | 'rose' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({
  children,
  variant = 'sage',
  size = 'sm',
  icon,
  className = ''
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    forest: 'bg-[#122b1c] text-[#f5f8f5] border-[#1a422b]',
    sage: 'bg-[#e6ede7] text-[#1e4a31] border-[#cfded1]',
    ivory: 'bg-[#fcfbf9] text-[#262f28] border-[#eae4d5]',
    amber: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
    rose: 'bg-[#ffe4e6] text-[#9f1239] border-[#fecdd3]',
    neutral: 'bg-[#f1ede3] text-[#4f5f53] border-[#eae4d5]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
