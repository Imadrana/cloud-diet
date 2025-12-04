import axios from "axios";

const baseURL =
  import.meta.env.VITE_FUNCTION_BASE ||
  "https://nutrition-insights-fnc-01.azurewebsites.net/api";

const client = axios.create({
  baseURL,
});

// Attach JWT if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----- Data APIs used by Dashboard -----

export function getNutritionalInsights(dietType) {
  const params = {};
  if (dietType) params.dietType = dietType;
  return client.get("/getNutritionalInsights", { params }).then((r) => r.data);
}

export function getClusters(k = 3) {
  return client
    .get("/getClusters", { params: { k } })
    .then((r) => r.data);
}

export function getRecipes(dietType, page = 1, pageSize = 10, keyword = "") {
  const params = { page, pageSize };
  if (dietType) params.dietType = dietType;
  if (keyword) params.q = keyword;
  return client.get("/getRecipes", { params }).then((r) => r.data);
}

export default client;
