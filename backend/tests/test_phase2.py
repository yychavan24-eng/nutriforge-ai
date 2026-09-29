import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.ocr import MockOCRProvider

client = TestClient(app)

def test_ocr_provider_abstraction():
    provider = MockOCRProvider()
    data = provider.extract_structured_data("dummy_image_data")
    assert "name" in data
    assert "serving_size_value" in data
    assert "structured_ingredients" in data
    assert data["serving_size_value"] == 50

def test_scan_endpoint():
    response = client.post("/api/scan", json={"image_data": "base64_string"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["extracted_data"]["name"] == "Scanned Protein Bar"

def test_scan_endpoint_no_image():
    response = client.post("/api/scan", json={})
    assert response.status_code == 200
    assert response.json()["status"] == "error"

def test_barcode_lookup_found():
    response = client.get("/api/barcode/8901234567890")
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["product"]["name"] == "High Protein Oats"

def test_barcode_lookup_not_found():
    response = client.get("/api/barcode/invalid123")
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
    assert "not found" in data["message"].lower()

def test_create_scanned_product():
    product_payload = {
        "id": "p_test_123",
        "barcode": "unknown",
        "name": "Test Scanned Item",
        "brand": "TestBrand",
        "category": "Community Scanned",
        "serving_size": "50g",
        "serving_size_value": 50,
        "serving_size_unit": "g",
        "serving_description": "1 bar",
        "calories": 200,
        "protein": 15,
        "carbohydrates": 20,
        "total_sugar": 5,
        "added_sugar": 2,
        "total_fat": 6,
        "saturated_fat": 1,
        "trans_fat": 0,
        "sodium": 100,
        "fibre": 5,
        "provenance": {
            "calories": {"source": "LABEL_DECLARED"},
            "protein": {"source": "LABEL_DECLARED"}
        },
        "raw_ingredient_text": "Protein, Peanuts, Cocoa",
        "structured_ingredients": [
            {"text": "Protein", "is_allergen": False},
            {"text": "Peanuts", "is_allergen": True}
        ],
        "allergens": ["Peanuts"],
        "claims": ["High Protein"],
        "fssai_information": "Awaiting",
        "evidence": "Scanned by community",
        "source_type": "COMMUNITY",
        "image": "placeholder.jpg",
        "last_updated": "2026-09-29T12:00:00Z"
    }
    
    response = client.post("/api/products", json=product_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify we can fetch it and it didn't break phase 1 nutrition endpoints
    fetch_resp = client.get(f"/api/products/{product_payload['id']}/nutrition")
    assert fetch_resp.status_code == 200
    assert fetch_resp.json()["calories"] == 200
