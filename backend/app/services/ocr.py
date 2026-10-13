"""
OCR Service module for NutriForge AI.
Provides provider abstraction for food label text and nutrition extraction:
- OCRProvider (Base interface)
- MockOCRProvider (Simulated demo mode)
- GeminiOCRProvider (Real Google Gen AI Vision extraction)
"""

import base64
import json
import os
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field, ValidationError

# Supported image MIME types and their signature magic bytes
SUPPORTED_MIME_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
    "image/gif": [b"GIF87a", b"GIF89a"],
}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


# ==============================================================================
# Custom Exceptions
# ==============================================================================

class OCRError(Exception):
    """Base exception for all OCR errors."""
    pass

class MissingAPIKeyError(OCRError):
    """Raised when real OCR is called without GEMINI_API_KEY configured."""
    pass

class InvalidImageError(OCRError):
    """Raised when an uploaded image is invalid, corrupt, oversized, or unsupported."""
    pass

class ModelParsingError(OCRError):
    """Raised when Gemini output cannot be parsed into structured food label data."""
    pass

class RateLimitError(OCRError):
    """Raised when Gemini API quota or rate limit is exceeded."""
    pass

class AuthenticationError(OCRError):
    """Raised when Gemini API authentication fails."""
    pass

class TimeoutError(OCRError):
    """Raised when Gemini API request times out."""
    pass


# ==============================================================================
# Structured Output Pydantic Schemas
# ==============================================================================

class ExtractedIngredientNode(BaseModel):
    text: str
    is_allergen: bool = False
    explanation: Optional[str] = None

class LabelExtractionResult(BaseModel):
    """
    Strict structured schema for packaged food label extraction.
    Missing or unreadable values MUST be None/null — never fabricated.
    """
    name: Optional[str] = None
    brand: Optional[str] = None
    serving_size_value: Optional[float] = None
    serving_size_unit: Optional[str] = "g"
    serving_description: Optional[str] = None
    
    # Nutrition fields - None if not visible/printed
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbohydrates: Optional[float] = None
    total_sugar: Optional[float] = None
    added_sugar: Optional[float] = None
    total_fat: Optional[float] = None
    saturated_fat: Optional[float] = None
    trans_fat: Optional[float] = None
    sodium: Optional[float] = None
    fibre: Optional[float] = None
    
    # Ingredients and Allergens
    raw_ingredient_text: Optional[str] = None
    structured_ingredients: List[ExtractedIngredientNode] = []
    allergens: List[str] = []
    claims: List[str] = []
    
    # Metadata, provenance, and verification notes
    raw_text: Optional[str] = None
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    uncertainty_notes: List[str] = []
    fields_needing_review: List[str] = []
    is_simulated: bool = False
    provider: str = "gemini-2.5-flash"
    notice: Optional[str] = None


# ==============================================================================
# Image Validation and Decoding Utilities
# ==============================================================================

def validate_and_decode_image(image_data: str, max_bytes: int = MAX_IMAGE_SIZE_BYTES) -> Tuple[bytes, str]:
    """
    Validates, decodes, and identifies the MIME type of a base64-encoded image string.
    Supports data URI prefixes (e.g., data:image/png;base64,...) and raw base64 strings.
    
    Returns:
        Tuple of (decoded_image_bytes, mime_type)
        
    Raises:
        InvalidImageError: If the input is empty, oversized, corrupt, or unsupported.
    """
    if not image_data or not isinstance(image_data, str) or not image_data.strip():
        raise InvalidImageError("No image data provided.")

    cleaned_data = image_data.strip()
    mime_type: Optional[str] = None

    # Handle data URI prefix if present
    if cleaned_data.startswith("data:"):
        match = re.match(r"^data:(image/[a-zA-Z0-9\.\+\-]+);base64,(.+)$", cleaned_data, re.DOTALL)
        if match:
            declared_mime = match.group(1).lower()
            cleaned_data = match.group(2)
            mime_type = declared_mime
        else:
            raise InvalidImageError("Malformed image data URI header.")

    # Remove any whitespace or newlines from base64 string
    cleaned_data = re.sub(r"\s+", "", cleaned_data)

    try:
        raw_bytes = base64.b64decode(cleaned_data, validate=True)
    except Exception as e:
        raise InvalidImageError(f"Invalid base64 image data: {str(e)}")

    if len(raw_bytes) == 0:
        raise InvalidImageError("Decoded image content is empty.")

    if len(raw_bytes) > max_bytes:
        size_mb = len(raw_bytes) / (1024 * 1024)
        limit_mb = max_bytes / (1024 * 1024)
        raise InvalidImageError(f"Image size ({size_mb:.1f}MB) exceeds the maximum allowed limit of {limit_mb:.0f}MB.")

    # Detect/verify MIME type via magic bytes
    detected_mime: Optional[str] = None
    if raw_bytes.startswith(b"\xff\xd8\xff"):
        detected_mime = "image/jpeg"
    elif raw_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        detected_mime = "image/png"
    elif raw_bytes.startswith(b"RIFF") and len(raw_bytes) >= 12 and raw_bytes[8:12] == b"WEBP":
        detected_mime = "image/webp"
    elif raw_bytes.startswith((b"GIF87a", b"GIF89a")):
        detected_mime = "image/gif"
    elif len(raw_bytes) >= 12 and b"ftyp" in raw_bytes[4:12]:
        brand = raw_bytes[8:12].lower()
        if brand in (b"heic", b"mif1", b"msf1"):
            detected_mime = "image/heic"
        elif brand in (b"heif", b"heix"):
            detected_mime = "image/heif"

    final_mime = detected_mime or mime_type

    if not final_mime or final_mime not in ("image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"):
        raise InvalidImageError(
            f"Unsupported image format ({final_mime or 'unknown'}). Supported formats: JPEG, PNG, WebP, GIF, HEIC."
        )

    return raw_bytes, final_mime


