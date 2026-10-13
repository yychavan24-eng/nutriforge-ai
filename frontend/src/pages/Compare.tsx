import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Scale, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';
import type { SmartCompareResponse } from '../types';

export default function Compare() {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const ids = useMemo(() => idsParam.split(',').filter(Boolean), [idsParam]);
  const [data, setData] = useState<SmartCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { profile } = useProfile();

  useEffect(() => {
    if (ids.length === 0) return;
    
    setLoading(true);
    setError('');

    api.compareProducts(ids, profile)
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Comparison failed'))
      .finally(() => setLoading(false));
  }, [ids, profile]);

  if (ids.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-2xl border border-slate-200">
        <Scale className="text-slate-400 mx-auto mb-3" size={40} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Products Selected</h2>
        <p className="text-slate-600 mb-6">Select 2 or more products from the catalog to see a side-by-side comparative analysis.</p>
        <Link to="/app/products" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-500 shadow-sm">
          Browse Products
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        Calculating transparent product trade-offs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertTriangle className="text-red-500 mx-auto mb-3" size={36} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Comparison Failed</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <Link to="/app/products" className="text-blue-600 font-medium hover:underline">
          Return to Products
        </Link>
      </div>
    );
  }

  const results = data?.comparison || [];
  const fieldComparison = data?.field_comparison || [];
  const tradeOffs = data?.trade_offs || [];

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/products" className="p-2 hover:bg-slate-200/60 rounded-full text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Smart Compare</h1>
            <p className="text-slate-600 text-sm">
              Transparent field-by-field evaluation & trade-offs tailored to your goal ({profile.goal.replace('_', ' ')}).
            </p>
          </div>
        </div>
        <Link to="/app/products" className="text-sm font-semibold text-blue-600 hover:underline">
          Change Selection
        </Link>
      </div>

      {/* Trade-offs Highlight Banner */}
      {tradeOffs.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-900 text-base">Key Comparative Trade-Offs</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            NutriForge highlights contextual trade-offs instead of declaring an arbitrary single winner.
          </p>
          <div className="space-y-2">
            {tradeOffs.map((to, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/90 p-3 rounded-xl border border-blue-100 text-sm text-slate-800">
                <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <span>{to}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-600 w-1/4">
                  Nutrient / Factor
                </th>
                {results.map(r => (
                  <th key={r.product.id} className="p-4 border-b border-slate-200 bg-white min-w-[220px]">
                    <div className="text-lg font-bold text-slate-900">{r.product.name}</div>
                    <div className="text-xs text-slate-500 font-normal">{r.product.brand} &bull; {r.product.category}</div>
                    
                    {/* Allergen Flag per product */}
                    {r.allergen_status?.has_conflicts && (
                      <div className="mt-2 text-xs bg-red-50 text-red-700 p-2 rounded-lg border border-red-200 flex items-center gap-1.5 font-medium">
                        <AlertTriangle size={14} className="shrink-0 text-red-600" />
                        <span>Allergen Conflict Detected</span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Field-by-Field Breakdown */}
              {fieldComparison.map(row => (
                <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 border-b border-slate-100 bg-slate-50/70 font-semibold text-slate-700 text-sm">
                    {row.label} {row.unit && <span className="text-xs font-normal text-slate-400">({row.unit})</span>}
                  </td>
                  {results.map(r => {
                    const val = row.values[r.product.id];
                    return (
                      <td key={r.product.id} className="p-4 border-b border-slate-100 text-sm">
                        {val !== null && val !== undefined ? (
                          <span className="font-medium text-slate-900">
                            {val} {row.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            — (Not Declared)
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Marketing Claims */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 border-b border-slate-100 bg-slate-50/70 font-semibold text-slate-700 text-sm">
                  Declared Claims
                </td>
                {results.map(r => (
                  <td key={r.product.id} className="p-4 border-b border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {r.product.claims && r.product.claims.length > 0 ? (
                        r.product.claims.map(c => (
                          <span key={c} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">None declared</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Personalized Alignment */}
              <tr>
                <td className="p-5 bg-blue-50 font-bold text-blue-950 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Target size={16} /> Personalized Alignment
                  </div>
                  <span className="text-xs font-normal text-blue-700 block mt-0.5">
                    For {profile.goal.replace('_', ' ')}
                  </span>
                </td>
                {results.map(r => (
                  <td key={r.product.id} className="p-5 bg-blue-50/40 text-sm align-top border-l border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Score</span>
                      <span className="text-lg font-extrabold text-blue-700">
                        {Math.round(r.overallAlignment * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-blue-100">
                      {r.explanation}
                    </p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
