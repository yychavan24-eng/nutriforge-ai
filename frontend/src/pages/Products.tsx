import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, AlertCircle, PlusCircle, Scale, Check } from 'lucide-react';
import { api } from '../services/api';
import type { Product } from '../types';
import { Badge } from '../components/Badge';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
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
    <div className="max-w-6xl mx-auto pb-16 space-y-7">

      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-[#eae4d5]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
              Verified Packaged Food
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
            Food Intelligence Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[#4f5f53] mt-1 max-w-xl">
            Inspect individual packaging facts, evaluate ingredient intelligence, or select 2-4 products for side-by-side Smart Compare.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => navigate('/app/scan')}
            className="flex items-center gap-1.5 border border-[#ded5c2] bg-[#fcfbf9] text-[#262f28] hover:bg-[#eae4d5]/40 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-health transition-all"
          >
            <PlusCircle size={16} className="text-[#183c27]" />
            <span>Scan Label</span>
          </button>
          {selected.length >= 2 && (
            <button
              onClick={handleCompare}
              className="flex items-center gap-2 bg-[#183c27] hover:bg-[#122b1c] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-health transition-all animate-fade-in"
            >
              <Scale size={16} />
              <span>Compare ({selected.length})</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#ffe4e6] border border-[#fecdd3] rounded-xl text-[#9f1239] text-xs flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#8b9a8f]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by brand, product name, or category (e.g. Oats, Whey Protein, Peanut Butter)..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#ded5c2] bg-white text-[#171d18] placeholder-[#8b9a8f] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] shadow-health text-xs sm:text-sm transition-all"
        />
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#68796d]">
          <div className="w-8 h-8 border-3 border-[#cfded1] border-t-[#183c27] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs sm:text-sm font-semibold text-[#122b1c]">Loading verified product database...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-[#fcfbf9] p-12 text-center rounded-2xl border border-dashed border-[#ded5c2] shadow-xs">
          <p className="text-[#38453b] font-bold text-base mb-1">No matching packaged foods found</p>
          <p className="text-[#68796d] text-xs mb-5 max-w-sm mx-auto">
            Try adjusting your search terms or scan packaging to ingest a new product.
          </p>
          <button
            onClick={() => navigate('/app/scan')}
            className="bg-[#183c27] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#122b1c] shadow-xs transition-colors"
          >
            Scan New Food Label
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map(product => {
            const isSelected = selected.includes(product.id);
            return (
              <div
                key={product.id}
                className={`bg-[#fcfbf9] p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#183c27] ring-2 ring-[#183c27]/20 shadow-health-md'
                    : 'border-[#eae4d5] hover:border-[#b4c8b6] shadow-health hover:shadow-health-md'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3.5">
                    <div className="h-14 w-14 bg-[#e6ede7] rounded-xl flex items-center justify-center text-xs font-bold text-[#183c27] border border-[#cfded1]">
                      {product.category.slice(0, 3).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSelect(product.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-[#183c27] text-white border-[#183c27]'
                          : 'bg-[#f6f4ee] text-[#38453b] border-[#ded5c2] hover:bg-[#eae4d5]/50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isSelected ? 'bg-white border-white text-[#183c27]' : 'border-[#8b9a8f] bg-white'
                      }`}>
                        {isSelected && <Check size={11} className="stroke-[3]" />}
                      </div>
                      <span>Compare</span>
                    </button>
                  </div>

                  <h3 className="font-bold text-[#122b1c] text-base mb-0.5 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-[#68796d] text-xs mb-3">
                    {product.brand} &bull; {product.category}
                  </p>

                  {product.claims && product.claims.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.claims.slice(0, 3).map(c => (
                        <Badge key={c} variant="sage" size="sm">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3.5 border-t border-[#eae4d5] flex justify-between items-center text-xs">
                  <div className="text-[#4f5f53]">
                    <span className="font-bold text-[#122b1c]">{product.calories}</span> kcal &bull; <span className="font-bold text-[#183c27]">{product.protein}g</span> protein
                  </div>
                  <button
                    onClick={() => navigate(`/app/products/${product.id}`)}
                    className="text-[#183c27] hover:text-[#0a1a11] font-bold flex items-center gap-0.5 transition-colors"
                  >
                    <span>Analyze</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
