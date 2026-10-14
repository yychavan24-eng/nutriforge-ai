export type ValueSource =
  | 'LABEL_DECLARED'
  | 'MANUAL_ENTRY'
  | 'CALCULATED'
  | 'EXTERNAL_EVIDENCE'
  | 'DEMO'
  | 'UNKNOWN';

export interface ProvenanceInfo {
  source: ValueSource;
  confidence?: number;
  original_text?: string;
}

export interface IngredientNode {
  text: string;
  is_allergen: boolean;
  explanation?: string;
}

export interface EnrichedIngredient {
  raw_text: string;
  normalized_name: string;
  canonical_name?: string | null;
  matched_alias?: string | null;
  category: string;
  function?: string | null;
  evidence_summary?: string | null;
  fitness_context?: string | null;
  provenance?: string | null;
  confidence: string;
  status: string;
  is_compound: boolean;
  specification?: string | null;
  children: EnrichedIngredient[];
  has_uncertainty: boolean;
  uncertainty_reason?: string | null;
}

export interface IngredientIntelligenceResult {
  raw_statement: string;
  total_ingredients: number;
  catalogued_count: number;
  uncatalogued_count: number;
  has_uncertainty: boolean;
  ingredients: EnrichedIngredient[];
  error?: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  serving_size: string;
  serving_size_value: number;
  serving_size_unit: string;
  serving_description?: string;
  package_quantity?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  total_sugar: number;
  added_sugar: number;
  total_fat: number;
  saturated_fat: number;
  trans_fat: number;
  sodium: number;
  fibre: number;
  provenance?: Record<string, ProvenanceInfo>;
  raw_ingredient_text?: string;
  structured_ingredients?: IngredientNode[];
  ingredient_intelligence?: IngredientIntelligenceResult;
  allergens: string[];
  claims: string[];
  fssai_information?: string;
  evidence?: string;
  source_type?: string;
  image: string;
  last_updated: string;
}

export interface DailyTargets {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  total_sugar?: number;
  added_sugar?: number;
  total_fat?: number;
  saturated_fat?: number;
  sodium?: number;
  fibre?: number;
}

export interface ProfileData {
  age: string;
  height: string;
  weight: string;
  activityLevel: string;
  goal: string;
  dietaryPreference: string;
  restrictions: string;
  priorities: string[];
  daily_targets?: DailyTargets;
}

export interface ScaledNutrientData {
  label_serving_mass: number;
  consumed_serving_mass: number;
  multiplier: number;
  scaled_nutrients: Record<string, number | null>;
  units: Record<string, string>;
  missing_nutrients: string[];
  target_contributions?: Record<string, {
    consumed: number | null;
    target: number;
    percentage: number | null;
    status: string;
  }>;
}

export interface AllergenConflict {
  type: string;
  user_restriction: string;
  matched_item: string;
  source: string;
  confidence: string;
  explanation: string;
}

export interface AllergenCheckResult {
  status: string;
  has_conflicts: boolean;
  conflict_count: number;
  conflicts: AllergenConflict[];
  data_completeness_warnings: string[];
  disclaimer: string;
}

export interface ComparisonFactor {
  value: number;
  weight: number;
  direction: 'positive' | 'negative';
  contribution: number;
}

export interface ComparisonItem {
  product: Product;
  overallAlignment: number;
  factors: Record<string, ComparisonFactor>;
  explanation: string;
  goal_note?: string;
  allergen_status?: AllergenCheckResult;
}

export interface ComparisonFieldRow {
  key: string;
  label: string;
  unit: string;
  values: Record<string, any>;
}

export interface SmartCompareResponse {
  comparison: ComparisonItem[];
  field_comparison: ComparisonFieldRow[];
  trade_offs: string[];
}
