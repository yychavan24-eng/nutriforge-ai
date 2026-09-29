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
- `POST /api/profile`: Create or update user profile.
- `POST /api/scan`: Submit a scanned image or barcode to initiate analysis.
- `POST /api/compare`: Submit product IDs to compare.
- `POST /api/recheck`: Submit product ID to check for formulation changes.
- `POST /api/assistant`: Send queries to AI Nutrition Assistant.

### Dashboard
- `GET /api/dashboard`: Retrieve personalized dashboard data.
- `GET /api/history`: Retrieve user's history of analyses.
