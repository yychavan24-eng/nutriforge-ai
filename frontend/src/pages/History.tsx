import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function History() {
  const historyStr = localStorage.getItem('nutriforge_history') || '[]';
  let historyCount = 0;
  try {
    historyCount = JSON.parse(historyStr).length;
  } catch {
    historyCount = 0;
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">

      {/* Header */}
      <div className="pb-2 border-b border-[#eae4d5]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
            Temporal Records
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
          Analysis History
        </h1>
        <p className="text-xs sm:text-sm text-[#4f5f53] mt-0.5">
          Audit trail of past food packaging analyses, label comparisons, and serving size calculations.
        </p>
      </div>

      <div className="bg-[#fcfbf9] rounded-2xl border border-[#eae4d5] shadow-health p-8 sm:p-12 text-center">
        <div className="w-14 h-14 bg-[#f6f4ee] rounded-2xl flex items-center justify-center text-[#183c27] mx-auto mb-4 border border-[#eae4d5]">
          <Clock size={28} />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#122b1c] mb-1.5">Session Inspection Log Active</h2>
        <p className="text-xs sm:text-sm text-[#4f5f53] max-w-md mx-auto leading-relaxed mb-6">
          {historyCount > 0
            ? `Your active session has ${historyCount} product(s) tracked in local audit memory.`
            : 'You have not analyzed any food products in this session yet.'}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/app/scan"
            className="bg-[#183c27] hover:bg-[#122b1c] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-health transition-all"
          >
            Scan Packaging Label
          </Link>
          <Link
            to="/app/products"
            className="bg-[#f6f4ee] text-[#262f28] border border-[#ded5c2] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#eae4d5]/40 shadow-xs transition-all"
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
