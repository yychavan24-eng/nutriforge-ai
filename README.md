# NutriForge AI 🥗

### Personalized Packaged-Food Intelligence and Decision Support for Fitness Communities

**The label tells you WHAT is in the food. NutriForge helps you understand WHAT IT MEANS FOR YOU.**

NutriForge AI is a nutrition intelligence and food-label literacy application designed to help gym-goers and fitness communities interpret packaged-food labels, understand serving sizes, identify declared allergen conflicts, and compare products according to their nutritional goals.

Rather than relying on marketing claims or protein numbers alone, NutriForge presents transparent calculations, ingredient explanations, personalized context, and clear data provenance.

> **Project status:** Active development. Core nutrition, allergen-checking, product-comparison and profile-persistence functionality has been implemented and tested. Gemini Vision OCR is integrated, but live extraction from a real product image still requires verification with a configured API key.

---

## ✨ Key Features

### 1. Personalized Nutrition Profile
- Configure fitness goals and dietary preferences.
- Record voluntarily provided age, height and weight.
- Declare allergies and dietary restrictions.
- Set optional daily nutrition targets.
- Preserve profile data across navigation and application sessions.

### 2. AI-Powered Food-Label Scanning
- Upload photographs of packaged-food labels.
- Extract structured nutrition and ingredient information using the Gemini Vision provider when configured.
- Review and correct extracted fields before saving.
- Identify missing or uncertain information instead of silently inventing values.
- Use clearly labelled simulated demo mode when live extraction is unavailable.

**Important:** Live image extraction must be verified in the configured environment. Simulated results are explicitly identified as demo data.

### 3. Nutrition Analysis
- Understand calories, protein, carbohydrates, fats and other available nutrients.
- Calculate nutrition for different consumed serving sizes.
- Compare nutrient values against user-provided daily targets.
- Distinguish label-declared values from calculated and manually entered data.

### 4. Allergen and Dietary Restriction Checks
- Compare declared allergens and recognizable ingredient terms against user-provided restrictions.
- Flag identifiable ingredient conflicts and relevant derivatives.
- Explain which ingredient or declaration triggered a warning.
- Warn when ingredient information is missing.

NutriForge provides decision support, not a guarantee of food safety. It does not diagnose allergies or determine safe allergen doses.

### 5. Smart Compare
- Compare multiple products side by side.
- Examine available calories, protein, carbohydrates, sugars, fats, sodium and fibre.
- Account for serving-size differences through normalized comparisons when applicable.
- Highlight nutritional trade-offs instead of declaring a universal winner.
- Display allergen conflicts prominently.

### 6. Context-Aware Nutrition Assistant
- Explain nutritional calculations in understandable language.
- Use available profile goals and product context to formulate grounded responses.
- Present relevant limitations and decision-support disclaimers.

### 7. Product History and Dashboard
- Access product information through the existing application workflows.
- View profile priorities and relevant product insights.
- Retain persisted product and profile information where supported by the current implementation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI and styling | Tailwind CSS, Lucide React |
| Routing | React Router |
| Backend | Python, FastAPI |
| Validation | Pydantic |
| Persistence | SQLAlchemy, SQLite / PostgreSQL configuration |
| Vision model integration | Google Gen AI SDK, Gemini Vision |
| Testing | pytest, HTTPX |
| Code quality | TypeScript build, Oxlint |

---

## 🏗️ Architecture

```text
NutriForge AI
│
├── frontend/
│   └── React + TypeScript + Vite
│       ├── Profile & Dashboard
│       ├── Product Analysis
│       ├── Food Scanner
│       ├── Smart Compare
│       └── Nutrition Assistant
│
├── backend/
│   └── FastAPI
│       ├── API Routes
│       ├── Pydantic Schemas
│       ├── Nutrition Engine
│       ├── Allergen Engine
│       ├── Comparison Engine
│       ├── OCR Provider
│       └── Database Layer
│
├── docs/
└── README.md
```

### Design principles

- **Deterministic calculations:** Serving-size arithmetic and nutrient comparisons use explicit calculation logic.
- **Evidence awareness:** Label values, calculated values, manual edits, demo data and unknown fields are distinguished.
- **Human verification:** Extracted label data must be reviewed before it is saved.
- **Privacy and security:** API credentials belong on the backend, not in frontend code or committed files.
- **Honest uncertainty:** Missing information is not automatically treated as zero or as proof of safety.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11 or a compatible version supported by the project's dependencies.
- Node.js and npm compatible with the frontend toolchain.
- Git.
- A Gemini API key for live Vision OCR; simulated demo mode can be used without one.

