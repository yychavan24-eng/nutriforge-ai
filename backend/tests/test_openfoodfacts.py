import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.openfoodfacts import (
    fetch_open_food_facts_product,
    _parse_serving_size,
    _clean_tag
)

client = TestClient(app)


def test_parse_serving_size():
    assert _parse_serving_size("30g", None, None) == ("30g", 30.0, "g", "1 serving (30g)")
    assert _parse_serving_size("250 ml", None, None) == ("250 ml", 250.0, "ml", "1 serving (250 ml)")
    assert _parse_serving_size(None, 45, "g") == ("45.0g", 45.0, "g", "1 serving (45.0g)")
    assert _parse_serving_size(None, None, None) == ("100g", 100.0, "g", "100g standard portion")


def test_clean_tag():
    assert _clean_tag("en:milk") == "Milk"
    assert _clean_tag("en:soy-beans") == "Soy Beans"
    assert _clean_tag("fr:arachides") == "Arachides"
    assert _clean_tag("organic") == "Organic"


def test_fetch_open_food_facts_product_invalid_barcode():
    assert fetch_open_food_facts_product("") is None
    assert fetch_open_food_facts_product("   ") is None
    assert fetch_open_food_facts_product("invalid barcode with spaces & symbols!") is None


def test_fetch_open_food_facts_product_mock_success():
    mock_payload = {
        "status": 1,
        "product": {
            "product_name": "Crunchy Hazelnut Spread",
            "brands": "NutriForge Delights",
            "categories": "Spreads, Hazelnut Spreads",
            "serving_size": "20g",
            "nutriments": {
                "energy-kcal_100g": 540,
                "proteins_100g": 6.5,
                "carbohydrates_100g": 58.0,
                "sugars_100g": 55.0,
                "added-sugars_100g": 40.0,
                "fat_100g": 31.0,
                "saturated-fat_100g": 10.0,
                "trans-fat_100g": 0.0,
                "sodium_100g": 0.05,  # 0.05g = 50mg
                "fiber_100g": 3.0
            },
            "ingredients_text": "Sugar, Palm Oil, Hazelnuts (13%), Skimmed Milk Powder (8.7%), Cocoa, Emulsifier: Lecithins (Soya), Vanillin.",
            "allergens_tags": ["en:milk", "en:nuts", "en:soybeans"],
            "labels_tags": ["en:no-gluten", "en:vegetarian"],
            "image_front_url": "https://example.com/spread.jpg"
        }
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_payload

    with patch("httpx.Client.get", return_value=mock_response):
        product = fetch_open_food_facts_product("3017620422003")

    assert product is not None
    assert product["barcode"] == "3017620422003"
    assert product["name"] == "Crunchy Hazelnut Spread"
    assert product["brand"] == "NutriForge Delights"
    assert product["category"] == "Spreads"
    assert product["serving_size"] == "20g"
    assert product["calories"] == 540.0
    assert product["protein"] == 6.5
    assert product["carbohydrates"] == 58.0
    assert product["sodium"] == 50.0  # converted from 0.05g to 50.0mg
    assert "Milk" in product["allergens"]
    assert "Nuts" in product["allergens"]
    assert "Soybeans" in product["allergens"]
    assert product["source_type"] == "EXTERNAL_EVIDENCE"
    assert product["provenance"]["sodium"]["authority"] == "Open Food Facts"


def test_fetch_open_food_facts_product_mock_not_found():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": 0, "status_verbose": "product not found"}

    with patch("httpx.Client.get", return_value=mock_response):
        product = fetch_open_food_facts_product("0000000000000")

    assert product is None


def test_fetch_open_food_facts_product_mock_http_error():
    mock_response = MagicMock()
    mock_response.status_code = 500

    with patch("httpx.Client.get", return_value=mock_response):
        product = fetch_open_food_facts_product("3017620422003")

    assert product is None


def test_barcode_endpoint_external_open_food_facts_flow():
    mock_product = {
        "id": "off_1234567890128",
        "barcode": "1234567890128",
        "name": "Organic Oat Granola",
        "brand": "Pure Oats",
        "category": "Cereals",
        "serving_size": "45g",
        "serving_size_value": 45.0,
        "serving_size_unit": "g",
        "serving_description": "1 serving (45g)",
        "calories": 180.0,
        "protein": 5.0,
        "carbohydrates": 28.0,
        "total_sugar": 6.0,
        "added_sugar": 2.0,
        "total_fat": 4.5,
        "saturated_fat": 0.8,
        "trans_fat": 0.0,
        "sodium": 12.0,
        "fibre": 4.0,
        "provenance": {
            "protein": {"source": "EXTERNAL_EVIDENCE", "authority": "Open Food Facts"}
        },
        "raw_ingredient_text": "Whole Grain Rolled Oats, Cane Sugar, Canola Oil, Sea Salt",
        "structured_ingredients": [],
        "allergens": ["Gluten", "Oats"],
        "claims": ["Organic", "High Fibre"],
        "fssai_information": "",
        "evidence": "Retrieved from Open Food Facts external database.",
        "source_type": "EXTERNAL_EVIDENCE",
        "image": "https://example.com/oats.jpg",
        "last_updated": "2026-10-26T12:00:00Z"
    }

    with patch("app.main.fetch_open_food_facts_product", return_value=mock_product):
        response = client.get("/api/barcode/1234567890128")

    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["source"] == "OPEN_FOOD_FACTS"
    assert data["product"]["name"] == "Organic Oat Granola"
    # Verify enrichment ran automatically
    assert "ingredient_intelligence" in data["product"]
    assert data["product"]["ingredient_intelligence"]["total_ingredients"] > 0


def test_barcode_endpoint_not_found_honest_message():
    with patch("app.main.fetch_open_food_facts_product", return_value=None):
        response = client.get("/api/barcode/9999999999999")

    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
    assert "Open Food Facts" in data["message"]
