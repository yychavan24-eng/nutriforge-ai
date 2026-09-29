import { RotateCw, RefreshCcw } from 'lucide-react';

export default function Recheck() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
           <RotateCw className="text-blue-600" />
           Product Re-check
        </h1>
        <p className="text-slate-600">Detect formulation changes over time.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
         <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
               <RefreshCcw size={32} />
            </div>
         </div>
         <h2 className="text-lg font-bold text-slate-900 mb-2">Re-check Scaffolded</h2>
         <p className="text-slate-500 max-w-md mx-auto">
            The foundation for comparing an old product snapshot vs a new product snapshot is in place. Full detection of nutrition and ingredient changes will be implemented in Phase 2.
         </p>
      </div>
    </div>
  );
}
