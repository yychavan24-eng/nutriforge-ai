# Architecture Overview

NutriForge AI is built with a decoupled frontend and backend.

## Frontend
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM

The frontend follows a feature-based directory structure (`src/features/` and `src/pages/`) for modularity.

## Backend
- **Framework**: FastAPI (Python)
- **Database Architecture**: PostgreSQL (Prepared for Phase 2), SQLAlchemy ORM

The backend exposes RESTful APIs to serve product data, process user profiles, and handle advanced analytics logic. It separates data models, business logic, and routing.

## Data Flow
1. User provides a profile -> Stored in backend.
2. User scans a product -> Image/Barcode processed by backend.
3. Backend returns parsed product data to frontend.
4. Frontend visualizes the data (Nutrition, Serving, Ingredients).
5. User selects products to compare -> Frontend queries backend for comparative stats.
6. AI Assistant handles natural language queries via backend endpoints.
