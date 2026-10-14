"""
Unit tests for NutriForge AI Ingredient Intelligence: Milestone 1.
Covers deterministic knowledge base lookup, compound parenthetical parsing,
normalization, unknown ingredient handling, and allergen engine independence.

Specific test areas covered:
1. Exact canonical-name matches.
2. Alias-to-canonical-name matches (including E-numbers/INS codes).
3. Case and whitespace normalization.
4. Nested parentheses and compound ingredient parsing.
5. Commas within nested ingredient statements.
6. Unknown ingredient handling.
7. Preservation of original label text.
8. Duplicate or ambiguous ingredient handling.
9. Invalid or empty input.
10. Regression checks confirming this service does not replace or alter allergen-engine behavior.
"""
import pytest
from app.services.ingredient_parser import (
    parse_ingredient_statement,
    split_top_level,
    normalize_whitespace_and_punctuation,
    ParsedIngredient
)
from app.services.ingredient_engine import (
    get_kb,
    lookup_ingredient,
    analyze_ingredients,
    enrich_parsed_node,
    IngredientStatus,
    UNCATALOGUED_LABEL,
    UNKNOWN_CONFIDENCE
)
from app.services.allergen_engine import (
    check_allergens_and_restrictions,
    MatchConfidence,
    DISCLAIMER_TEXT
)


# ==============================================================================
# 1. Exact Canonical-Name Matches
# ==============================================================================

def test_exact_canonical_name_matches():
    """Verify that exact canonical ingredient names match directly and return complete metadata."""
    canonical_samples = [
        ("Whey Protein Concentrate", "Protein Source"),
        ("Whey Protein Isolate", "Protein Source"),
        ("Milk Protein Concentrate", "Protein Source"),
        ("Soy Protein Isolate", "Protein Source"),
        ("Micellar Casein", "Protein Source"),
        ("Creatine Monohydrate", "Ergogenic Aid / Amino Acid Derivative"),
        ("Maltodextrin", "Carbohydrate / Bulking Agent"),
        ("Sucrose", "Nutritive Sweetener / Carbohydrate"),
        ("Glucose Syrup", "Nutritive Sweetener / Carbohydrate"),
        ("Sucralose", "Non-Nutritive Sweetener"),
        ("Stevia Extract", "Non-Nutritive Sweetener"),
        ("Soy Lecithin", "Emulsifier"),
        ("Xanthan Gum", "Stabilizer / Thickener"),
        ("Citric Acid", "Acidity Regulator / Acidulant"),
        ("Sodium Chloride", "Mineral / Electrolyte"),
        ("Cocoa Powder", "Flavoring / Whole Food Component"),
        ("Sunflower Oil", "Fat / Lipid"),
        ("Rolled Oats", "Whole Grain / Complex Carbohydrate"),
        ("Almonds", "Tree Nut / Whole Food Component"),
    ]

    for name, expected_category in canonical_samples:
        match = lookup_ingredient(name)
        assert match is not None, f"Failed to match canonical ingredient: {name}"
        record, matched_key = match
        assert record.canonical_name == name
        assert record.category == expected_category
        assert record.confidence == "HIGH"
        assert record.function is not None and len(record.function) > 0
        assert record.evidence_summary is not None and len(record.evidence_summary) > 0
        assert record.provenance is not None and len(record.provenance) > 0


# ==============================================================================
# 2. Alias-to-Canonical-Name Matches
# ==============================================================================

