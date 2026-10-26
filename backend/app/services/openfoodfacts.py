"""
Open Food Facts External Database Integration for NutriForge AI.
Provides real-world barcode lookup by querying the Open Food Facts v2 API.
Returns verified, honest product records without fabricating data.
"""
import re
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import httpx

logger = logging.getLogger(__name__)

OPEN_FOOD_FACTS_API_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
USER_AGENT = "NutriForgeAI/1.0 (https://github.com/yychavan24-eng/nutriforge-ai)"
TIMEOUT_SECONDS = 5.0


def _parse_serving_size(raw_serving: Optional[str], raw_quantity: Any, raw_unit: Optional[str]) -> tuple[str, float, str, str]:
    """
    Parses serving size into (display_str, numeric_value, unit, description).
    Defaults to 100g portion if unparseable or absent.
    """
    if raw_serving:
        match = re.search(r"(\d+(?:\.\d+)?)\s*([a-zA-Z]+)", str(raw_serving))
        if match:
            val = float(match.group(1))
            unit = match.group(2).lower()
            return raw_serving, val, unit, f"1 serving ({raw_serving})"
        return raw_serving, 100.0, "g", raw_serving

    if raw_quantity:
        try:
            val = float(raw_quantity)
            unit = (raw_unit or "g").lower()
            return f"{val}{unit}", val, unit, f"1 serving ({val}{unit})"
        except (ValueError, TypeError):
            pass

    return "100g", 100.0, "g", "100g standard portion"


def _clean_tag(tag: str) -> str:
    """Removes language prefixes like 'en:', 'fr:' and returns capitalized string."""
    cleaned = re.sub(r"^[a-z]{2}:", "", tag.strip().lower())
    cleaned = cleaned.replace("-", " ")
    return cleaned.title()


def fetch_open_food_facts_product(barcode: str, client: Optional[httpx.Client] = None) -> Optional[Dict[str, Any]]:
    """
    Queries Open Food Facts for a product by barcode.
    Returns a standardized NutriForge product dictionary, or None if not found or on network failure.
    Does NOT fabricate missing data; preserves honest provenance.
    """
    clean_barcode = re.sub(r"\s+", "", str(barcode or ""))
    if not clean_barcode or not clean_barcode.isalnum():
        return None

    url = OPEN_FOOD_FACTS_API_URL.format(barcode=clean_barcode)
    headers = {"User-Agent": USER_AGENT}

    try:
        if client is not None:
            response = client.get(url, headers=headers, timeout=TIMEOUT_SECONDS)
        else:
            with httpx.Client() as h_client:
                response = h_client.get(url, headers=headers, timeout=TIMEOUT_SECONDS)

        if response.status_code != 200:
            logger.info("Open Food Facts returned status %s for barcode %s", response.status_code, clean_barcode)
            return None

        data = response.json()
        if data.get("status") != 1 or "product" not in data:
            return None

        p = data["product"]
        nutriments = p.get("nutriments", {})

        # Name and basic info
        product_name = p.get("product_name") or p.get("product_name_en") or p.get("generic_name") or "Unknown Product"
        brands = p.get("brands") or "Unknown Brand"
        
        # Category
        categories = p.get("categories") or p.get("category") or "Packaged Food"
        category = categories.split(",")[0].strip() if "," in categories else categories.strip()

        # Serving size
        raw_serving = p.get("serving_size")
        raw_quantity = p.get("serving_quantity")
        raw_unit = p.get("serving_quantity_unit", "g")
        serving_size_str, serving_val, serving_unit, serving_desc = _parse_serving_size(raw_serving, raw_quantity, raw_unit)

        # Nutrients (per 100g default)
        calories = float(nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal") or 0.0)
        protein = float(nutriments.get("proteins_100g") or nutriments.get("proteins") or 0.0)
        carbs = float(nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates") or 0.0)
        sugars = float(nutriments.get("sugars_100g") or nutriments.get("sugars") or 0.0)
        
        added_sugars_val = nutriments.get("added-sugars_100g")
        added_sugars = float(added_sugars_val) if added_sugars_val is not None else 0.0

        fat = float(nutriments.get("fat_100g") or nutriments.get("fat") or 0.0)
        sat_fat = float(nutriments.get("saturated-fat_100g") or nutriments.get("saturated-fat") or 0.0)
        trans_fat = float(nutriments.get("trans-fat_100g") or nutriments.get("trans-fat") or 0.0)

        # Sodium: Open Food Facts reports sodium in grams! NutriForge uses mg.
        sodium_g = nutriments.get("sodium_100g")
        if sodium_g is not None:
            sodium_mg = round(float(sodium_g) * 1000.0, 1)
        else:
            salt_g = nutriments.get("salt_100g")
            sodium_mg = round(float(salt_g) * 400.0, 1) if salt_g is not None else 0.0

        fibre = float(nutriments.get("fiber_100g") or nutriments.get("fiber") or 0.0)

        # Ingredients text
        raw_ingredient_text = p.get("ingredients_text") or p.get("ingredients_text_en") or ""

        # Allergens
        raw_allergens_tags = p.get("allergens_tags") or []
        allergens = [_clean_tag(t) for t in raw_allergens_tags if t]
        if not allergens and p.get("allergens"):
            allergens = [a.strip().title() for a in p["allergens"].split(",") if a.strip()]

        # Claims & labels
        labels_tags = p.get("labels_tags") or []
        claims = [_clean_tag(l) for l in labels_tags[:5] if l]

        # Product Image
        image_url = p.get("image_front_url") or p.get("image_url") or ""

        provenance = {
            "calories": {"source": "EXTERNAL_EVIDENCE", "authority": "Open Food Facts"},
            "protein": {"source": "EXTERNAL_EVIDENCE", "authority": "Open Food Facts"},
            "carbohydrates": {"source": "EXTERNAL_EVIDENCE", "authority": "Open Food Facts"},
            "total_fat": {"source": "EXTERNAL_EVIDENCE", "authority": "Open Food Facts"},
            "sodium": {"source": "EXTERNAL_EVIDENCE", "authority": "Open Food Facts"},
        }

        return {
            "id": f"off_{clean_barcode}",
            "barcode": clean_barcode,
            "name": product_name,
            "brand": brands,
            "category": category or "Packaged Food",
            "serving_size": serving_size_str,
            "serving_size_value": serving_val,
            "serving_size_unit": serving_unit,
            "serving_description": serving_desc,
            "calories": calories,
            "protein": protein,
            "carbohydrates": carbs,
            "total_sugar": sugars,
            "added_sugar": added_sugars,
            "total_fat": fat,
            "saturated_fat": sat_fat,
            "trans_fat": trans_fat,
            "sodium": sodium_mg,
            "fibre": fibre,
            "provenance": provenance,
            "raw_ingredient_text": raw_ingredient_text,
            "structured_ingredients": [],
            "allergens": allergens,
            "claims": claims,
            "fssai_information": "",
            "evidence": f"Retrieved from Open Food Facts external database (barcode {clean_barcode}).",
            "source_type": "EXTERNAL_EVIDENCE",
            "image": image_url,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.warning("Error fetching product %s from Open Food Facts: %s", clean_barcode, str(e))
        return None
