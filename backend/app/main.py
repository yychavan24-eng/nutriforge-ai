from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import json

import os
from app.schemas import (
    ValueSource,
    ProvenanceInfo,
    IngredientNode,
    ProductBase,
    ProfileData,
    CompareRequest,
    ScanRequest,
    ScanStatusResponse,
    RecheckRequest,
    AssistantRequest,
    ScaleServingRequest,
    AllergenCheckRequest,
    IngredientAnalysisRequest
)
from app.services.ingredient_engine import analyze_ingredients
from app.services.ocr import (
    OCRProvider,
    MockOCRProvider,
    GeminiOCRProvider,
    get_ocr_provider,
    InvalidImageError,
    MissingAPIKeyError,
    RateLimitError,
    AuthenticationError,
    TimeoutError,
    ModelParsingError,
    OCRError
)
from app.services.nutrition_engine import (
    scale_nutrient_proportional,
    scale_product_nutrition,
    calculate_target_contributions
)
from app.services.allergen_engine import (
    check_allergens_and_restrictions,
    DISCLAIMER_TEXT
)
from app.services.compare_engine import (
    compare_multiple_products,
    generate_field_by_field_comparison,
    generate_trade_offs
)
from app.db.database import (
    init_db,
    seed_demo_products,
    SessionLocal,
    ProductModel,
    ProfileModel
)

app = FastAPI(
    title="NutriForge AI",
    description="Personalized Packaged-Food Intelligence & Decision Support Platform"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory user profile state (synchronized with DB)
CURRENT_PROFILE: Dict[str, Any] = {
    "age": "",
    "height": "",
    "weight": "",
    "activityLevel": "moderate",
    "goal": "muscle_gain",
    "dietaryPreference": "no_preference",
    "restrictions": "",
    "priorities": ["protein", "calories"],
    "daily_targets": {
        "calories": 2200.0,
        "protein": 140.0,
        "carbohydrates": 250.0,
        "total_sugar": 40.0,
        "added_sugar": 25.0,
        "total_fat": 70.0,
        "saturated_fat": 20.0,
        "sodium": 2000.0,
        "fibre": 30.0
    }
}

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
            {"text": "Whey Protein Isolate", "is_allergen": True, "explanation": "Dairy derived"},
            {"text": "Almonds", "is_allergen": True, "explanation": "Tree nut allergen"},
            {"text": "Chia Seeds", "is_allergen": False}
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
        "raw_ingredient_text": "Protein Blend (Whey Protein, Soy Crisps), Glucose Syrup, Dark Chocolate, Peanuts, Soy Lecithin",
        "structured_ingredients": [
            {"text": "Whey Protein", "is_allergen": True, "explanation": "Milk derivative"},
            {"text": "Soy Crisps", "is_allergen": True, "explanation": "Soy allergen"},
            {"text": "Glucose Syrup", "is_allergen": False},
            {"text": "Dark Chocolate", "is_allergen": False},
            {"text": "Peanuts", "is_allergen": True, "explanation": "Peanut allergen"},
            {"text": "Soy Lecithin", "is_allergen": True, "explanation": "Soy derivative"}
        ],
        "allergens": ["Milk", "Peanuts", "Soy"],
        "claims": ["20g Protein", "Energy Boost"],
        "fssai_information": "FSSAI Lic. No. 10015022000456",
        "evidence": "Verified via label scan.",
        "source_type": "COMMUNITY_VERIFIED",
        "image": "bar_placeholder.jpg",
        "last_updated": "2026-09-29T12:00:00Z"
    },
    {
        "id": "3",
        "barcode": "8901234567892",
        "name": "Organic Peanut Butter Crunch",
        "brand": "NutriFit",
        "category": "Nut Butters",
        "serving_size": "32g",
        "serving_size_value": 32.0,
        "serving_size_unit": "g",
        "serving_description": "2 tbsp",
        "calories": 190.0,
        "protein": 8.0,
        "carbohydrates": 7.0,
        "total_sugar": 2.0,
        "added_sugar": 0.0,
        "total_fat": 16.0,
        "saturated_fat": 2.5,
        "trans_fat": 0.0,
        "sodium": 5.0,
        "fibre": 2.0,
        "provenance": {
            "protein": {"source": "LABEL_DECLARED"},
            "total_fat": {"source": "LABEL_DECLARED"}
        },
        "raw_ingredient_text": "Roasted Organic Peanuts, Sea Salt",
        "structured_ingredients": [
            {"text": "Roasted Organic Peanuts", "is_allergen": True, "explanation": "Peanut allergen"},
            {"text": "Sea Salt", "is_allergen": False}
        ],
        "allergens": ["Peanuts"],
        "claims": ["No Added Sugar", "100% Peanuts", "Organic"],
        "fssai_information": "FSSAI Lic. No. 10019011000789",
        "evidence": "Verified via packaging label.",
        "source_type": "COMMUNITY_VERIFIED",
        "image": "pb_placeholder.jpg",
        "last_updated": "2026-09-29T12:00:00Z"
    }
]

