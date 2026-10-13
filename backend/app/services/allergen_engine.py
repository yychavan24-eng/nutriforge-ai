"""
Deterministic Allergen and Dietary Restriction Engine for NutriForge AI.
Evaluates declared allergens and ingredients against user allergies and dietary preferences.
Flags conflicts conservatively, distinguishes confirmed vs derivative matches,
and maintains clear medical disclaimer boundaries.
"""
import re
from typing import List, Dict, Any, Optional
from enum import Enum

class MatchConfidence(str, Enum):
    CONFIRMED_LABEL_ALLERGEN = "CONFIRMED_LABEL_ALLERGEN"
    CONFIRMED_INGREDIENT = "CONFIRMED_INGREDIENT"
    DERIVATIVE_MATCH = "DERIVATIVE_MATCH"
    UNCERTAIN_INTERPRETATION = "UNCERTAIN_INTERPRETATION"

DISCLAIMER_TEXT = (
    "NutriForge is a label literacy and decision-support tool. It is NOT a medical diagnostic "
    "or laboratory testing service and does NOT guarantee that a food is safe. Packaged foods "
    "may carry undeclared cross-contamination risks or formulation changes."
)

# Known ingredient synonyms and derivatives for common allergens & dietary preferences
ALLERGEN_SYNONYMS: Dict[str, List[str]] = {
    "milk": ["milk", "dairy", "whey", "casein", "caseinate", "butter", "cheese", "lactose", "cream", "ghee", "curd"],
    "dairy": ["milk", "dairy", "whey", "casein", "caseinate", "butter", "cheese", "lactose", "cream", "ghee", "curd"],
    "peanut": ["peanut", "peanuts", "groundnut", "groundnuts", "arachis"],
    "tree nuts": ["almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pecan", "hazelnut", "pistachio", "macadamia", "brazil nut", "nuts"],
    "nuts": ["peanut", "peanuts", "almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pecan", "hazelnut", "pistachio", "macadamia", "brazil nut"],
    "egg": ["egg", "eggs", "albumen", "albumin", "ovalbumin", "yolk", "egg powder"],
    "soy": ["soy", "soya", "soybean", "soybeans", "edamame", "soy lecithin"],
    "gluten": ["gluten", "wheat", "barley", "rye", "spelt", "semolina", "triticale", "malt", "flour"],
    "wheat": ["wheat", "semolina", "spelt", "flour", "gluten", "triticale"],
    "fish": ["fish", "salmon", "tuna", "cod", "anchovy", "tilapia", "haddock", "trout"],
    "shellfish": ["shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
    "sesame": ["sesame", "tahini", "sesame seeds"]
}

DIETARY_RESTRICTION_KEYWORDS: Dict[str, List[str]] = {
    "vegan": [
        "milk", "dairy", "whey", "casein", "butter", "cheese", "ghee", "cream",
        "egg", "eggs", "albumen", "yolk", "gelatin", "gelatine", "collagen",
        "honey", "beef", "chicken", "pork", "meat", "fish", "shellfish"
    ],
    "vegetarian": [
        "gelatin", "gelatine", "collagen", "beef", "chicken", "pork", "meat",
        "fish", "salmon", "tuna", "prawn", "crab", "lobster", "poultry"
    ]
}

def normalize_text(text: str) -> str:
    """Normalizes string for robust token and phrase matching."""
    return re.sub(r"[^\w\s]", " ", text.lower()).strip()


def parse_user_restrictions(raw_restrictions: Any) -> List[str]:
    """Parses user restrictions into a clean list of lowercased tokens."""
    if isinstance(raw_restrictions, list):
        items = raw_restrictions
    elif isinstance(raw_restrictions, str):
        items = [r.strip() for r in raw_restrictions.split(",") if r.strip()]
    else:
        items = []
    
    clean = []
    for item in items:
        norm = normalize_text(str(item))
        if norm:
            clean.append(norm)
    return clean


def check_allergens_and_restrictions(
    product_allergens: List[str],
    raw_ingredient_text: str,
    structured_ingredients: Optional[List[Dict[str, Any]]],
    user_restrictions: Any,
    dietary_preference: Optional[str] = None
) -> Dict[str, Any]:
    """
    Deterministically evaluates product label declarations against user restrictions.
    Returns conflicts, explanations, confidence tags, and conservative missing data notes.
    """
    restrictions = parse_user_restrictions(user_restrictions)
    diet_pref = normalize_text(dietary_preference or "")

    # Expand dietary preferences into restrictions if applicable
    dietary_keywords = DIETARY_RESTRICTION_KEYWORDS.get(diet_pref, [])
    
    conflicts: List[Dict[str, Any]] = []
    seen_conflict_keys = set()

    normalized_declared_allergens = [normalize_text(a) for a in (product_allergens or [])]
    normalized_ingredient_text = normalize_text(raw_ingredient_text or "")

    ingredient_tokens = [normalize_text(i.get("text", "")) for i in (structured_ingredients or [])]
    if not ingredient_tokens and raw_ingredient_text:
        ingredient_tokens = [normalize_text(t) for t in raw_ingredient_text.split(",") if t.strip()]

    # 1. Check declared allergens first (Confirmed Label Allergen)
    for user_res in restrictions:
        res_synonyms = ALLERGEN_SYNONYMS.get(user_res, [user_res])
        
        for decl_allergen in normalized_declared_allergens:
            for syn in res_synonyms:
                if syn in decl_allergen or decl_allergen in syn:
                    key = f"allergen:{user_res}:{decl_allergen}"
                    if key not in seen_conflict_keys:
                        seen_conflict_keys.add(key)
                        conflicts.append({
                            "type": "ALLERGEN_CONFLICT",
                            "user_restriction": user_res,
                            "matched_item": decl_allergen,
                            "source": "Declared Product Allergens",
                            "confidence": MatchConfidence.CONFIRMED_LABEL_ALLERGEN.value,
                            "explanation": (
                                f"Matches declared allergen '{decl_allergen}' on the product label. "
                                f"Directly conflicts with your restriction: '{user_res}'."
                            )
                        })

    # 2. Check declared ingredients (Confirmed Ingredient or Derivative Match)
    for user_res in restrictions:
        res_synonyms = ALLERGEN_SYNONYMS.get(user_res, [user_res])
        for ing in ingredient_tokens:
            for syn in res_synonyms:
                pattern = r"\b" + re.escape(syn) + r"\b"
                if re.search(pattern, ing):
                    confidence = (
                        MatchConfidence.CONFIRMED_INGREDIENT.value
                        if syn == user_res
                        else MatchConfidence.DERIVATIVE_MATCH.value
                    )
                    key = f"ingredient:{user_res}:{ing}"
                    if key not in seen_conflict_keys:
                        seen_conflict_keys.add(key)
                        conflicts.append({
                            "type": "INGREDIENT_CONFLICT",
                            "user_restriction": user_res,
                            "matched_item": ing,
                            "source": "Ingredient List",
                            "confidence": confidence,
                            "explanation": (
                                f"Ingredient '{ing}' contains '{syn}' which is a known form or derivative "
                                f"of your restriction '{user_res}'."
                            )
                        })

    # 3. Check Dietary Preference conflicts (e.g. Vegan / Vegetarian)
    if dietary_keywords:
        for keyword in dietary_keywords:
            # Check allergens
            for decl_allergen in normalized_declared_allergens:
                if keyword in decl_allergen:
                    key = f"diet:{diet_pref}:{decl_allergen}"
                    if key not in seen_conflict_keys:
                        seen_conflict_keys.add(key)
                        conflicts.append({
                            "type": "DIETARY_PREFERENCE_CONFLICT",
                            "user_restriction": f"{diet_pref.capitalize()} Diet",
                            "matched_item": decl_allergen,
                            "source": "Declared Product Allergens",
                            "confidence": MatchConfidence.CONFIRMED_LABEL_ALLERGEN.value,
                            "explanation": (
                                f"Product declares '{decl_allergen}', which typically conflicts with a "
                                f"{diet_pref} diet."
                            )
                        })
            # Check ingredients
            for ing in ingredient_tokens:
                pattern = r"\b" + re.escape(keyword) + r"\b"
                if re.search(pattern, ing):
                    key = f"diet:{diet_pref}:{ing}"
                    if key not in seen_conflict_keys:
                        seen_conflict_keys.add(key)
                        conflicts.append({
                            "type": "DIETARY_PREFERENCE_CONFLICT",
                            "user_restriction": f"{diet_pref.capitalize()} Diet",
                            "matched_item": ing,
                            "source": "Ingredient List",
                            "confidence": MatchConfidence.DERIVATIVE_MATCH.value,
                            "explanation": (
                                f"Ingredient '{ing}' contains '{keyword}', which conflicts with a "
                                f"{diet_pref} diet."
                            )
                        })

    # 4. Handle Missing Information Conservatively
    data_completeness_warnings = []
    if not normalized_ingredient_text and not ingredient_tokens:
        data_completeness_warnings.append(
            "Ingredient list was not provided on the label or record. Unknown ingredients could contain allergens."
        )
    if not normalized_declared_allergens and not ingredient_tokens:
        data_completeness_warnings.append(
            "Neither allergen warnings nor ingredients are declared. Absence of warnings does not mean the food is allergen-free."
        )

    has_conflicts = len(conflicts) > 0
    status = "CONFLICT_DETECTED" if has_conflicts else "NO_DECLARED_CONFLICTS_FOUND"

    return {
        "status": status,
        "has_conflicts": has_conflicts,
        "conflict_count": len(conflicts),
        "conflicts": conflicts,
        "data_completeness_warnings": data_completeness_warnings,
        "disclaimer": DISCLAIMER_TEXT
    }
