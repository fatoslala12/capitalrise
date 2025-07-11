// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import WorkHoursTable from "../components/WorkHoursTable";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

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
  const token = localStorage.getItem("token");

  const currentWeekLabel = formatDateRange(getStartOfWeek());
  const previousWeeks = [
    { label: formatDateRange(getStartOfWeek(-1)), start: getStartOfWeek(-1) },
    { label: formatDateRange(getStartOfWeek(-2)), start: getStartOfWeek(-2) }
  ];

  // Merr punonjësit nga backend
  useEffect(() => {
    axios.get("https://building-system.onrender.com/api/employees", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setEmployees(res.data))
      .catch(() => setEmployees([]));
  }, [token]);

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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">📊 Paneli i Administrimit të Orëve</h2>

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