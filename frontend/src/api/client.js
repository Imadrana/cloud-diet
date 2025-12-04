import axios from "axios";

const baseURL =
  import.meta.env.VITE_FUNCTION_BASE ||
  "https://nutrition-insights-fnc-01.azurewebsites.net/api";

const client = axios.create({
  baseURL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
