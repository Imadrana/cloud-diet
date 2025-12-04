import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_FUNCTION_BASE,
});

// Attach JWT if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Old helper functions used by your dashboard
export function getNutritionalInsights(dietType) {
  const params = {};
  if (dietType) params.dietType = dietType;
  return client.get("/getNutritionalInsights", { params }).then((r) => r.data);
}

export function getClusters(k = 3) {
  return client.get("/getClusters", { params: { k } }).then((r) => r.data);
}

export function getRecipes(dietType, page = 1, pageSize = 1000, q) {
  const params = { page, pageSize };
  if (dietType) params.dietType = dietType;
  if (q) params.q = q;
  return client.get("/getRecipes", { params }).then((r) => r.data);
}

export default client;
