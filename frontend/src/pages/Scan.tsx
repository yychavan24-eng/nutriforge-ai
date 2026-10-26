import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Search,
  Barcode,
  Camera as CameraIcon,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  HelpCircle,
  FileText,
  X,
  RefreshCw,
  Globe
} from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { api } from '../services/api';
import type { Product, ProvenanceInfo } from '../types';
import { Badge } from '../components/Badge';

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
  const [loadingText, setLoadingText] = useState('Extracting Label Intelligence...');
  const [mode, setMode] = useState<'select' | 'barcode' | 'upload' | 'review' | 'live-barcode'>('select');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [keyMissingNotice, setKeyMissingNotice] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const stopBarcodeScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping barcode scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  };

  useEffect(() => {
    // Check backend OCR configuration status
    api.getScanStatus()
      .then(status => setScanStatus(status))
      .catch(() => setScanStatus(null));

    return () => {
      stopBarcodeScanner();
    };
  }, []);

  const startBarcodeScanner = async () => {
    setErrorMsg('');
    setSuccessNotice('');
    setMode('live-barcode');

    // Give DOM time to render reader container
    setTimeout(async () => {
      try {
        const container = document.getElementById('barcode-reader-container');
        if (!container) return;

        const scanner = new Html5Qrcode('barcode-reader-container');
        html5QrCodeRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            console.log('Barcode successfully scanned:', decodedText);
            await stopBarcodeScanner();
            handleBarcodeLookup(decodedText);
          },
          () => {
            // Frame analysis error (silent while aiming camera)
          }
        );
      } catch (err: any) {
        console.error('Failed to start live barcode camera:', err);
        setErrorMsg(
          err.message?.includes('Permission')
            ? 'Camera permission was denied. Please grant camera access in app settings or enter the barcode manually.'
            : 'Unable to access camera for live barcode scanning. Please use manual entry or photo upload.'
        );
        setMode('select');
      }
    }, 150);
  };

  const handleBarcodeLookup = async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    setLoading(true);
    setLoadingText(`Searching catalog & Open Food Facts for barcode ${cleanBarcode}...`);
    setErrorMsg('');
    setSuccessNotice('');

    try {
      const data = await api.lookupBarcode(cleanBarcode);
      if (data.found && data.product) {
        if (data.source === 'OPEN_FOOD_FACTS') {
          setSuccessNotice(`Found on Open Food Facts: ${data.product.name}`);
        }
        navigate(`/app/products/${data.product.id}`);
      } else {
        setErrorMsg(
          data.message ||
          `Product with barcode ${cleanBarcode} was not found in the catalog or Open Food Facts database. You can capture or upload a packaging photo to extract facts with AI.`
        );
        setMode('select');
      }
    } catch {
      setErrorMsg('Error contacting barcode service. Please check network connection.');
      setMode('select');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeLookup(barcodeInput.trim());
  };

  const processImageBase64 = async (base64Data: string) => {
    setLoading(true);
    setLoadingText('Analyzing packaging photo with Gemini Vision OCR...');
    setMode('upload');
    setErrorMsg('');
    setKeyMissingNotice(false);

    try {
      const data = await api.scanLabel(base64Data, false);
      if (data.status === 'success' && data.extracted_data) {
        setExtractedData(data.extracted_data);
        setEditedFields(new Set());
        setMode('review');
      } else if (data.error_code === 'GEMINI_API_KEY_MISSING') {
        setErrorMsg(data.message || 'Gemini API key is not configured on the backend.');
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

  const handleCapturePhoto = async () => {
    setErrorMsg('');
    setSuccessNotice('');

    // If native Capacitor device, use Capacitor Camera plugin
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera
        });

        if (photo.base64String) {
          const mimeType = photo.format ? `image/${photo.format}` : 'image/jpeg';
          const fullBase64 = `data:${mimeType};base64,${photo.base64String}`;
          await processImageBase64(fullBase64);
        }
      } catch (err: any) {
        // User cancelled camera or permission denied
        if (!err.message?.includes('User cancelled')) {
          console.warn('Native camera error:', err);
          // Fallback to web capture input
          cameraInputRef.current?.click();
        }
      }
    } else {
      // On web browser, trigger HTML5 camera capture input
      cameraInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await processImageBase64(base64Data);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file.');
      setMode('select');
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const handleDemoUpload = async () => {
    setLoading(true);
    setLoadingText('Loading simulated demonstration label dataset...');
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
    setLoadingText('Saving verified product to database...');
    setErrorMsg('');

    try {
      const servingVal = parseFloat(extractedData.serving_size_value) || 100;
      const servingUnit = extractedData.serving_size_unit || 'g';

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
        id: 'p_' + Date.now(),
        barcode: barcodeInput || 'unknown',
        name: extractedData.name || 'Unnamed Product',
        brand: extractedData.brand || 'Unspecified Brand',
        category: extractedData.category || 'Community Scanned',
        serving_size: `${servingVal}${servingUnit}`,
        serving_size_value: servingVal,
        serving_size_unit: servingUnit,
        serving_description: extractedData.serving_description || '',
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
        raw_ingredient_text: extractedData.raw_ingredient_text || '',
        structured_ingredients: editedFields.has('ingredients') ? [] : (extractedData.structured_ingredients || []),
        allergens: extractedData.allergens || [],
        claims: extractedData.claims || [],
        fssai_information: 'Awaiting Community Verification',
        evidence: extractedData.is_simulated
          ? 'Simulated demonstration extraction (Test Provider).'
          : `Extracted via Gemini Vision (${extractedData.provider}) and human verified.`,
        source_type: 'COMMUNITY_VERIFIED',
        image: 'placeholder.jpg',
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
    <div className="max-w-4xl mx-auto pb-16 space-y-6">

      {/* Hidden File and Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Editorial Header */}
      <div className="pb-2 border-b border-[#eae4d5] text-center sm:text-left">
        <div className="flex items-center gap-2 mb-1.5 justify-center sm:justify-start">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
            Computer Vision & Ingestion
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
          Food Scanner & Product Ingestion
        </h1>
        <p className="text-sm text-[#4f5f53] mt-1 max-w-xl mx-auto sm:mx-0">
          Capture food label photos with Gemini Vision OCR, scan barcodes with live camera, or look up genuine records in Open Food Facts.
        </p>

        {/* OCR Engine & Open Food Facts Status Badges */}
        <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
          {scanStatus?.gemini_configured ? (
            <Badge variant="sage" size="sm" icon={<Sparkles size={12} className="text-[#183c27]" />}>
              Live Gemini Vision Active ({scanStatus.model})
            </Badge>
          ) : (
            <Badge variant="amber" size="sm" icon={<Info size={12} className="text-[#92400e]" />}>
              Simulated Demo Mode Active (Configure GEMINI_API_KEY for live OCR)
            </Badge>
          )}

          <Badge variant="sage" size="sm" icon={<Globe size={12} className="text-[#183c27]" />}>
            Open Food Facts Database Connected
          </Badge>
        </div>
      </div>

      <div className="bg-[#fcfbf9] p-6 md:p-8 rounded-2xl border border-[#eae4d5] shadow-health">

        {/* Loading State */}
        {loading && mode !== 'review' ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 border-3 border-[#cfded1] border-t-[#183c27] rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-[#122b1c]">{loadingText}</p>
            <p className="text-xs text-[#68796d] mt-1 max-w-xs">
              Analyzing printed nutrition facts, ingredients statement, and allergen warnings with provenance validation.
            </p>
          </div>
        ) : mode === 'live-barcode' ? (
          /* Live Barcode Camera Scanner */
          <div className="space-y-4 max-w-lg mx-auto py-2">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#122b1c]">Live Barcode Scanner</h2>
                <p className="text-xs text-[#68796d]">Point camera at EAN / UPC food packaging barcode</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await stopBarcodeScanner();
                  setMode('select');
                }}
                className="p-2 rounded-xl text-[#68796d] hover:bg-[#eae4d5]/50 hover:text-[#122b1c] transition-colors"
                title="Cancel scanner"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scanner Viewport */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#183c27] bg-black aspect-4/3 flex items-center justify-center">
              <div id="barcode-reader-container" className="w-full h-full"></div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-[#68796d] mb-3">
                Scans automatically upon detecting a standard barcode.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={async () => {
                    await stopBarcodeScanner();
                    setMode('barcode');
                  }}
                  className="px-4 py-2 bg-[#f6f4ee] text-[#122b1c] border border-[#ded5c2] rounded-xl text-xs font-semibold hover:bg-[#eae4d5]/50 transition-colors"
                >
                  Enter Barcode Manually
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await stopBarcodeScanner();
                    setMode('select');
                  }}
                  className="px-4 py-2 bg-[#183c27] text-white rounded-xl text-xs font-semibold hover:bg-[#122b1c] transition-colors"
                >
                  Close Scanner
                </button>
              </div>
            </div>
          </div>
        ) : mode === 'barcode' ? (
          /* Manual Barcode Input Mode */
          <div className="space-y-4 max-w-lg mx-auto py-4">
            <div>
              <h2 className="text-lg font-bold text-[#122b1c]">Lookup Product by Barcode</h2>
              <p className="text-xs text-[#68796d] mt-0.5">
                Enter standard 12 or 13-digit EAN/UPC barcode number. Checks local catalog and Open Food Facts.
              </p>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="e.g. 3017620422003 or 8901234567890"
                className="w-full border border-[#ded5c2] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] text-base font-mono bg-white text-[#171d18]"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="flex-1 bg-[#f6f4ee] text-[#38453b] py-2.5 rounded-xl text-xs font-semibold hover:bg-[#eae4d5]/50 border border-[#ded5c2] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#183c27] text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-[#122b1c] transition-colors shadow-xs"
                >
                  Lookup Barcode
                </button>
              </div>
            </form>
          </div>
        ) : mode === 'review' && extractedData ? (
          /* Review & Ingestion Mode */
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#eae4d5]">
              <CheckCircle className="text-[#1a6b41]" size={22} />
              <div>
                <h2 className="text-lg font-bold text-[#122b1c]">Review & Verify Extracted Label Facts</h2>
                <p className="text-xs text-[#68796d]">
                  Confirm printed values. NutriForge marks unmodified values as Label Declared (LBL) and edited values as Manual (MAN).
                </p>
              </div>
            </div>

            {/* Provider Truth Transparency Banner */}
            {extractedData.is_simulated ? (
              <div className="p-4 bg-[#fef3c7] border border-[#fde68a] rounded-xl text-xs text-[#92400e] flex items-start gap-3">
                <Info className="shrink-0 text-[#b45309] mt-0.5" size={18} />
                <div>
                  <p className="font-bold">Simulated Demonstration Data</p>
                  <p className="mt-0.5 text-[#78350f] leading-relaxed">
                    This sample label extraction was loaded via the local simulated provider. Real photographic scans run through Gemini Vision once GEMINI_API_KEY is configured on the backend.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#f5f8f5] border border-[#b4c8b6] rounded-xl text-xs text-[#1e4a31] flex items-start gap-3">
                <Sparkles className="shrink-0 text-[#183c27] mt-0.5" size={18} />
                <div>
                  <p className="font-bold">Gemini Vision Extraction ({extractedData.provider})</p>
                  <p className="mt-0.5 text-[#3b523e] leading-relaxed">
                    Visual extraction completed. Printed metrics are tagged as <strong className="font-semibold text-[#183c27]">LBL (Label Declared)</strong>. Any user corrections will be flagged as <strong className="font-semibold text-[#183c27]">MAN (Manual Entry)</strong> for full provenance.
                  </p>
                </div>
              </div>
            )}

            {/* Uncertainty Warning if specific fields were flagged */}
            {extractedData.fields_needing_review && extractedData.fields_needing_review.length > 0 && (
              <div className="p-4 bg-[#fef3c7] border border-[#fde68a] rounded-xl text-xs text-[#92400e] flex items-start gap-3">
                <AlertTriangle className="shrink-0 text-[#b45309] mt-0.5" size={18} />
                <div>
                  <p className="font-bold">Human Verification Recommended for Specific Fields</p>
                  <p className="mt-0.5 text-[#78350f]">
                    Visual ambiguity or packaging curve flagged for: <strong>{extractedData.fields_needing_review.join(', ')}</strong>. Please verify accuracy against your physical packaging.
                  </p>
                  {extractedData.uncertainty_notes && extractedData.uncertainty_notes.length > 0 && (
                    <ul className="list-disc list-inside mt-2 space-y-0.5 text-[#78350f]">
                      {extractedData.uncertainty_notes.map((note: string, idx: number) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleReviewSave} className="space-y-6">

              {/* Product Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                    Product Title {isFieldFlagged('name') && <span className="text-[#92400e] font-bold">(Review)</span>}
                  </label>
                  <input
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] ${
                      isFieldFlagged('name') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                    }`}
                    value={extractedData.name || ''}
                    onChange={e => { setExtractedData({...extractedData, name: e.target.value}); markFieldEdited('name'); }}
                    placeholder="Product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                    Brand or Manufacturer {isFieldFlagged('brand') && <span className="text-[#92400e] font-bold">(Review)</span>}
                  </label>
                  <input
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] ${
                      isFieldFlagged('brand') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                    }`}
                    value={extractedData.brand || ''}
                    onChange={e => { setExtractedData({...extractedData, brand: e.target.value}); markFieldEdited('brand'); }}
                    placeholder="Brand name"
                    required
                  />
                </div>
              </div>

              {/* Serving Size Information */}
              <div className="pt-4 border-t border-[#eae4d5]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#122b1c] mb-3">Serving Metrics</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">
                      Serving Mass / Value {isFieldFlagged('serving_size_value') && <span className="text-[#92400e] font-bold">*</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full rounded-xl border px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] ${
                        isFieldFlagged('serving_size_value') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                      }`}
                      value={extractedData.serving_size_value ?? ''}
                      onChange={e => { setExtractedData({...extractedData, serving_size_value: e.target.value}); markFieldEdited('serving'); }}
                      placeholder="e.g. 50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">Unit</label>
                    <input
                      className="w-full rounded-xl border border-[#ded5c2] px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b]"
                      value={extractedData.serving_size_unit || 'g'}
                      onChange={e => { setExtractedData({...extractedData, serving_size_unit: e.target.value}); markFieldEdited('serving'); }}
                      placeholder="g or ml"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">Serving Description</label>
                    <input
                      className="w-full rounded-xl border border-[#ded5c2] px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b]"
                      value={extractedData.serving_description || ''}
                      onChange={e => { setExtractedData({...extractedData, serving_description: e.target.value}); markFieldEdited('serving'); }}
                      placeholder="e.g. 1 bowl (30g)"
                    />
                  </div>
                </div>
              </div>

              {/* Nutrition Facts */}
              <div className="pt-4 border-t border-[#eae4d5]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#122b1c] mb-3">Nutrition Values</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">
                      Calories (kcal) {isFieldFlagged('calories') && <span className="text-[#92400e] font-bold">*</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full rounded-xl border px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] ${
                        isFieldFlagged('calories') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                      }`}
                      value={extractedData.calories ?? ''}
                      onChange={e => { setExtractedData({...extractedData, calories: e.target.value}); markFieldEdited('calories'); }}
                      placeholder="e.g. 210"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">
                      Protein (g) {isFieldFlagged('protein') && <span className="text-[#92400e] font-bold">*</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full rounded-xl border px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] ${
                        isFieldFlagged('protein') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                      }`}
                      value={extractedData.protein ?? ''}
                      onChange={e => { setExtractedData({...extractedData, protein: e.target.value}); markFieldEdited('protein'); }}
                      placeholder="e.g. 10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">
                      Carbohydrates (g) {isFieldFlagged('carbohydrates') && <span className="text-[#92400e] font-bold">*</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full rounded-xl border px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] ${
                        isFieldFlagged('carbohydrates') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                      }`}
                      value={extractedData.carbohydrates ?? ''}
                      onChange={e => { setExtractedData({...extractedData, carbohydrates: e.target.value}); markFieldEdited('carbohydrates'); }}
                      placeholder="e.g. 28"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">Total Sugar (g)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full rounded-xl border border-[#ded5c2] px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b]"
                      value={extractedData.total_sugar ?? ''}
                      onChange={e => { setExtractedData({...extractedData, total_sugar: e.target.value}); markFieldEdited('total_sugar'); }}
                      placeholder="e.g. 2"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">Added Sugar (g)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full rounded-xl border border-[#ded5c2] px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b]"
                      value={extractedData.added_sugar ?? ''}
                      onChange={e => { setExtractedData({...extractedData, added_sugar: e.target.value}); markFieldEdited('added_sugar'); }}
                      placeholder="e.g. 0"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">
                      Total Fat (g) {isFieldFlagged('total_fat') && <span className="text-[#92400e] font-bold">*</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full rounded-xl border px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] ${
                        isFieldFlagged('total_fat') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                      }`}
                      value={extractedData.total_fat ?? ''}
                      onChange={e => { setExtractedData({...extractedData, total_fat: e.target.value}); markFieldEdited('total_fat'); }}
                      placeholder="e.g. 3.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">
                      Sodium (mg) {isFieldFlagged('sodium') && <span className="text-[#92400e] font-bold">*</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full rounded-xl border px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] ${
                        isFieldFlagged('sodium') ? 'border-[#fde68a] bg-[#fef3c7]/20' : 'border-[#ded5c2]'
                      }`}
                      value={extractedData.sodium ?? ''}
                      onChange={e => { setExtractedData({...extractedData, sodium: e.target.value}); markFieldEdited('sodium'); }}
                      placeholder="e.g. 50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#68796d] mb-1">Dietary Fibre (g)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full rounded-xl border border-[#ded5c2] px-3 py-1.5 text-sm bg-white text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b]"
                      value={extractedData.fibre ?? ''}
                      onChange={e => { setExtractedData({...extractedData, fibre: e.target.value}); markFieldEdited('fibre'); }}
                      placeholder="e.g. 6"
                    />
                  </div>
                </div>
              </div>

              {/* Ingredients Statement */}
              <div className="pt-4 border-t border-[#eae4d5]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText size={15} className="text-[#183c27]" />
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b]">
                    Printed Ingredients Statement
                  </label>
                </div>
                <textarea
                  className="w-full rounded-xl border border-[#ded5c2] px-3.5 py-2.5 text-sm bg-white text-[#171d18] h-24 focus:outline-none focus:ring-2 focus:ring-[#24593b] leading-relaxed"
                  value={extractedData.raw_ingredient_text || ''}
                  placeholder="Verbatim ingredients as printed on packaging"
                  onChange={e => { setExtractedData({...extractedData, raw_ingredient_text: e.target.value}); markFieldEdited('ingredients'); }}
                />
              </div>

              {/* Action Bar */}
              <div className="bg-[#f6f4ee] p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 border border-[#eae4d5]">
                <p className="text-xs text-[#68796d]">
                  Verification writes this food item to persistent database with source attribution.
                </p>
                <div className="flex gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setMode('select')}
                    className="px-4 py-2 border border-[#ded5c2] rounded-xl font-semibold text-[#4f5f53] hover:bg-[#eae4d5]/50 text-xs transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#183c27] text-white rounded-xl font-semibold hover:bg-[#122b1c] disabled:opacity-50 text-xs shadow-xs transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Ingesting...' : 'Verify & Ingest Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* Selection / Main Upload View */
          <div className="space-y-6">

            {/* Success Notice */}
            {successNotice && (
              <div className="bg-[#ecfdf5] text-[#065f46] p-4 rounded-xl border border-[#a7f3d0] text-xs flex items-center gap-2.5 shadow-xs">
                <CheckCircle size={16} className="shrink-0 text-[#059669]" />
                <p className="font-semibold">{successNotice}</p>
              </div>
            )}

            {/* Error Message Display */}
            {errorMsg && (
              <div className="bg-[#ffe4e6] text-[#9f1239] p-4 rounded-xl border border-[#fecdd3] text-xs flex items-start gap-2.5 shadow-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#e11d48]" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMsg}</p>
                  {keyMissingNotice && (
                    <div className="mt-2 text-xs text-[#4f5f53] bg-white/90 p-3 rounded-lg border border-[#fecdd3]">
                      <p className="font-semibold text-[#171d18] mb-1">To enable live Gemini Vision OCR:</p>
                      <code className="block bg-[#f6f4ee] p-1.5 rounded font-mono text-[11px] mb-1.5 text-[#122b1c]">
                        PowerShell: $env:GEMINI_API_KEY="your_api_key_here"
                      </code>
                      <p className="text-[11px] text-[#68796d]">
                        Or test instantly using the simulated demo button below without needing an external API key.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Primary Scanner Grid - 4 Ingestion Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* 1. Device Camera Photo Capture */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="border-2 border-[#cfded1] hover:border-[#183c27] hover:bg-[#f5f8f5] transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-3 group bg-[#fcfbf9] shadow-xs text-center"
              >
                <div className="w-12 h-12 bg-[#e6ede7] group-hover:bg-[#183c27] rounded-xl flex items-center justify-center text-[#183c27] group-hover:text-white transition-colors">
                  <CameraIcon size={22} />
                </div>
                <div>
                  <span className="font-bold text-[#122b1c] block text-sm sm:text-base">
                    Capture Label Photo
                  </span>
                  <span className="text-xs text-[#68796d] mt-0.5 block">
                    Use device camera for real-time label photography
                  </span>
                </div>
              </button>

              {/* 2. Photo File Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-[#ded5c2] hover:border-[#183c27] hover:bg-[#f5f8f5] transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-3 group bg-[#fcfbf9] shadow-xs text-center"
              >
                <div className="w-12 h-12 bg-[#f6f4ee] group-hover:bg-[#183c27] rounded-xl flex items-center justify-center text-[#38453b] group-hover:text-white transition-colors">
                  <Upload size={22} />
                </div>
                <div>
                  <span className="font-bold text-[#122b1c] block text-sm sm:text-base">
                    Upload Existing Photo
                  </span>
                  <span className="text-xs text-[#68796d] mt-0.5 block">
                    Select JPG, PNG, or WebP photo up to 10MB
                  </span>
                </div>
              </button>

              {/* 3. Live Barcode Camera Scanner */}
              <button
                type="button"
                onClick={startBarcodeScanner}
                className="border-2 border-[#cfded1] hover:border-[#183c27] hover:bg-[#f5f8f5] transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-3 group bg-[#fcfbf9] shadow-xs text-center"
              >
                <div className="w-12 h-12 bg-[#e6ede7] group-hover:bg-[#183c27] rounded-xl flex items-center justify-center text-[#183c27] group-hover:text-white transition-colors">
                  <RefreshCw size={22} />
                </div>
                <div>
                  <span className="font-bold text-[#122b1c] block text-sm sm:text-base">
                    Live Barcode Camera
                  </span>
                  <span className="text-xs text-[#68796d] mt-0.5 block">
                    Continuous camera reticle to detect package barcodes
                  </span>
                </div>
              </button>

              {/* 4. Manual Barcode Entry */}
              <button
                type="button"
                onClick={() => setMode('barcode')}
                className="border-2 border-[#ded5c2] hover:border-[#183c27] hover:bg-[#f5f8f5] transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-3 group bg-[#fcfbf9] shadow-xs text-center"
              >
                <div className="w-12 h-12 bg-[#f6f4ee] group-hover:bg-[#183c27] rounded-xl flex items-center justify-center text-[#38453b] group-hover:text-white transition-colors">
                  <Barcode size={22} />
                </div>
                <div>
                  <span className="font-bold text-[#122b1c] block text-sm sm:text-base">
                    Enter Barcode Manually
                  </span>
                  <span className="text-xs text-[#68796d] mt-0.5 block">
                    Type 12-13 digit EAN/UPC code (e.g. 3017620422003)
                  </span>
                </div>
              </button>
            </div>

            {/* Transparent Demo Mode Option */}
            <div className="bg-[#f6f4ee] border border-[#eae4d5] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-[#eae4d5] text-[#183c27] shrink-0">
                  <HelpCircle size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-bold text-[#122b1c]">
                    Testing without a physical package?
                  </p>
                  <p className="text-xs text-[#68796d]">
                    Run a simulated label scan to test ingestion review, allergen flags, and serving scaling.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDemoUpload}
                className="whitespace-nowrap bg-white border border-[#ded5c2] text-[#262f28] px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-[#eae4d5]/40 transition-colors shadow-xs"
              >
                Try Demo Mode (Simulated)
              </button>
            </div>

            {/* Catalog Discovery CTA */}
            <div className="pt-2 border-t border-[#eae4d5]">
              <button
                type="button"
                onClick={() => navigate('/app/products')}
                className="w-full bg-[#122b1c] text-white font-semibold py-3 rounded-xl hover:bg-[#0a1a11] transition-colors flex justify-center items-center gap-2 text-xs sm:text-sm shadow-health"
              >
                <Search size={16} /> Browse Verified Packaged Products
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
