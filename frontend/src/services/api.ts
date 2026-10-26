import type {
  Product,
  ProfileData,
  ScaledNutrientData,
  AllergenCheckResult,
  SmartCompareResponse,
  IngredientIntelligenceResult
} from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
      ? rawApiUrl.replace(/\/+$/, '')
      : `https://${rawApiUrl.replace(/\/+$/, '')}`)
  : (import.meta.env.PROD ? 'https://nutriforge-backend-0doa.onrender.com' : 'http://localhost:8000');

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch {
      // ignore json parse error on response
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Products
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    return handleResponse<Product[]>(res);
  },

  async getProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
    const data = await handleResponse<any>(res);
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  },

  async getIngredientIntelligence(productId: string): Promise<IngredientIntelligenceResult> {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}/ingredient-intelligence`);
    return handleResponse<IngredientIntelligenceResult>(res);
  },

  async analyzeIngredients(rawIngredientText: string): Promise<{ status: string; data: IngredientIntelligenceResult }> {
    const res = await fetch(`${API_BASE_URL}/api/ingredients/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_ingredient_text: rawIngredientText })
    });
    return handleResponse(res);
  },

  async saveProduct(product: Partial<Product>): Promise<{ status: string; product_id: string }> {
    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    return handleResponse(res);
  },

  // Barcode & Scanner
  async lookupBarcode(barcode: string): Promise<{ found: boolean; product?: Product; message?: string; source?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/barcode/${barcode}`);
    return handleResponse(res);
  },

  async getScanStatus(): Promise<{
    gemini_configured: boolean;
    model: string;
    supported_formats: string[];
    max_file_size_mb: number;
    provider_name: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/api/scan/status`);
    return handleResponse(res);
  },

  async scanLabel(
    imageData: string,
    forceDemo: boolean = false
  ): Promise<{
    status: string;
    extracted_data?: any;
    message?: string;
    error_code?: string;
    allow_demo_fallback?: boolean;
    is_simulated?: boolean;
    provider?: string;
    fields_needing_review?: string[];
    uncertainty_notes?: string[];
  }> {
    const res = await fetch(`${API_BASE_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_data: imageData, force_demo: forceDemo })
    });
    return handleResponse(res);
  },

  // User Profile
  async getProfile(): Promise<{ status: string; data: ProfileData }> {
    const res = await fetch(`${API_BASE_URL}/api/profile`);
    return handleResponse(res);
  },

  async saveProfile(profile: ProfileData): Promise<{ status: string; message: string; data: ProfileData }> {
    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return handleResponse(res);
  },

  // Deterministic Nutrition Scaling Engine
  async scaleNutrition(params: {
    product_id?: string;
    consumed_serving_mass: number;
    label_serving_mass?: number;
    nutrition_data?: Record<string, number | null>;
    daily_targets?: Record<string, number>;
  }): Promise<{ status: string; data: ScaledNutrientData }> {
    const res = await fetch(`${API_BASE_URL}/api/nutrition/scale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return handleResponse(res);
  },

  // Deterministic Allergen Engine
  async checkAllergens(params: {
    product_id?: string;
    product_allergens?: string[];
    raw_ingredient_text?: string;
    structured_ingredients?: any[];
    user_restrictions?: string;
    dietary_preference?: string;
  }): Promise<{ status: string; data: AllergenCheckResult }> {
    const res = await fetch(`${API_BASE_URL}/api/allergens/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return handleResponse(res);
  },

  // Smart Compare Engine
  async compareProducts(productIds: string[], profile: ProfileData): Promise<SmartCompareResponse> {
    const res = await fetch(`${API_BASE_URL}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: productIds, profile })
    });
    return handleResponse<SmartCompareResponse>(res);
  },

  // AI Assistant
  async askAssistant(params: {
    query: string;
    profile?: ProfileData;
    context_product_ids?: string[];
  }): Promise<{ response: string; disclaimer?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return handleResponse(res);
  }
};
