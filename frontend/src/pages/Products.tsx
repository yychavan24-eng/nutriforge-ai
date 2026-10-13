import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, AlertCircle, PlusCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Product } from '../types';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.getProducts()
      .then(data => {
        setProducts(data);
        setError('');
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load products from server. Please verify backend is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(pId => pId !== id));
    } else {
      if (selected.length < 4) {
        setSelected([...selected, id]);
      }
    }
  };

  const handleCompare = () => {
    if (selected.length >= 2) {
      navigate(`/app/compare?ids=${selected.join(',')}`);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.claims && p.claims.some(c => c.toLowerCase().includes(q)))
    );
  }, [products, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Packaged-Food Intelligence Catalog</h1>
          <p className="text-slate-600 text-sm">
            Select products to analyze individually or check side-by-side trade-offs with Smart Compare.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/scan')}
            className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <PlusCircle size={16} /> Scan Label
          </button>
          {selected.length >= 2 && (
            <button 
              onClick={handleCompare}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-500 transition-colors shadow-sm text-sm"
            >
              Compare {selected.length} Selected
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by brand, product name, or category (e.g. Oats, Whey, Protein bars)..." 
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm bg-white"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          Loading product catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <p className="text-slate-600 font-medium mb-2">No matching products found.</p>
          <p className="text-slate-400 text-sm mb-4">Try adjusting your search query or upload a new label to scan.</p>
          <button 
            onClick={() => navigate('/app/scan')}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-500"
          >
            Scan New Label
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                selected.includes(product.id) 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="h-16 w-16 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
                    {product.image}
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      checked={selected.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                    Compare
                  </label>
                </div>
                
                <h3 className="font-bold text-slate-900 text-base mb-1">{product.name}</h3>
                <p className="text-slate-500 text-xs mb-3">{product.brand} &bull; {product.category}</p>

                {product.claims && product.claims.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {product.claims.slice(0, 3).map(c => (
                      <span key={c} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">{product.calories}</span> kcal &bull; <span className="font-bold text-blue-700">{product.protein}g</span> protein
                </div>
                <button 
                  onClick={() => navigate(`/app/products/${product.id}`)}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center text-xs gap-0.5"
                >
                  Analyze <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
