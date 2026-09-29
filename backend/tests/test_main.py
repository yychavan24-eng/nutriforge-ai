from fastapi.testclient import TestClient
from app.main import app, DEMO_PRODUCTS

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "NutriForge AI" in response.json()["message"]

def test_get_products():
    response = client.get("/api/products")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_get_product_nutrition():
    product_id = DEMO_PRODUCTS[0]["id"]
    response = client.get(f"/api/products/{product_id}/nutrition")
    assert response.status_code == 200
    data = response.json()
    assert "calories" in data
    assert "protein" in data

def test_compare_products_muscle_gain():
    product_ids = [p["id"] for p in DEMO_PRODUCTS[:2]]
    profile_data = {
        "age": "30",
        "weight": "70",
        "height": "175",
        "activityLevel": "active",
        "goal": "muscle_gain",
        "dietaryPreference": "none",
        "restrictions": "none",
        "priorities": ["protein"]
    }
    response = client.post("/api/compare", json={"product_ids": product_ids, "profile": profile_data})
    assert response.status_code == 200
    data = response.json()
    comparison = data["comparison"]
    assert len(comparison) == 2
    
    # Assert deterministic logic works
    # Both products have protein. The explanation should mention protein positively.
    assert "Protein contributed positively" in comparison[0]["explanation"]
    assert comparison[0]["factors"]["protein"]["direction"] == "positive"
    
def test_compare_products_fat_loss():
    product_ids = [p["id"] for p in DEMO_PRODUCTS[:2]]
    profile_data = {
        "age": "30",
        "weight": "70",
        "height": "175",
        "activityLevel": "active",
        "goal": "fat_loss",
        "dietaryPreference": "none",
        "restrictions": "none",
        "priorities": ["sugar"]
    }
    response = client.post("/api/compare", json={"product_ids": product_ids, "profile": profile_data})
    assert response.status_code == 200
    data = response.json()
    comparison = data["comparison"]
    
    # Check that explanation changed dynamically due to profile change
    assert "Sugar contributed negatively" in comparison[0]["explanation"]
    assert comparison[0]["factors"]["sugar"]["direction"] == "negative"

def test_compare_invalid_product():
    product_ids = ["invalid_123"]
    profile_data = {
        "age": "30",
        "weight": "70",
        "height": "175",
        "activityLevel": "active",
        "goal": "muscle_gain",
        "dietaryPreference": "none",
        "restrictions": "none",
        "priorities": ["protein"]
    }
    response = client.post("/api/compare", json={"product_ids": product_ids, "profile": profile_data})
    assert response.status_code == 400
    assert response.json()["detail"] == "No valid products found"

def test_compare_malformed_payload():
    # Missing profile entirely
    response = client.post("/api/compare", json={"product_ids": ["1", "2"]})
    assert response.status_code == 422 # Pydantic validation error

def test_get_product_not_found():
    response = client.get("/api/products/invalid_id")
    assert response.status_code == 200
    assert "error" in response.json()

def test_profile_creation():
    profile_data = {
        "age": "30",
        "weight": "70",
        "height": "175",
        "activityLevel": "active",
        "goal": "muscle_gain",
        "dietaryPreference": "none",
        "restrictions": "none",
        "priorities": ["protein"]
    }
    response = client.post("/api/profile", json=profile_data)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
