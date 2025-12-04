import { useEffect, useState } from "react";
import { getNutritionalInsights, getClusters, getRecipes } from "./api/client";
import NutritionBarCard from "./components/NutritionBarCard";
import RecipePieCard from "./components/RecipePieCard";
import CorrelationScatterCard from "./components/CorrelationScatterCard";

export default function Dashboard({ user, onLogout }) {
  const [dietType, setDietType] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const [insights, setInsights] = useState(null);
  const [clusters, setClusters] = useState(null);
  const [recipesData, setRecipesData] = useState(null);

  const [recipeKeyword, setRecipeKeyword] = useState("");
  const [recipePage, setRecipePage] = useState(1);
  const recipePageSize = 10;

  const loadAll = async (pageOverride) => {
    const page = pageOverride || recipePage;
    setLoading(true);
    setError("");
    const t0 = performance.now();
    try {
      const [i, c, r] = await Promise.all([
        getNutritionalInsights(dietType || undefined),
        getClusters(3),
        getRecipes(
          dietType || undefined,
          page,
          recipePageSize,
          recipeKeyword || undefined
        ),
      ]);
      setInsights(i);
      setClusters(c);
      setRecipesData(r);
      setRecipePage(r.meta?.page || page);
    } catch (e) {
      setError(
        "Failed to fetch from backend. Check CORS, .env base URL, and Function status."
      );
    } finally {
      setElapsed(Math.round(performance.now() - t0));
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDietChange = (value) => {
    setDietType(value);
    setRecipePage(1);
  };

  const handleSearch = () => {
    setRecipePage(1);
    loadAll(1);
  };

  const goToPage = (p) => {
    const meta = recipesData?.meta;
    if (!meta) return;
    const totalPages = Math.ceil(meta.total / recipePageSize);
    if (p < 1 || p > totalPages) return;
    setRecipePage(p);
    loadAll(p);
  };

  const meta = recipesData?.meta;
  const list = recipesData?.recipes || [];
  const total = meta?.total || 0;
  const startIdx = total === 0 ? 0 : (recipePage - 1) * recipePageSize + 1;
  const endIdx = Math.min(recipePage * recipePageSize, total);
  const totalPages = total === 0 ? 1 : Math.ceil(total / recipePageSize || 1);

  return (
    <div className="wrapper">
      <div
        className="header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: "2rem",
        }}
      >
        <span>Nutritional Insights Dashboard</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: 14 }}>
            Logged in as <strong>{user?.name || user?.email}</strong>
          </span>
          <button
            onClick={onLogout}
            style={{
              padding: "0.3rem 0.7rem",
              borderRadius: 6,
              border: "1px solid #dc2626",
              background: "white",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="toolbar">
        <select
          value={dietType}
          onChange={(e) => handleDietChange(e.target.value)}
        >
          <option value="">All Diet Types</option>
          <option value="vegan">Vegan</option>
          <option value="keto">Keto</option>
          <option value="paleo">Paleo</option>
          <option value="dash">Dash</option>
          <option value="mediterranean">Mediterranean</option>
        </select>
        <button onClick={() => loadAll(1)} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </button>
      </div>

      <div className="meta">Last fetch took: {elapsed} ms</div>
      {error && (
        <div className="meta" style={{ color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h3>Nutritional Breakdown</h3>
          <NutritionBarCard insights={insights} />
        </div>
        <div className="card">
          <h3>Recipe Distribution</h3>
          <RecipePieCard recipes={recipesData} />
        </div>
        <div className="card">
          <h3>Nutritional Correlations</h3>
          <CorrelationScatterCard clusters={clusters} />
        </div>
      </div>

      {/* Recipes explorer */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>Recipes Explorer</h3>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <span style={{ fontSize: 14 }}>Diet filter is from top toolbar.</span>
          <input
            type="text"
            placeholder="Search by recipe keyword..."
            value={recipeKeyword}
            onChange={(e) => setRecipeKeyword(e.target.value)}
            style={{ flex: 1, padding: "0.4rem 0.6rem" }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Search
          </button>
        </div>

        <div style={{ fontSize: 13, marginBottom: "0.5rem" }}>
          Showing {startIdx}-{endIdx} of {total} recipes
          {dietType && ` (diet: ${dietType})`}
          {recipeKeyword && ` | keyword: "${recipeKeyword}"`}
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "0.4rem" }}>Recipe</th>
              <th style={{ padding: "0.4rem" }}>Diet</th>
              <th style={{ padding: "0.4rem" }}>Calories</th>
              <th style={{ padding: "0.4rem" }}>Protein</th>
              <th style={{ padding: "0.4rem" }}>Carbs</th>
              <th style={{ padding: "0.4rem" }}>Fat</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <td style={{ padding: "0.4rem" }}>{r.recipe}</td>
                <td style={{ padding: "0.4rem", textTransform: "capitalize" }}>
                  {r.diet_type}
                </td>
                <td style={{ padding: "0.4rem" }}>{r.calories}</td>
                <td style={{ padding: "0.4rem" }}>{r.protein}</td>
                <td style={{ padding: "0.4rem" }}>{r.carbs}</td>
                <td style={{ padding: "0.4rem" }}>{r.fat}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "0.8rem", textAlign: "center" }}>
                  No recipes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
          }}
        >
          <div>
            Page {recipePage} of {totalPages}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
  {/* Previous */}
  <button
    onClick={() => goToPage(recipePage - 1)}
    disabled={recipePage <= 1}
    style={{
      padding: "0.45rem 1.1rem",
      borderRadius: 6,
      border: "none",
      background: recipePage <= 1 ? "#cbd5e1" : "#64748b",
      color: "white",
      fontWeight: 600,
      cursor: recipePage <= 1 ? "not-allowed" : "pointer",
      opacity: recipePage <= 1 ? 0.6 : 1,
    }}
  >
    ◀ Previous
  </button>

  {/* Next */}
  <button
    onClick={() => goToPage(recipePage + 1)}
    disabled={recipePage >= totalPages}
    style={{
      padding: "0.45rem 1.1rem",
      borderRadius: 6,
      border: "none",
      background: recipePage >= totalPages ? "#cbd5e1" : "#2563eb",
      color: "white",
      fontWeight: 600,
      cursor: recipePage >= totalPages ? "not-allowed" : "pointer",
      opacity: recipePage >= totalPages ? 0.6 : 1,
    }}
  >
    Next ▶
  </button>
</div>

        </div>
      </div>
    </div>
  );
}
