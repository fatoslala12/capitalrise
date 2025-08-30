import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const navigate = useNavigate();

  // Enhanced token management with role-based storage
  const getRoleBasedTokenKey = useCallback((role) => {
    return `token_${role}`;
  }, []);

  const getRoleBasedUserKey = useCallback((role) => {
    return `user_${role}`;
  }, []);

  // Check token validity
  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    
    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Check if token is expired (if expiry is stored)
      const storedExpiry = localStorage.getItem('tokenExpiry');
      if (storedExpiry && new Date(storedExpiry) < new Date()) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, []);

  // Enhanced login with role-based token storage
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      
      const response = await api.post("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user: userData, expiresIn } = response.data;
      
      if (!token || !userData || !userData.role) {
        throw new Error('Invalid response from server');
      }

      // Store role-specific tokens
      const roleTokenKey = getRoleBasedTokenKey(userData.role);
      const roleUserKey = getRoleBasedUserKey(userData.role);
      
      // Calculate token expiry
      const expiryDate = expiresIn ? new Date(Date.now() + expiresIn * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
      
      // Store authentication data
      localStorage.setItem(roleTokenKey, token);
      localStorage.setItem(roleUserKey, JSON.stringify(userData));
      localStorage.setItem('tokenExpiry', expiryDate.toISOString());
      localStorage.setItem('currentRole', userData.role);
      
      // Set global token for API calls
      localStorage.setItem("token", token);
      
      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      setTokenExpiry(expiryDate);
      
      // Set API default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getRoleBasedTokenKey, getRoleBasedUserKey]);

  // Enhanced logout with role-based cleanup
  const logout = useCallback(() => {
    const currentRole = user?.role || localStorage.getItem('currentRole');
    
    if (currentRole) {
      // Remove role-specific data
      const roleTokenKey = getRoleBasedTokenKey(currentRole);
      const roleUserKey = getRoleBasedUserKey(currentRole);
      
      localStorage.removeItem(roleTokenKey);
      localStorage.removeItem(roleUserKey);
    }
    
    // Remove global data
    localStorage.removeItem("token");
    localStorage.removeItem("authUser");
    localStorage.removeItem("user");
    localStorage.removeItem("currentRole");
    localStorage.removeItem("tokenExpiry");
    
    // Clear API headers
    delete api.defaults.headers.common['Authorization'];
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    setTokenExpiry(null);
    
    // Navigate to login
    navigate("/");
  }, [user?.role, getRoleBasedTokenKey, getRoleBasedUserKey, navigate]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const currentRole = localStorage.getItem('currentRole');
        if (!currentRole) {
          setLoading(false);
          return;
        }

        const roleTokenKey = getRoleBasedTokenKey(currentRole);
        const roleUserKey = getRoleBasedUserKey(currentRole);
        
        const token = localStorage.getItem(roleTokenKey);
        const storedUser = localStorage.getItem(roleUserKey);
        
        if (token && storedUser && isTokenValid(token)) {
          try {
            const userData = JSON.parse(storedUser);
            
            // Verify token with backend
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const response = await api.get('/api/auth/verify');
            
            if (response.data.valid) {
              setUser(userData);
              setIsAuthenticated(true);
              setTokenExpiry(new Date(localStorage.getItem('tokenExpiry')));
            } else {
              // Token invalid, clear everything
              logout();
            }
          } catch (error) {
            console.error('Token verification failed:', error);
            logout();
          }
        } else {
          // Invalid or expired token
          logout();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [getRoleBasedTokenKey, getRoleBasedUserKey, isTokenValid, logout]);

  // Auto-logout on token expiry
  useEffect(() => {
    if (!tokenExpiry) return;

    const checkExpiry = () => {
      if (new Date() >= tokenExpiry) {
        console.log('Token expired, logging out...');
        logout();
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tokenExpiry, logout]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    user,
    setUser,
    login,
    logout,
    loading,
    isAuthenticated,
    tokenExpiry,
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles) => roles.includes(user?.role),
    hasPermission: (permission) => {
      // Implement permission-based access control
      const userRole = user?.role;
      const permissions = {
        admin: ['read', 'write', 'delete', 'manage_users', 'manage_system'],
        manager: ['read', 'write', 'manage_employees'],
        user: ['read', 'write_own']
      };
      return permissions[userRole]?.includes(permission) || false;
    }
  }), [user, login, logout, loading, isAuthenticated, tokenExpiry]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}