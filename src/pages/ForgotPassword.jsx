import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleReset = async () => {
    if (!email.trim()) {
      setMessage("❌ Ju lutem vendosni emailin.");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("❌ Fjalëkalimi duhet të ketë të paktën 8 karaktere.");
      return;
    }
    try {
      await axios.post("https://building-system.onrender.com/api/user-management/reset-password", {
        email: email.trim().toLowerCase(),
        newPassword,
      });
      setMessage("✅ Fjalëkalimi u rivendos me sukses. Email u dërgua me njoftim.");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      let errorMessage = "❌ Ky email nuk ekziston ose ndodhi një gabim.";
      
      if (err.response?.data?.error?.message) {
        errorMessage = `❌ ${err.response.data.error.message}`;
      } else if (err.response?.status === 404) {
        errorMessage = "❌ Email-i nuk u gjet në sistem.";
      } else if (err.response?.status === 400) {
        errorMessage = "❌ Të dhënat nuk janë të vlefshme.";
      }
      
      setMessage(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">🔐 Reset Fjalëkalimi</h2>

        <input
          type="email"
          placeholder="Vendos emailin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full mb-3 rounded"
        />

        <input
          type="password"
          placeholder="Vendos fjalëkalimin e ri"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="border p-2 w-full mb-3 rounded"
        />

        <button
          onClick={handleReset}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Reset Fjalëkalimin
        </button>

        {message && <p className="mt-3 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}