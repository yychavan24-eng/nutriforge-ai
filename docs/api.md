# NutriForge API Definition

## Endpoints

### Products
- `GET /api/products`: Retrieve a list of all products.
- `GET /api/products/{id}`: Retrieve full details of a specific product.
- `GET /api/products/{id}/nutrition`: Retrieve calculated nutrition metrics.
- `GET /api/products/{id}/ingredients`: Retrieve parsed ingredients and allergens.
- `GET /api/products/{id}/claims`: Retrieve regulatory claims.
- `GET /api/products/{id}/evidence`: Retrieve evidence records.

### User & Core Workflows
- `GET /api/profile`: Retrieve active user profile.
- `POST /api/profile`: Create or update user profile (persisted to SQLite database).
- `POST /api/scan`: Submit a scanned image or barcode to initiate analysis (Simulated/Mock OCR Provider).
- `POST /api/nutrition/scale`: Calculate proportional nutrient scaling, serving realities, and user target contributions.
- `POST /api/nutrition/allergens`: Check label & derivative allergens against user profile restrictions.
- `POST /api/compare`: Submit product IDs to compare with profile-aware trade-offs, serving comparability, and allergen alerts.
- `POST /api/recheck`: Submit product ID to check for formulation changes.
- `POST /api/assistant`: Send queries to AI Nutrition Assistant with contextual profile & product grounding.

### Dashboard
- `GET /api/dashboard`: Retrieve personalized dashboard data with user target progress and recent activity.
- `GET /api/history`: Retrieve user's history of analyses.
