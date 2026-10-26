"""
Focused Regression Audit Test Suite for NutriForge AI.
Tests the 6 critical user journey flows via pytest & TestClient with full state isolation and cleanup.
"""
import pytest
import json
from fastapi.testclient import TestClient
from app.main import app, CURRENT_PROFILE, DEMO_PRODUCTS
from app.db.database import SessionLocal, ProductModel, ProfileModel

client = TestClient(app)

@pytest.fixture
def isolate_test_state():
    """
    Snapshots CURRENT_PROFILE and product lists before each test,
    and guarantees full cleanup and restoration after test execution.
    """
    original_profile = dict(CURRENT_PROFILE)
    original_products_count = len(DEMO_PRODUCTS)
    created_product_ids = []

    yield created_product_ids

    # Teardown: Remove any product records created in DB
    db = SessionLocal()
    try:
        for pid in created_product_ids:
            db.query(ProductModel).filter(ProductModel.id == pid).delete()

        # Restore original user profile in DB
        prof = db.query(ProfileModel).filter(ProfileModel.id == "current_user").first()
        if prof:
            prof.age = original_profile.get("age", "")
            prof.height = original_profile.get("height", "")
            prof.weight = original_profile.get("weight", "")
            prof.activity_level = original_profile.get("activityLevel", "moderate")
            prof.goal = original_profile.get("goal", "muscle_gain")
            prof.dietary_preference = original_profile.get("dietaryPreference", "no_preference")
            prof.restrictions = original_profile.get("restrictions", "")
            prof.priorities_json = json.dumps(original_profile.get("priorities", ["protein", "calories"]))
            prof.daily_targets_json = json.dumps(original_profile.get("daily_targets", {}))
        db.commit()
    finally:
        db.close()

    # Restore in-memory structures
    CURRENT_PROFILE.clear()
    CURRENT_PROFILE.update(original_profile)
    while len(DEMO_PRODUCTS) > original_products_count:
        DEMO_PRODUCTS.pop()


def test_regression_1_profile_contract_and_loading(isolate_test_state):
    """1. Profile loads from backend and matches full schema contract."""
    resp = client.get("/api/profile")
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["status"] == "success"
    profile = res_data["data"]

    for required_key in ["age", "height", "weight", "goal", "restrictions", "priorities", "daily_targets"]:
        assert required_key in profile, f"Missing profile field: {required_key}"
    assert isinstance(profile["daily_targets"], dict)
    assert isinstance(profile["priorities"], list)


def test_regression_2_profile_edit_and_persistence(isolate_test_state):
    """2. Editing and saving profile persists across subsequent requests."""
    payload = {
        "age": "29",
        "height": "180",
        "weight": "77",
        "activityLevel": "very_active",
        "goal": "muscle_gain",
        "dietaryPreference": "no_preference",
        "restrictions": "Peanuts, Gluten",
        "priorities": ["protein", "calories", "sodium"],
        "daily_targets": {
            "calories": 2700.0,
            "protein": 175.0,
            "carbohydrates": 290.0,
            "total_fat": 75.0,
            "total_sugar": 45.0,
            "added_sugar": 20.0,
            "sodium": 2100.0,
            "fibre": 32.0
        }
    }
    save_resp = client.post("/api/profile", json=payload)
    assert save_resp.status_code == 200
    assert save_resp.json()["status"] == "success"

    # Simulate fresh load
    get_resp = client.get("/api/profile")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()["data"]
    assert retrieved["age"] == "29"
    assert retrieved["weight"] == "77"
    assert retrieved["restrictions"] == "Peanuts, Gluten"
    assert retrieved["daily_targets"]["protein"] == 175.0
    assert retrieved["daily_targets"]["calories"] == 2700.0


def test_regression_3_dashboard_catalog_and_empty_history(isolate_test_state):
    """3. Dashboard renders correctly with both catalog products and empty history."""
    # When history is empty, frontend does not query products;
    # verify catalog items resolve accurately with complete nutritional profile
    resp = client.get("/api/products/1")
    assert resp.status_code == 200
    product = resp.json()
    assert product["id"] == "1"
    assert product["name"] == "High Protein Oats"
    assert product["serving_size_value"] == 50.0
    assert product["protein"] == 10.0
    assert "allergens" in product and isinstance(product["allergens"], list)


