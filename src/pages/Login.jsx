import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useErrorHandler } from "../components/ErrorBoundary";
import { LoadingWithError } from "../components/ErrorBoundary";
import { toast } from "react-hot-toast";
import logo from "../assets/2872763b-2a87-451b-8c6f-1094646f8f52.png";
import bgImage from "../assets/382b2286-46ce-4e4e-ad8b-e6ac9d0ee9ef.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      return "Email-i është i detyrueshëm";
    }
    if (!emailRegex.test(email)) {
      return "Email-i nuk është i vlefshëm";
    }
    return null;
  };

  const validatePassword = (password) => {
    if (!password.trim()) {
      return "Fjalëkalimi është i detyrueshëm";
    }
    if (password.length < 6) {
      return "Fjalëkalimi duhet të ketë minimum 6 karaktere";
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error("Ju lutem plotësoni të gjitha fushat në mënyrë korrekte");
      return;
    }

    setLoading(true);
    
    try {
      // Attempt login
      await login(formData.email.trim().toLowerCase(), formData.password);
      
      // Success notification
      toast.success("Mirëseerdhët! Po ju drejtojmë në dashboard...");
      
      // Navigate to appropriate dashboard based on role
      setTimeout(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'manager') {
          navigate('/manager/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1000);
      
    } catch (error) {
      // Handle specific error types
      let errorMessage = "Email ose fjalëkalim i pasaktë!";
      
      if (error.response?.status === 429) {
        errorMessage = "Shumë tentativa të dështuara. Provoni përsëri më vonë.";
      } else if (error.response?.status === 403) {
        errorMessage = "Llogaria juaj është e bllokuar. Kontaktoni administratorin.";
      } else if (error.response?.status === 500) {
        errorMessage = "Gabim i serverit. Provoni përsëri më vonë.";
      } else if (error.message?.includes('Network')) {
        errorMessage = "Probleme me lidhjen. Kontrolloni internetin tuaj.";
      }
      
      // Log error for debugging
      handleError(error, 'Login failed');
      
      // Show error message
      toast.error(errorMessage);
      
      // Clear password field on error
      setFormData(prev => ({
        ...prev,
        password: ""
      }));
      
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin(e);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="bg-white bg-opacity-95 p-8 rounded-2xl shadow-xl w-full max-w-md text-center backdrop-blur-sm">
        <img src={logo} alt="Logo" className="h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-blue-800 mb-2">
          Mirëseerdhët në Alban Construction
        </h2>
        <p className="text-sm text-gray-600 mb-6">Vendosni kredencialet për të hyrë:</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="Vendosni email-in tuaj"
              value={formData.email}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                errors.email 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              disabled={loading}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.email}
              </p>
            )}
          </div>

          <div className="text-left">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Fjalëkalimi
            </label>
            <input
              type="password"
              name="password"
              placeholder="Vendosni fjalëkalimin tuaj"
              value={formData.password}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                errors.password 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              disabled={loading}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              loading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-[1.02]'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Duke hyrë...
              </>
            ) : (
              <>
                <span>🔐</span>
                Hyr
              </>
            )}
          </button>

          <div className="mt-4 text-sm text-center">
            <a 
              href="/forgot-password" 
              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Kam harruar fjalëkalimin?
            </a>
          </div>
        </form>

        {/* Security notice */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 flex items-center gap-1">
            <span>🔒</span>
            Lidhja juaj është e sigurt dhe e enkriptuar
          </p>
        </div>
      </div>
    </div>
  );
}