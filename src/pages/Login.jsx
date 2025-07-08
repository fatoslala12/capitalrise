import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/2872763b-2a87-451b-8c6f-1094646f8f52.png";
import bgImage from "../assets/382b2286-46ce-4e4e-ad8b-e6ac9d0ee9ef.png";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      setError("Email ose fjalëkalim i pasaktë!");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="bg-white bg-opacity-90 p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <img src={logo} alt="Logo" className="h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-blue-800 mb-2">
          Welcome to Alban Construction
        </h2>
        <p className="text-sm text-gray-600 mb-4">Vendos kredencialet për të hyrë:</p>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="Lutem vendosni email-in per tu loguar"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="text-left">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Fjalëkalimi
            </label>
            <input
              type="password"
              placeholder="Lutem vendosni password-in per tu loguar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 transition duration-200"
          >
            Hyr
          </button>

          <div className="mt-3 text-sm text-center">
            <a href="/forgot-password" className="text-blue-600 hover:underline">
              Kam harruar fjalëkalimin?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}