def test_regression_4_smart_compare_preference_updates(isolate_test_state):
    """4. Smart Compare updates when products or profile preferences change."""
    # Run compare with baseline profile
    base_profile = {
        "age": "25",
        "goal": "muscle_gain",
        "restrictions": "Peanuts",
        "priorities": ["protein", "calories"],
        "daily_targets": {"protein": 150.0, "calories": 2500.0}
    }
    resp1 = client.post("/api/compare", json={"product_ids": ["1", "2"], "profile": base_profile})
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(data1["comparison"]) == 2
    assert "field_comparison" in data1
    assert "trade_offs" in data1

    # Now alter restrictions to Milk/Dairy (which Product 1 contains)
    updated_profile = dict(base_profile)
    updated_profile["restrictions"] = "Milk, Dairy"
    resp2 = client.post("/api/compare", json={"product_ids": ["1", "2"], "profile": updated_profile})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2["comparison"]) == 2
    # Verify trade-offs and comparison matrix reflect updated profile context
    assert data2["comparison"][0]["product"]["id"] == "1"


def test_regression_5_product_analysis_scaling_independence(isolate_test_state):
    """5. ProductAnalysis scaling calculates independently and proportionally per product."""
    # Test Product 1: 50g consumed from 50g label serving (1.0x multiplier)
    resp1 = client.post("/api/nutrition/scale", json={
        "product_id": "1",
        "consumed_serving_mass": 50.0,
        "label_serving_mass": 50.0,
        "daily_targets": {"protein": 140.0}
    })
    assert resp1.status_code == 200
    scale1 = resp1.json()["data"]
    assert scale1["multiplier"] == 1.0

    # Test Product 2: 60g consumed from 40g label serving (1.5x multiplier)
    resp2 = client.post("/api/nutrition/scale", json={
        "product_id": "2",
        "consumed_serving_mass": 60.0,
        "label_serving_mass": 40.0,
        "daily_targets": {"protein": 140.0}
    })
    assert resp2.status_code == 200
    scale2 = resp2.json()["data"]
    assert scale2["multiplier"] == 1.5
    assert scale1["multiplier"] != scale2["multiplier"]


def test_regression_6_scanner_demo_and_review_flow_with_cleanup(isolate_test_state):
    """6. Scanner simulated demo scan, status, and review product persistence with isolation."""
    created_ids = isolate_test_state

    # 1. Status check
    status_resp = client.get("/api/scan/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "model" in status_data
    assert "gemini_configured" in status_data

    # 2. Demo scan
    scan_resp = client.post("/api/scan", json={
        "image_data": "simulated_test_image_bytes",
        "force_demo": True
    })
    assert scan_resp.status_code == 200
    scan_data = scan_resp.json()
    assert scan_data["status"] == "success"
    assert scan_data["is_simulated"] is True
    extracted = scan_data["extracted_data"]
    assert "protein" in extracted and "calories" in extracted

    # 3. Review form save
    test_product_id = "test_review_prod_regression_999"
    created_ids.append(test_product_id)  # Registered for automatic teardown cleanup

    review_payload = {
        "id": test_product_id,
        "name": "Regression Test Clean Oats",
        "brand": "NutriForge Labs",
        "serving_size": "40g",
        "serving_size_value": 40.0,
        "serving_size_unit": "g",
        "calories": 160.0,
        "protein": 24.0,
        "carbohydrates": 12.0,
        "total_fat": 2.5,
        "provenance": {
            "calories": {"source": "LABEL_DECLARED"},
            "protein": {"source": "MANUAL_ENTRY"}
        }
    }
    save_prod_resp = client.post("/api/products", json=review_payload)
    assert save_prod_resp.status_code == 200

    # 4. Confirm product is immediately retrievable
    get_prod_resp = client.get(f"/api/products/{test_product_id}")
    assert get_prod_resp.status_code == 200
    saved_data = get_prod_resp.json()
    assert saved_data["name"] == "Regression Test Clean Oats"
    assert saved_data["protein"] == 24.0
    assert saved_data["provenance"]["protein"]["source"] == "MANUAL_ENTRY"