def test_alias_to_canonical_matches():
    """Verify common label acronyms, trade names, and additive E/INS codes map to canonical names."""
    alias_test_cases = [
        # Acronyms & common trade abbreviations
        ("WPI", "Whey Protein Isolate"),
        ("wpi90", "Whey Protein Isolate"),
        ("WPC", "Whey Protein Concentrate"),
        ("wpc80", "Whey Protein Concentrate"),
        ("MPC", "Milk Protein Concentrate"),
        ("SPI", "Soy Protein Isolate"),
        ("casein", "Micellar Casein"),
        ("creapure", "Creatine Monohydrate"),
        ("creatine", "Creatine Monohydrate"),
        ("sugar", "Sucrose"),
        ("cane sugar", "Sucrose"),
        ("table sugar", "Sucrose"),
        ("corn syrup", "Glucose Syrup"),
        ("splenda", "Sucralose"),
        ("stevia", "Stevia Extract"),
        ("steviol glycosides", "Stevia Extract"),
        ("salt", "Sodium Chloride"),
        ("table salt", "Sodium Chloride"),
        ("sea salt", "Sodium Chloride"),
        ("cocoa", "Cocoa Powder"),
        ("cacao powder", "Cocoa Powder"),
        ("oats", "Rolled Oats"),
        ("oat flakes", "Rolled Oats"),
        ("almond", "Almonds"),

        # Additive E-numbers & INS codes
        ("E955", "Sucralose"),
        ("e 955", "Sucralose"),
        ("ins 955", "Sucralose"),
        ("INS-955", "Sucralose"),
        ("E415", "Xanthan Gum"),
        ("ins 415", "Xanthan Gum"),
        ("E330", "Citric Acid"),
        ("INS 330", "Citric Acid"),
        ("E322", "Soy Lecithin"),
        ("INS 322", "Soy Lecithin"),
        ("E960", "Stevia Extract"),
        ("INS 960", "Stevia Extract"),
        ("E950", "Acesulfame Potassium"),
        ("INS 950", "Acesulfame Potassium"),
    ]

    for alias, expected_canonical in alias_test_cases:
        match = lookup_ingredient(alias)
        assert match is not None, f"Failed to match alias '{alias}' to '{expected_canonical}'"
        record, _ = match
        assert record.canonical_name == expected_canonical, (
            f"Alias '{alias}' matched to '{record.canonical_name}', expected '{expected_canonical}'"
        )


# ==============================================================================
# 3. Case and Whitespace Normalization
# ==============================================================================

def test_case_and_whitespace_normalization():
    """Verify that messy casing, redundant internal spaces, and harmless punctuation normalize cleanly."""
    messy_inputs = [
        ("  wHeY   pRoTeIn   iSoLaTe  ", "Whey Protein Isolate"),
        ("MALTODEXTRIN", "Maltodextrin"),
        ("   sOy    lEcItHiN .  ", "Soy Lecithin"),
        ("Citric Acid*", "Citric Acid"),
        ("Creatine Monohydrate†", "Creatine Monohydrate"),
        ("\t\n  Rolled   Oats  \r\n", "Rolled Oats"),
        ("  Xanthan   Gum; ", "Xanthan Gum"),
        ("  e-955  ", "Sucralose"),
        ("  INS - 955  ", "Sucralose"),
    ]

    for messy, expected_canonical in messy_inputs:
        match = lookup_ingredient(messy)
        assert match is not None, f"Failed to normalize and match: '{messy}'"
        record, _ = match
        assert record.canonical_name == expected_canonical


# ==============================================================================
# 4. Nested Parentheses and Compound Ingredient Parsing
# ==============================================================================

def test_nested_parentheses_and_compound_parsing():
    """Verify parsing of nested parenthetical structures with square and round brackets."""
    raw = "Protein Blend (Whey Protein Isolate, Milk Protein Concentrate [Filtered]), Cocoa, Soy Lecithin"
    result = analyze_ingredients(raw)

    assert len(result.ingredients) == 3

    # 1. Protein Blend compound node
    blend = result.ingredients[0]
    assert blend.raw_text == "Protein Blend (Whey Protein Isolate, Milk Protein Concentrate [Filtered])"
    assert blend.normalized_name == "protein blend"
    assert blend.is_compound is True
    assert len(blend.children) == 2

    # Child 1 of blend
    child1 = blend.children[0]
    assert child1.canonical_name == "Whey Protein Isolate"
    assert child1.status == IngredientStatus.CATALOGUED.value
    assert child1.category == "Protein Source"

    # Child 2 of blend (has nested brackets)
    child2 = blend.children[1]
    assert child2.canonical_name == "Milk Protein Concentrate"
    assert child2.is_compound is True
    assert len(child2.children) == 1
    assert child2.children[0].raw_text == "Filtered"

    # 2. Cocoa
    cocoa = result.ingredients[1]
    assert cocoa.canonical_name == "Cocoa Powder"
    assert cocoa.status == IngredientStatus.CATALOGUED.value

    # 3. Soy Lecithin
    lecithin = result.ingredients[2]
    assert lecithin.canonical_name == "Soy Lecithin"
    assert lecithin.status == IngredientStatus.CATALOGUED.value


