"""
Deterministic Ingredient Intelligence Engine for NutriForge AI.
Provides knowledge-base lookup, alias resolution, normalization, and compound enrichment.
Grounds all ingredient data strictly in version-controlled reference standards.
Unknown ingredients are explicitly tagged as 'Uncatalogued ingredient' with UNKNOWN confidence.
Never infers safety, toxicity, whole-food status, or allergen classifications.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
import json
import os
import re
from pathlib import Path

from app.services.ingredient_parser import (
    ParsedIngredient,
    parse_ingredient_statement,
    parse_single_token,
    split_top_level,
    normalize_whitespace_and_punctuation
)

DEFAULT_KB_PATH = Path(__file__).resolve().parent.parent / "data" / "ingredients_kb.json"

UNCATALOGUED_LABEL = "Uncatalogued ingredient"
UNKNOWN_CONFIDENCE = "UNKNOWN"
UNCATALOGUED_PROVENANCE = "Uncatalogued / Not in Knowledge Base"


class IngredientStatus(str, Enum):
    CATALOGUED = "CATALOGUED"
    UNCATALOGUED = "UNCATALOGUED"


@dataclass
class IngredientRecord:
    canonical_name: str
    synonyms: List[str]
    category: str
    function: str
    evidence_summary: str
    fitness_context: Optional[str]
    provenance: str
    confidence: str


@dataclass
class EnrichedIngredient:
    """
    Structured, enriched representation of an ingredient.
    Preserves raw text and hierarchy while providing deterministic KB metadata.
    """
    raw_text: str
    normalized_name: str
    canonical_name: Optional[str]
    matched_alias: Optional[str]
    category: str
    function: Optional[str]
    evidence_summary: Optional[str]
    fitness_context: Optional[str]
    provenance: Optional[str]
    confidence: str
    status: str
    is_compound: bool = False
    specification: Optional[str] = None
    children: List['EnrichedIngredient'] = field(default_factory=list)
    has_uncertainty: bool = False
    uncertainty_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "normalized_name": self.normalized_name,
            "canonical_name": self.canonical_name,
            "matched_alias": self.matched_alias,
            "category": self.category,
            "function": self.function,
            "evidence_summary": self.evidence_summary,
            "fitness_context": self.fitness_context,
            "provenance": self.provenance,
            "confidence": self.confidence,
            "status": self.status,
            "is_compound": self.is_compound,
            "specification": self.specification,
            "has_uncertainty": self.has_uncertainty,
            "uncertainty_reason": self.uncertainty_reason,
            "children": [c.to_dict() for c in self.children]
        }


@dataclass
class IngredientAnalysisResult:
    """
    Complete analysis result for an ingredient statement.
    """
    raw_statement: str
    ingredients: List[EnrichedIngredient]
    total_ingredients: int
    catalogued_count: int
    uncatalogued_count: int
    has_uncertainty: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "raw_statement": self.raw_statement,
            "total_ingredients": self.total_ingredients,
            "catalogued_count": self.catalogued_count,
            "uncatalogued_count": self.uncatalogued_count,
            "has_uncertainty": self.has_uncertainty,
            "ingredients": [i.to_dict() for i in self.ingredients]
        }


def _make_lookup_key(text: str) -> str:
    """Normalizes case, removes hyphens, and trims harmless whitespace/punctuation."""
    norm = normalize_whitespace_and_punctuation(text).lower()
    norm = re.sub(r"[-_.]", " ", norm)
    return re.sub(r"\s+", " ", norm).strip()


def _make_compact_key(text: str) -> str:
    """Removes all non-alphanumeric characters for robust alias indexing (e.g., ins-955 -> ins955)."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


