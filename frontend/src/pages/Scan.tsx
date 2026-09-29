import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, Barcode, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Scan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'select' | 'barcode' | 'upload' | 'review'>('select');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`http://localhost:8000/api/barcode/${barcodeInput}`);
      const data = await res.json();
      if (data.found && data.product) {
        navigate(`/app/products/${data.product.id}`);
      } else {
        setErrorMsg('Barcode not found in our database. Please upload the label image.');
        setMode('select');
      }
    } catch (err) {
      setErrorMsg('Error contacting barcode service.');
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    // const file = e.target.files[0]; // Not used in this mock
    
    // In a real app we would send the actual image bytes. 
    // For Phase 2 Mock OCR we just send a base64 string or dummy
    setLoading(true);
    setMode('upload');
    try {
      const res = await fetch('http://localhost:8000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: "base64_dummy_data" })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setExtractedData(data.extracted_data);
        setMode('review');
      } else {
        setErrorMsg('Failed to process image OCR.');
        setMode('select');
      }
    } catch (err) {
      setErrorMsg('Error contacting OCR service.');
      setMode('select');
    }
    setLoading(false);
  };

  const handleReviewSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Map extractedData to full Product schema
      const newProduct = {
        id: "p_" + Date.now(),
        barcode: barcodeInput || "unknown",
        name: extractedData.name,
        brand: extractedData.brand,
        category: "Community Scanned",
        serving_size: `${extractedData.serving_size_value}${extractedData.serving_size_unit}`,
        serving_size_value: extractedData.serving_size_value,
        serving_size_unit: extractedData.serving_size_unit,
        serving_description: extractedData.serving_description,
        calories: extractedData.calories,
        protein: extractedData.protein,
        carbohydrates: extractedData.carbohydrates,
        total_sugar: extractedData.total_sugar,
        added_sugar: extractedData.added_sugar,
        total_fat: extractedData.total_fat,
        saturated_fat: extractedData.saturated_fat,
        trans_fat: extractedData.trans_fat,
        sodium: extractedData.sodium,
        fibre: extractedData.fibre,
        provenance: {
          calories: { source: "LABEL_DECLARED" },
          protein: { source: "LABEL_DECLARED" },
          total_sugar: { source: "LABEL_DECLARED" }
        },
        raw_ingredient_text: extractedData.raw_ingredient_text,
        structured_ingredients: extractedData.structured_ingredients,
        allergens: extractedData.allergens,
        claims: extractedData.claims,
        fssai_information: "Awaiting Verification",
        evidence: "Scanned and verified by community user.",
        source_type: "COMMUNITY",
        image: "placeholder.jpg",
        last_updated: new Date().toISOString()
      };

      const res = await fetch('http://localhost:8000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      const data = await res.json();
      if (data.status === 'success') {
        navigate(`/app/products/${data.product_id}`);
      } else {
        setErrorMsg('Failed to save product.');
      }
    } catch (err) {
      setErrorMsg('Error saving product.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">AI Label Scanner</h1>
        <p className="text-slate-600">Scan a barcode or upload a nutrition label to start.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        
        {loading && mode !== 'review' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-medium animate-pulse">Processing...</p>
          </div>
        ) : mode === 'barcode' ? (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Enter Barcode</h2>
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <input 
                type="text" 
                autoFocus
                placeholder="e.g. 8901234567890" 
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setMode('select')} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium">Lookup</button>
              </div>
            </form>
          </div>
        ) : mode === 'review' && extractedData ? (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="text-emerald-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Review Extracted Data</h2>
            </div>
            
            <form onSubmit={handleReviewSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={extractedData.name} onChange={e => setExtractedData({...extractedData, name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={extractedData.brand} onChange={e => setExtractedData({...extractedData, brand: e.target.value})} required />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-slate-800 mb-3">Serving Size</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                    <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={extractedData.serving_size_value} onChange={e => setExtractedData({...extractedData, serving_size_value: parseFloat(e.target.value)})} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={extractedData.serving_size_unit} onChange={e => setExtractedData({...extractedData, serving_size_unit: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={extractedData.serving_description} onChange={e => setExtractedData({...extractedData, serving_description: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  Nutrition per Serving 
                  <span className="text-xs font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle size={12}/> Please verify OCR values
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Calories (kcal)</label>
                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" value={extractedData.calories} onChange={e => setExtractedData({...extractedData, calories: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Protein (g)</label>
                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" value={extractedData.protein} onChange={e => setExtractedData({...extractedData, protein: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Total Sugar (g)</label>
                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" value={extractedData.total_sugar} onChange={e => setExtractedData({...extractedData, total_sugar: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fibre (g)</label>
                    <input type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" value={extractedData.fibre} onChange={e => setExtractedData({...extractedData, fibre: parseFloat(e.target.value)})} />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ingredients List</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-24" 
                  value={extractedData.raw_ingredient_text} 
                  onChange={e => setExtractedData({...extractedData, raw_ingredient_text: e.target.value})}
                ></textarea>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center mt-6">
                <div>
                  <p className="text-sm text-slate-600">By saving, you verify these details are correct.</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setMode('select')} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100">Discard</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                    {loading ? "Saving..." : "Save & Analyze"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                {errorMsg}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <label className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer">
                <Upload size={24} className="text-slate-500" />
                <span className="font-medium text-slate-700">Upload Label</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              
              <button 
                onClick={() => setMode('barcode')}
                className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-3"
              >
                <Barcode size={24} className="text-slate-500" />
                <span className="font-medium text-slate-700">Enter Barcode</span>
              </button>
            </div>
            
            <div className="relative pt-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-slate-500">or</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/app/products')}
              className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors flex justify-center items-center gap-2"
            >
              <Search size={18} /> Browse Demo Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
