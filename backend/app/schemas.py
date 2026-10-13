"""
Pydantic Schemas for NutriForge AI.
Covers products, provenance, user profile, serving calculations, and comparisons.
"""
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ValueSource(str, Enum):
    LABEL_DECLARED = "LABEL_DECLARED"
    MANUAL_ENTRY = "MANUAL_ENTRY"
    CALCULATED = "CALCULATED"
    EXTERNAL_EVIDENCE = "EXTERNAL_EVIDENCE"
    DEMO = "DEMO"
    UNKNOWN = "UNKNOWN"

class ProvenanceInfo(BaseModel):
    source: ValueSource = ValueSource.UNKNOWN
    confidence: Optional[float] = None
    original_text: Optional[str] = None

class IngredientNode(BaseModel):
    text: str
    is_allergen: bool = False
    explanation: Optional[str] = None

class ProductBase(BaseModel):
    id: str
    barcode: str = "unknown"
    name: str
    brand: str
    category: str = "General"
    
    # Serving
    serving_size: str = "100g"
    serving_size_value: float = 100.0
    serving_size_unit: str = "g"
    serving_description: str = ""
    
    # Nutrition
    calories: Optional[float] = 0.0
    protein: Optional[float] = 0.0
    carbohydrates: Optional[float] = 0.0
    total_sugar: Optional[float] = 0.0
    added_sugar: Optional[float] = 0.0
    total_fat: Optional[float] = 0.0
    saturated_fat: Optional[float] = 0.0
    trans_fat: Optional[float] = 0.0
    sodium: Optional[float] = 0.0
    fibre: Optional[float] = 0.0
    
    # Metadata
    provenance: Dict[str, ProvenanceInfo] = {}

    # Ingredients
    raw_ingredient_text: str = ""
    structured_ingredients: List[IngredientNode] = []
    
    # Restrictions/Claims
    allergens: List[str] = []
    claims: List[str] = []
    
    # Regulatory/Evidence
    fssai_information: str = "Awaiting verification"
    evidence: str = "Declared product label."
    source_type: str = "DEMO"
    image: str = "placeholder.jpg"
    last_updated: str = ""

class DailyTargets(BaseModel):
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbohydrates: Optional[float] = None
    total_sugar: Optional[float] = None
    added_sugar: Optional[float] = None
    total_fat: Optional[float] = None
    saturated_fat: Optional[float] = None
    sodium: Optional[float] = None
    fibre: Optional[float] = None

class ProfileData(BaseModel):
    age: Optional[str] = ""
    height: Optional[str] = ""
    weight: Optional[str] = ""
    activityLevel: str = "moderate"
    goal: str = "muscle_gain"
    dietaryPreference: str = "no_preference"
    restrictions: str = ""
    priorities: List[str] = ["protein", "calories"]
    daily_targets: Optional[Dict[str, float]] = None

class ScaleServingRequest(BaseModel):
    product_id: Optional[str] = None
    consumed_serving_mass: float
    label_serving_mass: Optional[float] = None
    nutrition_data: Optional[Dict[str, Optional[float]]] = None
    daily_targets: Optional[Dict[str, float]] = None

class AllergenCheckRequest(BaseModel):
    product_id: Optional[str] = None
    product_allergens: Optional[List[str]] = None
    raw_ingredient_text: Optional[str] = None
    structured_ingredients: Optional[List[Dict[str, Any]]] = None
    user_restrictions: Optional[str] = None
    dietary_preference: Optional[str] = None

class CompareRequest(BaseModel):
    product_ids: List[str]
    profile: ProfileData

class ScanRequest(BaseModel):
    image_data: Optional[str] = None
    barcode: Optional[str] = None
    force_demo: Optional[bool] = False

class ScanStatusResponse(BaseModel):
    gemini_configured: bool
    model: str
    supported_formats: List[str]
    max_file_size_mb: int
    provider_name: str

class RecheckRequest(BaseModel):
    product_id: str
    snapshot_data: Dict[str, Any]

class AssistantRequest(BaseModel):
    query: str
    profile: Optional[ProfileData] = None
    context_product_ids: List[str] = []
