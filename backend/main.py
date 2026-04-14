from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.clustering import router as clustering_router
from routers.correlations import router as correlations_router
from routers.descriptive import router as descriptive_router
from routers.overview import router as overview_router
from routers.pca import router as pca_router
from routers.timeseries import router as timeseries_router
from services.data_service import get_df

app = FastAPI(title="Air Senegal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    get_df()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(overview_router)
app.include_router(descriptive_router)
app.include_router(correlations_router)
app.include_router(pca_router)
app.include_router(clustering_router)
app.include_router(timeseries_router)
