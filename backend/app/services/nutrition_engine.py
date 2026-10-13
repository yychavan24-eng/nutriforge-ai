"""
Deterministic Nutrition Calculation Engine for NutriForge AI.
Handles proportional serving-size scaling, nutrient target calculations,
and strict validation of missing/invalid nutrition values.
"""
from typing import Dict, Any, Optional, Tuple

STANDARD_NUTRIENT_UNITS = {
    "calories": "kcal",
    "protein": "g",
    "carbohydrates": "g",
    "total_sugar": "g",
    "added_sugar": "g",
    "total_fat": "g",
    "saturated_fat": "g",
    "trans_fat": "g",
    "sodium": "mg",
    "fibre": "g"
}

def scale_nutrient_proportional(
    label_value: Optional[float],
    label_serving_mass: float,
    consumed_serving_mass: float
) -> Optional[float]:
    """
    Scales a single nutrient value proportionally based on consumed serving mass.
    Formula: consumed_nutrient = (label_nutrient * consumed_serving_mass) / label_serving_mass

    Rules:
    - If label_value is None, returns None. Never silently convert missing to zero.
    - label_serving_mass must be > 0.
    - consumed_serving_mass must be >= 0.
    """
    if label_value is None:
        return None
    if label_serving_mass <= 0:
        raise ValueError(f"Label serving mass must be greater than zero, got {label_serving_mass}")
    if consumed_serving_mass < 0:
        raise ValueError(f"Consumed serving mass cannot be negative, got {consumed_serving_mass}")
    
    scaled = (float(label_value) * float(consumed_serving_mass)) / float(label_serving_mass)
    return round(scaled, 2)


def scale_product_nutrition(
    nutrition_data: Dict[str, Optional[float]],
    label_serving_mass: float,
    consumed_serving_mass: float
) -> Dict[str, Any]:
    """
    Scales an entire dictionary of nutrients to the consumed serving mass.
    Preserves None for missing nutrients and tags units explicitly.
    """
    if label_serving_mass <= 0:
        raise ValueError("Label serving mass must be greater than zero.")
    if consumed_serving_mass < 0:
        raise ValueError("Consumed serving mass cannot be negative.")

    multiplier = consumed_serving_mass / label_serving_mass
    scaled_nutrients: Dict[str, Optional[float]] = {}
    missing_nutrients = []

    for nutrient_key, unit in STANDARD_NUTRIENT_UNITS.items():
        raw_val = nutrition_data.get(nutrient_key)
        if raw_val is None:
            scaled_nutrients[nutrient_key] = None
            missing_nutrients.append(nutrient_key)
        else:
            try:
                scaled_nutrients[nutrient_key] = scale_nutrient_proportional(
                    float(raw_val), label_serving_mass, consumed_serving_mass
                )
            except (ValueError, TypeError):
                scaled_nutrients[nutrient_key] = None
                missing_nutrients.append(nutrient_key)

    return {
        "label_serving_mass": label_serving_mass,
        "consumed_serving_mass": consumed_serving_mass,
        "multiplier": round(multiplier, 3),
        "scaled_nutrients": scaled_nutrients,
        "units": STANDARD_NUTRIENT_UNITS,
        "missing_nutrients": missing_nutrients
    }


def calculate_target_contributions(
    scaled_nutrients: Dict[str, Optional[float]],
    daily_targets: Optional[Dict[str, float]]
) -> Dict[str, Any]:
    """
    Calculates each nutrient's percentage contribution to user-specified daily targets.
    Formula: percentage = (consumed_nutrient / daily_target) * 100
    
    If daily_targets is not provided or target is missing/zero, percentage is None.
    """
    if not daily_targets:
        return {}

    contributions = {}
    for nutrient_key, target_value in daily_targets.items():
        if target_value is None or target_value <= 0:
            continue
        
        nutrient_val = scaled_nutrients.get(nutrient_key)
        if nutrient_val is None:
            contributions[nutrient_key] = {
                "consumed": None,
                "target": target_value,
                "percentage": None,
                "status": "missing_data"
            }
        else:
            pct = round((nutrient_val / target_value) * 100.0, 1)
            contributions[nutrient_key] = {
                "consumed": nutrient_val,
                "target": target_value,
                "percentage": pct,
                "status": "exceeds" if pct > 100.0 else "within"
            }

    return contributions
