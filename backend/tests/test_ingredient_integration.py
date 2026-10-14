"""
Integration tests for NutriForge AI Ingredient Intelligence: Milestone 2.
Tests backend product retrieval, creation, ingredient intelligence enrichment,
scanner correction priority, empty/malformed handling, and regression checks.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app, DEMO_PRODUCTS

client = TestClient(app)


# ==============================================================================
# 1. Enriched Product Response for Recognized Ingredients
# ==============================================================================

def test_get_product_enriched_with_ingredient_intelligence():
    """Verify GET /api/products/{id} includes enriched ingredient intelligence for known products."""
    resp = client.get("/api/products/1")
    assert resp.status_code == 200
    data = resp.json()

    # Legacy fields preserved
    assert data["id"] == "1"
    assert data["name"] == "High Protein Oats"
    assert "structured_ingredients" in data
    assert "raw_ingredient_text" in data
    assert "allergens" in data

    # Enriched intelligence present
    assert "ingredient_intelligence" in data
    intel = data["ingredient_intelligence"]
    assert intel is not None
    assert intel["total_ingredients"] >= 4
    assert intel["catalogued_count"] >= 3

    # Check specific catalogued ingredients in Product 1
    # Product 1 has: Rolled Oats (85%), Whey Protein Concentrate (10%), Chia Seeds, Cocoa Powder, Stevia Leaf Extract
    canonical_names = [
        item["canonical_name"]
        for item in intel["ingredients"]
        if item.get("canonical_name")
    ]
    assert "Rolled Oats" in canonical_names
    assert "Whey Protein Isolate" in canonical_names
    assert "Almonds" in canonical_names


def test_dedicated_product_ingredient_intelligence_endpoint():
    """Verify GET /api/products/{id}/ingredient-intelligence endpoint."""
    resp = client.get("/api/products/1/ingredient-intelligence")
    assert resp.status_code == 200
    intel = resp.json()

    assert "raw_statement" in intel
    assert "ingredients" in intel
    assert "total_ingredients" in intel
    assert "catalogued_count" in intel
    assert "uncatalogued_count" in intel
    assert "has_uncertainty" in intel

    # Invalid ID produces 404
    resp_404 = client.get("/api/products/nonexistent_product_xyz/ingredient-intelligence")
    assert resp_404.status_code == 404


def test_get_product_ingredients_backward_compatibility():
    """Verify GET /api/products/{id}/ingredients preserves legacy contract while exposing intelligence."""
    resp = client.get("/api/products/1/ingredients")
    assert resp.status_code == 200
    data = resp.json()

    # Legacy fields
    assert "ingredients" in data
    assert isinstance(data["ingredients"], list)
    assert "allergens" in data
    assert isinstance(data["allergens"], list)
    assert "structured_ingredients" in data
    assert isinstance(data["structured_ingredients"], list)

    # New additive field
    assert "ingredient_intelligence" in data
    assert data["ingredient_intelligence"] is not None


# ==============================================================================
# 2. Nested Compound Ingredients in Product
# ==============================================================================

def test_product_with_nested_compound_ingredients():
    """Verify Product 2 with Protein Blend (Whey Protein, Soy Crisps) handles compounds properly."""
    resp = client.get("/api/products/2")
    assert resp.status_code == 200
    data = resp.json()
    intel = data["ingredient_intelligence"]

    # First ingredient in Product 2 is a compound blend
    compound = intel["ingredients"][0]
    assert compound["is_compound"] is True
    assert len(compound["children"]) == 2
    assert compound["raw_text"] == "Protein Blend (Whey Protein, Soy Crisps)"
    assert compound["children"][0].get("raw_text") == "Whey Protein"
    assert compound["children"][1].get("raw_text") == "Soy Crisps"


# ==============================================================================
# 3. Product with Unknown Ingredients
# ==============================================================================

def test_product_creation_with_unknown_ingredients():
    """Verify unknown ingredients in saved products are explicitly marked uncatalogued."""
    payload = {
        "id": "test_unknown_prod_99",
        "barcode": "999888777666",
        "name": "Experimental Pre-Workout",
        "brand": "LabTest",
        "category": "Pre-Workout",
        "serving_size": "10g",
        "serving_size_value": 10.0,
        "serving_size_unit": "g",
        "calories": 15.0,
        "protein": 0.0,
        "carbohydrates": 2.0,
        "raw_ingredient_text": "Creatine Monohydrate, Mystery Herb Complex 5000, Citric Acid",
        "structured_ingredients": [],
        "allergens": []
    }

    create_resp = client.post("/api/products", json=payload)
    assert create_resp.status_code == 200
    assert create_resp.json()["status"] == "success"

    fetch_resp = client.get("/api/products/test_unknown_prod_99")
    assert fetch_resp.status_code == 200
    data = fetch_resp.json()
    intel = data["ingredient_intelligence"]

    assert intel["total_ingredients"] == 3
    assert intel["catalogued_count"] == 2
    assert intel["uncatalogued_count"] == 1

    unknown_item = [i for i in intel["ingredients"] if i["status"] == "UNCATALOGUED"][0]
    assert unknown_item["raw_text"] == "Mystery Herb Complex 5000"
    assert unknown_item["category"] == "Uncatalogued ingredient"
    assert unknown_item["confidence"] == "UNKNOWN"
    assert unknown_item["canonical_name"] is None
    assert unknown_item["function"] is None


# ==============================================================================
# 4. Empty and Missing Ingredient Statements
# ==============================================================================

def test_product_with_empty_ingredient_statement():
    """Verify empty raw_ingredient_text and structured_ingredients produce clean empty intelligence."""
    payload = {
        "id": "test_empty_ing_prod",
        "barcode": "111222333444",
        "name": "Pure Distilled Water",
        "brand": "AquaPure",
        "category": "Beverage",
        "serving_size": "250ml",
        "raw_ingredient_text": "",
        "structured_ingredients": [],
        "allergens": []
    }
    create_resp = client.post("/api/products", json=payload)
    assert create_resp.status_code == 200

    fetch_resp = client.get("/api/products/test_empty_ing_prod")
    assert fetch_resp.status_code == 200
    intel = fetch_resp.json()["ingredient_intelligence"]

    assert intel["total_ingredients"] == 0
    assert intel["ingredients"] == []
    assert intel["has_uncertainty"] is False


# ==============================================================================
# 5. Malformed Ingredient Statements
# ==============================================================================

def test_product_with_malformed_bracket_statement():
    """Verify unclosed parentheses preserve compound text and flag uncertainty."""
    payload = {
        "id": "test_malformed_bracket_prod",
        "name": "Malformed Shake",
        "brand": "TestBrand",
        "raw_ingredient_text": "Protein Blend (Whey Protein Isolate, Cocoa Powder",
        "structured_ingredients": [],
        "allergens": []
    }
    create_resp = client.post("/api/products", json=payload)
    assert create_resp.status_code == 200

    fetch_resp = client.get("/api/products/test_malformed_bracket_prod")
    assert fetch_resp.status_code == 200
    intel = fetch_resp.json()["ingredient_intelligence"]

    assert intel["has_uncertainty"] is True
    assert len(intel["ingredients"]) == 1
    assert intel["ingredients"][0]["has_uncertainty"] is True
    assert "Unclosed bracket" in intel["ingredients"][0]["uncertainty_reason"]
    assert intel["ingredients"][0]["raw_text"] == "Protein Blend (Whey Protein Isolate, Cocoa Powder"


# ==============================================================================
# 6. Fallback from Missing Raw Text to Structured Ingredients
# ==============================================================================

def test_missing_raw_text_derives_from_structured_ingredients():
    """Verify intelligence derives from structured ingredients when raw_ingredient_text is missing."""
    payload = {
        "id": "test_structured_fallback_prod",
        "name": "Structured Only Supplement",
        "brand": "NutriFit",
        "raw_ingredient_text": "",
        "structured_ingredients": [
            {"text": "Creatine Monohydrate"},
            {"text": "Maltodextrin"}
        ],
        "allergens": []
    }
    create_resp = client.post("/api/products", json=payload)
    assert create_resp.status_code == 200

    fetch_resp = client.get("/api/products/test_structured_fallback_prod")
    assert fetch_resp.status_code == 200
    intel = fetch_resp.json()["ingredient_intelligence"]

    assert intel["total_ingredients"] == 2
    assert intel["catalogued_count"] == 2
    canon_names = [i["canonical_name"] for i in intel["ingredients"]]
    assert "Creatine Monohydrate" in canon_names
    assert "Maltodextrin" in canon_names


# ==============================================================================
# 7. Scanner Correction Priority (Raw Text Priority Over Stale Structured)
# ==============================================================================

def test_raw_text_priority_over_stale_structured_ingredients():
    """
    Verify that when user edits raw ingredient text during scanner review,
    the ingredient intelligence is derived from the user-confirmed raw text,
    while leaving caller's structured_ingredients intact.
    """
    payload = {
        "id": "test_scanner_corrected_prod",
        "name": "Corrected Whey",
        "brand": "ProBrand",
        # User corrected the raw text in review screen
        "raw_ingredient_text": "Whey Protein Isolate, Cocoa Powder, Stevia Extract",
        # Stale structured ingredients before review
        "structured_ingredients": [
            {"text": "Old Stale Uncorrected Item", "is_allergen": False}
        ],
        "allergens": ["Milk"]
    }
    create_resp = client.post("/api/products", json=payload)
    assert create_resp.status_code == 200

    fetch_resp = client.get("/api/products/test_scanner_corrected_prod")
    assert fetch_resp.status_code == 200
    data = fetch_resp.json()

    # 1. Structured ingredients preserved as sent (no destructive overwrite)
    assert len(data["structured_ingredients"]) == 1
    assert data["structured_ingredients"][0]["text"] == "Old Stale Uncorrected Item"

    # 2. Ingredient intelligence derived from corrected raw text
    intel = data["ingredient_intelligence"]
    assert intel["total_ingredients"] == 3
    assert intel["catalogued_count"] == 3
    canon_names = [i["canonical_name"] for i in intel["ingredients"]]
    assert "Whey Protein Isolate" in canon_names
    assert "Cocoa Powder" in canon_names
    assert "Stevia Extract" in canon_names


# ==============================================================================
# 8. Standalone Real-Time Ingredient Analysis Endpoint
# ==============================================================================

def test_standalone_analyze_endpoint():
    """Verify POST /api/ingredients/analyze endpoint for ad-hoc label evaluation."""
    req_body = {
        "raw_ingredient_text": "Whey Protein Isolate, Xanthan Gum (E415), Soy Lecithin (INS 322)"
    }
    resp = client.post("/api/ingredients/analyze", json=req_body)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["status"] == "success"

    intel = res_data["data"]
    assert intel["total_ingredients"] >= 3
    assert intel["catalogued_count"] >= 3

    # Check additive codes matched correctly
    canonicals = [i["canonical_name"] for i in intel["ingredients"]]
    assert "Whey Protein Isolate" in canonicals
    assert "Xanthan Gum" in canonicals
    assert "Soy Lecithin" in canonicals


# ==============================================================================
# 9. Regression Checks: Allergen & Nutrition Engine Untouched
# ==============================================================================

def test_allergen_and_nutrition_engine_regression():
    """Verify allergen checking and nutrition scaling continue working without alteration."""
    # 1. Nutrition scale check
    scale_payload = {
        "product_id": "1",
        "consumed_serving_mass": 100.0
    }
    scale_resp = client.post("/api/nutrition/scale", json=scale_payload)
    assert scale_resp.status_code == 200
    scaled = scale_resp.json()["data"]["scaled_nutrients"]
    assert scaled["calories"] > 0
    assert scaled["protein"] > 0

    # 2. Allergen check
    allergen_payload = {
        "product_id": "1",
        "user_restrictions": "milk"
    }
    allergen_resp = client.post("/api/allergens/check", json=allergen_payload)
    assert allergen_resp.status_code == 200
    assert len(allergen_resp.json()["data"]["conflicts"]) > 0
