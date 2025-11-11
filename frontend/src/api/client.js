import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_FUNCTION_BASE });
export const getNutritionalInsights = (dietType) =>
  api.get("/getnutritionalinsights", { params: { dietType } }).then(r => r.data);
export const getClusters = (k=3) =>
  api.get("/getclusters", { params: { k } }).then(r => r.data);
export const getRecipes = (dietType, page=1, pageSize=10) =>
  api.get("/getrecipes", { params: { dietType, page, pageSize } }).then(r => r.data);
export default api;
