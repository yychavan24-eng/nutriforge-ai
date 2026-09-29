from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
from app.services.ocr import MockOCRProvider

app = FastAPI(title="NutriForge AI", description="Personalized Packaged-Food Intelligence API")
ocr_provider = MockOCRProvider()

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ValueSource(str, Enum):
    LABEL_DECLARED = "LABEL_DECLARED"
    CALCULATED = "CALCULATED"
    EXTERNAL_EVIDENCE = "EXTERNAL_EVIDENCE"
    UNKNOWN = "UNKNOWN"

class ProvenanceInfo(BaseModel):
    source: ValueSource
    confidence: Optional[float] = None
    original_text: Optional[str] = None

class IngredientNode(BaseModel):
    text: str
    is_allergen: bool = False
    explanation: Optional[str] = None

class ProductBase(BaseModel):
    id: str
    barcode: str
    name: str
    brand: str
    category: str
    
    # Serving
    serving_size: str
    serving_size_value: float = 0.0
    serving_size_unit: str = "g"
    serving_description: str = ""
    
    # Nutrition
    calories: float
    protein: float
    carbohydrates: float
    total_sugar: float
    added_sugar: float
    total_fat: float
    saturated_fat: float
    trans_fat: float
    sodium: float
    fibre: float
    
    # Metadata
    provenance: Dict[str, ProvenanceInfo] = {}

    # Ingredients
    raw_ingredient_text: str = ""
    structured_ingredients: List[IngredientNode] = []
    
    # Restrictions/Claims
    allergens: List[str]
    claims: List[str]
    
    # Regulatory/Evidence
    fssai_information: str
    evidence: str
    source_type: str = "DEMO"
    image: str
    last_updated: str

class ProfileData(BaseModel):
    age: str
    height: str
    weight: str
    activityLevel: str
    goal: str
    dietaryPreference: str
    restrictions: str
    priorities: List[str]

class CompareRequest(BaseModel):
    product_ids: List[str]
    profile: ProfileData

class ScanRequest(BaseModel):
    image_data: Optional[str] = None
    barcode: Optional[str] = None

class RecheckRequest(BaseModel):
    product_id: str
    snapshot_data: Dict[str, Any]

class AssistantRequest(BaseModel):
    query: str
    profile: ProfileData
    context_product_ids: List[str] = []

# Demo Product Data updated for Phase 2
DEMO_PRODUCTS = [
    {
        "id": "1",
        "barcode": "8901234567890",
        "name": "High Protein Oats",
        "brand": "NutriFit",
        "category": "Oats",
        "serving_size": "50g",
        "serving_size_value": 50.0,
        "serving_size_unit": "g",
        "serving_description": "1/2 cup",
        "calories": 190.0,
        "protein": 10.0,
        "carbohydrates": 28.0,
        "total_sugar": 1.0,
        "added_sugar": 0.0,
        "total_fat": 3.5,
        "saturated_fat": 0.5,
        "trans_fat": 0.0,
        "sodium": 50.0,
        "fibre": 6.0,
        "provenance": {
            "calories": {"source": "LABEL_DECLARED"},
            "protein": {"source": "LABEL_DECLARED"}
        },
        "raw_ingredient_text": "Whole Grain Rolled Oats, Whey Protein Isolate, Almonds, Chia Seeds",
        "structured_ingredients": [
            {"text": "Whole Grain Rolled Oats", "is_allergen": False},
            {"text": "Whey Protein Isolate", "is_allergen": True, "explanation": "Dairy derived"}
        ],
        "allergens": ["Milk", "Tree Nuts"],
        "claims": ["High Protein", "No Added Sugar", "High Fibre"],
        "fssai_information": "FSSAI Lic. No. 10012011000123",
        "evidence": "Verified via label scan.",
        "source_type": "COMMUNITY_VERIFIED",
        "image": "oats_placeholder.jpg",
        "last_updated": "2026-09-29T12:00:00Z"
    },
    {
        "id": "2",
        "barcode": "8901234567891",
        "name": "Energy Protein Bar",
        "brand": "PowerFuel",
        "category": "Protein bars",
        "serving_size": "60g",
        "serving_size_value": 60.0,
        "serving_size_unit": "g",
        "serving_description": "1 bar",
        "calories": 240.0,
        "protein": 20.0,
        "carbohydrates": 22.0,
        "total_sugar": 12.0,
        "added_sugar": 10.0,
        "total_fat": 8.0,
        "saturated_fat": 2.5,
        "trans_fat": 0.0,
        "sodium": 120.0,
        "fibre": 3.0,
        "provenance": {
            "total_sugar": {"source": "LABEL_DECLARED", "confidence": 0.95}
        },
        "raw_ingredient_text": "Protein Blend, Glucose Syrup, Dark Chocolate, Peanuts, Soy Lecithin",
        "structured_ingredients": [],
        "allergens": ["Milk", "Peanuts", "Soy"],
        "claims": ["20g Protein", "Energy Boost"],
        "fssai_information": "FSSAI Lic. No. 10015022000456",
        "evidence": "Verified via label scan.",
        "source_type": "COMMUNITY_VERIFIED",
        "image": "bar_placeholder.jpg",
        "last_updated": "2026-09-29T12:00:00Z"
    }
]

@app.get("/")
def read_root():
    return {"message": "Welcome to NutriForge AI API - Phase 1"}

@app.get("/api/products")
def get_products():
    return DEMO_PRODUCTS

@app.get("/api/products/{id}")
def get_product(id: str):
    product = next((p for p in DEMO_PRODUCTS if p["id"] == id), None)
    if product:
        return product
    return {"error": "Product not found"}

