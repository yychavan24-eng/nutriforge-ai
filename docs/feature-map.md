# NutriForge AI - Feature Map

| Feature | Frontend Module | Backend Module | Data Model | Route | Phase 1 Status | Future Implementation |
|---------|----------------|----------------|------------|-------|----------------|-----------------------|
| 1. Fitness & Nutrition Profile | `src/pages/Profile.tsx` | `GET/POST /api/profile` | `Profile` | `/app/profile` | Verified Vertical Slice | Connect to PostgreSQL / Auth |
| 2. AI Label Scanner | `src/pages/Scan.tsx` | `POST /api/scan` | - | `/app/scan` | Verified (Simulated OCR + Edit + Community DB) | Gemini Vision Live OCR Integration |
| 3. Nutrition Analysis | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/nutrition` | `Product` | `/app/products/:id` | Verified Vertical Slice | Extended micro-nutrient breakdown |
| 4. Serving Reality | `src/pages/ProductAnalysis.tsx` | `POST /api/nutrition/scale` | - | `/app/products/:id` | Verified Vertical Slice | Custom serving size presets |
| 5. Ingredient Intelligence | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/ingredients`| `Ingredient` | `/app/products/:id` | Verified Vertical Slice | NLP ingredient parsing & additive lookup |
| 6. Allergen & Restriction Check| `src/pages/ProductAnalysis.tsx` | `POST /api/nutrition/allergens`| `Allergen` | `/app/products/:id` | Verified Vertical Slice | User Profile matching engine + derivatives |
| 7. ClaimCheck | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/claims` | `Claim` | `/app/products/:id` | Verified Vertical Slice | NLP verification against rules |
| 8. FSSAI Intelligence | `src/pages/ProductAnalysis.tsx` | - | `FSSAIInfo` | `/app/products/:id` | Scaffolded (Provenance Badges) | FSSAI API / DB integration |
| 9. Evidence Center | `src/pages/ProductAnalysis.tsx` | `GET /api/products/{id}/evidence` | `Evidence` | `/app/products/:id` | Scaffolded (Evidence Records) | Third-party lab reports link |
| 10. Smart Compare | `src/pages/Compare.tsx` | `POST /api/compare` | `Comparison` | `/app/compare` | Verified Vertical Slice | Real multi-product comparison with trade-offs |
| 11. AI Nutrition Assistant | `src/pages/Assistant.tsx` | `POST /api/assistant` | - | `/app/assistant` | Verified Vertical Slice (Context-grounded) | Gemini LLM integration |
| 12. History (Optional) | `src/pages/History.tsx` | `GET /api/history` | `HistoryLog` | `/app/history` | Scaffolded (UI) | Database persistence |
| 13. Product Re-check | `src/pages/Recheck.tsx` | `POST /api/recheck` | `Snapshot` | `/app/recheck` | Scaffolded (UI) | Snapshot diffing logic |
| 14. Personalized Final Dashboard| `src/pages/Dashboard.tsx` | `GET /api/dashboard` | - | `/app/dashboard` | Verified Vertical Slice | Live user stats and history |
