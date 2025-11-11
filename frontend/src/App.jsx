import { useEffect, useState } from "react";
import { getNutritionalInsights, getClusters, getRecipes } from "./api/client";
import NutritionBarCard from "./components/NutritionBarCard";
import RecipePieCard from "./components/RecipePieCard";
import CorrelationScatterCard from "./components/CorrelationScatterCard";

export default function App(){
  const [dietType, setDietType] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const [insights, setInsights] = useState(null);
  const [clusters, setClusters] = useState(null);
  const [recipes, setRecipes]   = useState(null);

  const loadAll = async () => {
    setLoading(true); setError("");
    const t0 = performance.now();
    try{
      const [i, c, r] = await Promise.all([
        getNutritionalInsights(dietType || undefined),
        getClusters(3),
        getRecipes(dietType || undefined, 1, 1000)
      ]);
      setInsights(i); setClusters(c); setRecipes(r);
    }catch(e){
      setError("Failed to fetch from backend. Check CORS, .env base URL, and Function status.");
    }finally{
      setElapsed(Math.round(performance.now() - t0));
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="wrapper">
      <div className="header">Nutritional Insights Dashboard</div>

      <div className="toolbar">
        <select value={dietType} onChange={e=>setDietType(e.target.value)}>
          <option value="">All Diet Types</option>
          <option value="vegan">Vegan</option>
          <option value="keto">Keto</option>
          <option value="paleo">Paleo</option>
          <option value="dash">Dash</option>
          <option value="mediterranean">Mediterranean</option>
        </select>
        <button onClick={loadAll} disabled={loading}>{loading ? "Loading..." : "Refresh Data"}</button>
      </div>

      <div className="meta">Last fetch took: {elapsed} ms</div>
      {error && <div className="meta" style={{color:"#b91c1c"}}>{error}</div>}

      <div className="grid">
        <div className="card">
          <h3>Nutritional Breakdown</h3>
          <NutritionBarCard insights={insights} />
        </div>
        <div className="card">
          <h3>Recipe Distribution</h3>
          <RecipePieCard recipes={recipes} />
        </div>
        <div className="card">
          <h3>Nutritional Correlations</h3>
          <CorrelationScatterCard clusters={clusters} />
        </div>
      </div>
    </div>
  );
}
