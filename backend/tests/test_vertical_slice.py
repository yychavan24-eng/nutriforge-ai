"""
Comprehensive unit and integration tests for NutriForge AI vertical slice.
Verifies serving scaling, target contributions, deterministic allergen matching,
comparison trade-offs, and profile persistence.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.nutrition_engine import (
    scale_nutrient_proportional,
    scale_product_nutrition,
    calculate_target_contributions
)
from app.services.allergen_engine import (
    check_allergens_and_restrictions,
    MatchConfidence,
    DISCLAIMER_TEXT
)
from app.services.compare_engine import (
    generate_trade_offs,
    generate_field_by_field_comparison,
    compare_multiple_products
)
from app.schemas import ProfileData

client = TestClient(app)

# ==============================================================================
# 1. Deterministic Nutrition Engine Unit Tests
# ==============================================================================

def test_scale_nutrient_proportional_exact_example():
    """
    Prompt requirement:
    if a verified label states 22 g protein per 40 g serving,
    a 60 g serving corresponds to 33 g protein, assuming proportional scaling.
    """
    result = scale_nutrient_proportional(
        label_value=22.0,
        label_serving_mass=40.0,
        consumed_serving_mass=60.0
    )
    assert result == 33.0

def test_scale_nutrient_proportional_preserves_none():
    """Missing value must remain None and never silently become zero."""
    result = scale_nutrient_proportional(
        label_value=None,
        label_serving_mass=40.0,
        consumed_serving_mass=60.0
    )
    assert result is None

def test_scale_nutrient_proportional_invalid_mass():
    """Serving mass <= 0 or consumed mass < 0 must raise ValueError."""
    with pytest.raises(ValueError):
        scale_nutrient_proportional(22.0, 0.0, 60.0)
    with pytest.raises(ValueError):
        scale_nutrient_proportional(22.0, -10.0, 60.0)
    with pytest.raises(ValueError):
        scale_nutrient_proportional(22.0, 40.0, -5.0)

def test_scale_product_nutrition_full_dict():
    raw_data = {
        "calories": 200.0,
        "protein": 20.0,
        "carbohydrates": 25.0,
        "total_sugar": 5.0,
        "added_sugar": 2.0,
        "total_fat": 6.0,
        "saturated_fat": 1.5,
        "trans_fat": 0.0,
        "sodium": 100.0,
        "fibre": 4.0
    }
    # Double the serving (50g -> 100g)
    res = scale_product_nutrition(raw_data, label_serving_mass=50.0, consumed_serving_mass=100.0)
    assert res["multiplier"] == 2.0
    assert res["scaled_nutrients"]["protein"] == 40.0
    assert res["scaled_nutrients"]["calories"] == 400.0
    assert res["scaled_nutrients"]["sodium"] == 200.0
    assert res["units"]["protein"] == "g"
    assert res["units"]["calories"] == "kcal"
    assert len(res["missing_nutrients"]) == 0

def test_scale_product_nutrition_with_missing_fields():
    # Only protein and calories known
    raw_data = {
        "calories": 150.0,
        "protein": 15.0
    }
    res = scale_product_nutrition(raw_data, label_serving_mass=30.0, consumed_serving_mass=60.0)
    assert res["scaled_nutrients"]["protein"] == 30.0
    assert res["scaled_nutrients"]["calories"] == 300.0
    assert res["scaled_nutrients"]["sodium"] is None
    assert "sodium" in res["missing_nutrients"]
    assert "total_fat" in res["missing_nutrients"]

def test_calculate_target_contributions():
    scaled = {
        "calories": 500.0,
        "protein": 50.0,
        "sodium": None
    }
    targets = {
        "calories": 2000.0,
        "protein": 150.0,
        "sodium": 2300.0
    }
    contribs = calculate_target_contributions(scaled, targets)
    assert contribs["calories"]["percentage"] == 25.0
    assert contribs["protein"]["percentage"] == 33.3
    assert contribs["sodium"]["status"] == "missing_data"
    assert contribs["sodium"]["percentage"] is None

# ==============================================================================
# 2. Deterministic Allergen Engine Unit Tests
# ==============================================================================

def test_allergen_direct_label_match():
    res = check_allergens_and_restrictions(
        product_allergens=["Milk", "Peanuts"],
        raw_ingredient_text="Whey Protein, Cocoa, Sugar",
        structured_ingredients=None,
        user_restrictions="peanuts"
    )
    assert res["has_conflicts"] is True
    assert res["status"] == "CONFLICT_DETECTED"
    assert len(res["conflicts"]) >= 1
    match = res["conflicts"][0]
    assert match["confidence"] == MatchConfidence.CONFIRMED_LABEL_ALLERGEN.value
    assert "peanuts" in match["user_restriction"]

def test_allergen_derivative_ingredient_match():
    # User has dairy/milk allergy, ingredient is Whey Protein Isolate
    res = check_allergens_and_restrictions(
        product_allergens=[],
        raw_ingredient_text="Whey Protein Isolate, Cocoa, Almonds",
        structured_ingredients=[{"text": "Whey Protein Isolate", "is_allergen": True}],
        user_restrictions="milk"
    )
    assert res["has_conflicts"] is True
    whey_conflicts = [c for c in res["conflicts"] if "whey" in c["matched_item"].lower()]
    assert len(whey_conflicts) > 0
    assert whey_conflicts[0]["confidence"] == MatchConfidence.DERIVATIVE_MATCH.value
    assert "known form or derivative" in whey_conflicts[0]["explanation"]

def test_allergen_dietary_preference_vegan_conflict():
    res = check_allergens_and_restrictions(
        product_allergens=["Milk"],
        raw_ingredient_text="Whey, Sugar",
        structured_ingredients=None,
        user_restrictions="",
        dietary_preference="vegan"
    )
    assert res["has_conflicts"] is True
    assert any("vegan" in c["user_restriction"].lower() for c in res["conflicts"])

def test_allergen_no_conflicts_has_disclaimer():
    res = check_allergens_and_restrictions(
        product_allergens=["Peanuts"],
        raw_ingredient_text="Oats, Sugar, Salt",
        structured_ingredients=None,
        user_restrictions="fish, shellfish",
        dietary_preference="no_preference"
    )
    assert res["has_conflicts"] is False
    assert res["status"] == "NO_DECLARED_CONFLICTS_FOUND"
    assert DISCLAIMER_TEXT in res["disclaimer"]

def test_allergen_missing_ingredients_conservative_warning():
    res = check_allergens_and_restrictions(
        product_allergens=[],
        raw_ingredient_text="",
        structured_ingredients=[],
        user_restrictions="gluten"
    )
    assert res["has_conflicts"] is False
    assert len(res["data_completeness_warnings"]) > 0
    assert "Ingredient list was not provided" in res["data_completeness_warnings"][0]

# ==============================================================================
# 3. Smart Compare Service Unit Tests
# ==============================================================================

def test_compare_trade_offs_generation():
    products = [
        {"id": "1", "name": "Prod A", "protein": 25.0, "total_sugar": 12.0, "calories": 250.0},
        {"id": "2", "name": "Prod B", "protein": 10.0, "total_sugar": 2.0, "calories": 180.0}
    ]
    trade_offs = generate_trade_offs(products)
    assert len(trade_offs) >= 2
    assert any("protein" in t for t in trade_offs)
    assert any("sugar" in t for t in trade_offs)

def test_compare_field_by_field_preserves_missing():
    products = [
        {"id": "1", "name": "Prod A", "protein": 20.0, "fibre": None},
        {"id": "2", "name": "Prod B", "protein": 15.0, "fibre": 5.0}
    ]
    rows = generate_field_by_field_comparison(products)
    fibre_row = next(r for r in rows if r["key"] == "fibre")
    assert fibre_row["values"]["1"] is None
    assert fibre_row["values"]["2"] == 5.0

def test_compare_multiple_products_flags_allergen():
    profile = ProfileData(
        goal="muscle_gain",
        restrictions="peanuts",
        priorities=["protein"]
    )
    products = [
        {
            "id": "1",
            "name": "High Protein Bar",
            "protein": 25.0,
            "allergens": ["Peanuts"],
            "raw_ingredient_text": "Peanuts, Whey",
            "structured_ingredients": []
        }
    ]
    res = compare_multiple_products(products, profile)
    comp = res["comparison"][0]
    assert "[ALLERGEN WARNING]" in comp["explanation"]
    assert comp["allergen_status"]["has_conflicts"] is True

# ==============================================================================
# 4. API Endpoints Integration Tests
# ==============================================================================

def test_api_scale_nutrition_by_product_id():
    response = client.post("/api/nutrition/scale", json={
        "product_id": "1",  # High Protein Oats (50g serving, 10g protein)
        "consumed_serving_mass": 100.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    scaled = data["data"]["scaled_nutrients"]
    assert scaled["protein"] == 20.0
    assert scaled["calories"] == 380.0
    assert data["data"]["multiplier"] == 2.0

def test_api_scale_nutrition_custom_data():
    response = client.post("/api/nutrition/scale", json={
        "consumed_serving_mass": 75.0,
        "label_serving_mass": 50.0,
        "nutrition_data": {
            "calories": 200.0,
            "protein": 12.0
        },
        "daily_targets": {
            "protein": 100.0
        }
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["scaled_nutrients"]["protein"] == 18.0
    assert data["target_contributions"]["protein"]["percentage"] == 18.0

def test_api_check_allergens_endpoint():
    response = client.post("/api/allergens/check", json={
        "product_id": "1",  # Has Milk, Tree Nuts
        "user_restrictions": "tree nuts"
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["has_conflicts"] is True
    assert data["conflict_count"] >= 1

def test_api_profile_persistence():
    payload = {
        "age": "28",
        "height": "180",
        "weight": "78",
        "activityLevel": "very_active",
        "goal": "muscle_gain",
        "dietaryPreference": "no_preference",
        "restrictions": "shellfish, peanuts",
        "priorities": ["protein", "fibre"],
        "daily_targets": {
            "calories": 2600.0,
            "protein": 160.0
        }
    }
    # 1. Save profile
    post_res = client.post("/api/profile", json=payload)
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "success"

    # 2. Get profile
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    data = get_res.json()["data"]
    assert data["age"] == "28"
    assert data["goal"] == "muscle_gain"
    assert data["restrictions"] == "shellfish, peanuts"
    assert data["daily_targets"]["protein"] == 160.0

def test_api_assistant_grounded_response():
    # Without profile
    res1 = client.post("/api/assistant", json={"query": "Tell me about protein"})
    assert res1.status_code == 200
    assert "protein" in res1.json()["response"].lower()

    # With profile
    profile = {
        "age": "25",
        "height": "175",
        "weight": "70",
        "activityLevel": "moderate",
        "goal": "fat_loss",
        "dietaryPreference": "no_preference",
        "restrictions": "milk",
        "priorities": ["added_sugar"]
    }
    res2 = client.post("/api/assistant", json={"query": "Is sugar safe?", "profile": profile})
    assert res2.status_code == 200
    assert "sugar" in res2.json()["response"].lower()
    assert DISCLAIMER_TEXT in res2.json()["disclaimer"]

def test_db_persistence_across_simulated_restart():
    """Confirms profile and products persist in DB even when in-memory globals are reset."""
    from app.main import load_db_state
    
    profile_payload = {
        "age": "32",
        "height": "178",
        "weight": "80",
        "activityLevel": "moderate",
        "goal": "maintenance",
        "dietaryPreference": "vegetarian",
        "restrictions": "shellfish",
        "priorities": ["fibre", "protein"],
        "daily_targets": {"protein": 130.0}
    }
    client.post("/api/profile", json=profile_payload)
    
    # Simulate application restart by reloading DB state
    load_db_state()
    
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["goal"] == "maintenance"
    assert get_res.json()["data"]["dietaryPreference"] == "vegetarian"
    assert get_res.json()["data"]["daily_targets"]["protein"] == 130.0

def test_serving_comparability_in_trade_offs():
    """Confirms trade-offs highlight serving size discrepancies when portions differ."""
    products = [
        {"id": "1", "name": "Prod A (Oats)", "serving_size": "50g", "serving_size_value": 50.0, "protein": 10.0},
        {"id": "2", "name": "Prod B (Bar)", "serving_size": "60g", "serving_size_value": 60.0, "protein": 20.0}
    ]
    trade_offs = generate_trade_offs(products)
    assert any("Serving size note" in t for t in trade_offs)
    assert any("Standardized per 100g" in t for t in trade_offs)