# ==============================================================================
# Provider Interface and Implementations
# ==============================================================================

class OCRProvider(ABC):
    @abstractmethod
    def extract_structured_data(self, image_data: str) -> Dict[str, Any]:
        """
        Extracts text from an image and structures it into a dictionary 
        representing the product label.
        """
        pass


class MockOCRProvider(OCRProvider):
    """
    Explicitly labeled simulated demonstration OCR provider.
    Used for local testing, frontend development, and when no Gemini API key is configured.
    """
    def extract_structured_data(self, image_data: str) -> Dict[str, Any]:
        return {
            "name": "Scanned Protein Bar",
            "brand": "ScanFit",
            "serving_size_value": 50.0,
            "serving_size_unit": "g",
            "serving_description": "1 bar",
            "calories": 200.0,
            "protein": 15.0,
            "carbohydrates": 20.0,
            "total_sugar": 5.0,
            "added_sugar": 2.0,
            "total_fat": 6.0,
            "saturated_fat": 1.0,
            "trans_fat": 0.0,
            "sodium": 100.0,
            "fibre": 5.0,
            "raw_ingredient_text": "Protein Blend (Whey), Peanuts, Cocoa, Sugar",
            "structured_ingredients": [
                {"text": "Protein Blend (Whey)", "is_allergen": True, "explanation": "Contains dairy derivative"},
                {"text": "Peanuts", "is_allergen": True, "explanation": "Tree nut/peanut allergen"},
                {"text": "Cocoa", "is_allergen": False, "explanation": None},
                {"text": "Sugar", "is_allergen": False, "explanation": None}
            ],
            "allergens": ["Milk", "Peanuts"],
            "claims": ["High Protein"],
            "raw_text": "SCANFIT PROTEIN BAR 15G PROTEIN... NUTRITION FACTS PER 50G: CALORIES 200...",
            "confidence_score": 1.0,
            "uncertainty_notes": [],
            "fields_needing_review": [],
            "is_simulated": True,
            "provider": "simulated-demo",
            "notice": "Simulated demonstration data. To perform real OCR, configure GEMINI_API_KEY in the backend."
        }


