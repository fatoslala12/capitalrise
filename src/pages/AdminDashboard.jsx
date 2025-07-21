// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import WorkHoursTable from "../components/WorkHoursTable";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import api from "../api";

const getStartOfWeek = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
  // Java tradicionale: E Hëna (1) → E Diel (0)
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  return new Date(today.setDate(diff));
};

const formatDateRange = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [contracts, setContracts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const token = localStorage.getItem("token");

  const currentWeekLabel = formatDateRange(getStartOfWeek());
  const previousWeeks = [
    { label: formatDateRange(getStartOfWeek(-1)), start: getStartOfWeek(-1) },
    { label: formatDateRange(getStartOfWeek(-2)), start: getStartOfWeek(-2) }
  ];

  useEffect(() => {
    api.get("/api/employees").then(res => setEmployees(res.data)).catch(() => setEmployees([]));
    api.get("/api/contracts").then(res => setContracts(res.data)).catch(() => setContracts([]));
    api.get("/api/tasks").then(res => setTasks(res.data)).catch(() => setTasks([]));
    api.get("/api/invoices").then(res => setInvoices(res.data)).catch(() => setInvoices([]));
    api.get("/api/expenses").then(res => setExpenses(res.data)).catch(() => setExpenses([]));
  }, []);

  // Merr orët e punës për çdo punonjës nga backend
  useEffect(() => {
    if (employees.length === 0) return;
    const fetchHours = async () => {
      const allData = {};
      for (const emp of employees) {
        try {
          const res = await axios.get(
            `https://building-system.onrender.com/api/work-hours/${emp.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          allData[emp.id] = res.data || {};
        } catch {
          allData[emp.id] = {};
        }
      }
      setHourData(allData);
    };
    fetchHours();
  }, [employees, token]);

  const handleChange = (empId, day, field, value) => {
    setHourData((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [day]: {
          ...prev[empId]?.[day],
          [field]: value,
        },
      },
    }));
    // Mund të shtosh axios.put/post këtu për të ruajtur ndryshimet në backend
  };

  return (
    <div className="w-full max-w-full px-2 md:px-8 py-6 md:py-10 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Cards statistikash */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">📄</div>
          <div className="text-2xl font-bold text-blue-800">{contracts.length}</div>
          <div className="text-sm text-blue-700">Kontrata</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">📝</div>
          <div className="text-2xl font-bold text-green-800">{tasks.length}</div>
          <div className="text-sm text-green-700">Detyra</div>
        </div>
        <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">🧾</div>
          <div className="text-2xl font-bold text-purple-800">{invoices.length}</div>
          <div className="text-sm text-purple-700">Fatura</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">💸</div>
          <div className="text-2xl font-bold text-yellow-800">{expenses.length}</div>
          <div className="text-sm text-yellow-700">Shpenzime</div>
        </div>
      </div>
      {/* Këtu do shtojmë cards/statistika dhe grafikë të avancuara për admin */}
      <WorkHoursTable
        employees={employees}
        weekLabel={currentWeekLabel}
        data={hourData}
        onChange={handleChange}
        readOnly={true}
        showPaymentControl={true}
      />

      {previousWeeks.map((week, index) => (
        <WorkHoursTable
          key={index}
          employees={employees}
          weekLabel={week.label}
          data={hourData}
          onChange={handleChange}
          readOnly={true}
          showPaymentControl={true}
        />
      ))}
    </div>
  );
}