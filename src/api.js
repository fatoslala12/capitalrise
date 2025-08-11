import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (window?.location?.hostname === "localhost" || window?.location?.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://building-system.onrender.com");

const api = axios.create({
  baseURL,
});

// Interceptor për të shtuar token-in në çdo kërkesë
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
