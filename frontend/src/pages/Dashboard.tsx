import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Target, AlertCircle } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';

export default function Dashboard() {
  const { profile } = useProfile();
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const historyStr = localStorage.getItem('nutriforge_history') || '[]';
    const historyIds = JSON.parse(historyStr);

    if (historyIds.length === 0) {
       setLoading(false);
       return;
    }

    Promise.all(historyIds.map((id: string) => fetch(`http://localhost:8000/api/products/${id}`).then(r => r.json())))
      .then(data => {
         setRecentProducts(data.filter(p => !p.error));
         setLoading(false);
      })
      .catch(err => {
         console.error(err);
         setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  const insights = recentProducts.length > 0 
    ? [`You have analyzed ${recentProducts.length} product(s) recently.`]
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Personalized Dashboard</h1>
        <p className="text-slate-600">Your nutrition intelligence overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
             <Target className="text-blue-600" />
             <h2 className="text-lg font-bold">Current Focus</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <p className="text-sm text-slate-500">Goal</p>
                <p className="text-xl font-semibold text-slate-900 capitalize">{profile.goal.replace('_', ' ')}</p>
             </div>
             <div>
                <p className="text-sm text-slate-500">Key Priorities</p>
                <div className="flex flex-wrap gap-2 mt-1">
                   {profile.priorities.map((p: string) => (
                      <span key={p} className="text-xs bg-slate-100 px-2 py-1 rounded capitalize">{p.replace('_', ' ')}</span>
                   ))}
                </div>
             </div>
          </div>
        </div>
        
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
           <div>
              <h2 className="text-lg font-bold mb-2">NutriForge Assistant</h2>
              <p className="text-blue-100 text-sm">Have a question about a product or ingredient?</p>
           </div>
           <Link to="/app/assistant" className="mt-4 bg-white text-blue-600 font-medium py-2 px-4 rounded-lg text-center hover:bg-blue-50 transition-colors">
              Ask AI
           </Link>
        </div>
      </div>

      {insights.length > 0 && (
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
               <Activity className="text-slate-500" size={20} /> AI Insights
            </h2>
            <div className="space-y-3">
               {insights.map((insight: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                     <AlertCircle className="text-blue-500 shrink-0" size={18} />
                     <p className="text-sm text-slate-700">{insight}</p>
                  </div>
               ))}
            </div>
         </div>
      )}
      
      <div>
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Products</h2>
            {recentProducts.length > 0 && (
               <Link to="/app/products" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                  View All <ArrowRight size={16} />
               </Link>
            )}
         </div>
         
         {recentProducts.length === 0 ? (
            <div className="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-300 text-center">
               <p className="text-slate-500 font-medium mb-2">No products analyzed yet.</p>
               <Link to="/app/scan" className="text-blue-600 font-medium hover:underline">Scan a product to get started</Link>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recentProducts.map((p: any) => (
                  <Link key={p.id} to={`/app/products/${p.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                     <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center text-xs text-slate-400">img</div>
                     <div>
                        <h3 className="font-semibold text-slate-900">{p.name}</h3>
                        <p className="text-xs text-slate-500">{p.brand}</p>
                     </div>
                  </Link>
               ))}
            </div>
         )}
      </div>
    </div>
  );
}