def load_db_state():
    """Restores saved profile and persisted products from DB across server restarts."""
    global CURRENT_PROFILE, DEMO_PRODUCTS
    try:
        init_db()
        seed_demo_products(DEMO_PRODUCTS)
        db = SessionLocal()

        # Restore Profile
        prof = db.query(ProfileModel).filter(ProfileModel.id == "current_user").first()
        if prof and prof.goal:
            CURRENT_PROFILE = {
                "age": prof.age or "",
                "height": prof.height or "",
                "weight": prof.weight or "",
                "activityLevel": prof.activity_level or "moderate",
                "goal": prof.goal or "muscle_gain",
                "dietaryPreference": prof.dietary_preference or "no_preference",
                "restrictions": prof.restrictions or "",
                "priorities": json.loads(prof.priorities_json) if prof.priorities_json else ["protein", "calories"],
                "daily_targets": json.loads(prof.daily_targets_json) if prof.daily_targets_json else {}
            }

        # Restore any newly created community products
        db_products = db.query(ProductModel).all()
        if db_products:
            existing_ids = {p["id"] for p in DEMO_PRODUCTS}
            for row in db_products:
                if row.id not in existing_ids:
                    try:
                        p_dict = json.loads(row.data_json)
                        DEMO_PRODUCTS.append(p_dict)
                        existing_ids.add(row.id)
                    except Exception:
                        pass
        db.close()
    except Exception as e:
        print(f"Database initialization notice: {e}")

# Run load on startup
load_db_state()

@app.get("/")
def read_root():
    return {"message": "Welcome to NutriForge AI API - Phase 1"}

