import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function ChangePassword() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = async () => {
    if (newPass.length < 8) {
      return setMessage("❌ Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere.");
    }
    if (newPass !== confirm) {
      return setMessage("❌ Konfirmimi nuk përputhet.");
    }
    try {
      await axios.post(
        "https://capitalrise-cwcq.onrender.com/api/users/change-password",
        {
          email: user.email,
          currentPassword: current,
          newPassword: newPass,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setMessage("✅ Fjalëkalimi u ndryshua me sukses!");
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "❌ Gabim gjatë ndryshimit të fjalëkalimit."
      );
    }
  };

  return (
    <div className="mt-6 bg-white p-4 rounded shadow">
      <h3 className="text-xl font-bold mb-4">🔑 Ndrysho Fjalëkalimin</h3>

      <div className="space-y-3">
        <input
          type="password"
          className="border p-2 rounded w-full"
          placeholder="Fjalëkalimi aktual"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          type="password"
          className="border p-2 rounded w-full"
          placeholder="Fjalëkalim i ri"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />
        <input
          type="password"
          className="border p-2 rounded w-full"
          placeholder="Konfirmo fjalëkalimin"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          onClick={handleChange}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ndrysho
        </button>

        {message && <p className="mt-2 text-sm">{message}</p>}
      </div>
    </div>
  );
}
