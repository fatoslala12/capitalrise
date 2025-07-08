import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function Employees() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const token = localStorage.getItem("token");

  // Merr user-at nga backend
  useEffect(() => {
    axios
      .get("https://building-system.onrender.com/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));
  }, [token]);

  // Merr punonjësit nga backend
  useEffect(() => {
    axios
      .get("https://building-system.onrender.com/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployees(res.data))
      .catch(() => setEmployees([]));
  }, [token]);

  // Reset password për user
  const handleReset = async (email) => {
    if (user.role !== "admin") {
      alert("Vetëm admini mund të bëjë reset!");
      return;
    }
    try {
      await axios.post(
        "https://building-system.onrender.com/api/users/reset-password",
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Fjalëkalimi për ${email} u rivendos me sukses.`);
    } catch {
      alert("⚠️ Përdoruesi nuk u gjet ose ndodhi një gabim.");
    }
  };

  const allUsers = [...users, ...employees.filter((e) => e.email && e.role)];

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">👥 Lista e Përdoruesve</h2>

      {allUsers.length === 0 ? (
        <p className="text-gray-500 italic">Nuk ka përdorues të regjistruar.</p>
      ) : (
        <table className="w-full border text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Roli</th>
              <th className="p-2 border">Reset Password</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((employee, index) => (
              <tr key={employee.email} className="hover:bg-gray-50">
                <td className="p-2 border">{index + 1}</td>
                <td className="p-2 border">{employee.email}</td>
                <td className="p-2 border capitalize">{employee.role}</td>
                <td className="p-2 border">
                  {user.role === "admin" ? (
                    <button
                      onClick={() => handleReset(employee.email)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      ♻ Reset Password
                    </button>
                  ) : (
                    <span className="text-gray-400 italic">Vetëm admini</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