class IngredientKnowledgeBase:
    """
    In-memory registry and lookup index for curated ingredients.
    Deterministic, offline, and thread-safe.
    """
    _instance: Optional['IngredientKnowledgeBase'] = None

    def __init__(self, kb_path: Optional[Path] = None):
        self.kb_path = kb_path or DEFAULT_KB_PATH
        self.records: List[IngredientRecord] = []
        self._canonical_index: Dict[str, IngredientRecord] = {}
        self._synonym_index: Dict[str, IngredientRecord] = {}
        self._compact_index: Dict[str, Tuple[IngredientRecord, str]] = {}
        self._load_and_index()

    def _load_and_index(self) -> None:
        if not os.path.exists(self.kb_path):
            raise FileNotFoundError(f"Ingredient Knowledge Base not found at {self.kb_path}")

        with open(self.kb_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        raw_list = data.get("ingredients", [])
        for item in raw_list:
            rec = IngredientRecord(
                canonical_name=item["canonical_name"],
                synonyms=item.get("synonyms", []),
                category=item["category"],
                function=item["function"],
                evidence_summary=item["evidence_summary"],
                fitness_context=item.get("fitness_context"),
                provenance=item.get("provenance", "NutriForge Curated Registry"),
                confidence=item.get("confidence", "HIGH")
            )
            self.records.append(rec)

            # Index canonical name
            canon_lower = rec.canonical_name.lower().strip()
            self._canonical_index[canon_lower] = rec
            self._synonym_index[canon_lower] = rec
            self._compact_index[_make_compact_key(canon_lower)] = (rec, rec.canonical_name)

            # Index all synonyms and additive numbers
            for syn in rec.synonyms:
                syn_norm = normalize_whitespace_and_punctuation(syn).lower()
                self._synonym_index[syn_norm] = rec
                self._synonym_index[_make_lookup_key(syn)] = rec
                compact = _make_compact_key(syn)
                if compact:
                    self._compact_index[compact] = (rec, syn)

    @classmethod
    def get_instance(cls, kb_path: Optional[Path] = None) -> 'IngredientKnowledgeBase':
        if cls._instance is None or (kb_path and kb_path != cls._instance.kb_path):
            cls._instance = IngredientKnowledgeBase(kb_path)
        return cls._instance

    def lookup(self, name: str) -> Optional[Tuple[IngredientRecord, str]]:
        """
        Deterministically matches an ingredient string against the registry.
        Returns (IngredientRecord, matched_alias) or None.
        """
        if not name:
            return None

        cleaned = normalize_whitespace_and_punctuation(name).lower()
        if not cleaned:
            return None

        # 1. Exact canonical check
        if cleaned in self._canonical_index:
            rec = self._canonical_index[cleaned]
            return rec, rec.canonical_name

        # 2. Exact synonym check
        if cleaned in self._synonym_index:
            return self._synonym_index[cleaned], cleaned

        # 3. Lookup key (spaces instead of dashes/periods)
        lookup_key = _make_lookup_key(name)
        if lookup_key in self._synonym_index:
            return self._synonym_index[lookup_key], lookup_key

        # 4. Compact alphanumeric match (e.g., ins-955 -> ins955)
        compact = _make_compact_key(name)
        if compact in self._compact_index:
            rec, matched_syn = self._compact_index[compact]
            return rec, matched_syn

        return None


def get_kb(kb_path: Optional[Path] = None) -> IngredientKnowledgeBase:
    """Returns the singleton Knowledge Base instance."""
    return IngredientKnowledgeBase.get_instance(kb_path)


def lookup_ingredient(name: str, kb: Optional[IngredientKnowledgeBase] = None) -> Optional[Tuple[IngredientRecord, str]]:
    """Helper to lookup an individual ingredient string."""
    registry = kb or get_kb()
    return registry.lookup(name)


def enrich_parsed_node(
    parsed: ParsedIngredient,
    kb: Optional[IngredientKnowledgeBase] = None
) -> EnrichedIngredient:
    """
    Enriches a ParsedIngredient node by looking up its cleaned name in the Knowledge Base.
    Preserves raw text, parent-child relationships, and flags unknowns explicitly.
    """
    registry = kb or get_kb()
    match = registry.lookup(parsed.clean_name)

    is_compound = bool(parsed.children)

    # Recursively enrich child ingredients
    enriched_children = [
        enrich_parsed_node(child, registry)
        for child in parsed.children
    ]

    normalized_name = normalize_whitespace_and_punctuation(parsed.clean_name).lower()

    if match:
        record, matched_alias = match
        return EnrichedIngredient(
            raw_text=parsed.raw_text,
            normalized_name=normalized_name,
            canonical_name=record.canonical_name,
            matched_alias=matched_alias,
            category=record.category,
            function=record.function,
            evidence_summary=record.evidence_summary,
            fitness_context=record.fitness_context,
            provenance=record.provenance,
            confidence=record.confidence,
            status=IngredientStatus.CATALOGUED.value,
            is_compound=is_compound,
            specification=parsed.specification,
            children=enriched_children,
            has_uncertainty=parsed.has_uncertainty,
            uncertainty_reason=parsed.uncertainty_reason
        )
    else:
        # Unknown ingredient - explicitly mark as Uncatalogued ingredient
        # Never infer safe, unsafe, whole food, or allergen status
        return EnrichedIngredient(
            raw_text=parsed.raw_text,
            normalized_name=normalized_name,
            canonical_name=None,
            matched_alias=None,
            category=UNCATALOGUED_LABEL,
            function=None,
            evidence_summary=None,
            fitness_context=None,
            provenance=UNCATALOGUED_PROVENANCE,
            confidence=UNKNOWN_CONFIDENCE,
            status=IngredientStatus.UNCATALOGUED.value,
            is_compound=is_compound,
            specification=parsed.specification,
            children=enriched_children,
            has_uncertainty=parsed.has_uncertainty,
            uncertainty_reason=parsed.uncertainty_reason
        )


def analyze_ingredients(
    raw_statement: Optional[str],
    kb: Optional[IngredientKnowledgeBase] = None
) -> IngredientAnalysisResult:
    """
    End-to-end deterministic pipeline:
    1. Parses compound and nested ingredient statement into ParsedIngredient nodes.
    2. Enriches each node and child recursively against the curated Knowledge Base.
    3. Calculates aggregate statistics while strictly preserving raw text and uncertain syntax.
    """
    if raw_statement is None or not raw_statement.strip():
        return IngredientAnalysisResult(
            raw_statement="" if raw_statement is None else raw_statement,
            ingredients=[],
            total_ingredients=0,
            catalogued_count=0,
            uncatalogued_count=0,
            has_uncertainty=False
        )

    registry = kb or get_kb()
    parsed_nodes = parse_ingredient_statement(raw_statement)

    enriched_nodes: List[EnrichedIngredient] = [
        enrich_parsed_node(node, registry)
        for node in parsed_nodes
    ]

    # Calculate counts (including top-level and children)
    def _count_stats(nodes: List[EnrichedIngredient]) -> Tuple[int, int, int, bool]:
        total = 0
        cat = 0
        uncat = 0
        uncert = False
        for n in nodes:
            total += 1
            if n.status == IngredientStatus.CATALOGUED.value:
                cat += 1
            else:
                uncat += 1
            if n.has_uncertainty:
                uncert = True
            if n.children:
                c_total, c_cat, c_uncat, c_uncert = _count_stats(n.children)
                total += c_total
                cat += c_cat
                uncat += c_uncat
                if c_uncert:
                    uncert = True
        return total, cat, uncat, uncert

    total_count, cat_count, uncat_count, has_uncertainty = _count_stats(enriched_nodes)

    return IngredientAnalysisResult(
        raw_statement=raw_statement,
        ingredients=enriched_nodes,
        total_ingredients=total_count,
        catalogued_count=cat_count,
        uncatalogued_count=uncat_count,
        has_uncertainty=has_uncertainty
    )
