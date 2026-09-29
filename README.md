# NutriForge AI
**Personalized Packaged-Food Intelligence & Decision Support Platform**

"The label tells you WHAT is in the food. NutriForge helps you understand WHAT it means for you."

## Phase 1 Overview
This repository contains the Phase 1 implementation of NutriForge AI, establishing the foundational architecture for the 14 core features. 

### Key Features Implemented in Phase 1:
- Clean Project Architecture (Frontend/Backend/Docs)
- Application Shell and Routing Structure
- Working Profile Flow
- Working Product Selection Flow
- Working Product Analysis Flow (Demo Data)
- Smart Compare Flow (Demo Data)
- Personalized Dashboard
- Architecture for AI Label Scanner, ClaimCheck, FSSAI, Evidence Center, History, and Re-check.

### Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS (v4)
- **Backend**: Python + FastAPI
- **Database Architecture**: PostgreSQL + SQLAlchemy (Prepared for Phase 2)

## Getting Started

### Backend
1. `cd backend`
2. `pip install -r requirements.txt` (or use a virtualenv)
3. `uvicorn app.main:app --reload`
The API will run on `http://localhost:8000`.

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
The UI will run on `http://localhost:5173`.

## Documentation
Please check the `docs/` folder for architectural maps, feature maps, and API definitions.
