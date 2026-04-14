# AirSénégal - Dashboard Qualité de l'air

Application full-stack pour l'analyse des facteurs influençant la qualité de l'air au Sénégal à partir des données de capteurs environnementaux.

## Stack technique

- Backend: FastAPI, pandas, scikit-learn, statsmodels
- Frontend: React 18, Vite, TailwindCSS, Recharts, TanStack Query
- Dataset: backend/data/airQualityClean.csv

## Structure du projet

- backend/
- frontend/

## 1) Lancer le backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API disponible sur http://localhost:8000

## 2) Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

Application disponible sur http://localhost:5173

## Endpoints API principaux

- /api/overview/stats
- /api/overview/sites
- /api/descriptive/stats
- /api/descriptive/distributions
- /api/descriptive/top15_sites
- /api/descriptive/indoor_outdoor
- /api/descriptive/hourly_profile
- /api/descriptive/monthly_profile
- /api/correlations/matrix
- /api/correlations/with_pm25
- /api/correlations/scatter
- /api/pca/variance
- /api/pca/loadings
- /api/pca/biplot
- /api/clustering/elbow
- /api/clustering/profiles
- /api/clustering/scatter
- /api/timeseries/daily
- /api/timeseries/decomposition
- /api/timeseries/adf_test
- /api/timeseries/seasonal_comparison
- /api/timeseries/heatmap
- /api/timeseries/top5_sites

## Notes

- Le CSV est chargé une seule fois au démarrage via le service partagé backend/services/data_service.py.
- CORS est activé pour localhost:3000 et localhost:5173.
- Les appels frontend sont centralisés dans frontend/src/api.js.
- Toutes les pages utilisent TanStack Query avec cache et gestion de chargement.
