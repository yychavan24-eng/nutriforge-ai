"""
Smart Compare Service for NutriForge AI.
Provides transparent, field-by-field comparison, trade-off explanations,
goal-aware evaluation, and allergen-safe warnings across products.
"""
from typing import List, Dict, Any, Optional
from app.services.allergen_engine import check_allergens_and_restrictions

STANDARD_COMPARE_FIELDS = [
    {"key": "serving_size", "label": "Serving Size", "unit": ""},
    {"key": "calories", "label": "Calories", "unit": "kcal", "type": "number"},
    {"key": "protein", "label": "Protein", "unit": "g", "type": "number"},
    {"key": "carbohydrates", "label": "Carbohydrates", "unit": "g", "type": "number"},
    {"key": "total_sugar", "label": "Total Sugar", "unit": "g", "type": "number"},
    {"key": "added_sugar", "label": "Added Sugar", "unit": "g", "type": "number"},
    {"key": "total_fat", "label": "Total Fat", "unit": "g", "type": "number"},
    {"key": "saturated_fat", "label": "Saturated Fat", "unit": "g", "type": "number"},
    {"key": "trans_fat", "label": "Trans Fat", "unit": "g", "type": "number"},
    {"key": "sodium", "label": "Sodium", "unit": "mg", "type": "number"},
    {"key": "fibre", "label": "Fibre", "unit": "g", "type": "number"},
]

