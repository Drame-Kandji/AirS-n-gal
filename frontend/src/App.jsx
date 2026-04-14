import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { api } from "./api";
import Overview from "./pages/Overview";
import Descriptive from "./pages/Descriptive";
import Correlations from "./pages/Correlations";
import PCA from "./pages/PCA";
import Clustering from "./pages/Clustering";
import TimeSeries from "./pages/TimeSeries";

const TITLES = {
  overview: "Vue générale",
  descriptive: "Analyse descriptive",
  correlations: "Analyse des corrélations",
  pca: "Analyse en Composantes Principales (ACP)",
  clustering: "Analyse de clustering",
  timeseries: "Analyse de série temporelle",
};

export default function App() {
  const [page, setPage] = useState("overview");
  const statsQuery = useQuery({ queryKey: ["overviewStats"], queryFn: api.overviewStats });

  const currentPm25 = useMemo(() => statsQuery.data?.pm25_mean ?? null, [statsQuery.data]);

  const content = {
    overview: <Overview />,
    descriptive: <Descriptive />,
    correlations: <Correlations />,
    pca: <PCA />,
    clustering: <Clustering />,
    timeseries: <TimeSeries />,
  }[page];

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar active={page} onChange={setPage} />
      <div className="ml-[260px]">
        <Header title={TITLES[page]} currentPm25={currentPm25 ? currentPm25.toFixed(2) : "--"} />
        <main className="p-6">{content}</main>
      </div>
    </div>
  );
}
