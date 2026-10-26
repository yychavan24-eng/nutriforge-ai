interface NutritionBarProps {
  label: string;
  current: number | null | undefined;
  target?: number | null;
  unit: string;
  type?: 'goal' | 'limit';
  highlight?: boolean;
}

export function NutritionBar({
  label,
  current,
  target,
  unit,
  type = 'goal',
  highlight = false
}: NutritionBarProps) {
  if (current === null || current === undefined) {
    return (
      <div className="bg-[#fcfbf9] p-3.5 rounded-xl border border-[#eae4d5]">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-[#68796d]">{label}</span>
          <span className="text-xs text-[#8b9a8f] italic">—</span>
        </div>
        <p className="text-[11px] text-[#8b9a8f]">Not declared on packaging</p>
      </div>
    );
  }

  const hasTarget = target && target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((current / target) * 100)) : null;
  const isOverLimit = type === 'limit' && hasTarget && current > target;

  return (
    <div className={`p-3.5 rounded-xl border transition-all ${
      highlight
        ? 'bg-[#f5f8f5] border-[#b4c8b6]'
        : 'bg-[#fcfbf9] border-[#eae4d5] hover:border-[#ded5c2]'
    }`}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className={`text-xs font-semibold ${
          highlight ? 'text-[#1e4a31]' : 'text-[#38453b]'
        }`}>
          {label}
        </span>
        <div className="text-right">
          <span className={`text-sm font-bold ${
            isOverLimit ? 'text-[#9f1239]' : highlight ? 'text-[#163623]' : 'text-[#171d18]'
          }`}>
            {current}
            <span className="text-[11px] font-normal text-[#68796d] ml-0.5">{unit}</span>
          </span>
          {hasTarget && (
            <span className="text-[10px] text-[#8b9a8f] block">
              of {target}{unit} {type === 'limit' ? 'limit' : 'target'}
            </span>
          )}
        </div>
      </div>

      {hasTarget && pct !== null && (
        <div className="mt-2">
          <div className="w-full bg-[#eae4d5] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverLimit
                  ? 'bg-[#9f1239]'
                  : highlight
                    ? 'bg-[#24593b]'
                    : 'bg-[#68856c]'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#68796d] mt-1 font-medium">
            <span>{pct}% daily contribution</span>
            <span>{type === 'limit' && isOverLimit ? 'Exceeded' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
