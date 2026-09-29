# Scanner Architecture & Data Model (Phase 2)

## 1. Scanner Pipeline & OCR Abstraction
The NutriForge Scanner uses an abstract `OCRProvider` base class. This allows swapping the underlying text extraction engine without modifying the application logic. 

**Flow:**
`Image -> OCRProvider -> Normalized Dictionary -> User Review -> Validated ProductBase`

- **Local/Mock OCR:** Currently uses `MockOCRProvider` returning scaffolded structured data.
- **Future Integration:** Can easily swap to Vision-Language models by implementing `extract_structured_data(image: str) -> Dict`.

## 2. Product Data Model & Provenance
NutriForge relies heavily on deterministic calculations. However, data sources vary in reliability. Phase 2 introduces explicit **Provenance** metadata mapped to core nutrition metrics.

**Provenance Levels (`ValueSource`):**
- `LABEL_DECLARED`: Extracted directly from the physical label via OCR/Scanner.
- `CALCULATED`: Inferred algorithmically by NutriForge.
- `EXTERNAL_EVIDENCE`: Retrieved from a reliable third-party database.
- `UNKNOWN`: No reliable source available.

**Schema:**
```python
class ProvenanceInfo(BaseModel):
    source: ValueSource
    confidence: Optional[float] = None

class ProductBase(BaseModel):
    # Nutrition values remain flat for deterministic speed
    calories: float
    # Provenance tracks the source
    provenance: Dict[str, ProvenanceInfo] = {}
```

## 3. Barcode Flow
1. User enters barcode.
2. System calls `/api/barcode/{barcode}`.
3. If found (`found: True`), routes directly to `/app/products/{id}`.
4. If not found (`found: False`), scanner gracefully falls back to OCR/Upload flow for community crowdsourcing.

## 4. Extraction & Validation Pipeline
- **Raw Text Preservation:** `raw_ingredient_text` preserves verbatim OCR output.
- **Structured Fields:** Extracted text is mapped to numeric `serving_size_value` and structural properties.
- **Human in the Loop:** The scanner presents a `review` UI state where users must explicitly confirm or correct extracted values before they are persisted.

## 5. Community Data Foundation
When a new product is saved via the scanner:
- `source_type` is set to `"COMMUNITY"`.
- `evidence` stores community verification claims.
- The record is appended to the product database for immediate analysis.
