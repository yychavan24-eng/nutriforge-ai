"""
Deterministic Compound Ingredient Parser for NutriForge AI.
Handles ordinary comma-delimited lists and nested parenthetical statements
(e.g., 'Protein Blend (Whey Protein Isolate, Milk Protein Concentrate), Cocoa, Soy Lecithin').
Preserves parent-child relationships, raw text, and detects structural uncertainties
(such as unclosed parentheses) without discarding text.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
import re

OPEN_TO_CLOSE = {'(': ')', '[': ']', '{': '}'}
CLOSE_TO_OPEN = {')': '(', ']': '[', '}': '{'}

# Matches quantitative percentage or dosage declarations inside brackets, e.g. "80%", "min. 80%", "15g", "approx 10%"
IS_QUANT_DECLARATION = re.compile(
    r"^(?:approx\.?\s*)?(?:min\.?\s*|max\.?\s*)?\d+(?:\.\d+)?\s*(?:%|g|mg|kcal)?$",
    re.IGNORECASE
)


@dataclass
class ParsedIngredient:
    """
    Represents an ingredient parsed from label text.
    Preserves exact original raw_text, cleaned name, child ingredients,
    and uncertainty flags.
    """
    raw_text: str
    clean_name: str
    children: List['ParsedIngredient'] = field(default_factory=list)
    specification: Optional[str] = None
    has_uncertainty: bool = False
    uncertainty_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "clean_name": self.clean_name,
            "specification": self.specification,
            "has_uncertainty": self.has_uncertainty,
            "uncertainty_reason": self.uncertainty_reason,
            "children": [c.to_dict() for c in self.children]
        }


def normalize_whitespace_and_punctuation(text: str) -> str:
    """
    Normalizes whitespace and strips harmless edge punctuation.
    Collapses internal whitespace, removes footnote symbols (*, †, •).
    """
    if not text:
        return ""
    # Strip footnote marks and bullet characters
    cleaned = re.sub(r"[\*†‡•\u2022]", "", text)
    # Strip leading/trailing edge punctuation and whitespace
    cleaned = cleaned.strip(" .,;:!?\t\r\n\"'")
    # Collapse multiple whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def split_top_level(text: str) -> Tuple[List[str], bool, Optional[str]]:
    """
    Splits text by top-level delimiters (commas or semicolons) that are NOT
    enclosed within brackets/parentheses.

    Returns:
        (tokens, is_balanced, error_message)
    """
    if not text:
        return [], True, None

    tokens: List[str] = []
    current: List[str] = []
    stack: List[Tuple[str, int]] = []  # (bracket_char, index)

    for idx, char in enumerate(text):
        if char in OPEN_TO_CLOSE:
            stack.append((char, idx))
            current.append(char)
        elif char in CLOSE_TO_OPEN:
            expected_open = CLOSE_TO_OPEN[char]
            if stack and stack[-1][0] == expected_open:
                stack.pop()
                current.append(char)
            else:
                # Unmatched closing bracket
                return [text], False, f"Unmatched closing '{char}' at index {idx}"
        elif (char == ',' or char == ';') and len(stack) == 0:
            token = "".join(current).strip()
            if token:
                tokens.append(token)
            current = []
        else:
            current.append(char)

    if stack:
        # Unclosed bracket(s)
        unclosed_char, unclosed_idx = stack[-1]
        return [text], False, f"Unclosed bracket '{unclosed_char}' opened at index {unclosed_idx}"

    last_token = "".join(current).strip()
    if last_token:
        tokens.append(last_token)

    return tokens, True, None


def extract_first_bracket_group(text: str) -> Optional[Tuple[str, str, str, str]]:
    """
    Finds the first balanced bracket group in text.
    Returns:
        (prefix_text, open_bracket, inner_text, suffix_text) or None
    """
    if not text:
        return None

    open_idx = -1
    open_char = ''
    close_char = ''

    for idx, char in enumerate(text):
        if char in OPEN_TO_CLOSE:
            open_idx = idx
            open_char = char
            close_char = OPEN_TO_CLOSE[char]
            break

    if open_idx == -1:
        return None

    depth = 0
    close_idx = -1
    for idx in range(open_idx, len(text)):
        char = text[idx]
        if char == open_char:
            depth += 1
        elif char == close_char:
            depth -= 1
            if depth == 0:
                close_idx = idx
                break

    if close_idx == -1:
        # Unclosed bracket group
        return None

    prefix = text[:open_idx].strip()
    inner = text[open_idx + 1:close_idx].strip()
    suffix = text[close_idx + 1:].strip()
    return prefix, open_char, inner, suffix


def parse_single_token(raw_token: str) -> ParsedIngredient:
    """
    Parses a single ingredient token which may contain parenthetical children or specifications.
    Preserves exact raw_text and handles nested brackets recursively.
    """
    cleaned = normalize_whitespace_and_punctuation(raw_token)
    if not cleaned:
        return ParsedIngredient(raw_text=raw_token, clean_name="")

    bracket_group = extract_first_bracket_group(raw_token)
    if not bracket_group:
        # Check if there are any stray brackets
        for b in "()[]{}":
            if b in raw_token:
                return ParsedIngredient(
                    raw_text=raw_token,
                    clean_name=cleaned,
                    has_uncertainty=True,
                    uncertainty_reason="Unbalanced bracket syntax in token"
                )
        return ParsedIngredient(raw_text=raw_token, clean_name=cleaned)

    prefix, _, inner, suffix = bracket_group

    # If the inner text is a quantitative declaration (e.g., "80%", "15g")
    if IS_QUANT_DECLARATION.match(inner):
        clean_name = normalize_whitespace_and_punctuation(prefix)
        if suffix:
            clean_name = normalize_whitespace_and_punctuation(f"{clean_name} {suffix}")
        return ParsedIngredient(
            raw_text=raw_token,
            clean_name=clean_name or raw_token,
            specification=inner
        )

    # If the inner text contains multiple child ingredients or nested items
    inner_tokens, is_balanced, error_msg = split_top_level(inner)

    children: List[ParsedIngredient] = []
    if is_balanced:
        for child_token in inner_tokens:
            child_node = parse_single_token(child_token)
            if child_node.clean_name or child_node.raw_text:
                children.append(child_node)
    else:
        children.append(ParsedIngredient(
            raw_text=inner,
            clean_name=normalize_whitespace_and_punctuation(inner),
            has_uncertainty=True,
            uncertainty_reason=error_msg
        ))

    parent_name = normalize_whitespace_and_punctuation(prefix)
    if suffix:
        parent_name = normalize_whitespace_and_punctuation(f"{parent_name} {suffix}")
    if not parent_name:
        # If no outer text (e.g. "(Whey Protein, Casein)"), use compound inner as identifier
        parent_name = normalize_whitespace_and_punctuation(inner)

    return ParsedIngredient(
        raw_text=raw_token,
        clean_name=parent_name,
        children=children,
        has_uncertainty=not is_balanced,
        uncertainty_reason=error_msg
    )


def parse_ingredient_statement(raw_statement: Optional[str]) -> List[ParsedIngredient]:
    """
    Deterministic entrypoint for parsing a full ingredient declaration statement.
    Splits top-level items on commas/semicolons while respecting parentheses.
    Preserves raw text, parent-child structures, and flags unbalanced syntax without data loss.
    """
    if raw_statement is None:
        return []

    text = raw_statement.strip()
    if not text:
        return []

    top_tokens, is_balanced, error_msg = split_top_level(text)

    if not is_balanced:
        # Retain original compound text and mark uncertainty instead of silently generating incorrect fragments
        return [
            ParsedIngredient(
                raw_text=text,
                clean_name=normalize_whitespace_and_punctuation(text),
                has_uncertainty=True,
                uncertainty_reason=error_msg or "Unbalanced parentheses or brackets in ingredient statement."
            )
        ]

    results: List[ParsedIngredient] = []
    for token in top_tokens:
        clean = normalize_whitespace_and_punctuation(token)
        if clean:
            results.append(parse_single_token(token))

    return results
