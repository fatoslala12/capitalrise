import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Kontrollo përdoruesin aktiv në localStorage kur ngarkohet aplikacioni
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Gabim në parsing e user data:", error);
        localStorage.removeItem("authUser");
      }
    }
    setLoading(false);
  }, []);

  // Login me backend - optimized me useCallback
  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      // Ruaj token dhe user në localStorage
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("authUser", JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate(`/${res.data.user.role}/dashboard`);
    } catch (err) {
      alert("Email ose fjalëkalim i pasaktë!");
    }
  }, [navigate]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
    navigate("/");
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}