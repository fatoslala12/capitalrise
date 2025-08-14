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
      const user = await login(formData.email.trim().toLowerCase(), formData.password);
      
      // Success notification
      toast.success("Mirëseerdhët! Po ju drejtojmë në dashboard...");
      
      // Navigate to appropriate dashboard based on role
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'manager') {
          navigate('/manager/dashboard');
        } else if (user.role === 'user') {
          navigate('/user/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1000);
      
    } catch (error) {
      // Handle specific error types
      let errorMessage = "Logimi dështoi. Ju lutem kontrolloni kredencialet tuaja.";
      
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
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative overflow-hidden p-4"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20"></div>
      
      <div className="relative z-10 bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md text-center border border-white/20">
        {/* Logo and Header */}
        <div className="mb-6 sm:mb-8">
          <img src={logo} alt="Logo" className="h-16 sm:h-20 mx-auto mb-4 sm:mb-6 drop-shadow-lg" />
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3">
            Mirëseerdhët
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm">Vendosni kredencialet për të hyrë në sistem</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          {/* Email Field */}
          <div className="text-left">
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              📧 Email
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="Vendosni email-in tuaj"
                value={formData.email}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className={`w-full p-3 sm:p-4 pl-10 sm:pl-12 border-2 rounded-xl focus:ring-4 focus:outline-none transition-all duration-300 text-sm sm:text-base ${
                  errors.email 
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-blue-300'
                }`}
                disabled={loading}
                autoComplete="email"
              />
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <span className="text-gray-400 text-sm sm:text-base">📧</span>
              </div>
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-pulse">
                <span>⚠️</span> {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="text-left">
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              🔐 Fjalëkalimi
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Vendosni fjalëkalimin tuaj"
                value={formData.password}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className={`w-full p-3 sm:p-4 pl-10 sm:pl-12 border-2 rounded-xl focus:ring-4 focus:outline-none transition-all duration-300 text-sm sm:text-base ${
                  errors.password 
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-blue-300'
                }`}
                disabled={loading}
                autoComplete="current-password"
              />
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <span className="text-gray-400 text-sm sm:text-base">🔐</span>
              </div>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-pulse">
                <span>⚠️</span> {errors.password}
              </p>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-3 sm:py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base ${
              loading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
                <span>Duke hyrë...</span>
              </>
            ) : (
              <>
                <span className="text-base sm:text-lg">🚀</span>
                <span>Hyr në Sistem</span>
              </>
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="mt-4 sm:mt-6 text-center">
            <a 
              href="/forgot-password" 
              className="text-blue-600 hover:text-blue-800 font-medium transition-all duration-300 hover:scale-105 inline-flex items-center gap-2 text-sm sm:text-base"
            >
              <span>🔑</span>
              <span>Kam harruar fjalëkalimin?</span>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}