# ==============================================================================
# 5. Commas within Nested Ingredient Statements
# ==============================================================================

def test_commas_within_nested_parentheses():
    """Verify commas inside brackets do NOT split the top-level ingredient list."""
    statement = "Protein Blend (Whey Protein Isolate, Milk Protein Concentrate), Cocoa, Soy Lecithin"

    # Top-level splitter
    tokens, is_balanced, err = split_top_level(statement)
    assert is_balanced is True
    assert err is None
    assert len(tokens) == 3
    assert tokens[0] == "Protein Blend (Whey Protein Isolate, Milk Protein Concentrate)"
    assert tokens[1] == "Cocoa"
    assert tokens[2] == "Soy Lecithin"

    # End-to-end analysis
    result = analyze_ingredients(statement)
    assert len(result.ingredients) == 3
    assert result.ingredients[0].raw_text == "Protein Blend (Whey Protein Isolate, Milk Protein Concentrate)"
    assert len(result.ingredients[0].children) == 2
    assert result.ingredients[0].children[0].canonical_name == "Whey Protein Isolate"
    assert result.ingredients[0].children[1].canonical_name == "Milk Protein Concentrate"


# ==============================================================================
# 6. Unknown Ingredient Handling
# ==============================================================================

def test_unknown_ingredient_handling():
    """Verify unknown ingredients are flagged as Uncatalogued ingredient with UNKNOWN confidence and no safety inference."""
    statement = "Whey Protein Isolate, Synthetico-Compound 99, Astragalus Root Extract"
    result = analyze_ingredients(statement)

    assert len(result.ingredients) == 3

    # Known
    assert result.ingredients[0].status == IngredientStatus.CATALOGUED.value
    assert result.ingredients[0].canonical_name == "Whey Protein Isolate"

    # Unknown 1
    unknown1 = result.ingredients[1]
    assert unknown1.status == IngredientStatus.UNCATALOGUED.value
    assert unknown1.canonical_name is None
    assert unknown1.category == UNCATALOGUED_LABEL
    assert unknown1.confidence == UNKNOWN_CONFIDENCE
    assert unknown1.function is None
    assert unknown1.evidence_summary is None
    assert unknown1.fitness_context is None

    # Unknown 2
    unknown2 = result.ingredients[2]
    assert unknown2.status == IngredientStatus.UNCATALOGUED.value
    assert unknown2.canonical_name is None
    assert unknown2.category == UNCATALOGUED_LABEL
    assert unknown2.confidence == UNKNOWN_CONFIDENCE


# ==============================================================================
# 7. Preservation of Original Label Text
# ==============================================================================

def test_preservation_of_original_label_text():
    """Verify the original raw text is preserved verbatim across both parents and child nodes."""
    raw_statement = "  Protein Matrix ( Whey Protein Isolate , Milk Protein Concentrate ) ,  DUTCH COCOA* ,  Splenda (Sucralose) "
    result = analyze_ingredients(raw_statement)

    assert result.raw_statement == raw_statement

    # First token raw text preserved
    assert result.ingredients[0].raw_text == "Protein Matrix ( Whey Protein Isolate , Milk Protein Concentrate )"
    assert result.ingredients[0].children[0].raw_text == "Whey Protein Isolate"
    assert result.ingredients[0].children[1].raw_text == "Milk Protein Concentrate"

    # Second token raw text preserved
    assert result.ingredients[1].raw_text == "DUTCH COCOA*"
    assert result.ingredients[1].canonical_name == "Cocoa Powder"

    # Third token raw text preserved
    assert result.ingredients[2].raw_text == "Splenda (Sucralose)"
    assert result.ingredients[2].canonical_name == "Sucralose"


# ==============================================================================
# 8. Duplicate and Repeated Ingredient Handling
# ==============================================================================

def test_duplicate_and_repeated_ingredient_handling():
    """Verify duplicate ingredients in the statement are preserved in order without dropping tokens."""
    statement = "Whey Protein Isolate, Cocoa Powder, Whey Protein Isolate, Salt"
    result = analyze_ingredients(statement)

    assert len(result.ingredients) == 4
    assert result.ingredients[0].canonical_name == "Whey Protein Isolate"
    assert result.ingredients[1].canonical_name == "Cocoa Powder"
    assert result.ingredients[2].canonical_name == "Whey Protein Isolate"
    assert result.ingredients[3].canonical_name == "Sodium Chloride"
    assert result.total_ingredients == 4
    assert result.catalogued_count == 4


