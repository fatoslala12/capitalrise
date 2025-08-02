import axios from "axios";

// Use localhost for development, production URL for production
const baseURL = process.env.NODE_ENV === 'production' 
  ? "https://building-system.onrender.com"
  : "http://localhost:5000";

console.log('🔧 API Configuration:', { NODE_ENV: process.env.NODE_ENV, baseURL });

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
