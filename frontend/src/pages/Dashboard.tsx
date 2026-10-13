import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Target, AlertCircle } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';
import type { Product } from '../types';

export default function Dashboard() {
  const { profile } = useProfile();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const historyStr = localStorage.getItem('nutriforge_history') || '[]';
    let historyIds: string[] = [];
    try {
      historyIds = JSON.parse(historyStr);
    } catch {
      historyIds = [];
    }

    if (historyIds.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      historyIds.map(id => api.getProduct(id).catch(() => null))
    )
      .then(data => {
        setRecentProducts(data.filter((p): p is Product => p !== null));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading personalized dashboard...</div>;
  }

  const insights = recentProducts.length > 0 
    ? [
        `You have analyzed ${recentProducts.length} product(s) aligned with your ${profile.goal.replace('_', ' ')} goal.`,
        profile.restrictions 
          ? `Active allergy protection enabled for: ${profile.restrictions}.`
          : 'No specific food allergies or restrictions declared in your profile.'
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Personalized Dashboard</h1>
        <p className="text-slate-600 text-sm">Your packaged-food intelligence overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Target className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Current Focus & Priorities</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-medium">Goal</p>
              <p className="text-lg font-bold text-slate-900 capitalize mt-0.5">{profile.goal.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Dietary Preference</p>
              <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">{profile.dietaryPreference.replace('_', ' ')}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500 font-medium mb-1">Active Priorities</p>
              <div className="flex flex-wrap gap-2">
                {profile.priorities.map((p: string) => (
                  <span key={p} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium capitalize">
                    {p.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-2">NutriForge Assistant</h2>
            <p className="text-blue-100 text-sm">Have a question about product ingredients or label claims?</p>
          </div>
          <Link to="/app/assistant" className="mt-4 bg-white text-blue-600 font-semibold py-2 px-4 rounded-xl text-center hover:bg-blue-50 transition-colors shadow-sm text-sm">
            Ask AI Assistant
          </Link>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
            <Activity className="text-blue-600" size={20} /> Grounded Intelligence Insights
          </h2>
          <div className="space-y-3">
            {insights.map((insight: string, i: number) => (
              <div key={i} className="flex gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-slate-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Analyzed Products</h2>
          {recentProducts.length > 0 && (
            <Link to="/app/products" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          )}
        </div>
        
        {recentProducts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center">
            <p className="text-slate-500 font-medium mb-3">No products analyzed yet.</p>
            <Link to="/app/products" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-500">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentProducts.map((p) => (
              <Link 
                key={p.id} 
                to={`/app/products/${p.id}`} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center text-xs text-slate-400">
                  {p.image}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.brand} &bull; {p.category}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold text-blue-700 block">{p.protein}g</span>
                  <span className="text-slate-400">protein</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