@app.post("/api/profile")
def create_profile(profile_data: ProfileData):
    # Mock saving profile data
    return {"status": "success", "message": "Profile created successfully", "data": profile_data.model_dump()}

@app.post("/api/scan")
def scan_product(scan_data: ScanRequest):
    if scan_data.image_data:
        # Perform OCR
        structured_data = ocr_provider.extract_structured_data(scan_data.image_data)
        return {"status": "success", "extracted_data": structured_data}
    return {"status": "error", "message": "No image data provided"}

@app.get("/api/barcode/{barcode}")
def lookup_barcode(barcode: str):
    product = next((p for p in DEMO_PRODUCTS if p.get("barcode") == barcode), None)
    if product:
        return {"found": True, "product": product}
    return {"found": False, "message": "Product not found. Please scan the label."}

@app.post("/api/products")
def create_product(product: ProductBase):
    product_dict = product.model_dump()
    DEMO_PRODUCTS.append(product_dict)
    return {"status": "success", "product_id": product.id}

@app.get("/api/products/{id}/nutrition")
def get_product_nutrition(id: str):
    product = next((p for p in DEMO_PRODUCTS if p["id"] == id), None)
    if not product:
        return {"error": "Product not found"}
    return {
        "calories": product["calories"],
        "protein": product["protein"],
        "carbohydrates": product["carbohydrates"],
        "sugar": product["total_sugar"],
        "added_sugar": product["added_sugar"],
        "fat": product["total_fat"],
        "saturated_fat": product["saturated_fat"],
        "sodium": product["sodium"],
        "fibre": product["fibre"]
    }

@app.get("/api/products/{id}/ingredients")
def get_product_ingredients(id: str):
    product = next((p for p in DEMO_PRODUCTS if p["id"] == id), None)
    if not product:
        return {"error": "Product not found"}
    # Gracefully handle the new schema for backward compatibility if needed
    ingredients = product.get("raw_ingredient_text", "")
    allergens = product.get("allergens", [])
    return {"ingredients": [i.strip() for i in ingredients.split(",")] if ingredients else [], "allergens": allergens, "structured_ingredients": product.get("structured_ingredients", [])}

@app.get("/api/products/{id}/claims")
def get_product_claims(id: str):
    product = next((p for p in DEMO_PRODUCTS if p["id"] == id), None)
    if not product:
        return {"error": "Product not found"}
    return {"claims": product["claims"], "status": "Appears Consistent"}

@app.get("/api/products/{id}/evidence")
def get_product_evidence(id: str):
    product = next((p for p in DEMO_PRODUCTS if p["id"] == id), None)
    if not product:
        return {"error": "Product not found"}
    return {"evidence": product["evidence"]}

def calculate_personalization(products: List[dict], profile: ProfileData):
    results = []
    
    # Very simple deterministic engine
    positive_priorities = ["protein", "fibre"]
    
    for p in products:
        overall_score = 0.5 # Base
        factors = {}
        
        for prio in profile.priorities:
            # Map frontend prio string to backend product key
            key = prio
            if prio == "sugar": key = "total_sugar"
            
            val = p.get(key, 0)
            
            # Naive logic for phase 1.1:
            if prio in positive_priorities:
                contribution = min((val / 100.0) * 0.4, 0.4)
                direction = "positive"
            else:
                contribution = max(- (val / 100.0) * 0.4, -0.4)
                direction = "negative"
                
            factors[prio] = {
                "value": val,
                "weight": 1.0,
                "direction": direction,
                "contribution": round(contribution, 3)
            }
            overall_score += contribution
            
        overall_score = max(0.0, min(1.0, overall_score))
        
        # Generate explainable string based on highest priority
        explain_str = "Neutral match."
        if profile.priorities:
            top_prio = profile.priorities[0]
            if top_prio in positive_priorities:
                explain_str = f"{top_prio.capitalize()} contributed positively because it is one of your highest selected priorities. This product provides {p.get(top_prio, 0)}g."
            else:
                explain_str = f"{top_prio.capitalize()} contributed negatively to alignment based on your priorities. This product contains {p.get(top_prio if top_prio != 'sugar' else 'total_sugar', 0)}g."
        
        results.append({
            "product": p,
            "overallAlignment": round(overall_score, 2),
            "factors": factors,
            "explanation": explain_str
        })
        
    return results

@app.post("/api/compare")
def compare_products(request: CompareRequest):
    products = [p for p in DEMO_PRODUCTS if p["id"] in request.product_ids]
    if not products:
        raise HTTPException(status_code=400, detail="No valid products found")
    
    # Run deterministic personalization
    personalized_results = calculate_personalization(products, request.profile)
    
    return {"comparison": personalized_results}

@app.post("/api/recheck")
def recheck_product(request: RecheckRequest):
    # Placeholder
    return {"status": "unchanged", "message": "No new formulation detected"}

@app.post("/api/assistant")
def ask_assistant(request: AssistantRequest):
    # Placeholder
    return {"response": f"Based on your profile goal of {request.profile.goal}, this product matches your priorities."}

@app.get("/api/history")
def get_history():
    return {"history": [{"id": "1", "action": "analyzed", "date": "2026-09-29"}]}

@app.get("/api/dashboard")
def get_dashboard():
    return {
        "goal": "Muscle Gain",
        "priorities": ["Protein", "Added Sugar"],
        "recent_products": DEMO_PRODUCTS,
        "insights": ["You've consistently hit your protein goals with your recent product choices."]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