### 1. Clone the repository

```bash
git clone https://github.com/yychavan24-eng/nutriforge-ai.git
cd nutriforge-ai
```

If you already have the repository locally, skip cloning.

### 2. Configure the backend

Open Command Prompt:

```cmd
cd /d "C:\Users\Yash Chavan\nutriforge-ai\backend"
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
```

Configure your Gemini API key for the current CMD session:

```cmd
set /p GEMINI_API_KEY=Enter your Gemini API key:
```

Optionally configure the model:

```cmd
set GEMINI_MODEL=gemini-2.5-flash
```

The key should never be committed to Git. See `.env.example` for the configuration template.

Start the backend:

```cmd
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If port 8000 is unavailable, use another permitted port and configure the frontend accordingly.

API documentation is available at:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/api/scan/status`

### 3. Configure the frontend

Open a second CMD window:

```cmd
cd /d "C:\Users\Yash Chavan\nutriforge-ai\frontend"
npm install
set VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

Open the local URL printed by Vite, normally:

`http://localhost:5173`

For an existing installation, you can use the dependencies already installed instead of running `npm install` again.

### 4. Database configuration

The development configuration supports SQLite. PostgreSQL can be configured using `DATABASE_URL` when the required database and driver are available.

Do not commit local database files or credentials.

---

## 🧪 Testing

Run the backend test suite from the backend directory:

```cmd
python -m pytest tests/ -v
```

Build the frontend:

```cmd
cd /d "C:\Users\Yash Chavan\nutriforge-ai\frontend"
npm run build
```

Run lint checks:

```cmd
npm run lint
```

The latest recorded engineering report documented:

- **58 backend tests passed**
- Frontend production build successful
- Oxlint completed with zero errors and eight warnings

These are results from the recorded test run, not a guarantee that every future version will pass. Live Gemini extraction also requires a separate real-image test.

---

## 🔬 Example: Serving-Size Intelligence

Suppose a verified nutrition label declares:

- Serving size: 40 g
- Protein: 22 g

For a consumed serving of 60 g:

\[
22 \times \frac{60}{40} = 33\text{ g protein}
\]

If the user has provided a daily protein target of 150 g:

\[
\frac{33}{150}\times100 = 22\%
\]

NutriForge can display the calculated result and its contribution to the user-provided target, while preserving the distinction between label data and calculations.

---

## 🌍 Community Engagement and Social Impact

NutriForge AI is being developed in the context of a Community Engagement Project focused on improving packaged-food label literacy among fitness communities.

Potential applications include:

- Gym-based nutrition-awareness activities.
- Helping users interpret serving sizes and nutrition panels.
- Encouraging informed comparisons between packaged foods.
- Raising awareness of declared allergens and ingredient lists.
- Collecting community feedback to improve usability.

The project aligns with **UN Sustainable Development Goal 3: Good Health and Well-being**, with a potential secondary connection to **SDG 12: Responsible Consumption and Production**.

Community outcomes and impact should be reported using actual survey findings, feedback and field evidence—not assumed results.

---

## ⚠️ Limitations and Responsible Use

- Gemini Vision availability depends on valid configuration, network access, quotas and provider availability.
- OCR can misread packaging; users should verify extracted fields against the original label.
- Ingredient matching cannot guarantee the absence of undeclared allergens or cross-contamination.
- The application is not a medical diagnostic system and does not replace qualified professional advice.
- Live government-registry verification and external laboratory-evidence integrations remain separate development tasks unless explicitly implemented and verified.
- Nutritional conclusions depend on the completeness and accuracy of the available product data.

---

## 🗺️ Roadmap

- [x] Deterministic nutrition calculations
- [x] Profile and target persistence
- [x] Allergen and restriction matching
- [x] Field-by-field product comparison
- [x] FastAPI and React integration
- [x] Gemini Vision provider implementation
- [ ] Verify live OCR against real packaged-food labels
- [ ] Improve extraction accuracy and edge-case handling
- [ ] Expand real product-label coverage
- [ ] Improve usability through community testing
- [ ] Expand evidence and regulatory integrations

---

## 👨‍💻 Development

Contributions and constructive feedback are welcome.

Before proposing changes, run the backend tests, frontend production build and lint checks. Keep credentials out of source control and label simulated functionality honestly.

## 📄 Disclaimer

NutriForge AI is an educational and nutritional decision-support project. It does not provide medical diagnoses, guarantee product safety, certify regulatory compliance or replace professional dietary guidance.

---

**Built to make packaged-food information easier to understand, compare and use responsibly.**
