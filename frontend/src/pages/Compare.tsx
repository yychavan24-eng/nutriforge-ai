import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';

export default function Compare() {
  const [searchParams] = useSearchParams();
  const ids = searchParams.get('ids')?.split(',') || [];
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const { profile } = useProfile();

  useEffect(() => {
    if (ids.length === 0) return;
    
    fetch('http://localhost:8000/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: ids, profile })
    })
      .then(res => {
        if (!res.ok) throw new Error('Comparison failed');
        return res.json();
      })
      .then(data => setResults(data.comparison))
      .catch(err => setError(err.message));
  }, [searchParams, profile]);

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">No products selected for comparison or loading...</p>
        <Link to="/app/products" className="text-blue-600 font-medium hover:underline">Select Products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/app/products" className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Compare</h1>
          <p className="text-slate-600">Side-by-side analysis of selected products.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-slate-200 bg-slate-50 font-medium text-slate-500 w-1/4">Factor</th>
                {results.map(r => (
                  <th key={r.product.id} className="p-4 border-b border-slate-200 bg-white min-w-[200px]">
                    <div className="text-lg font-bold text-slate-900">{r.product.name}</div>
                    <div className="text-sm text-slate-500 font-normal">{r.product.brand}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Core Nutrition */}
              <tr>
                <td className="p-4 border-b border-slate-100 bg-slate-50 font-medium text-slate-700">Serving Size</td>
                {results.map(r => <td key={r.product.id} className="p-4 border-b border-slate-100">{r.product.serving_size}</td>)}
              </tr>
              <tr>
                <td className="p-4 border-b border-slate-100 bg-slate-50 font-medium text-slate-700">Calories</td>
                {results.map(r => <td key={r.product.id} className="p-4 border-b border-slate-100">{r.product.calories} kcal</td>)}
              </tr>
              <tr>
                <td className="p-4 border-b border-slate-100 bg-slate-50 font-medium text-slate-700">Protein</td>
                {results.map(r => <td key={r.product.id} className="p-4 border-b border-slate-100 text-blue-700 font-medium">{r.product.protein}g</td>)}
              </tr>
              <tr>
                <td className="p-4 border-b border-slate-100 bg-slate-50 font-medium text-slate-700">Total Sugar</td>
                {results.map(r => <td key={r.product.id} className="p-4 border-b border-slate-100">{r.product.total_sugar}g</td>)}
              </tr>
              
              {/* Ingredients & Claims */}
              <tr>
                <td className="p-4 border-b border-slate-100 bg-slate-50 font-medium text-slate-700">Key Claims</td>
                {results.map(r => (
                  <td key={r.product.id} className="p-4 border-b border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {r.product.claims.map((c: string) => <span key={c} className="text-xs bg-slate-100 px-2 py-1 rounded">{c}</span>)}
                    </div>
                  </td>
                ))}
              </tr>
              
              {/* Personalized AI Insight */}
              <tr>
                <td className="p-4 bg-blue-50 font-medium text-blue-900">Personalized Match</td>
                {results.map(r => (
                  <td key={r.product.id} className="p-4 bg-blue-50/50 text-sm text-slate-700">
                    <div className="font-semibold text-blue-800 mb-1">Alignment: {Math.round(r.overallAlignment * 100)}%</div>
                    <div>{r.explanation}</div>
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