def generate_field_by_field_comparison(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Builds a structured field-by-field table preserving missing data visibly.
    """
    rows = []
    for field in STANDARD_COMPARE_FIELDS:
        key = field["key"]
        values = {}
        for p in products:
            val = p.get(key)
            # Distinguish None/missing from 0.0
            values[p["id"]] = val
        rows.append({
            "key": key,
            "label": field["label"],
            "unit": field["unit"],
            "values": values
        })
    return rows


def generate_trade_offs(products: List[Dict[str, Any]]) -> List[str]:
    """
    Generates transparent pairwise trade-offs rather than declaring a single 'winner'.
    """
    if len(products) < 2:
        return ["Select at least two products to evaluate comparative trade-offs."]

    trade_offs = []
    p1 = products[0]
    p2 = products[1]

    # Protein comparison
    prot1 = p1.get("protein")
    prot2 = p2.get("protein")
    if prot1 is not None and prot2 is not None:
        diff_prot = round(abs(prot1 - prot2), 1)
        if diff_prot > 0.5:
            higher_p = p1["name"] if prot1 > prot2 else p2["name"]
            lower_p = p2["name"] if prot1 > prot2 else p1["name"]
            trade_offs.append(
                f"{higher_p} provides {diff_prot}g more protein per serving than {lower_p}."
            )

    # Sugar comparison
    sug1 = p1.get("total_sugar")
    sug2 = p2.get("total_sugar")
    if sug1 is not None and sug2 is not None:
        diff_sug = round(abs(sug1 - sug2), 1)
        if diff_sug > 1.0:
            lower_sug_p = p1["name"] if sug1 < sug2 else p2["name"]
            higher_sug_p = p2["name"] if sug1 < sug2 else p1["name"]
            trade_offs.append(
                f"{lower_sug_p} has {diff_sug}g less total sugar compared to {higher_sug_p}."
            )

    # Calorie comparison
    cal1 = p1.get("calories")
    cal2 = p2.get("calories")
    if cal1 is not None and cal2 is not None:
        diff_cal = round(abs(cal1 - cal2), 1)
        if diff_cal > 10:
            lower_cal_p = p1["name"] if cal1 < cal2 else p2["name"]
            higher_cal_p = p2["name"] if cal1 < cal2 else p1["name"]
            trade_offs.append(
                f"{lower_cal_p} is lower in energy density ({diff_cal} kcal less) than {higher_cal_p}."
            )

    # Fibre comparison
    fib1 = p1.get("fibre")
    fib2 = p2.get("fibre")
    if fib1 is not None and fib2 is not None:
        diff_fib = round(abs(fib1 - fib2), 1)
        if diff_fib > 1.0:
            higher_fib_p = p1["name"] if fib1 > fib2 else p2["name"]
            lower_fib_p = p2["name"] if fib1 > fib2 else p1["name"]
            trade_offs.append(
                f"{higher_fib_p} contains {diff_fib}g more dietary fibre than {lower_fib_p}."
            )

    # Standardized 100g serving comparability check
    m1 = float(p1.get("serving_size_value", 0.0) or 0.0)
    m2 = float(p2.get("serving_size_value", 0.0) or 0.0)
    if m1 > 0 and m2 > 0 and abs(m1 - m2) >= 5 and prot1 is not None and prot2 is not None:
        p1_100 = round((prot1 * 100.0) / m1, 1)
        p2_100 = round((prot2 * 100.0) / m2, 1)
        trade_offs.append(
            f"Serving size note: Declared portions differ ({p1['name']}: {m1}g vs {p2['name']}: {m2}g). "
            f"Standardized per 100g: {p1['name']} provides {p1_100}g protein/100g vs {p2['name']} with {p2_100}g protein/100g."
        )

    if not trade_offs:
        trade_offs.append(
            "Products have very similar nutritional profiles across primary macronutrients."
        )

    return trade_offs


def evaluate_product_alignment(
    product: Dict[str, Any],
    profile: Any
) -> Dict[str, Any]:
    """
    Evaluates a single product's alignment with user goal and priorities.
    Also executes deterministic allergen conflict detection.
    Maintains backward compatibility with Phase 1 factor/explanation format.
    """
    priorities = getattr(profile, "priorities", []) or []
    goal = getattr(profile, "goal", "general")
    restrictions = getattr(profile, "restrictions", "")
    dietary_pref = getattr(profile, "dietaryPreference", None)

    # Run allergen check
    allergen_check = check_allergens_and_restrictions(
        product_allergens=product.get("allergens", []),
        raw_ingredient_text=product.get("raw_ingredient_text", ""),
        structured_ingredients=product.get("structured_ingredients", []),
        user_restrictions=restrictions,
        dietary_preference=dietary_pref
    )

    positive_priorities = ["protein", "fibre"]
    overall_score = 0.5
    factors = {}

    for prio in priorities:
        key = prio
        if prio == "sugar":
            key = "total_sugar"
        val = product.get(key, 0.0) or 0.0

        if prio in positive_priorities:
            contribution = min((val / 100.0) * 0.4, 0.4)
            direction = "positive"
        else:
            contribution = max(- (val / 100.0) * 0.4, -0.4)
            direction = "negative"

        factors[prio] = {
            "value": val,
            "weight": 1.0,
            "direction": direction,
            "contribution": round(contribution, 3)
        }
        overall_score += contribution

    # Goal adjustment:
    goal_note = ""
    if goal == "muscle_gain":
        prot = product.get("protein") or 0.0
        if prot >= 15.0:
            overall_score += 0.1
            goal_note = "High protein supports muscle protein synthesis goals."
        elif prot < 5.0:
            overall_score -= 0.1
            goal_note = "Lower protein density may require supplementation for muscle gain."
    elif goal == "fat_loss":
        sugar = product.get("total_sugar") or 0.0
        cal = product.get("calories") or 0.0
        if sugar <= 5.0 and cal <= 200:
            overall_score += 0.1
            goal_note = "Moderate calories and low sugar align well with fat loss."
        elif sugar > 10.0:
            overall_score -= 0.1
            goal_note = "Higher sugar content may be less optimal for calorie restriction."

    overall_score = max(0.0, min(1.0, overall_score))

    # Base explanation
    explain_str = "Neutral match."
    if priorities:
        top_prio = priorities[0]
        if top_prio in positive_priorities:
            explain_str = f"{top_prio.capitalize()} contributed positively because it is one of your highest selected priorities. This product provides {product.get(top_prio, 0)}g."
        else:
            explain_str = f"{top_prio.capitalize()} contributed negatively to alignment based on your priorities. This product contains {product.get(top_prio if top_prio != 'sugar' else 'total_sugar', 0)}g."

    if goal_note:
        explain_str = f"{explain_str} {goal_note}"

    # Critical rule: NEVER let high score conceal an allergen conflict
    if allergen_check["has_conflicts"]:
        explain_str = f"[ALLERGEN WARNING] {explain_str}"

    return {
        "product": product,
        "overallAlignment": round(overall_score, 2),
        "factors": factors,
        "explanation": explain_str,
        "goal_note": goal_note,
        "allergen_status": allergen_check
    }


def compare_multiple_products(
    products: List[Dict[str, Any]],
    profile: Any
) -> Dict[str, Any]:
    """
    Executes full multi-product Smart Compare analysis.
    """
    personalized_results = [
        evaluate_product_alignment(p, profile) for p in products
    ]
    field_comparison = generate_field_by_field_comparison(products)
    trade_offs = generate_trade_offs(products)

    return {
        "comparison": personalized_results,
        "field_comparison": field_comparison,
        "trade_offs": trade_offs
    }