# ==============================================================================
# 9. Invalid and Empty Input Handling
# ==============================================================================

def test_invalid_and_empty_inputs():
    """Verify safe, graceful handling of empty strings, None, punctuation-only strings, and malformed brackets."""
    # None input
    res_none = analyze_ingredients(None)
    assert res_none.total_ingredients == 0
    assert len(res_none.ingredients) == 0
    assert res_none.has_uncertainty is False

    # Empty string
    res_empty = analyze_ingredients("")
    assert res_empty.total_ingredients == 0
    assert len(res_empty.ingredients) == 0

    # Whitespace only
    res_spaces = analyze_ingredients("    \t\n  ")
    assert res_spaces.total_ingredients == 0
    assert len(res_spaces.ingredients) == 0

    # Punctuation only
    res_punct = analyze_ingredients(",,, ; ; ; ,,,")
    assert res_punct.total_ingredients == 0
    assert len(res_punct.ingredients) == 0

    # Unclosed parenthesis (malformed label)
    unclosed = "Protein Blend (Whey Protein Isolate, Cocoa Powder"
    res_unclosed = analyze_ingredients(unclosed)
    assert res_unclosed.has_uncertainty is True
    assert len(res_unclosed.ingredients) == 1
    # Retains compound text and marks uncertainty rather than silently creating corrupt fragments
    assert res_unclosed.ingredients[0].has_uncertainty is True
    assert "Unclosed bracket" in res_unclosed.ingredients[0].uncertainty_reason
    assert res_unclosed.ingredients[0].raw_text == unclosed

    # Unmatched closing bracket
    unmatched = "Whey Protein Isolate), Cocoa"
    res_unmatched = analyze_ingredients(unmatched)
    assert res_unmatched.has_uncertainty is True
    assert len(res_unmatched.ingredients) == 1
    assert "Unmatched closing" in res_unmatched.ingredients[0].uncertainty_reason


# ==============================================================================
# 10. Regression Checks: Allergen Engine Independence
# ==============================================================================

def test_allergen_engine_behavior_is_not_altered():
    """
    Verify this service does NOT replace, alter, or influence allergen-engine decisions.
    Allergen conflicts and confidence levels must remain strictly determined by allergen_engine.py.
    """
    # 1. Milk allergen check
    res_milk = check_allergens_and_restrictions(
        product_allergens=["Milk"],
        raw_ingredient_text="Whey Protein Isolate, Cocoa, Sucralose",
        structured_ingredients=[{"text": "Whey Protein Isolate"}, {"text": "Cocoa"}],
        user_restrictions="milk",
        dietary_preference=None
    )
    assert len(res_milk["conflicts"]) >= 1
    # Check declared allergen conflict
    decl_conflict = [c for c in res_milk["conflicts"] if c["source"] == "Declared Product Allergens"][0]
    assert decl_conflict["confidence"] == MatchConfidence.CONFIRMED_LABEL_ALLERGEN.value
    assert res_milk["disclaimer"] == DISCLAIMER_TEXT

    # 2. Vegan dietary restriction check (Whey is non-vegan)
    res_vegan = check_allergens_and_restrictions(
        product_allergens=[],
        raw_ingredient_text="Whey Protein Concentrate, Oats",
        structured_ingredients=[{"text": "Whey Protein Concentrate"}, {"text": "Oats"}],
        user_restrictions="",
        dietary_preference="vegan"
    )
    assert len(res_vegan["conflicts"]) >= 1
    vegan_conflict = res_vegan["conflicts"][0]
    assert vegan_conflict["type"] == "DIETARY_PREFERENCE_CONFLICT"
    assert "vegan" in vegan_conflict["user_restriction"].lower()

    # 3. Confirm ingredient_engine does NOT set allergen status
    ing_result = analyze_ingredients("Whey Protein Isolate, Cocoa, Soy Lecithin")
    for ing in ing_result.ingredients:
        # Check dictionary conversion
        d = ing.to_dict()
        assert "is_allergen" not in d, "Ingredient engine must not make allergen determinations"
