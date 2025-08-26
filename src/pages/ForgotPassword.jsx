import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import logo from "../assets/2872763b-2a87-451b-8c6f-1094646f8f52.png";
import bgImage from "../assets/382b2286-46ce-4e4e-ad8b-e6ac9d0ee9ef.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1: email, 2: verification, 3: new password
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

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
    if (password.length < 8) {
      return "Fjalëkalimi duhet të ketë minimum 8 karaktere";
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "Fjalëkalimi duhet të përmbajë shkronja të mëdha, të vogla dhe numra";
    }
    return null;
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (password !== confirmPassword) {
      return "Fjalëkalimet nuk përputhen";
    }
    return null;
  };

  // Step 1: Send reset email
  const handleSendResetEmail = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setLoading(true);
    try {
      await axios.post("https://capitalrise-cwcq.onrender.com/api/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      
      toast.success("Email-i u dërgua me sukses! Kontrolloni kutinë tuaj.");
      setStep(2);
      setErrors({});
    } catch (err) {
      let errorMessage = "Email-i nuk u gjet në sistem.";
      
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.status === 404) {
        errorMessage = "Email-i nuk u gjet në sistem.";
      } else if (err.response?.status === 429) {
        errorMessage = "Shumë tentativa. Provoni përsëri më vonë.";
      }
      
      toast.error(errorMessage);
      setErrors({ email: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setErrors({ verificationCode: "Kodi i verifikimit është i detyrueshëm" });
      return;
    }

    setLoading(true);
    try {
      await axios.post("https://capitalrise-cwcq.onrender.com/api/auth/verify-reset-code", {
        email: email.trim().toLowerCase(),
        code: verificationCode.trim(),
      });
      
      toast.success("Kodi u verifikua me sukses!");
      setStep(3);
      setErrors({});
    } catch (err) {
      let errorMessage = "Kodi i verifikimit është i pasaktë.";
      
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      }
      
      toast.error(errorMessage);
      setErrors({ verificationCode: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
  const handleSetNewPassword = async () => {
    const passwordError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    
    const newErrors = {};
    if (passwordError) newErrors.password = passwordError;
    if (confirmError) newErrors.confirmPassword = confirmError;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await axios.post("https://capitalrise-cwcq.onrender.com/api/auth/reset-password", {
        email: email.trim().toLowerCase(),
        verificationCode: verificationCode.trim(),
        newPassword,
      });
      
      toast.success("Fjalëkalimi u ndryshua me sukses! Po ju drejtojmë në login...");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      let errorMessage = "Gabim në ndryshimin e fjalëkalimit.";
      
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      if (step === 1) handleSendResetEmail();
      else if (step === 2) handleVerifyCode();
      else if (step === 3) handleSetNewPassword();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20"></div>
      
      <div className="relative z-10 bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border border-white/20">
        {/* Logo and Header */}
        <div className="mb-8">
          <img src={logo} alt="Logo" className="h-16 mx-auto mb-4 drop-shadow-lg" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🔐 Reset Fjalëkalimi
          </h2>
          <p className="text-gray-600 text-sm">
            {step === 1 && "Vendosni email-in tuaj për të marrë kodin e verifikimit"}
            {step === 2 && "Vendosni kodin që u dërgua në email"}
            {step === 3 && "Vendosni fjalëkalimin e ri"}
          </p>
        </div>

        {/* Step 1: Email Input */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-left">
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                📧 Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="Vendosni email-in tuaj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`w-full p-4 pl-12 border-2 rounded-xl focus:ring-4 focus:outline-none transition-all duration-300 ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-blue-300'
                  }`}
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400">📧</span>
                </div>
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-pulse">
                  <span>⚠️</span> {errors.email}
                </p>
              )}
            </div>

            <button
              onClick={handleSendResetEmail}
              disabled={loading}
              className={`w-full font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                loading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Duke dërguar...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">📤</span>
                  <span>Dërgo Kodin</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Verification Code */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-left">
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                🔢 Kodi i Verifikimit
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Vendosni kodin 6-shifror"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  maxLength={6}
                  className={`w-full p-4 pl-12 border-2 rounded-xl focus:ring-4 focus:outline-none transition-all duration-300 text-center text-lg font-mono ${
                    errors.verificationCode 
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-blue-300'
                  }`}
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔢</span>
                </div>
              </div>
              {errors.verificationCode && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-pulse">
                  <span>⚠️</span> {errors.verificationCode}
                </p>
              )}
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={loading}
              className={`w-full font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                loading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Duke verifikuar...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">✅</span>
                  <span>Verifiko Kodin</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-left">
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                🔐 Fjalëkalimi i Ri
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Vendosni fjalëkalimin e ri"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`w-full p-4 pl-12 border-2 rounded-xl focus:ring-4 focus:outline-none transition-all duration-300 ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-blue-300'
                  }`}
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔐</span>
                </div>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-pulse">
                  <span>⚠️</span> {errors.password}
                </p>
              )}
            </div>

            <div className="text-left">
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                🔐 Konfirmo Fjalëkalimin
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Përsëritni fjalëkalimin e ri"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`w-full p-4 pl-12 border-2 rounded-xl focus:ring-4 focus:outline-none transition-all duration-300 ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-blue-300'
                  }`}
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔐</span>
                </div>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-pulse">
                  <span>⚠️</span> {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              onClick={handleSetNewPassword}
              disabled={loading}
              className={`w-full font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                loading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-purple-600 text-white hover:from-green-700 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Duke ndryshuar...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">💾</span>
                  <span>Ndrysho Fjalëkalimin</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-blue-600 hover:text-blue-800 font-medium transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
          >
            <span>←</span>
            <span>Kthehu në Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}