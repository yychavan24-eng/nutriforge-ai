import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Scale,
  Target,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';
import type { SmartCompareResponse } from '../types';
import { Badge } from '../components/Badge';

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
    let isCurrent = true;

    setLoading(true);
    setError('');

    api.compareProducts(ids, profile)
      .then(res => {
        if (isCurrent) {
          setData(res);
        }
      })
      .catch(err => {
        if (isCurrent) {
          setError(err.message || 'Comparison failed');
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [ids, profile]);

  if (ids.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-6 text-center bg-[#fcfbf9] rounded-2xl border border-[#eae4d5] shadow-health">
        <div className="w-14 h-14 bg-[#f6f4ee] rounded-2xl flex items-center justify-center text-[#183c27] mx-auto mb-4 border border-[#eae4d5]">
          <Scale size={28} />
        </div>
        <h2 className="text-xl font-bold text-[#122b1c] mb-2">No Products Selected for Comparison</h2>
        <p className="text-sm text-[#4f5f53] mb-6 max-w-md mx-auto">
          Select 2 or more packaged products from the verified catalog to see a side-by-side nutritional trade-off analysis.
        </p>
        <Link
          to="/app/products"
          className="inline-flex items-center gap-2 bg-[#183c27] hover:bg-[#122b1c] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-health transition-all"
        >
          <span>Browse Verified Catalog</span>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <div className="w-10 h-10 border-3 border-[#cfded1] border-t-[#183c27] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-[#122b1c]">Evaluating Product Trade-Offs...</p>
        <p className="text-xs text-[#68796d] mt-1">Cross-referencing packaging facts, serving masses, and declared claims.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-[#fcfbf9] rounded-2xl border border-[#eae4d5] shadow-health">
        <AlertTriangle className="text-[#9f1239] mx-auto mb-3" size={36} />
        <h2 className="text-lg font-bold text-[#122b1c] mb-2">Comparison Analysis Failed</h2>
        <p className="text-xs text-[#9f1239] mb-6">{error}</p>
        <Link to="/app/products" className="text-xs font-semibold text-[#183c27] hover:underline">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const results = data?.comparison || [];
  const fieldComparison = data?.field_comparison || [];
  const tradeOffs = data?.trade_offs || [];

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-7">

      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#eae4d5]">
        <div className="flex items-center gap-3">
          <Link
            to="/app/products"
            className="p-2 hover:bg-[#eae4d5]/50 rounded-xl text-[#38453b] border border-[#ded5c2] transition-colors"
            title="Return to products"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
                Comparative Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
              Smart Compare
            </h1>
            <p className="text-xs sm:text-sm text-[#4f5f53] mt-0.5">
              Transparent field-by-field evaluation & trade-offs tailored to your <strong className="text-[#122b1c] font-semibold">{profile.goal.replace('_', ' ')}</strong> goal.
            </p>
          </div>
        </div>

        <Link
          to="/app/products"
          className="text-xs font-semibold text-[#183c27] hover:text-[#0a1a11] underline self-start sm:self-auto"
        >
          Change Product Selection
        </Link>
      </div>

      {/* Trade-offs Banner */}
      {tradeOffs.length > 0 && (
        <div className="bg-[#f5f8f5] border border-[#b4c8b6] rounded-2xl p-6 shadow-health">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-[#183c27]" size={18} />
            <h2 className="font-bold text-[#122b1c] text-sm sm:text-base">Grounded Comparative Trade-Offs</h2>
          </div>
          <p className="text-xs text-[#4f5f53] mb-4">
            NutriForge highlights contextual differences between products rather than asserting a simplistic single "winner".
          </p>
          <div className="space-y-2">
            {tradeOffs.map((to, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 bg-white/95 p-3.5 rounded-xl border border-[#d2ded3] text-xs text-[#171d18] shadow-xs"
              >
                <CheckCircle2 size={16} className="text-[#183c27] mt-0.5 shrink-0" />
                <span className="leading-relaxed font-medium">{to}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix */}
      <div className="bg-[#fcfbf9] rounded-2xl border border-[#eae4d5] shadow-health overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#eae4d5]">
                <th className="p-4 sm:p-5 bg-[#f6f4ee] font-bold text-[#122b1c] text-xs uppercase tracking-wider w-1/4">
                  Nutrient / Label Factor
                </th>
                {results.map(r => (
                  <th key={r.product.id} className="p-4 sm:p-5 bg-[#fcfbf9] min-w-[240px] border-l border-[#eae4d5]">
                    <div className="text-base font-bold text-[#122b1c]">{r.product.name}</div>
                    <div className="text-xs text-[#68796d] font-medium mt-0.5">{r.product.brand} &bull; {r.product.category}</div>

                    {/* Allergen Flag per product */}
                    {r.allergen_status?.has_conflicts ? (
                      <div className="mt-2.5 text-xs bg-[#ffe4e6] text-[#9f1239] p-2 rounded-xl border border-[#fecdd3] flex items-center gap-1.5 font-semibold">
                        <AlertTriangle size={14} className="shrink-0 text-[#e11d48]" />
                        <span>Allergen Conflict Flagged</span>
                      </div>
                    ) : (
                      <div className="mt-2.5 text-[11px] text-[#1a6b41] bg-[#e6ede7] px-2 py-1 rounded-lg border border-[#cfded1] inline-flex items-center gap-1 font-medium">
                        <span>No conflicts with your restrictions</span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Field-by-Field Breakdown */}
              {fieldComparison.map(row => {
                const isProtein = row.key === 'protein';
                const isCalories = row.key === 'calories';

                return (
                  <tr key={row.key} className={`border-b border-[#eae4d5]/80 hover:bg-[#f6f4ee]/60 transition-colors ${
                    isProtein ? 'bg-[#f5f8f5]/40' : ''
                  }`}>
                    <td className="p-3.5 sm:p-4 bg-[#f6f4ee]/80 font-semibold text-[#262f28] text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5">
                        <span>{row.label}</span>
                        {row.unit && <span className="text-[11px] font-normal text-[#68796d]">({row.unit})</span>}
                      </div>
                    </td>
                    {results.map(r => {
                      const val = row.values[r.product.id];
                      return (
                        <td key={r.product.id} className="p-3.5 sm:p-4 text-xs sm:text-sm border-l border-[#eae4d5]/80">
                          {val !== null && val !== undefined ? (
                            <span className={`font-semibold ${
                              isProtein
                                ? 'text-[#183c27] font-bold text-sm'
                                : isCalories
                                  ? 'text-[#122b1c]'
                                  : 'text-[#171d18]'
                            }`}>
                              {val} {row.unit}
                            </span>
                          ) : (
                            <span className="text-[#8b9a8f] italic text-xs">
                              — (Not Declared)
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Declared Claims */}
              <tr className="border-b border-[#eae4d5]">
                <td className="p-3.5 sm:p-4 bg-[#f6f4ee]/80 font-semibold text-[#262f28] text-xs sm:text-sm">
                  Declared Packaging Claims
                </td>
                {results.map(r => (
                  <td key={r.product.id} className="p-3.5 sm:p-4 border-l border-[#eae4d5]">
                    <div className="flex flex-wrap gap-1">
                      {r.product.claims && r.product.claims.length > 0 ? (
                        r.product.claims.map(c => (
                          <Badge key={c} variant="sage" size="sm">
                            {c}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[#8b9a8f] text-xs italic">None declared</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Personalized Alignment Row */}
              <tr>
                <td className="p-4 sm:p-5 bg-[#e6ede7] font-bold text-[#122b1c] text-xs sm:text-sm align-top">
                  <div className="flex items-center gap-1.5">
                    <Target size={16} className="text-[#183c27]" />
                    <span>Personalized Alignment</span>
                  </div>
                  <span className="text-xs font-normal text-[#3b523e] block mt-1">
                    Grounded in: {profile.goal.replace('_', ' ')}
                  </span>
                </td>
                {results.map(r => (
                  <td key={r.product.id} className="p-4 sm:p-5 bg-[#f5f8f5] text-xs sm:text-sm align-top border-l border-[#eae4d5]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#183c27]">
                        Goal Alignment
                      </span>
                      <span className="text-base font-extrabold text-[#183c27] bg-[#e6ede7] px-2 py-0.5 rounded-lg border border-[#cfded1]">
                        {Math.round(r.overallAlignment * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-[#262f28] leading-relaxed bg-white p-3 rounded-xl border border-[#cfded1]">
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