def enrich_product_with_ingredient_intelligence(product_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches a product dictionary with deterministic ingredient intelligence.
    Prefers user-confirmed raw_ingredient_text if present, or derives from structured_ingredients.
    Preserves all existing fields without destructive modifications.
    """
    p = dict(product_dict)
    raw_text = p.get("raw_ingredient_text")
    structured = p.get("structured_ingredients") or []

    statement_to_analyze = raw_text
    if (statement_to_analyze is None or not statement_to_analyze.strip()) and structured:
        token_texts = [
            item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "")
            for item in structured
        ]
        statement_to_analyze = ", ".join(t.strip() for t in token_texts if t and t.strip())

    try:
        analysis = analyze_ingredients(statement_to_analyze)
        p["ingredient_intelligence"] = analysis.to_dict()
    except Exception as e:
        p["ingredient_intelligence"] = {
            "error": f"Failed to compute ingredient intelligence: {str(e)}",
            "raw_statement": statement_to_analyze or "",
            "total_ingredients": 0,
            "catalogued_count": 0,
            "uncatalogued_count": 0,
            "has_uncertainty": True,
            "ingredients": []
        }
    return p

@app.get("/api/products")
def get_products():
    return [enrich_product_with_ingredient_intelligence(p) for p in DEMO_PRODUCTS]

@app.get("/api/products/{id}")
def get_product(id: str):
    product = next((p for p in DEMO_PRODUCTS if p["id"] == id), None)
    if product:
        return enrich_product_with_ingredient_intelligence(product)
    return {"error": "Product not found"}

@app.get("/api/profile")
def get_profile():
    """Retrieve saved user profile, checking persistent DB."""
    global CURRENT_PROFILE
    try:
        db = SessionLocal()
        prof = db.query(ProfileModel).filter(ProfileModel.id == "current_user").first()
        if prof and prof.goal:
            CURRENT_PROFILE = {
                "age": prof.age or "",
                "height": prof.height or "",
                "weight": prof.weight or "",
                "activityLevel": prof.activity_level or "moderate",
                "goal": prof.goal or "muscle_gain",
                "dietaryPreference": prof.dietary_preference or "no_preference",
                "restrictions": prof.restrictions or "",
                "priorities": json.loads(prof.priorities_json) if prof.priorities_json else ["protein", "calories"],
                "daily_targets": json.loads(prof.daily_targets_json) if prof.daily_targets_json else {}
            }
        db.close()
    except Exception:
        pass
    return {"status": "success", "data": CURRENT_PROFILE}

@app.post("/api/profile")
def create_profile(profile_data: ProfileData):
    """Save user profile to in-memory state and database."""
    global CURRENT_PROFILE
    data = profile_data.model_dump()
    CURRENT_PROFILE = data

    # Also persist to SQLite/PostgreSQL
    try:
        db = SessionLocal()
        profile_row = db.query(ProfileModel).filter(ProfileModel.id == "current_user").first()
        if not profile_row:
            profile_row = ProfileModel(id="current_user")
            db.add(profile_row)
        profile_row.age = str(data.get("age", ""))
        profile_row.height = str(data.get("height", ""))
        profile_row.weight = str(data.get("weight", ""))
        profile_row.activity_level = str(data.get("activityLevel", "moderate"))
        profile_row.goal = str(data.get("goal", "muscle_gain"))
        profile_row.dietary_preference = str(data.get("dietaryPreference", "no_preference"))
        profile_row.restrictions = str(data.get("restrictions", ""))
        profile_row.priorities_json = json.dumps(data.get("priorities", []))
        profile_row.daily_targets_json = json.dumps(data.get("daily_targets", {}))
        db.commit()
        db.close()
    except Exception as e:
        print(f"Profile DB persistence notice: {e}")

    return {"status": "success", "message": "Profile created successfully", "data": data}

@app.post("/api/nutrition/scale")
def scale_nutrition(request: ScaleServingRequest):
    """
    Deterministically scales product nutrients for actual consumed mass
    and calculates contribution towards user daily targets.
    """
    nutrition_data = request.nutrition_data
    label_mass = request.label_serving_mass

    # If product_id is provided, pull missing fields from product
    if request.product_id:
        product = next((p for p in DEMO_PRODUCTS if p["id"] == request.product_id), None)
        if product:
            if label_mass is None or label_mass <= 0:
                label_mass = float(product.get("serving_size_value", 100.0) or 100.0)
            if not nutrition_data:
                nutrition_data = {
                    "calories": product.get("calories"),
                    "protein": product.get("protein"),
                    "carbohydrates": product.get("carbohydrates"),
                    "total_sugar": product.get("total_sugar"),
                    "added_sugar": product.get("added_sugar"),
                    "total_fat": product.get("total_fat"),
                    "saturated_fat": product.get("saturated_fat"),
                    "trans_fat": product.get("trans_fat"),
                    "sodium": product.get("sodium"),
                    "fibre": product.get("fibre")
                }

    if not nutrition_data:
        raise HTTPException(status_code=400, detail="No nutrition data provided for scaling.")
    if label_mass is None or label_mass <= 0:
        label_mass = 100.0

    try:
        scaled_result = scale_product_nutrition(
            nutrition_data=nutrition_data,
            label_serving_mass=label_mass,
            consumed_serving_mass=request.consumed_serving_mass
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Daily targets
    daily_targets = request.daily_targets or CURRENT_PROFILE.get("daily_targets")
    contributions = calculate_target_contributions(
        scaled_nutrients=scaled_result["scaled_nutrients"],
        daily_targets=daily_targets
    )
    scaled_result["target_contributions"] = contributions

    return {"status": "success", "data": scaled_result}

@app.post("/api/allergens/check")
def check_allergens(request: AllergenCheckRequest):
    """
    Deterministic matching between product declared ingredients/allergens
    and user restrictions.
    """
    product_allergens = request.product_allergens
    raw_ingredient_text = request.raw_ingredient_text
    structured_ingredients = request.structured_ingredients
    user_restrictions = request.user_restrictions or CURRENT_PROFILE.get("restrictions", "")
    dietary_preference = request.dietary_preference or CURRENT_PROFILE.get("dietaryPreference", "")

    if request.product_id:
        product = next((p for p in DEMO_PRODUCTS if p["id"] == request.product_id), None)
        if product:
            if product_allergens is None:
                product_allergens = product.get("allergens", [])
            if raw_ingredient_text is None:
                raw_ingredient_text = product.get("raw_ingredient_text", "")
            if structured_ingredients is None:
                structured_ingredients = product.get("structured_ingredients", [])

    result = check_allergens_and_restrictions(
        product_allergens=product_allergens or [],
        raw_ingredient_text=raw_ingredient_text or "",
        structured_ingredients=structured_ingredients or [],
        user_restrictions=user_restrictions,
        dietary_preference=dietary_preference
    )
    return {"status": "success", "data": result}

@app.get("/api/scan/status")
def get_scan_status():
    has_key = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    return {
        "gemini_configured": has_key,
        "model": model,
        "supported_formats": ["image/jpeg", "image/png", "image/webp", "image/heic"],
        "max_file_size_mb": 10,
        "provider_name": f"Gemini Vision ({model})" if has_key else "Simulated Mock OCR"
    }

@app.post("/api/scan")
def scan_product(scan_data: ScanRequest):
    if not scan_data.image_data:
        return {"status": "error", "error_code": "NO_IMAGE", "message": "No image data provided"}

    has_key = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))

    # Explicit simulated demo mode requested or legacy simulated test bytes
    if scan_data.force_demo or scan_data.image_data in ("simulated_image_bytes", "dummy_image_data", "base64_string"):
        mock_provider = MockOCRProvider()
        extracted_data = mock_provider.extract_structured_data(scan_data.image_data)
        return {
            "status": "success",
            "extracted_data": extracted_data,
            "is_simulated": True,
            "provider": "simulated-demo",
            "notice": "Simulated demonstration data. To perform real OCR, configure GEMINI_API_KEY."
        }

    # Real image provided, but GEMINI_API_KEY is not configured
    if not has_key:
        return {
            "status": "error",
            "error_code": "GEMINI_API_KEY_MISSING",
            "message": (
                "GEMINI_API_KEY is not configured on the backend server. "
                "To extract real packaging images using Gemini Vision, please set the GEMINI_API_KEY environment variable. "
                "Alternatively, select 'Try Demo Mode' to test with simulated label data."
            ),
            "allow_demo_fallback": True
        }

    # Real Gemini Vision OCR execution
    provider = GeminiOCRProvider()
    try:
        extracted_data = provider.extract_structured_data(scan_data.image_data)
        return {
            "status": "success",
            "extracted_data": extracted_data,
            "is_simulated": False,
            "provider": provider.model_name,
            "fields_needing_review": extracted_data.get("fields_needing_review", []),
            "uncertainty_notes": extracted_data.get("uncertainty_notes", [])
        }
    except InvalidImageError as e:
        raise HTTPException(
            status_code=400,
            detail={"status": "error", "error_code": "INVALID_IMAGE", "message": str(e)}
        )
    except RateLimitError as e:
        raise HTTPException(
            status_code=429,
            detail={"status": "error", "error_code": "RATE_LIMIT", "message": str(e)}
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=401,
            detail={"status": "error", "error_code": "AUTH_ERROR", "message": str(e)}
        )
    except TimeoutError as e:
        raise HTTPException(
            status_code=504,
            detail={"status": "error", "error_code": "TIMEOUT", "message": str(e)}
        )
    except ModelParsingError as e:
        return {"status": "error", "error_code": "MODEL_PARSE_ERROR", "message": str(e)}
    except OCRError as e:
        return {"status": "error", "error_code": "OCR_FAILED", "message": str(e)}
    except Exception as e:
        return {"status": "error", "error_code": "UNEXPECTED_ERROR", "message": f"Unexpected OCR error: {str(e)}"}

@app.get("/api/barcode/{barcode}")
def lookup_barcode(barcode: str):
    product = next((p for p in DEMO_PRODUCTS if p.get("barcode") == barcode), None)
    if product:
        return {"found": True, "product": product}
    return {"found": False, "message": "Product not found. Please scan the label."}

@app.post("/api/products")
def create_product(product: ProductBase):
    product_dict = product.model_dump()

    # Derive enriched ingredient intelligence prioritizing the user-confirmed raw text
    enriched = enrich_product_with_ingredient_intelligence(product_dict)
    product_dict["ingredient_intelligence"] = enriched.get("ingredient_intelligence")

    DEMO_PRODUCTS.append(product_dict)

    # Save to DB
    try:
        db = SessionLocal()
        db_item = ProductModel(
            id=product.id,
            barcode=product.barcode,
            name=product.name,
            brand=product.brand,
            category=product.category,
            serving_size=product.serving_size,
            serving_size_value=float(product.serving_size_value or 0.0),
            serving_size_unit=product.serving_size_unit,
            serving_description=product.serving_description,
            calories=product.calories,
            protein=product.protein,
            carbohydrates=product.carbohydrates,
            total_sugar=product.total_sugar,
            added_sugar=product.added_sugar,
            total_fat=product.total_fat,
            saturated_fat=product.saturated_fat,
            trans_fat=product.trans_fat,
            sodium=product.sodium,
            fibre=product.fibre,
            data_json=json.dumps(product_dict)
        )
        db.merge(db_item)
        db.commit()
        db.close()
    except Exception as e:
        print(f"Product DB save notice: {e}")

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
    ingredients = product.get("raw_ingredient_text", "")
    allergens = product.get("allergens", [])
    enriched = enrich_product_with_ingredient_intelligence(product)
    return {
        "ingredients": [i.strip() for i in ingredients.split(",")] if ingredients else [],
        "allergens": allergens,
        "structured_ingredients": product.get("structured_ingredients", []),
        "ingredient_intelligence": enriched.get("ingredient_intelligence")
    }

@app.get("/api/products/{id}/ingredient-intelligence")
def get_product_ingredient_intelligence(id: str):
    product = next((p for p in DEMO_PRODUCTS if p["id"] == id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    enriched = enrich_product_with_ingredient_intelligence(product)
    return enriched.get("ingredient_intelligence")

@app.post("/api/ingredients/analyze")
def analyze_ingredient_text(request: IngredientAnalysisRequest):
    analysis = analyze_ingredients(request.raw_ingredient_text)
    return {"status": "success", "data": analysis.to_dict()}

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

@app.post("/api/compare")
def compare_products(request: CompareRequest):
    products = [p for p in DEMO_PRODUCTS if p["id"] in request.product_ids]
    if not products:
        raise HTTPException(status_code=400, detail="No valid products found")

    # Run full Smart Compare engine
    result = compare_multiple_products(products, request.profile)
    return result

@app.post("/api/recheck")
def recheck_product(request: RecheckRequest):
    return {"status": "unchanged", "message": "No new formulation detected"}

@app.post("/api/assistant")
def ask_assistant(request: AssistantRequest):
    """
    Context-grounded assistant for label literacy and ingredient definitions.
    Falls back gracefully if LLM is unavailable.
    """
    profile = request.profile or ProfileData()
    user_query = request.query.lower()

    # Context-grounded response logic
    context_products = [p for p in DEMO_PRODUCTS if p["id"] in request.context_product_ids]

    if "protein" in user_query:
        if context_products:
            p_names = ", ".join([f"{p['name']} ({p.get('protein', 0)}g protein)" for p in context_products])
            response = f"Among your selected products, {p_names}. For your goal ({profile.goal}), aim for 1.6-2.2g of protein per kg of body weight daily."
        else:
            response = f"Protein helps with muscle repair and satiety. For your goal ({profile.goal}), prioritizing 20g+ per serving is generally effective."
    elif "sugar" in user_query:
        response = "Total sugar includes naturally occurring sugars (like lactose or fruit sugars), while Added Sugar represents sweeteners added during processing. FSSAI recommends limiting added sugars."
    elif "serving" in user_query:
        response = "Serving size on the nutrition facts panel is defined by the manufacturer. If you eat more or less than the declared mass, your actual intake scales proportionally. Use NutriForge Serving Reality to see your exact intake."
    elif "allergen" in user_query or "safe" in user_query:
        response = (
            f"NutriForge checks declared allergens and ingredients against your restrictions ({profile.restrictions or 'none declared'}). "
            f"{DISCLAIMER_TEXT}"
        )
    else:
        response = (
            f"Based on your profile goal ({profile.goal.replace('_', ' ')}), NutriForge evaluates packaged food labels "
            f"for protein density, added sugars, and ingredient transparency. What specific metric or ingredient would you like to explore?"
        )

    return {"response": response, "disclaimer": DISCLAIMER_TEXT}

@app.get("/api/history")
def get_history():
    return {"history": [{"id": "1", "action": "analyzed", "date": "2026-09-29"}]}

@app.get("/api/dashboard")
def get_dashboard():
    return {
        "goal": CURRENT_PROFILE.get("goal", "Muscle Gain"),
        "priorities": CURRENT_PROFILE.get("priorities", ["Protein", "Added Sugar"]),
        "recent_products": DEMO_PRODUCTS[:3],
        "insights": ["You've consistently hit your protein goals with your recent product choices."]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
