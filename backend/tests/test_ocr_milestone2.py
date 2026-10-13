"""
Comprehensive test suite for NutriForge AI Milestone 2: Food-Label OCR.
Covers:
- Image validation and decoding (supported formats, MIME sniffing, size limit, corrupt data)
- Mock OCR provider compliance
- Gemini OCR provider with mocked Google Gen AI SDK responses
- Missing/unreadable fields preserved as None/null (no fabrication)
- Invalid model responses (non-JSON, schema violation)
- Missing API key handling and explicit error messages
- API errors (auth failures, rate limits 429, timeouts 504)
- Scan status endpoint (/api/scan/status)
- End-to-end scan-to-product persistence with provenance tracking
"""

import base64
import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.ocr import (
    validate_and_decode_image,
    MockOCRProvider,
    GeminiOCRProvider,
    LabelExtractionResult,
    InvalidImageError,
    MissingAPIKeyError,
    RateLimitError,
    AuthenticationError,
    TimeoutError,
    ModelParsingError,
    OCRError
)

client = TestClient(app)

# 1x1 Transparent PNG for valid test image bytes
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
    b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
)
VALID_PNG_BASE64 = base64.b64encode(VALID_PNG_BYTES).decode("utf-8")
VALID_PNG_DATA_URL = f"data:image/png;base64,{VALID_PNG_BASE64}"

# Valid JPEG header bytes
VALID_JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
VALID_JPEG_BASE64 = base64.b64encode(VALID_JPEG_BYTES).decode("utf-8")

# Valid WebP bytes
VALID_WEBP_BYTES = b"RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00"
VALID_WEBP_BASE64 = base64.b64encode(VALID_WEBP_BYTES).decode("utf-8")


# ==============================================================================
# 1. Image Validation and Decoding Tests
# ==============================================================================

def test_validate_and_decode_valid_png_data_url():
    raw_bytes, mime = validate_and_decode_image(VALID_PNG_DATA_URL)
    assert mime == "image/png"
    assert raw_bytes == VALID_PNG_BYTES

def test_validate_and_decode_valid_jpeg_raw_base64():
    raw_bytes, mime = validate_and_decode_image(VALID_JPEG_BASE64)
    assert mime == "image/jpeg"
    assert raw_bytes == VALID_JPEG_BYTES

def test_validate_and_decode_valid_webp():
    raw_bytes, mime = validate_and_decode_image(VALID_WEBP_BASE64)
    assert mime == "image/webp"
    assert raw_bytes == VALID_WEBP_BYTES

def test_validate_and_decode_empty_input():
    with pytest.raises(InvalidImageError, match="No image data provided"):
        validate_and_decode_image("")
    with pytest.raises(InvalidImageError, match="No image data provided"):
        validate_and_decode_image("   ")

def test_validate_and_decode_corrupt_base64():
    with pytest.raises(InvalidImageError, match="Invalid base64"):
        validate_and_decode_image("not-a-valid-base64-string!!@@##")

def test_validate_and_decode_unsupported_format():
    # ASCII text disguised as base64
    fake_text_bytes = b"This is just a plain text document."
    fake_b64 = base64.b64encode(fake_text_bytes).decode("utf-8")
    with pytest.raises(InvalidImageError, match="Unsupported image format"):
        validate_and_decode_image(fake_b64)

def test_validate_and_decode_oversized_image():
    # Generate 11MB of mock data with JPEG header
    large_data = b"\xff\xd8\xff" + (b"0" * (11 * 1024 * 1024))
    large_b64 = base64.b64encode(large_data).decode("utf-8")
    with pytest.raises(InvalidImageError, match="exceeds the maximum allowed limit"):
        validate_and_decode_image(large_b64)


# ==============================================================================
# 2. Mock OCR Provider Tests
# ==============================================================================

def test_mock_ocr_provider_explicitly_tagged():
    provider = MockOCRProvider()
    result = provider.extract_structured_data("dummy_image_data")
    assert result["is_simulated"] is True
    assert result["provider"] == "simulated-demo"
    assert "notice" in result
    assert result["serving_size_value"] == 50.0
    assert result["protein"] == 15.0
    assert len(result["structured_ingredients"]) > 0


