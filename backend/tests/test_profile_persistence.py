"""
Regression tests for NutriForge AI Profile Persistence & API Contract.
Verifies that profile data (voluntary physical metrics, goal, activity level,
dietary preference, declared restrictions, priorities, and daily targets)
can be saved, retrieved, and persisted across simulated restarts.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app, load_db_state

client = TestClient(app)

def test_profile_api_schema_and_defaults():
    """Verify GET /api/profile returns a 200 with all expected profile fields."""
    resp = client.get("/api/profile")
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["status"] == "success"
    data = res_data["data"]

    # Verify all expected profile fields exist
    expected_fields = [
        "age", "height", "weight", "activityLevel", "goal",
        "dietaryPreference", "restrictions", "priorities", "daily_targets"
    ]
    for field in expected_fields:
        assert field in data, f"Missing field in profile response: {field}"

def test_profile_save_and_immediate_retrieval():
    """Verify POST /api/profile saves full profile and GET /api/profile reflects it immediately."""
    payload = {
        "age": "26",
        "height": "178",
        "weight": "74",
        "activityLevel": "very_active",
        "goal": "muscle_gain",
        "dietaryPreference": "vegetarian",
        "restrictions": "Peanuts, Shellfish, Gluten",
        "priorities": ["protein", "calories", "fibre"],
        "daily_targets": {
            "calories": 2600.0,
            "protein": 170.0,
            "carbohydrates": 280.0,
            "total_fat": 75.0,
            "added_sugar": 20.0,
            "sodium": 1800.0,
            "fibre": 35.0
        }
    }

    # Save profile
    save_resp = client.post("/api/profile", json=payload)
    assert save_resp.status_code == 200
    assert save_resp.json()["status"] == "success"

    # Immediately retrieve profile
    get_resp = client.get("/api/profile")
    assert get_resp.status_code == 200
    data = get_resp.json()["data"]

    assert data["age"] == "26"
    assert data["height"] == "178"
    assert data["weight"] == "74"
    assert data["activityLevel"] == "very_active"
    assert data["goal"] == "muscle_gain"
    assert data["dietaryPreference"] == "vegetarian"
    assert data["restrictions"] == "Peanuts, Shellfish, Gluten"
    assert data["priorities"] == ["protein", "calories", "fibre"]
    assert data["daily_targets"]["protein"] == 170.0
    assert data["daily_targets"]["calories"] == 2600.0
    assert data["daily_targets"]["fibre"] == 35.0

def test_profile_persistence_across_restart():
    """Verify profile survives simulated server restart via load_db_state()."""
    payload = {
        "age": "31",
        "height": "165",
        "weight": "62",
        "activityLevel": "light",
        "goal": "fat_loss",
        "dietaryPreference": "vegan",
        "restrictions": "Dairy, Eggs",
        "priorities": ["protein", "added_sugar"],
        "daily_targets": {
            "calories": 1800.0,
            "protein": 120.0,
            "added_sugar": 15.0
        }
    }

    # Save profile
    save_resp = client.post("/api/profile", json=payload)
    assert save_resp.status_code == 200

    # Simulate restart
    load_db_state()

    # Retrieve from DB
    get_resp = client.get("/api/profile")
    assert get_resp.status_code == 200
    data = get_resp.json()["data"]

    assert data["age"] == "31"
    assert data["height"] == "165"
    assert data["weight"] == "62"
    assert data["activityLevel"] == "light"
    assert data["goal"] == "fat_loss"
    assert data["dietaryPreference"] == "vegan"
    assert data["restrictions"] == "Dairy, Eggs"
    assert data["daily_targets"]["protein"] == 120.0
    assert data["daily_targets"]["added_sugar"] == 15.0

def test_profile_update_partial_and_clear_restrictions():
    """Verify updating restrictions and clearing voluntary metrics works correctly."""
    payload = {
        "age": "",
        "height": "",
        "weight": "",
        "activityLevel": "moderate",
        "goal": "maintenance",
        "dietaryPreference": "no_preference",
        "restrictions": "",
        "priorities": ["protein"],
        "daily_targets": {
            "calories": 2000.0,
            "protein": 100.0
        }
    }

    save_resp = client.post("/api/profile", json=payload)
    assert save_resp.status_code == 200

    get_resp = client.get("/api/profile")
    assert get_resp.status_code == 200
    data = get_resp.json()["data"]
    assert data["age"] == ""
    assert data["restrictions"] == ""
    assert data["goal"] == "maintenance"
    assert data["daily_targets"]["calories"] == 2000.0

def test_health_and_root_endpoints():
    """Verify production uptime healthcheck endpoints respond with 200 healthy."""
    r_root = client.get("/")
    assert r_root.status_code == 200

    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"

    r_api_health = client.get("/api/health")
    assert r_api_health.status_code == 200
    assert r_api_health.json()["status"] == "healthy"
