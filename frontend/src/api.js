const API_BASE = "http://localhost:8000";

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  let response;

  try {
    response = await fetch(`${API_BASE}${url}`, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

export const api = {
  overviewStats: () => fetchJson("/api/overview/stats"),
  overviewSites: () => fetchJson("/api/overview/sites"),

  descriptiveStats: () => fetchJson("/api/descriptive/stats"),
  descriptiveDistribution: (variable, bins = 50) =>
    fetchJson(`/api/descriptive/distributions?variable=${encodeURIComponent(variable)}&bins=${bins}`),
  descriptiveTop15: () => fetchJson("/api/descriptive/top15_sites"),
  descriptiveDataQuality: () => fetchJson("/api/descriptive/data_quality"),
  descriptiveIndoorOutdoor: () => fetchJson("/api/descriptive/indoor_outdoor"),
  descriptiveHourly: () => fetchJson("/api/descriptive/hourly_profile"),
  descriptiveMonthly: () => fetchJson("/api/descriptive/monthly_profile"),

  corrMatrix: () => fetchJson("/api/correlations/matrix"),
  corrWithPm25: () => fetchJson("/api/correlations/with_pm25"),
  corrScatter: (x, y, sample = 3000) =>
    fetchJson(`/api/correlations/scatter?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&sample=${sample}`),

  pcaVariance: () => fetchJson("/api/pca/variance"),
  pcaLoadings: () => fetchJson("/api/pca/loadings"),
  pcaBiplot: (sample = 5000) => fetchJson(`/api/pca/biplot?sample=${sample}`),

  clusteringElbow: () => fetchJson("/api/clustering/elbow"),
  clusteringProfiles: () => fetchJson("/api/clustering/profiles"),
  clusteringScatter: (sample = 5000) => fetchJson(`/api/clustering/scatter?sample=${sample}`),

  tsDaily: () => fetchJson("/api/timeseries/daily"),
  tsDecomposition: () => fetchJson("/api/timeseries/decomposition"),
  tsAdf: () => fetchJson("/api/timeseries/adf_test"),
  tsSeasonal: () => fetchJson("/api/timeseries/seasonal_comparison"),
  tsHeatmap: () => fetchJson("/api/timeseries/heatmap"),
  tsTop5: () => fetchJson("/api/timeseries/top5_sites"),
};
