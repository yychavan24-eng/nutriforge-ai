"""
Complete Verification Script for NutriForge AI - 10 Core User Journey Scenarios.
Directly tests against live FastAPI backend and validates contract behavior.
"""
import urllib.request
import json
import pytest

BASE_URL = "http://127.0.0.1:8000"

def post(endpoint, data):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def get(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def test_scenario_1_create_profile():
    payload = {
        "age": "28",
        "height": "178",
        "weight": "75",
        "activityLevel": "very_active",
        "goal": "muscle_gain",
        "dietaryPreference": "no_preference",
        "restrictions": "Peanuts, Milk",
        "priorities": ["protein", "added_sugar"],
        "daily_targets": {
            "calories": 2400.0,
            "protein": 140.0,
            "added_sugar": 25.0
        }
    }
    status, res = post("/api/profile", payload)
    assert status == 200
    assert res["status"] == "success"
    assert res["data"]["goal"] == "muscle_gain"
    assert res["data"]["restrictions"] == "Peanuts, Milk"
    assert res["data"]["daily_targets"]["protein"] == 140.0
    print("[PASS] Scenario 1: Profile created with goal, restrictions, and 140g protein target.")

def test_scenario_2_profile_persistence():
    status, res = get("/api/profile")
    assert status == 200
    assert res["status"] == "success"
    data = res["data"]
    assert data["goal"] == "muscle_gain"
    assert data["restrictions"] == "Peanuts, Milk"
    assert data["daily_targets"]["protein"] == 140.0
    print("[PASS] Scenario 2: Profile persisted and retrieved successfully.")

def test_scenario_3_seeded_catalog_product():
    status, product = get("/api/products/1")
    assert status == 200
    assert product["name"] == "High Protein Oats"
    assert product["brand"] == "NutriFit"
    assert product["serving_size"] == "50g"
    assert product["serving_size_value"] == 50.0
    assert product["calories"] == 190.0
    assert product["protein"] == 10.0
    assert "Milk" in product["allergens"]
    print("[PASS] Scenario 3: Seeded catalog product retrieved with verified label metrics.")

def test_scenario_4_proportional_scaling_22_per_40_to_60():
    payload = {
        "consumed_serving_mass": 60.0,
        "label_serving_mass": 40.0,
        "nutrition_data": {
            "protein": 22.0,
            "calories": 240.0
        },
        "daily_targets": {
            "protein": 140.0
        }
    }
    status, res = post("/api/nutrition/scale", payload)
    assert status == 200
    scaled = res["data"]["scaled_nutrients"]
    # 22 * 60 / 40 = 33.0 exactly
    assert scaled["protein"] == 33.0
    assert res["data"]["multiplier"] == 1.5
    print(f"[PASS] Scenario 4: Scaled 22g protein / 40g serving to 60g serving -> {scaled['protein']}g (multiplier 1.5x).")

def test_scenario_5_target_contribution_display():
    payload = {
        "consumed_serving_mass": 60.0,
        "label_serving_mass": 40.0,
        "nutrition_data": {
            "protein": 22.0
        },
        "daily_targets": {
            "protein": 140.0
        }
    }
    status, res = post("/api/nutrition/scale", payload)
    assert status == 200
    contrib = res["data"]["target_contributions"]["protein"]
    # 33 / 140 * 100 = 23.6%
    assert contrib["consumed"] == 33.0
    assert contrib["target"] == 140.0
    assert contrib["percentage"] == 23.6
    assert contrib["status"] == "within"
    print(f"[PASS] Scenario 5: Calculated target contribution -> {contrib['percentage']}% of daily {contrib['target']}g.")

def test_scenario_6_declared_allergen_conflict():
    payload = {
        "product_id": "1",  # Has Milk and Whey Protein Isolate
        "user_restrictions": "Milk, Peanuts"
    }
    status, res = post("/api/allergens/check", payload)
    assert status == 200
    data = res["data"]
    assert data["has_conflicts"] is True
    assert data["status"] == "CONFLICT_DETECTED"
    assert data["conflict_count"] >= 1
    # Check that explanation mentions the exact item and confidence
    matched_sources = [c["source"] for c in data["conflicts"]]
    assert "Declared Product Allergens" in matched_sources or "Ingredient List" in matched_sources
    assert len(data["disclaimer"]) > 0
    print(f"[PASS] Scenario 6: Allergen conflict flagged -> {data['conflict_count']} conflict(s) with disclaimer.")

def test_scenario_7_missing_data_not_zero():
    # 1. Missing nutrient scaling
    payload = {
        "consumed_serving_mass": 50.0,
        "label_serving_mass": 50.0,
        "nutrition_data": {
            "protein": 15.0,
            "sodium": None  # Undeclared sodium
        }
    }
    status, res = post("/api/nutrition/scale", payload)
    assert status == 200
    scaled = res["data"]["scaled_nutrients"]
    assert scaled["sodium"] is None  # Must remain None, NOT 0.0
    assert "sodium" in res["data"]["missing_nutrients"]

    # 2. Missing ingredients allergen check
    payload_allergen = {
        "product_allergens": [],
        "raw_ingredient_text": "",
        "user_restrictions": "gluten"
    }
    status_alg, res_alg = post("/api/allergens/check", payload_allergen)
    assert status_alg == 200
    assert len(res_alg["data"]["data_completeness_warnings"]) > 0
    print("[PASS] Scenario 7: Missing nutrients preserved as None and missing ingredients conservative warning present.")

def test_scenario_8_smart_compare_two_products():
    payload = {
        "product_ids": ["1", "2"],
        "profile": {
            "age": "28", "height": "178", "weight": "75",
            "activityLevel": "very_active", "goal": "muscle_gain",
            "dietaryPreference": "no_preference", "restrictions": "Peanuts, Milk",
            "priorities": ["protein", "added_sugar"]
        }
    }
    status, res = post("/api/compare", payload)
    assert status == 200
    assert len(res["comparison"]) == 2
    assert len(res["field_comparison"]) > 0
    assert len(res["trade_offs"]) > 0
    
    # Verify allergen warnings on both products
    assert res["comparison"][0]["allergen_status"]["has_conflicts"] is True
    assert res["comparison"][1]["allergen_status"]["has_conflicts"] is True
    assert "[ALLERGEN WARNING]" in res["comparison"][0]["explanation"]
    assert "[ALLERGEN WARNING]" in res["comparison"][1]["explanation"]

    # Verify trade offs mentions protein difference
    assert any("protein" in to.lower() for to in res["trade_offs"])
    print("[PASS] Scenario 8: Multi-product Smart Compare with field matrix, trade-offs, and allergen alerts verified.")

def test_scenario_9_navigation_persistence_simulation():
    # Verify profile endpoint retains data regardless of other calls
    status, res = get("/api/profile")
    assert status == 200
    assert res["data"]["restrictions"] == "Peanuts, Milk"
    assert res["data"]["goal"] == "muscle_gain"
    print("[PASS] Scenario 9: Profile context preserved without degradation.")

def test_scenario_10_network_failure_and_invalid_id_handling():
    # 1. Invalid product lookup returns 404/error JSON
    status, res = get("/api/products/invalid_id_999")
    assert status == 200
    assert "error" in res
    assert res["error"] == "Product not found"

    # 2. Assistant handles missing profile gracefully
    status_ast, res_ast = post("/api/assistant", {"query": "How much protein for muscle gain?"})
    assert status_ast == 200
    assert len(res_ast["response"]) > 0
    assert len(res_ast["disclaimer"]) > 0
    print("[PASS] Scenario 10: Graceful handling of invalid IDs and fallback Assistant responses verified.")

if __name__ == "__main__":
    test_scenario_1_create_profile()
    test_scenario_2_profile_persistence()
    test_scenario_3_seeded_catalog_product()
    test_scenario_4_proportional_scaling_22_per_40_to_60()
    test_scenario_5_target_contribution_display()
    test_scenario_6_declared_allergen_conflict()
    test_scenario_7_missing_data_not_zero()
    test_scenario_8_smart_compare_two_products()
    test_scenario_9_navigation_persistence_simulation()
    test_scenario_10_network_failure_and_invalid_id_handling()
    print("\nALL 10 USER JOURNEY SCENARIOS VERIFIED SUCCESSFULLY.")
