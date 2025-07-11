import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const avatarColors = [
  'bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-yellow-100', 'bg-pink-100', 'bg-indigo-100'
];

export default function Employees() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [resetting, setResetting] = useState("");
  const [toast, setToast] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios
      .get("https://building-system.onrender.com/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));
  }, [token]);

  useEffect(() => {
    axios
      .get("https://building-system.onrender.com/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployees(res.data))
      .catch(() => setEmployees([]));
  }, [token]);

  const handleReset = async (email) => {
    if (user.role !== "admin") {
      setToast("Vetëm admini mund të bëjë reset!");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    setResetting(email);
    try {
      await axios.post(
        "https://building-system.onrender.com/api/users/reset-password",
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast(`Fjalëkalimi për ${email} u rivendos në 123456789!`);
    } catch {
      setToast("⚠️ Përdoruesi nuk u gjet ose ndodhi një gabim.");
    }
    setResetting("");
    setTimeout(() => setToast(""), 2500);
  };

  const allUsers = [...users, ...employees.filter((e) => e.email && e.role)];

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h2 className="text-3xl font-bold mb-8 text-center text-purple-800 drop-shadow">👥 Lista e Përdoruesve</h2>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-6 py-3 rounded-xl shadow-lg z-50 border border-green-300 animate-fade-in">
          {toast}
        </div>
      )}
      {allUsers.length === 0 ? (
        <p className="text-gray-500 italic text-center">Nuk ka përdorues të regjistruar.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {allUsers.map((employee, index) => (
            <div
              key={employee.email}
              className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center border border-purple-100 hover:shadow-2xl transition group"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow ${avatarColors[index % avatarColors.length]}`}
              >
                {employee.photo ? (
                  <img src={employee.photo} alt="Foto" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span>{employee.first_name?.[0] || employee.firstName?.[0] || employee.email[0]}</span>
                )}
              </div>
              <div className="text-lg font-semibold text-purple-800 mb-1">
                {employee.first_name || employee.firstName || "-"} {employee.last_name || employee.lastName || ""}
              </div>
              <div className="text-sm text-gray-500 mb-2">{employee.email}</div>
              <div className="text-xs font-bold capitalize mb-4 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 inline-block">
                {employee.role}
              </div>
              {user.role === "admin" ? (
                <button
                  onClick={() => handleReset(employee.email)}
                  disabled={resetting === employee.email}
                  className={`w-full py-2 rounded-lg font-bold text-white transition bg-gradient-to-r from-purple-500 to-blue-500 shadow hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 ${resetting === employee.email ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {resetting === employee.email ? '...' : '♻ Reset Password'}
                </button>
              ) : (
                <span className="text-gray-400 italic">Vetëm admini</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
