import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

      const { token, user: userData } = response.data;
      
      if (!token || !userData || !userData.role) {
        throw new Error('Invalid response from server');
      }

      // Store role-specific tokens
      const roleTokenKey = getRoleBasedTokenKey(userData.role);
      const roleUserKey = getRoleBasedUserKey(userData.role);
      
      // Store authentication data
      localStorage.setItem(roleTokenKey, token);
      localStorage.setItem(roleUserKey, JSON.stringify(userData));
      localStorage.setItem('currentRole', userData.role);
      
      // Set global token for API calls
      localStorage.setItem("token", token);
      localStorage.setItem("authUser", JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      
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
    
    // Clear API headers
    delete api.defaults.headers.common['Authorization'];
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    
    // Navigate to login
    navigate("/");
  }, [user?.role, getRoleBasedTokenKey, getRoleBasedUserKey, navigate]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for existing authentication
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("authUser");
        
        if (token && storedUser && isTokenValid(token)) {
          try {
            const userData = JSON.parse(storedUser);
            
            // Set API header
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Set user state
            setUser(userData);
            setIsAuthenticated(true);
            
            // Store role-specific data for compatibility
            if (userData.role) {
              const roleTokenKey = getRoleBasedTokenKey(userData.role);
              const roleUserKey = getRoleBasedUserKey(userData.role);
              localStorage.setItem(roleTokenKey, token);
              localStorage.setItem(roleUserKey, storedUser);
              localStorage.setItem('currentRole', userData.role);
            }
            
          } catch (error) {
            console.error('User data parsing failed:', error);
            logout();
          }
        } else {
          // No valid authentication found
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [getRoleBasedTokenKey, getRoleBasedUserKey, isTokenValid, logout]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    user,
    setUser,
    login,
    logout,
    loading,
    isAuthenticated,
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
  }), [user, login, logout, loading, isAuthenticated]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}