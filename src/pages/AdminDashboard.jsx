// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import WorkHoursTable from "../components/WorkHoursTable";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import api from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

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

const barColors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f472b6"];

function getTop5Employees(employees, hourData) {
  return employees
    .map(emp => {
      let totalHours = 0;
      const empData = hourData[emp.id] || {};
      Object.values(empData).forEach(week => {
        Object.values(week).forEach(day => {
          totalHours += Number(day.hours || 0);
        });
      });
      return {
        id: emp.id,
        name: `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim(),
        photo: emp.photo,
        totalHours,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 5);
}

function EmployeeBarChart({ employees, hourData }) {
  const top5 = getTop5Employees(employees, hourData);
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
      <h3 className="text-xl font-bold mb-6 text-blue-800 flex items-center gap-2">
        <span>🏆</span> Top 5 Punonjësit më Produktivë
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={top5}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
          barSize={32}
        >
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 16, fill: "#334155" }}
            width={140}
            tickFormatter={(name, i) => (
              <span style={{ display: "flex", alignItems: "center" }}>
                {top5[i].photo ? (
                  <img
                    src={top5[i].photo}
                    alt={name}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginRight: 8,
                      border: "2px solid #e0e7ef",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#e0e7ef",
                      color: "#6366f1",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      marginRight: 8,
                    }}
                  >
                    {name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
                {name}
              </span>
            )}
          />
          <Tooltip
            formatter={(value) => [`${value} orë`, "Total Orë"]}
            cursor={{ fill: "#f3f4f6" }}
          />
          <Bar dataKey="totalHours" radius={[8, 8, 8, 8]}>
            {top5.map((entry, index) => (
              <Cell key={entry.id} fill={barColors[index % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopContractsBarChart({ contracts }) {
  // Merr top 5 kontratat sipas vlerës
  const topContracts = [...contracts]
    .filter(c => c.contract_value && !isNaN(Number(c.contract_value)))
    .sort((a, b) => Number(b.contract_value) - Number(a.contract_value))
    .slice(0, 5)
    .map(c => ({
      name: c.site_name || c.company || c.contract_number,
      value: Number(c.contract_value),
    }));
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
      <h3 className="text-xl font-bold mb-6 text-purple-800 flex items-center gap-2">
        <span>💼</span> Kontratat më të mëdha sipas vlerës
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={topContracts}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
          barSize={32}
        >
          <XAxis type="number" tickFormatter={v => `£${v.toLocaleString()}`} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 16, fill: "#6d28d9" }}
            width={180}
          />
          <Tooltip formatter={v => [`£${v.toLocaleString()}`, "Vlera"]} cursor={{ fill: "#f3f4f6" }} />
          <Bar dataKey="value" radius={[8, 8, 8, 8]}>
            {topContracts.map((entry, index) => (
              <Cell key={entry.name} fill={barColors[index % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [contracts, setContracts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const token = localStorage.getItem("token");

  // Kartat ekzistuese
  useEffect(() => {
    api.get("/api/employees").then(res => setEmployees(res.data)).catch(() => setEmployees([]));
    api.get("/api/contracts").then(res => setContracts(res.data)).catch(() => setContracts([]));
    api.get("/api/tasks").then(res => setTasks(res.data)).catch(() => setTasks([]));
    api.get("/api/invoices").then(res => setInvoices(res.data)).catch(() => setInvoices([]));
    api.get("/api/expenses").then(res => setExpenses(res.data)).catch(() => setExpenses([]));
  }, []);

  // Orët e punës për çdo punonjës (për kartat ekzistuese)
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

  // Statistikat/grafiket e reja nga backend
  useEffect(() => {
    api.get("/api/dashboard-stats")
      .then(res => setDashboardStats(res.data))
      .catch(() => setDashboardStats(null));
  }, []);

  // Top 5 punonjësit më produktivë nga backend
  const top5Employees = dashboardStats?.quickLists?.top5ProductiveEmployees || [];
  // Top 5 kontratat më të mëdha nga backend
  const top5Contracts = dashboardStats?.contractStats?.top5ContractsTotal || [];

  return (
    <div className="w-full max-w-full px-2 md:px-8 py-6 md:py-10 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Kartat ekzistuese */}
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

      {/* Grafiket/statistikat e reja nga dashboardStats */}
      {dashboardStats && (
        <>
          {/* Top 5 punonjësit më produktivë nga backend */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
            <h3 className="text-xl font-bold mb-6 text-blue-800 flex items-center gap-2">
              <span>🏆</span> Top 5 Punonjësit më Produktivë
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={top5Employees}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
                barSize={32}
              >
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 16, fill: "#334155" }}
                  width={140}
                />
                <Tooltip formatter={(value) => [`${value} orë`, "Total Orë"]} cursor={{ fill: "#f3f4f6" }} />
                <Bar dataKey="hours" radius={[8, 8, 8, 8]}>
                  {top5Employees.map((entry, index) => (
                    <Cell key={entry.id} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 kontratat më të mëdha sipas pagesës totale nga backend */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
            <h3 className="text-xl font-bold mb-6 text-purple-800 flex items-center gap-2">
              <span>💼</span> Top 5 Kontratat më të mëdha (pagesa totale)
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={top5Contracts}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
                barSize={32}
              >
                <XAxis type="number" tickFormatter={v => `£${v.toLocaleString()}`} />
                <YAxis
                  dataKey="site"
                  type="category"
                  tick={{ fontSize: 16, fill: "#6d28d9" }}
                  width={180}
                />
                <Tooltip formatter={v => [`£${v.toLocaleString()}`, "Pagesa"]} cursor={{ fill: "#f3f4f6" }} />
                <Bar dataKey="paid" radius={[8, 8, 8, 8]}>
                  {top5Contracts.map((entry, index) => (
                    <Cell key={entry.site} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Shembull: shfaqje e statistikave të tjera nga dashboardStats */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
            <h3 className="text-lg font-bold mb-4 text-gray-700">Statistika të tjera</h3>
            <pre className="text-xs bg-gray-50 p-4 rounded-xl overflow-x-auto">
              {JSON.stringify(dashboardStats, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}