import { RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Recheck() {
  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">

      {/* Header */}
      <div className="pb-2 border-b border-[#eae4d5]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
            Formulation Monitoring
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
          Product Re-Check & Formulation Delta
        </h1>
        <p className="text-xs sm:text-sm text-[#4f5f53] mt-0.5">
          Detect stealth reformulations, recipe alterations, and serving size changes across product batches over time.
        </p>
      </div>

      <div className="bg-[#fcfbf9] rounded-2xl border border-[#eae4d5] shadow-health p-8 sm:p-12 text-center">
        <div className="w-14 h-14 bg-[#f6f4ee] rounded-2xl flex items-center justify-center text-[#183c27] mx-auto mb-4 border border-[#eae4d5]">
          <RotateCw size={28} />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#122b1c] mb-1.5">Formulation Snapshot Engine</h2>
        <p className="text-xs sm:text-sm text-[#4f5f53] max-w-md mx-auto leading-relaxed mb-6">
          Compare older packaging snapshots against newly scanned food labels to catch undisclosed oil substitutions, protein dilution, or increased sodium.
        </p>
        <Link
          to="/app/scan"
          className="inline-flex items-center gap-2 bg-[#183c27] hover:bg-[#122b1c] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-health transition-all"
        >
          <span>Scan New Batch Label</span>
        </Link>
      </div>
    </div>
  );
}
