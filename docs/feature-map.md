# NutriForge AI - Feature Map

| Feature | Frontend Module | Backend Module | Data Model | Route | Phase 1 Status | Future Implementation |
|---------|----------------|----------------|------------|-------|----------------|-----------------------|
| 1. Fitness & Nutrition Profile | `src/pages/Profile.tsx` | `POST /api/profile` | `Profile` | `/app/profile` | Fully Implemented (UI+Mock API) | Connect to PostgreSQL / Auth |
| 2. AI Label Scanner | `src/pages/Scan.tsx` | `POST /api/scan` | - | `/app/scan` | Scaffolded (UI+Hooks) | OCR, Barcode API Integration |
| 3. Nutrition Analysis | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/nutrition` | `Product` | `/app/products/:id` | Fully Implemented (Demo Data) | Dynamic generation from Scanner |
| 4. Serving Reality | `src/pages/ProductAnalysis.tsx` | - | - | `/app/products/:id` | Scaffolded (UI+Concept) | Interactive multiplier |
| 5. Ingredient Intelligence | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/ingredients`| `Ingredient` | `/app/products/:id` | Scaffolded (UI) | NLP ingredient parsing |
| 6. Allergen & Restriction Check| `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/ingredients`| `Allergen` | `/app/products/:id` | Scaffolded (Deterministic Demo) | User Profile matching engine |
| 7. ClaimCheck | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/claims` | `Claim` | `/app/products/:id` | Scaffolded (UI) | NLP verification against rules |
| 8. FSSAI Intelligence | `src/pages/ProductAnalysis.tsx` | - | `FSSAIInfo` | `/app/products/:id` | Scaffolded (Placeholder) | FSSAI API / DB integration |
| 9. Evidence Center | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/evidence` | `Evidence` | `/app/products/:id` | Scaffolded (Placeholder) | Third-party lab reports link |
| 10. Smart Compare | `src/pages/Compare.tsx` | `POST /api/compare` | `Comparison` | `/app/compare` | Fully Implemented (Demo Data) | Real multi-product comparison |
| 11. AI Nutrition Assistant | `src/pages/Assistant.tsx` | `POST /api/assistant` | - | `/app/assistant` | Fully Implemented (UI+Mock) | LLM integration (Gemini/OpenAI) |
| 12. History (Optional) | `src/pages/History.tsx` | `GET /api/history` | `HistoryLog` | `/app/history` | Scaffolded (UI) | Database persistence |
| 13. Product Re-check | `src/pages/Recheck.tsx` | `POST /api/recheck` | `Snapshot` | `/app/recheck` | Scaffolded (UI) | Snapshot diffing logic |
| 14. Personalized Final Dashboard| `src/pages/Dashboard.tsx` | `GET /api/dashboard` | - | `/app/dashboard` | Fully Implemented (Demo Data) | Live user stats and history |
