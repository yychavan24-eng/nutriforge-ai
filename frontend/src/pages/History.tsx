import { History as HistoryIcon, Clock } from 'lucide-react';

export default function History() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
           <HistoryIcon className="text-blue-600" />
           History
        </h1>
        <p className="text-slate-600">Your past product analyses and comparisons.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
         <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
               <Clock size={32} />
            </div>
         </div>
         <h2 className="text-lg font-bold text-slate-900 mb-2">History Scaffolded</h2>
         <p className="text-slate-500 max-w-md mx-auto">
            The data model and API routes for history have been created. Display of past analyses will be fully implemented in Phase 2.
         </p>
      </div>
    </div>
  );
}
