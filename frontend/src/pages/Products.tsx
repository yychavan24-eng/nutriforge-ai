import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  calories: number;
  protein: number;
  image: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:8000/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err));
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Selection</h1>
          <p className="text-slate-600">Select a product to analyze or multiple to compare.</p>
        </div>
        {selected.length >= 2 && (
          <button 
            onClick={handleCompare}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-500 transition-colors shadow-sm"
          >
            Compare {selected.length} Selected
          </button>
        )}
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input 
          type="text" 
          placeholder="Search for a product..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div 
            key={product.id} 
            className={`bg-white p-5 rounded-xl border transition-all ${
              selected.includes(product.id) 
                ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' 
                : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="h-20 w-20 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                {product.image}
              </div>
              <input 
                type="checkbox" 
                className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                checked={selected.includes(product.id)}
                onChange={() => toggleSelect(product.id)}
              />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">{product.name}</h3>
            <p className="text-slate-500 text-sm mb-4">{product.brand} &bull; {product.category}</p>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <div className="text-sm">
                <span className="font-medium text-slate-900">{product.calories}</span> kcal &bull; <span className="font-medium text-slate-900">{product.protein}g</span> protein
              </div>
              <button 
                onClick={() => navigate(`/app/products/${product.id}`)}
                className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium"
              >
                Analyze <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
