// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import WorkHoursTable from "../components/WorkHoursTable";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import api from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

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

const getCurrentWeekLabel = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toISOString().slice(0, 10)} - ${sunday.toISOString().slice(0, 10)}`;
};

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
  // Quick lists
  const unpaidEmployees = dashboardStats?.quickLists?.unpaidEmployees || [];
  const absentEmployees = dashboardStats?.quickLists?.absentEmployees || [];
  const overduePayments = dashboardStats?.paymentStats?.overduePayments || [];

  const currentWeekLabel = getCurrentWeekLabel();
  // Për Top 5 më të paguar, përditëso map-in që të marrë edhe rolin dhe foton:
  const top5Paid = dashboardStats?.top5Employees?.map(e => {
    const emp = employees.find(emp => emp.id === e.id);
    return {
      ...e,
      role: emp?.role || '-',
      photo: emp?.photo || '/placeholder.png',
      first_name: emp?.first_name || '',
      last_name: emp?.last_name || ''
    };
  }) || [];
  const unpaidInvoices = invoices.filter(inv => !inv.paid);
  const unpaidExpenses = expenses.filter(exp => !exp.paid);

  // Shto funksion për të marrë top 5 site më aktive për javën aktuale:
  const top5Sites = (() => {
    const siteHours = {};
    employees.forEach(emp => {
      const weekData = (hourData[emp.id] || {})[currentWeekLabel] || {};
      Object.values(weekData).forEach(day => {
        if (day.site && day.hours) {
          siteHours[day.site] = (siteHours[day.site] || 0) + parseFloat(day.hours);
        }
      });
    });
    return Object.entries(siteHours)
      .map(([site, hours]) => ({ site, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  })();

  // Shto funksion për të marrë fitimin për çdo site për javën aktuale:
  const siteProfits = (() => {
    const profits = {};
    employees.forEach(emp => {
      const weekData = (hourData[emp.id] || {})[currentWeekLabel] || {};
      Object.values(weekData).forEach(day => {
        if (day.site && day.hours) {
          const profit = (parseFloat(day.hours) || 0) * (parseFloat(emp.hourly_rate) || 0) * 0.2;
          profits[day.site] = (profits[day.site] || 0) + profit;
        }
      });
    });
    return Object.entries(profits)
      .map(([site, profit]) => ({ site, profit }))
      .sort((a, b) => b.profit - a.profit);
  })();

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

      {/* Quick lists dhe njoftime të shpejta */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-blue-700 flex items-center gap-2">
              <span>⏳</span> Punonjësit me pagesa të papaguara
            </h3>
            {unpaidEmployees.length === 0 ? <p className="text-gray-500 italic">Të gjithë janë paguar këtë javë.</p> : (
              <ul className="space-y-2">
                {unpaidEmployees.map(e => (
                  <li key={e.id} className="flex justify-between border-b pb-1">
                    <span>{e.name}</span>
                    <span className="text-red-600 font-bold">£{e.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-yellow-700 flex items-center gap-2">
              <span>🚫</span> Punonjësit absentë këtë javë
            </h3>
            {absentEmployees.length === 0 ? <p className="text-gray-500 italic">Të gjithë kanë orë të regjistruara.</p> : (
              <ul className="space-y-2">
                {absentEmployees.map(e => (
                  <li key={e.id}>{e.name}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-purple-700 flex items-center gap-2">
              <span>💸</span> Pagesa të prapambetura
            </h3>
            {overduePayments.length === 0 ? <p className="text-gray-500 italic">Nuk ka pagesa të prapambetura.</p> : (
              <ul className="space-y-2">
                {overduePayments.map(e => (
                  <li key={e.id + e.week} className="flex justify-between border-b pb-1">
                    <span>{e.name} ({e.week})</span>
                    <span className="text-red-600 font-bold">£{e.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

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
      {/* Grafik për site */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📊 Ora të punuara këtë javë sipas site-ve ({dashboardStats?.thisWeek || ''})</h3>
        <div className="mb-4 text-lg font-semibold text-gray-700">
          Total orë të punuara: <span className="text-blue-600">{dashboardStats?.totalWorkHours ?? 0}</span> orë
        </div>
        {dashboardStats?.workHoursBysite && dashboardStats.workHoursBysite.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dashboardStats.workHoursBysite} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: "Orë", position: "insideBottomRight", offset: -5 }} />
              <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#3b82f6' }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka orë pune të regjistruara për këtë javë</p>
        )}
      </div>

      {/* Top 5 më të paguar */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">🏅 Top 5 punonjësit më të paguar këtë javë</h3>
        {dashboardStats?.top5Employees && dashboardStats.top5Employees.length > 0 ? (
          <ul className="space-y-3 text-gray-800">
            {dashboardStats.top5Employees.map((e, i) => (
              <li key={e.id} className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
                <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl border-2 border-blue-300 shadow">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">
                    {e.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {e.isPaid ? '✅ E paguar' : '⏳ E papaguar'}
                  </p>
                </div>
                <div className="text-blue-700 font-extrabold text-xl">£{e.grossAmount.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka pagesa të regjistruara për këtë javë</p>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
        <h3 className="text-xl font-bold mb-6 text-purple-800 flex items-center gap-2">
          <span>🧾</span> Faturat e papaguara
        </h3>
        <ul className="space-y-3">
          {unpaidInvoices.map(inv => (
            <li key={inv.invoice_number} className="flex flex-col md:flex-row md:items-center gap-2 border-b pb-2">
              <span className="font-semibold">#{inv.invoice_number}</span>
              <span>{inv.company || inv.company_name}</span>
              <span>{inv.site_name || inv.site_number}</span>
              <span className="ml-auto font-bold text-purple-700">£{inv.total || inv.amount}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
        <h3 className="text-xl font-bold mb-6 text-yellow-800 flex items-center gap-2">
          <span>💸</span> Shpenzime të papaguara
        </h3>
        <ul className="space-y-3">
          {unpaidExpenses.map(exp => (
            <li key={exp.id || exp.invoice_number} className="flex flex-col md:flex-row md:items-center gap-2 border-b pb-2">
              <span className="font-semibold">#{exp.invoice_number || exp.id}</span>
              <span>{exp.company || exp.company_name}</span>
              <span>{exp.site_name || exp.site_number}</span>
              <span className="ml-auto font-bold text-yellow-700">£{exp.total || exp.amount || exp.gross}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
        <h3 className="text-xl font-bold mb-6 text-blue-700 flex items-center gap-2">
          <span>📊</span> Top 5 site më aktive (kjo javë)
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={top5Sites}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
            barSize={32}
          >
            <XAxis type="number" />
            <YAxis
              dataKey="site"
              type="category"
              tick={{ fontSize: 16, fill: "#2563eb" }}
              width={140}
            />
            <Tooltip formatter={v => [`${v} orë`, "Total Orë"]} cursor={{ fill: "#f3f4f6" }} />
            <Bar dataKey="hours" radius={[8, 8, 8, 8]} fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-10">
        <h3 className="text-xl font-bold mb-6 text-green-700 flex items-center gap-2">
          <span>💰</span> Fitimi aktual për çdo site (kjo javë)
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={siteProfits}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
            barSize={32}
          >
            <XAxis type="number" tickFormatter={v => `£${v.toFixed(2)}`}/>
            <YAxis
              dataKey="site"
              type="category"
              tick={{ fontSize: 16, fill: "#059669" }}
              width={140}
            />
            <Tooltip formatter={v => [`£${v.toFixed(2)}`, "Fitimi"]} cursor={{ fill: "#f3f4f6" }} />
            <Bar dataKey="profit" radius={[8, 8, 8, 8]} fill="#059669" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Detyrat - më të dukshme */}
      <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-8 rounded-2xl shadow-xl col-span-full border border-yellow-200">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📋 Detyrat</h3>
        <div className="mb-4 flex gap-4 items-center">
          <label className="font-medium">Filtro:</label>
          <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="border p-2 rounded">
            <option value="ongoing">Vetëm aktive</option>
            <option value="completed">Vetëm të përfunduara</option>
            <option value="all">Të gjitha</option>
          </select>
        </div>
        <div className="mb-4 flex flex-wrap gap-6">
          <div className="bg-blue-100 px-6 py-3 rounded-xl text-blue-800 font-bold shadow">Totali: {allTasks.length}</div>
          <div className="bg-green-100 px-6 py-3 rounded-xl text-green-800 font-bold shadow">✅ Të përfunduara: {allTasks.filter(t => t.status === 'completed').length}</div>
          <div className="bg-yellow-100 px-6 py-3 rounded-xl text-yellow-800 font-bold shadow">🕒 Në vazhdim: {allTasks.filter(t => t.status === 'ongoing').length}</div>
        </div>
        {filteredTasks.length > 0 ? (
          <ul className="space-y-3">
            {filteredTasks.map((t, idx) => (
              <li key={t.id || idx} className="flex flex-col md:flex-row md:items-center gap-4 bg-white rounded-xl p-4 shadow border border-blue-100">
                <StatusBadge status={t.status === 'completed' ? 'completed' : 'ongoing'} />
                <span className="font-semibold flex-1 text-lg">{t.description || t.title || ''}</span>
                <span className="text-lg text-blue-700 font-bold">{t.site_name || t.siteName || ''}</span>
                <span className="text-lg text-purple-700 font-bold">Afati: {t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}</span>
                <span className="text-xs text-gray-500">Nga: {t.assigned_by || t.assignedBy || ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <NoTasksEmpty />
        )}
      </div>
      {/* Faturat e papaguara */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📌 Faturat e Papaguara</h3>
        {unpaidInvoices.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha faturat janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaidInvoices.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold">🔴 Kontrata #{item.contractNumber || ''}</span>
                <span className="font-bold text-black">Nr. Fature: <b>{item.invoiceNumber || ''}</b></span>
                <span className="font-bold text-black flex items-center gap-1">🏢 Site: <b>{item.siteName || ''}</b></span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.total !== undefined ? `£${item.total.toFixed(2)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shpenzimet e papaguara */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full mb-8">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📂 Shpenzimet e Papaguara</h3>
        {unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha shpenzimet janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold flex items-center gap-1">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                <span className="font-bold text-lg">{item.type || ''}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.gross !== undefined ? `£${item.gross.toFixed(2)}` : ''}</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">🏢 {(() => {
                  if (!item.contract_id || !contracts.length) return '';
                  const c = contracts.find(c => String(c.id) === String(item.contract_id));
                  return c ? `${c.site_name || c.siteName || ''}` : '';
                })()}</span>
                <span className="text-gray-700">{item.description || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}