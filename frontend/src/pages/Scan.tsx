import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, Barcode, CheckCircle, AlertTriangle, Info, Sparkles, HelpCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Product, ProvenanceInfo } from '../types';

interface ScanStatus {
  gemini_configured: boolean;
  model: string;
  supported_formats: string[];
  max_file_size_mb: number;
  provider_name: string;
}

export default function Scan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'select' | 'barcode' | 'upload' | 'review'>('select');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [keyMissingNotice, setKeyMissingNotice] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);

  useEffect(() => {
    // Check backend OCR configuration status
    api.getScanStatus()
      .then(status => setScanStatus(status))
      .catch(() => setScanStatus(null));
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.lookupBarcode(barcodeInput.trim());
      if (data.found && data.product) {
        navigate(`/app/products/${data.product.id}`);
      } else {
        setErrorMsg('Barcode not found in catalog. You can upload the product label or enter details manually.');
        setMode('select');
      }
    } catch {
      setErrorMsg('Error contacting barcode service. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10MB limit. Please upload a smaller image.');
      return;
    }

    setLoading(true);
    setMode('upload');
    setErrorMsg('');
    setKeyMissingNotice(false);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const data = await api.scanLabel(base64Data, false);
        if (data.status === 'success' && data.extracted_data) {
          setExtractedData(data.extracted_data);
          setEditedFields(new Set());
          setMode('review');
        } else if (data.error_code === 'GEMINI_API_KEY_MISSING') {
          setErrorMsg(data.message || 'Gemini API key is not configured.');
          setKeyMissingNotice(true);
          setMode('select');
        } else {
          setErrorMsg(data.message || 'Failed to process label image.');
          setMode('select');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error contacting OCR service.');
        setMode('select');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read image file.');
      setLoading(false);
      setMode('select');
    };

    reader.readAsDataURL(file);
  };

  const handleDemoUpload = async () => {
    setLoading(true);
    setMode('upload');
    setErrorMsg('');
    setKeyMissingNotice(false);

    try {
      const data = await api.scanLabel('simulated_image_bytes', true);
      if (data.status === 'success' && data.extracted_data) {
        setExtractedData(data.extracted_data);
        setEditedFields(new Set());
        setMode('review');
      } else {
        setErrorMsg('Failed to load simulated demo data.');
        setMode('select');
      }
    } catch {
      setErrorMsg('Error contacting OCR demo service.');
      setMode('select');
    } finally {
      setLoading(false);
    }
  };

  const markFieldEdited = (fieldName: string) => {
    setEditedFields(prev => new Set(prev).add(fieldName));
  };

  const handleReviewSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const servingVal = parseFloat(extractedData.serving_size_value) || 100;
      const servingUnit = extractedData.serving_size_unit || 'g';

      // Build provenance map distinguishing LABEL_DECLARED from MANUAL_ENTRY
      const provenance: Record<string, ProvenanceInfo> = {
        calories: { source: editedFields.has('calories') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        protein: { source: editedFields.has('protein') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        carbohydrates: { source: editedFields.has('carbohydrates') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        total_sugar: { source: editedFields.has('total_sugar') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        added_sugar: { source: editedFields.has('added_sugar') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        total_fat: { source: editedFields.has('total_fat') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        saturated_fat: { source: editedFields.has('saturated_fat') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        trans_fat: { source: 'LABEL_DECLARED' },
        sodium: { source: editedFields.has('sodium') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' },
        fibre: { source: editedFields.has('fibre') ? 'MANUAL_ENTRY' : 'LABEL_DECLARED' }
      };

      const newProduct: Partial<Product> = {
        id: "p_" + Date.now(),
        barcode: barcodeInput || "unknown",
        name: extractedData.name || "Unnamed Product",
        brand: extractedData.brand || "Unspecified Brand",
        category: "Community Scanned",
        serving_size: `${servingVal}${servingUnit}`,
        serving_size_value: servingVal,
        serving_size_unit: servingUnit,
        serving_description: extractedData.serving_description || "",
        calories: extractedData.calories !== null && extractedData.calories !== undefined ? parseFloat(extractedData.calories) : 0,
        protein: extractedData.protein !== null && extractedData.protein !== undefined ? parseFloat(extractedData.protein) : 0,
        carbohydrates: extractedData.carbohydrates !== null && extractedData.carbohydrates !== undefined ? parseFloat(extractedData.carbohydrates) : 0,
        total_sugar: extractedData.total_sugar !== null && extractedData.total_sugar !== undefined ? parseFloat(extractedData.total_sugar) : 0,
        added_sugar: extractedData.added_sugar !== null && extractedData.added_sugar !== undefined ? parseFloat(extractedData.added_sugar) : 0,
        total_fat: extractedData.total_fat !== null && extractedData.total_fat !== undefined ? parseFloat(extractedData.total_fat) : 0,
        saturated_fat: extractedData.saturated_fat !== null && extractedData.saturated_fat !== undefined ? parseFloat(extractedData.saturated_fat) : 0,
        trans_fat: extractedData.trans_fat !== null && extractedData.trans_fat !== undefined ? parseFloat(extractedData.trans_fat) : 0,
        sodium: extractedData.sodium !== null && extractedData.sodium !== undefined ? parseFloat(extractedData.sodium) : 0,
        fibre: extractedData.fibre !== null && extractedData.fibre !== undefined ? parseFloat(extractedData.fibre) : 0,
        provenance,
        raw_ingredient_text: extractedData.raw_ingredient_text || "",
        structured_ingredients: extractedData.structured_ingredients || [],
        allergens: extractedData.allergens || [],
        claims: extractedData.claims || [],
        fssai_information: "Awaiting Verification",
        evidence: extractedData.is_simulated ? "Simulated demonstration extraction." : `Extracted via Gemini Vision (${extractedData.provider}) and human verified.`,
        source_type: "COMMUNITY_VERIFIED",
        image: "placeholder.jpg",
        last_updated: new Date().toISOString()
      };

      const data = await api.saveProduct(newProduct);
      if (data.status === 'success') {
        navigate(`/app/products/${data.product_id}`);
      } else {
        setErrorMsg('Failed to save product record.');
      }
    } catch {
      setErrorMsg('Error saving product to backend.');
    } finally {
      setLoading(false);
    }
  };

  const isFieldFlagged = (fieldName: string) => {
    return extractedData?.fields_needing_review?.includes(fieldName);
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">AI Label Scanner & Ingestion</h1>
        <p className="text-slate-600 text-sm">
          Extract nutrition facts from packaged food photographs, lookup barcodes, or test demo extractions.
        </p>

        {/* OCR Engine Live Status Indicator */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {scanStatus?.gemini_configured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles size={14} className="text-emerald-500" />
              Live Gemini Vision Active ({scanStatus.model})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <Info size={14} className="text-amber-500" />
              Simulated Demo Mode Active (Set GEMINI_API_KEY in backend for live OCR)
            </span>
          )}
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        
        {loading && mode !== 'review' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-700 font-medium">Extracting label intelligence via Vision AI...</p>
            <p className="text-xs text-slate-500 mt-1">Analyzing nutrition facts, ingredients, and allergen declarations.</p>
          </div>
        ) : mode === 'barcode' ? (
          <div>
            <h2 className="text-lg font-bold mb-2 text-slate-800">Enter Barcode</h2>
            <p className="text-sm text-slate-500 mb-4">Lookup standard packaged food barcodes in catalog.</p>
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <input 
                type="text" 
                autoFocus
                placeholder="e.g. 8901234567890" 
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
              />
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setMode('select')} 
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-500 transition-colors shadow-sm"
                >
                  Lookup Barcode
                </button>
              </div>
            </form>
          </div>
        ) : mode === 'review' && extractedData ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-emerald-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Review & Verify Extracted Label Data</h2>
            </div>

            {/* Provider and Simulation Tag Banner */}
            {extractedData.is_simulated ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 text-sm text-amber-900 flex items-start gap-2.5">
                <Info className="shrink-0 text-amber-600 mt-0.5" size={18} />
                <div>
                  <p className="font-semibold">Simulated Demo OCR Data</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    This sample label was loaded via the test provider. Real images will run through Google Gemini Vision once GEMINI_API_KEY is configured on the backend.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 text-sm text-emerald-900 flex items-start gap-2.5">
                <Sparkles className="shrink-0 text-emerald-600 mt-0.5" size={18} />
                <div>
                  <p className="font-semibold">Live Gemini Vision Extraction ({extractedData.provider})</p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Fidelity extraction complete. Visibly printed values are marked as <span className="font-semibold bg-emerald-200/60 px-1 py-0.5 rounded text-emerald-900">LBL (Label Declared)</span>. Any manual corrections will be marked as <span className="font-semibold bg-blue-200/60 px-1 py-0.5 rounded text-blue-900">MAN (Manual Entry)</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Uncertainty and Verification Notices */}
            {extractedData.fields_needing_review && extractedData.fields_needing_review.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6 text-sm text-yellow-900 flex items-start gap-2.5">
                <AlertTriangle className="shrink-0 text-yellow-600 mt-0.5" size={18} />
                <div>
                  <p className="font-semibold">Human Verification Recommended for Specific Fields</p>
                  <p className="text-xs text-yellow-800 mt-0.5">
                    The model flagged potential visual ambiguity or packaging folds for: <strong>{extractedData.fields_needing_review.join(', ')}</strong>. Please review them carefully below.
                  </p>
                  {extractedData.uncertainty_notes && extractedData.uncertainty_notes.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-yellow-800 mt-2 space-y-0.5">
                      {extractedData.uncertainty_notes.map((note: string, idx: number) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            
            <form onSubmit={handleReviewSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Product Name {isFieldFlagged('name') && <span className="text-xs text-amber-600 font-semibold">(Verify)</span>}
                  </label>
                  <input 
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${isFieldFlagged('name') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                    value={extractedData.name || ''} 
                    onChange={e => { setExtractedData({...extractedData, name: e.target.value}); markFieldEdited('name'); }} 
                    placeholder="Enter product title"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Brand {isFieldFlagged('brand') && <span className="text-xs text-amber-600 font-semibold">(Verify)</span>}
                  </label>
                  <input 
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${isFieldFlagged('brand') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                    value={extractedData.brand || ''} 
                    onChange={e => { setExtractedData({...extractedData, brand: e.target.value}); markFieldEdited('brand'); }} 
                    placeholder="Brand or Manufacturer"
                    required 
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-slate-800 mb-3">Serving Size</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Mass / Value {isFieldFlagged('serving_size_value') && <span className="text-amber-600 font-bold">*</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm ${isFieldFlagged('serving_size_value') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                      value={extractedData.serving_size_value ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, serving_size_value: e.target.value}); markFieldEdited('serving'); }} 
                      placeholder="e.g. 30"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" 
                      value={extractedData.serving_size_unit || 'g'} 
                      onChange={e => setExtractedData({...extractedData, serving_size_unit: e.target.value})} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1 scoop / 1 bar" 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" 
                      value={extractedData.serving_description || ''} 
                      onChange={e => setExtractedData({...extractedData, serving_description: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center justify-between">
                  <span>Nutrition Facts per Serving</span>
                  <span className="text-xs font-normal text-slate-500">Unprinted or unreadable fields are left empty</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Calories (kcal) {isFieldFlagged('calories') && <span className="text-amber-600 font-bold">*</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm ${isFieldFlagged('calories') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                      value={extractedData.calories ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, calories: e.target.value}); markFieldEdited('calories'); }} 
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Protein (g) {isFieldFlagged('protein') && <span className="text-amber-600 font-bold">*</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm ${isFieldFlagged('protein') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                      value={extractedData.protein ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, protein: e.target.value}); markFieldEdited('protein'); }} 
                      placeholder="e.g. 24"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Carbohydrates (g) {isFieldFlagged('carbohydrates') && <span className="text-amber-600 font-bold">*</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm ${isFieldFlagged('carbohydrates') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                      value={extractedData.carbohydrates ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, carbohydrates: e.target.value}); markFieldEdited('carbohydrates'); }} 
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Total Sugar (g)
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" 
                      value={extractedData.total_sugar ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, total_sugar: e.target.value}); markFieldEdited('total_sugar'); }} 
                      placeholder="e.g. 1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Added Sugar (g)
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" 
                      value={extractedData.added_sugar ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, added_sugar: e.target.value}); markFieldEdited('added_sugar'); }} 
                      placeholder="e.g. 0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Total Fat (g) {isFieldFlagged('total_fat') && <span className="text-amber-600 font-bold">*</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm ${isFieldFlagged('total_fat') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                      value={extractedData.total_fat ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, total_fat: e.target.value}); markFieldEdited('total_fat'); }} 
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Sodium (mg) {isFieldFlagged('sodium') && <span className="text-amber-600 font-bold">*</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm ${isFieldFlagged('sodium') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'}`}
                      value={extractedData.sodium ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, sodium: e.target.value}); markFieldEdited('sodium'); }} 
                      placeholder="e.g. 120"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Fibre (g)
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" 
                      value={extractedData.fibre ?? ''} 
                      onChange={e => { setExtractedData({...extractedData, fibre: e.target.value}); markFieldEdited('fibre'); }} 
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ingredients Statement</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20" 
                  value={extractedData.raw_ingredient_text || ''} 
                  placeholder="Verbatim ingredients as printed on packaging"
                  onChange={e => { setExtractedData({...extractedData, raw_ingredient_text: e.target.value}); markFieldEdited('ingredients'); }} 
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center mt-6 border border-slate-100">
                <p className="text-xs text-slate-600">
                  Saving will ingest this product with verified provenance into NutriForge.
                </p>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setMode('select')} 
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 text-sm"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 text-sm shadow-sm" 
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Verify & Analyze"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMsg}</p>
                  {keyMissingNotice && (
                    <div className="mt-2 text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-red-100">
                      <p className="font-medium text-slate-800 mb-1">To configure live Vision OCR on Windows:</p>
                      <code className="block bg-slate-100 p-1 rounded font-mono text-[11px] mb-1">
                        PowerShell: $env:GEMINI_API_KEY="your_api_key_here"
                      </code>
                      <code className="block bg-slate-100 p-1 rounded font-mono text-[11px] mb-2">
                        CMD: set GEMINI_API_KEY="your_api_key_here"
                      </code>
                      <p>Or test immediately using the simulated demonstration button below.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group">
                <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 transition-colors">
                  <Upload size={24} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-slate-800 block text-base">Upload Food Label Photo</span>
                  <span className="text-xs text-slate-500 mt-1 block">Supports JPG, PNG, WebP packaging images</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              
              <button 
                onClick={() => setMode('barcode')}
                className="border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-12 h-12 bg-slate-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:text-blue-600 transition-colors">
                  <Barcode size={24} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-slate-800 block text-base">Enter Barcode</span>
                  <span className="text-xs text-slate-500 mt-1 block">Instant catalog lookup by EAN / UPC code</span>
                </div>
              </button>
            </div>

            {/* Demo Mode Action Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <HelpCircle size={20} className="text-blue-600 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">Testing without a camera or image?</p>
                  <p className="text-xs text-slate-500">Run the simulated demo OCR flow to test label review and analysis.</p>
                </div>
              </div>
              <button
                onClick={handleDemoUpload}
                className="whitespace-nowrap bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors shadow-xs"
              >
                Try Demo Mode (Simulated)
              </button>
            </div>
            
            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider text-slate-400">
                <span className="bg-white px-4">Or explore existing catalog</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/app/products')}
              className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 shadow-sm"
            >
              <Search size={18} /> Browse Verified Packaged Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
