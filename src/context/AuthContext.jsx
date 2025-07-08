import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login me backend
  const login = async (email, password) => {
    try {
      const res = await axios.post("https://building-system.onrender.com/api/auth/login", {
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
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}