import axios from "axios";

const token = localStorage.getItem("token");

const api = axios.create({
  baseURL: "https://building-system.onrender.com",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export default api;