# ==============================================================================
# 3. Gemini OCR Provider - Missing Key & Configuration
# ==============================================================================

def test_gemini_provider_missing_key_raises_error():
    with patch.dict("os.environ", {}, clear=True):
        provider = GeminiOCRProvider(api_key=None)
        with pytest.raises(MissingAPIKeyError, match="GEMINI_API_KEY environment variable is not configured"):
            provider.extract_structured_data(VALID_PNG_DATA_URL)


# ==============================================================================
# 4. Gemini OCR Provider - Mocked SDK Valid Extraction
# ==============================================================================

@patch("google.genai.Client")
def test_gemini_provider_valid_structured_extraction(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    sample_gemini_json = {
        "name": "Whey Isolate Chocolate",
        "brand": "Optimum Nutrition",
        "serving_size_value": 31.0,
        "serving_size_unit": "g",
        "serving_description": "1 rounded scoop",
        "calories": 120.0,
        "protein": 24.0,
        "carbohydrates": 3.0,
        "total_sugar": 1.0,
        "added_sugar": 0.0,
        "total_fat": 1.0,
        "saturated_fat": 0.5,
        "trans_fat": 0.0,
        "sodium": 130.0,
        "fibre": 0.0,
        "raw_ingredient_text": "Whey Protein Isolate, Cocoa, Natural Flavors, Lecithin, Sucralose",
        "structured_ingredients": [
            {"text": "Whey Protein Isolate", "is_allergen": True},
            {"text": "Cocoa", "is_allergen": False},
            {"text": "Natural Flavors", "is_allergen": False},
            {"text": "Lecithin", "is_allergen": True},
            {"text": "Sucralose", "is_allergen": False}
        ],
        "allergens": ["Milk", "Soy"],
        "claims": ["24g Protein", "Primary Source Whey Isolate"],
        "raw_text": "NUTRITION FACTS PER 31G SCOOP...",
        "confidence_score": 0.95,
        "uncertainty_notes": [],
        "fields_needing_review": []
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(sample_gemini_json)
    mock_client.models.generate_content.return_value = mock_response

    provider = GeminiOCRProvider(api_key="mock_test_key_123", model_name="gemini-2.5-flash")
    result = provider.extract_structured_data(VALID_PNG_DATA_URL)

    assert result["is_simulated"] is False
    assert result["provider"] == "gemini-2.5-flash"
    assert result["name"] == "Whey Isolate Chocolate"
    assert result["protein"] == 24.0
    assert result["serving_size_value"] == 31.0
    assert "Milk" in result["allergens"]
    assert result["confidence_score"] == 0.95


# ==============================================================================
# 5. Gemini OCR Provider - Missing Nutrients Preserved as None (Never Fabricated)
# ==============================================================================

@patch("google.genai.Client")
def test_gemini_provider_preserves_none_for_missing_fields(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    # Product label missing trans_fat, added_sugar, sodium, and brand
    partial_label_json = {
        "name": "Natural Almond Butter",
        "brand": None,
        "serving_size_value": 32.0,
        "serving_size_unit": "g",
        "serving_description": "2 tbsp",
        "calories": 190.0,
        "protein": 7.0,
        "carbohydrates": 6.0,
        "total_sugar": 1.0,
        "added_sugar": None,   # Missing from label
        "total_fat": 16.0,
        "saturated_fat": 1.5,
        "trans_fat": None,    # Missing from label
        "sodium": None,       # Missing/unreadable from label
        "fibre": 4.0,
        "raw_ingredient_text": "Roasted Almonds.",
        "structured_ingredients": [{"text": "Roasted Almonds", "is_allergen": True}],
        "allergens": ["Almonds (Tree Nuts)"],
        "claims": [],
        "confidence_score": 0.85,
        "uncertainty_notes": ["Sodium row torn and unreadable on label"],
        "fields_needing_review": ["sodium", "added_sugar"]
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(partial_label_json)
    mock_client.models.generate_content.return_value = mock_response

    provider = GeminiOCRProvider(api_key="mock_test_key_123")
    result = provider.extract_structured_data(VALID_PNG_DATA_URL)

    # STRICT ASSERTIONS: Must be None, NEVER fabricated into 0.0 or guessed
    assert result["sodium"] is None
    assert result["trans_fat"] is None
    assert result["added_sugar"] is None
    assert result["brand"] is None
    assert "sodium" in result["fields_needing_review"]
    assert len(result["uncertainty_notes"]) == 1


# ==============================================================================
# 6. Gemini OCR Provider - Invalid Output & Parsing Error Handling
# ==============================================================================

@patch("google.genai.Client")
def test_gemini_provider_invalid_json_raises_model_parsing_error(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = "This is not valid JSON at all: {calories: 200"
    mock_client.models.generate_content.return_value = mock_response

    provider = GeminiOCRProvider(api_key="mock_test_key_123")
    with pytest.raises(ModelParsingError, match="Failed to parse model output as JSON"):
        provider.extract_structured_data(VALID_PNG_DATA_URL)

@patch("google.genai.Client")
def test_gemini_provider_empty_response_raises_error(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = ""
    mock_client.models.generate_content.return_value = mock_response

    provider = GeminiOCRProvider(api_key="mock_test_key_123")
    with pytest.raises(ModelParsingError, match="returned an empty response"):
        provider.extract_structured_data(VALID_PNG_DATA_URL)


# ==============================================================================
# 7. Gemini OCR Provider - API Errors, Quota & Timeouts
# ==============================================================================

@patch("google.genai.Client")
def test_gemini_provider_rate_limit_error(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = Exception("429 ResourceExhausted: Quota exceeded")

    provider = GeminiOCRProvider(api_key="mock_test_key_123")
    with pytest.raises(RateLimitError, match="quota exceeded"):
        provider.extract_structured_data(VALID_PNG_DATA_URL)

@patch("google.genai.Client")
def test_gemini_provider_auth_error(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = Exception("403 Forbidden: API_KEY_INVALID")

    provider = GeminiOCRProvider(api_key="mock_test_key_123")
    with pytest.raises(AuthenticationError, match="authentication failed"):
        provider.extract_structured_data(VALID_PNG_DATA_URL)

@patch("google.genai.Client")
def test_gemini_provider_timeout_error(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = Exception("Request timed out (TIMEOUT)")

    provider = GeminiOCRProvider(api_key="mock_test_key_123")
    with pytest.raises(TimeoutError, match="timed out"):
        provider.extract_structured_data(VALID_PNG_DATA_URL)


# ==============================================================================
# 8. API Endpoints Integration Tests (/api/scan/status & /api/scan)
# ==============================================================================

def test_api_scan_status_endpoint():
    resp = client.get("/api/scan/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "gemini_configured" in data
    assert "model" in data
    assert "supported_formats" in data
    assert "max_file_size_mb" in data

def test_api_scan_missing_image():
    resp = client.post("/api/scan", json={})
    assert resp.status_code == 200
    assert resp.json()["status"] == "error"
    assert resp.json()["error_code"] == "NO_IMAGE"

def test_api_scan_force_demo_mode():
    resp = client.post("/api/scan", json={
        "image_data": VALID_PNG_DATA_URL,
        "force_demo": True
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["is_simulated"] is True
    assert data["provider"] == "simulated-demo"
    assert data["extracted_data"]["name"] == "Scanned Protein Bar"

def test_api_scan_real_image_without_api_key():
    with patch.dict("os.environ", {}, clear=True):
        resp = client.post("/api/scan", json={
            "image_data": VALID_PNG_DATA_URL,
            "force_demo": False
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "error"
        assert data["error_code"] == "GEMINI_API_KEY_MISSING"
        assert data["allow_demo_fallback"] is True
        assert "GEMINI_API_KEY" in data["message"]

def test_api_scan_unsupported_image_returns_400():
    fake_b64 = base64.b64encode(b"Not an image at all").decode("utf-8")
    with patch.dict("os.environ", {"GEMINI_API_KEY": "valid_key"}):
        resp = client.post("/api/scan", json={"image_data": fake_b64})
        assert resp.status_code == 400
        data = resp.json()
        assert "INVALID_IMAGE" in data["detail"]["error_code"]


# ==============================================================================
# 9. Scan to Product Persistence Workflow with Provenance
# ==============================================================================

@patch("google.genai.Client")
def test_end_to_end_scan_review_save_workflow(mock_client_cls):
    # Step 1: Simulate Gemini returning extracted label
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_label = {
        "name": "Live Scanned Protein Crisp",
        "brand": "CrispFit",
        "serving_size_value": 45.0,
        "serving_size_unit": "g",
        "serving_description": "1 bar (45g)",
        "calories": 170.0,
        "protein": 18.0,
        "carbohydrates": 15.0,
        "total_sugar": 2.0,
        "added_sugar": 0.0,
        "total_fat": 4.5,
        "saturated_fat": 1.0,
        "trans_fat": 0.0,
        "sodium": 120.0,
        "fibre": 3.0,
        "raw_ingredient_text": "Soy Protein Crisps, Almonds, Sea Salt",
        "structured_ingredients": [
            {"text": "Soy Protein Crisps", "is_allergen": True},
            {"text": "Almonds", "is_allergen": True},
            {"text": "Sea Salt", "is_allergen": False}
        ],
        "allergens": ["Soy", "Almonds"],
        "claims": ["18g Protein", "Plant Based"],
        "confidence_score": 0.98,
        "uncertainty_notes": [],
        "fields_needing_review": []
    }
    mock_response = MagicMock()
    mock_response.text = json.dumps(mock_label)
    mock_client.models.generate_content.return_value = mock_response

    with patch.dict("os.environ", {"GEMINI_API_KEY": "live_test_key_456"}):
        # Step 2: Call scan endpoint
        scan_resp = client.post("/api/scan", json={"image_data": VALID_PNG_DATA_URL})
        assert scan_resp.status_code == 200
        scan_data = scan_resp.json()
        assert scan_data["status"] == "success"
        extracted = scan_data["extracted_data"]

        # Step 3: Simulate user editing protein from 18g to 20g in Review UI
        # Protein gets MANUAL_ENTRY provenance; calories remains LABEL_DECLARED
        saved_product_id = "p_scanned_crisp_01"
        save_payload = {
            "id": saved_product_id,
            "barcode": "unknown",
            "name": extracted["name"],
            "brand": extracted["brand"],
            "category": "Community Scanned",
            "serving_size": "45g",
            "serving_size_value": 45.0,
            "serving_size_unit": "g",
            "serving_description": extracted["serving_description"],
            "calories": extracted["calories"],
            "protein": 20.0, # User manually corrected
            "carbohydrates": extracted["carbohydrates"],
            "total_sugar": extracted["total_sugar"],
            "added_sugar": extracted["added_sugar"],
            "total_fat": extracted["total_fat"],
            "saturated_fat": extracted["saturated_fat"],
            "trans_fat": extracted["trans_fat"],
            "sodium": extracted["sodium"],
            "fibre": extracted["fibre"],
            "provenance": {
                "calories": {"source": "LABEL_DECLARED", "confidence": 0.98},
                "protein": {"source": "MANUAL_ENTRY", "original_text": "18.0g"}
            },
            "raw_ingredient_text": extracted["raw_ingredient_text"],
            "structured_ingredients": extracted["structured_ingredients"],
            "allergens": extracted["allergens"],
            "claims": extracted["claims"],
            "source_type": "COMMUNITY_VERIFIED",
            "evidence": "Extracted via Gemini Vision and human verified."
        }

        save_resp = client.post("/api/products", json=save_payload)
        assert save_resp.status_code == 200
        assert save_resp.json()["status"] == "success"

        # Step 4: Verify newly saved product seamlessly plugs into vertical slice nutrition engine
        nutr_resp = client.get(f"/api/products/{saved_product_id}/nutrition")
        assert nutr_resp.status_code == 200
        assert nutr_resp.json()["protein"] == 20.0
        assert nutr_resp.json()["calories"] == 170.0

        # Step 5: Test scaling engine on newly scanned community product
        scale_resp = client.post("/api/nutrition/scale", json={
            "product_id": saved_product_id,
            "consumed_serving_mass": 90.0  # 2x serving
        })
        assert scale_resp.status_code == 200
        scaled_data = scale_resp.json()["data"]
        assert scaled_data["scaled_nutrients"]["protein"] == 40.0
        assert scaled_data["multiplier"] == 2.0