class GeminiOCRProvider(OCRProvider):
    """
    Live Vision-Language Model OCR provider powered by Google Gemini.
    Extracts structured nutrition facts, ingredient lists, and declared allergens.
    Strictly preserves null for omitted/unreadable values.
    """

    EXTRACTION_PROMPT = """You are NutriForge AI's expert food-label transcription and intelligence engine.
Analyze the provided packaged food label or nutrition facts panel image with extreme fidelity.

CRITICAL EXTRACTION RULES:
1. Extract ONLY information visibly and explicitly printed on this package label.
2. NEVER invent, estimate, guess, or fabricate any numbers or text.
3. If any nutrient (calories, protein, carbohydrates, total_sugar, added_sugar, total_fat, saturated_fat, trans_fat, sodium, fibre), serving size, ingredient list, or allergen declaration is MISSING, BLURRED, PARTIALLY CUT OFF, or UNREADABLE, set its value to null.
4. If a nutrient is explicitly printed as zero (e.g., "0g", "0 mg", "Zero Trans Fat"), set it to 0.0.
5. If a nutrient is omitted entirely from the nutrition table, set it to null.
6. For serving size:
   - serving_size_value: float (e.g., 30.0 for "30g" or "1 scoop (30g)")
   - serving_size_unit: string (e.g., "g", "ml", "oz", "scoop")
   - serving_description: string (e.g., "1 scoop", "2 cookies", "per 100g")
7. For ingredients:
   - raw_ingredient_text: verbatim text of the ingredients section.
   - structured_ingredients: list of individual ingredients [{"text": "Whey Protein", "is_allergen": true}, ...]
8. For allergens: list explicitly declared allergens (e.g. ["Milk", "Soy"]).
9. For claims: list marketing or health claims visibly stated on packaging (e.g. ["No Added Sugar", "24g Protein"]).
10. Uncertainty & Human Verification:
   - confidence_score: float from 0.0 to 1.0 representing overall visual clarity and extraction confidence.
   - uncertainty_notes: list of specific observations about blurriness, folds, glare, or ambiguities.
   - fields_needing_review: list of field names that need human verification due to visual ambiguity (e.g. ["sodium", "serving_size_value"]).

Return ONLY valid JSON matching this structure:
{
  "name": string or null,
  "brand": string or null,
  "serving_size_value": float or null,
  "serving_size_unit": string or null,
  "serving_description": string or null,
  "calories": float or null,
  "protein": float or null,
  "carbohydrates": float or null,
  "total_sugar": float or null,
  "added_sugar": float or null,
  "total_fat": float or null,
  "saturated_fat": float or null,
  "trans_fat": float or null,
  "sodium": float or null,
  "fibre": float or null,
  "raw_ingredient_text": string or null,
  "structured_ingredients": [{"text": string, "is_allergen": boolean}],
  "allergens": [string],
  "claims": [string],
  "raw_text": string or null,
  "confidence_score": float or null,
  "uncertainty_notes": [string],
  "fields_needing_review": [string]
}
"""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.model_name = model_name or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    def extract_structured_data(self, image_data: str) -> Dict[str, Any]:
        """
        Executes Gemini Vision extraction on the provided image data.
        Validates output against LabelExtractionResult schema.
        
        Raises:
            MissingAPIKeyError: If GEMINI_API_KEY is not configured.
            InvalidImageError: If the image cannot be decoded.
            RateLimitError: If API rate limits are hit.
            AuthenticationError: If API key is invalid.
            TimeoutError: If request times out.
            ModelParsingError: If model response is invalid JSON or violates schema.
        """
        if not self.api_key:
            raise MissingAPIKeyError(
                "GEMINI_API_KEY environment variable is not configured. "
                "Real food-label OCR requires a valid Gemini API key."
            )

        # Validate and decode image
        raw_bytes, mime_type = validate_and_decode_image(image_data)

        # Import official Google Gen AI SDK
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            raise OCRError("The 'google-genai' package is not installed. Please run: pip install google-genai")

        try:
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Part.from_bytes(data=raw_bytes, mime_type=mime_type),
                    self.EXTRACTION_PROMPT
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg.upper():
                raise RateLimitError("Gemini API rate limit or quota exceeded. Please wait a moment before retrying.")
            elif "401" in err_msg or "403" in err_msg or "API_KEY_INVALID" in err_msg.upper():
                raise AuthenticationError("Gemini API authentication failed. Please verify your GEMINI_API_KEY.")
            elif "TIMED_OUT" in err_msg.upper() or "TIMEOUT" in err_msg.upper():
                raise TimeoutError("Gemini Vision request timed out. Please retry with a clear image.")
            else:
                raise OCRError(f"Gemini Vision call failed: {err_msg}")

        if not response or not response.text:
            raise ModelParsingError("Gemini model returned an empty response.")

        # Clean JSON markdown if wrapped in ```json ... ```
        response_text = response.text.strip()
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

        try:
            parsed_json = json.loads(response_text)
        except Exception as e:
            raise ModelParsingError(f"Failed to parse model output as JSON: {str(e)}. Output: {response_text[:200]}")

        try:
            # Validate output via strict Pydantic schema
            validated = LabelExtractionResult.model_validate(parsed_json)
            result_dict = validated.model_dump()
            result_dict["is_simulated"] = False
            result_dict["provider"] = self.model_name
            return result_dict
        except ValidationError as e:
            raise ModelParsingError(f"Model output failed schema validation: {str(e)}")


# ==============================================================================
# Helper Factory
# ==============================================================================

def get_ocr_provider(force_demo: bool = False) -> OCRProvider:
    """
    Factory function returning the appropriate OCR provider.
    Returns GeminiOCRProvider if API key is present and not force_demo;
    otherwise returns MockOCRProvider.
    """
    if force_demo:
        return MockOCRProvider()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        return GeminiOCRProvider()
    return MockOCRProvider()
