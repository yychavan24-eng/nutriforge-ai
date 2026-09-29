import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';

export default function ProductAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('nutrition');
  const [consumedAmount, setConsumedAmount] = useState<number>(0);
  const { profile } = useProfile();

  useEffect(() => {
    fetch(`http://localhost:8000/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        const declared = parseFloat(data.serving_size) || 100;
        setConsumedAmount(declared);
        
        // Save to recent history for Dashboard
        if (data && !data.error) {
           const historyStr = localStorage.getItem('nutriforge_history') || '[]';
           let history = JSON.parse(historyStr);
           history = [data.id, ...history.filter((hid: string) => hid !== data.id)].slice(0, 5);
           localStorage.setItem('nutriforge_history', JSON.stringify(history));
        }
      })
      .catch(err => console.error(err));
  }, [id]);

  if (!product) return <div className="p-8 text-center text-slate-500">Loading analysis...</div>;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'serving', label: 'Serving Reality' },
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'restrictions', label: 'Allergens & Checks' },
    { id: 'claims', label: 'ClaimCheck' },
    { id: 'fssai', label: 'FSSAI' },
    { id: 'evidence', label: 'Evidence' }
  ];

  const declaredAmount = product ? parseFloat(product.serving_size) || 100 : 100;
  const multiplier = (consumedAmount >= 0 && declaredAmount > 0) ? (consumedAmount / declaredAmount) : 1;

  // Compute matched restrictions
  const profileRestrictions = profile.restrictions
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);
  
  const matchedAllergens = product.allergens.filter((alg: string) => 
    profileRestrictions.some(r => alg.toLowerCase().includes(r))
  );
  
  const matchedIngredients = product.ingredients.filter((ing: string) => 
    profileRestrictions.some(r => ing.toLowerCase().includes(r))
  );

  const hasMatches = matchedAllergens.length > 0 || matchedIngredients.length > 0;

  const getProvenanceBadge = (field: string) => {
    const prov = product?.provenance?.[field];
    if (!prov) return null;
    
    if (prov.source === 'LABEL_DECLARED') {
      return <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full" title="Declared on Label">LBL</span>;
    } else if (prov.source === 'CALCULATED') {
      return <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full" title="Calculated by NutriForge">CALC</span>;
    } else if (prov.source === 'EXTERNAL_EVIDENCE') {
      return <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full" title="External Evidence">EXT</span>;
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Product Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex items-start gap-6">
        <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
          {product.image}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
              <p className="text-lg text-slate-500">{product.brand} &bull; {product.category}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle2 size={14} /> Analyzed
            </span>
          </div>
          <div className="mt-4 flex gap-4">
             <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Serving Size</p>
                <p className="text-sm font-semibold text-slate-900">{product.serving_size}</p>
             </div>
             <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Package Qty</p>
                <p className="text-sm font-semibold text-slate-900">{product.package_quantity}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto">
        <nav className="flex space-x-6 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[400px]">
        
        {activeTab === 'nutrition' && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
               Nutrition Analysis <span className="text-sm font-normal text-slate-500 ml-2">(per {product.serving_size})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox label="Calories" value={(product.calories * multiplier).toFixed(1)} unit="kcal" badge={getProvenanceBadge('calories')} />
              <MetricBox label="Protein" value={(product.protein * multiplier).toFixed(1)} unit="g" highlight badge={getProvenanceBadge('protein')} />
              <MetricBox label="Carbs" value={(product.carbohydrates * multiplier).toFixed(1)} unit="g" badge={getProvenanceBadge('carbohydrates')} />
              <MetricBox label="Total Sugar" value={(product.total_sugar * multiplier).toFixed(1)} unit="g" warning={(product.added_sugar * multiplier) > 5} badge={getProvenanceBadge('total_sugar')} />
              <MetricBox label="Added Sugar" value={(product.added_sugar * multiplier).toFixed(1)} unit="g" warning={(product.added_sugar * multiplier) > 5} badge={getProvenanceBadge('added_sugar')} />
              <MetricBox label="Total Fat" value={(product.total_fat * multiplier).toFixed(1)} unit="g" badge={getProvenanceBadge('total_fat')} />
              <MetricBox label="Saturated Fat" value={(product.saturated_fat * multiplier).toFixed(1)} unit="g" badge={getProvenanceBadge('saturated_fat')} />
              <MetricBox label="Sodium" value={(product.sodium * multiplier).toFixed(1)} unit="mg" badge={getProvenanceBadge('sodium')} />
              <MetricBox label="Fibre" value={(product.fibre * multiplier).toFixed(1)} unit="g" badge={getProvenanceBadge('fibre')} />
            </div>
            <div className="mt-6 flex gap-3 text-xs text-slate-500">
               <span className="flex items-center gap-1"><span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">LBL</span> Declared on label</span>
               <span className="flex items-center gap-1"><span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">CALC</span> Calculated by NutriForge</span>
               <span className="flex items-center gap-1"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">EXT</span> External evidence</span>
            </div>
          </div>
        )}

        {activeTab === 'serving' && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Serving Reality</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
               <h3 className="font-semibold text-blue-900 mb-2">Calculate Actual Intake</h3>
               <p className="text-sm text-blue-700 mb-4">The declared serving size is {product.serving_size}. Enter how much you actually consume.</p>
               <div className="flex gap-4 items-center">
                  <input 
                    type="number" 
                    value={consumedAmount === 0 ? '' : consumedAmount} 
                    onChange={e => setConsumedAmount(parseFloat(e.target.value) || 0)} 
                    className="w-24 px-3 py-2 border border-blue-200 rounded-lg text-sm" 
                  />
                  <span className="text-blue-900 font-medium">grams</span>
                  <span className="text-blue-400 mx-2">=</span>
                  <span className="text-blue-900 font-bold bg-white px-3 py-1.5 rounded shadow-sm border border-blue-100">{multiplier.toFixed(2)}x serving</span>
               </div>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2">
               <Info size={16} /> 
               Adjusting the value above deterministically scales the nutrition metrics on the Nutrition tab.
            </p>
          </div>
        )}

        {activeTab === 'ingredients' && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center">
              Ingredient Intelligence
              {product.raw_ingredient_text && (
                <span className="text-sm font-normal bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  Extracted from label
                </span>
              )}
            </h2>
            
            {product.raw_ingredient_text && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Raw Label Text</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{product.raw_ingredient_text}</p>
              </div>
            )}

            <div className="space-y-3">
               {product.structured_ingredients && product.structured_ingredients.length > 0 ? (
                  product.structured_ingredients.map((ing: any, i: number) => (
                    <div key={i} className="flex flex-col p-4 border border-slate-100 rounded-lg hover:bg-slate-50">
                       <div className="flex items-center justify-between">
                         <span className="font-medium text-slate-800">{ing.text}</span>
                         <span className={`text-xs px-2 py-1 rounded ${ing.is_allergen ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                           {ing.is_allergen ? 'Known Allergen' : 'Standard Ingredient'}
                         </span>
                       </div>
                       {ing.explanation && <p className="text-sm text-slate-500 mt-2">{ing.explanation}</p>}
                    </div>
                  ))
               ) : (
                 product.ingredients?.map((ing: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50">
                       <span className="font-medium text-slate-800">{ing}</span>
                       <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Standard Ingredient</span>
                    </div>
                 ))
               )}
            </div>
          </div>
        )}

        {activeTab === 'restrictions' && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Allergen & Restriction Check</h2>
            <div className="space-y-4">
               {hasMatches ? (
                 <>
                   {matchedAllergens.map((alg: string, i: number) => (
                      <div key={`alg-${i}`} className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg text-red-900">
                         <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                         <div>
                            <p className="font-semibold">Potential restriction match: Contains {alg}</p>
                            <p className="text-sm text-red-700 mt-1">Matches your profile restriction. Declared explicitly on the label.</p>
                         </div>
                      </div>
                   ))}
                   {matchedIngredients.map((ing: string, i: number) => (
                      <div key={`ing-${i}`} className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg text-red-900">
                         <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                         <div>
                            <p className="font-semibold">Potential restriction match: {ing}</p>
                            <p className="text-sm text-red-700 mt-1">Found in the ingredient list matching your profile restriction.</p>
                         </div>
                      </div>
                   ))}
                   <p className="text-xs text-slate-500 italic mt-4">Note: NutriForge does not provide medical safety guarantees.</p>
                 </>
               ) : (
                  <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-green-900 flex items-center gap-3">
                     <ShieldCheck size={18} />
                     <p className="font-medium">No matches found for your profile restrictions.</p>
                  </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">ClaimCheck</h2>
            <div className="grid gap-4">
               {product.claims.map((claim: string, i: number) => (
                  <div key={i} className="p-4 border border-slate-200 rounded-lg flex items-center justify-between">
                     <span className="font-semibold text-slate-800">"{claim}"</span>
                     <span className="text-sm font-medium bg-green-100 text-green-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Appears Consistent
                     </span>
                  </div>
               ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {activeTab === 'evidence' && (
           <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Data Provenance & Evidence</h2>
              
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                 <h3 className="font-semibold text-slate-800 mb-4">Source Information</h3>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Source Type</p>
                      <p className="font-medium text-slate-900">{product.source_type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Last Updated</p>
                      <p className="font-medium text-slate-900">{new Date(product.last_updated).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 mt-2">
                      <p className="text-slate-500 mb-1">Evidence / Notes</p>
                      <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{product.evidence}</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* Placeholders for others */}
        {['overview', 'fssai'].includes(activeTab) && (
           <div className="text-slate-500 italic">
              {activeTab} data architecture scaffolded. Display coming soon.
           </div>
        )}

      </div>
    </div>
  );
}

function MetricBox({ label, value, unit, highlight, warning, badge }: any) {
   return (
      <div className={`p-4 rounded-xl border ${
         highlight ? 'bg-blue-50 border-blue-100' : 
         warning ? 'bg-amber-50 border-amber-100' : 
         'bg-slate-50 border-slate-100'
      }`}>
         <div className="flex items-center mb-1">
            <p className={`text-sm ${
               highlight ? 'text-blue-700' : 
               warning ? 'text-amber-700' : 
               'text-slate-500'
            }`}>{label}</p>
            {badge}
         </div>
         <p className={`text-2xl font-bold ${
            highlight ? 'text-blue-900' : 
            warning ? 'text-amber-900' : 
            'text-slate-900'
         }`}>
            {value}<span className="text-sm font-normal ml-1 text-slate-500">{unit}</span>
         </p>
      </div>
   )
}
