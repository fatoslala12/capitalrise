import { useAuth } from "../context/AuthContext";
import TodoList from "../components/TodoList";
import ChangePassword from "../components/ChangePassword";
import WorkHoursTable from "../components/WorkHoursTable";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import DashboardStats from "../components/DashboardStats";
import api from "../api";
import axios from "axios";
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

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [contracts, setContracts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [managerStats, setManagerStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalHoursThisWeek: 0,
    totalPayThisWeek: 0,
    pendingTasks: 0,
    completedTasks: 0,
    mySites: []
  });
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const currentWeekLabel = formatDateRange(getStartOfWeek());
  const previousWeeks = [
    { label: formatDateRange(getStartOfWeek(-1)), start: getStartOfWeek(-1) },
    { label: formatDateRange(getStartOfWeek(-2)), start: getStartOfWeek(-2) }
  ];

  // Merr emër + mbiemër për user-in (mos shfaq email në asnjë rast)
  const userFullName = (user?.first_name && user?.last_name)
    ? `${user.first_name} ${user.last_name}`
    : (user?.firstName && user?.lastName)
      ? `${user.firstName} ${user.lastName}`
      : "";

  // Merr punonjësit nga backend
  useEffect(() => {
    api.get("/api/employees")
      .then(res => setEmployees(res.data))
      .catch(() => setEmployees([]));
  }, []);

  // Merr orët e punës për user-in nga backend
  useEffect(() => {
    if (user?.role === "user" && user?.employee_id) {
      api.get(`/api/work-hours/${user.employee_id}`)
        .then(res => setHourData({ [user.employee_id]: res.data || {} }))
        .catch(() => setHourData({ [user.employee_id]: {} }));
    } else if (employees.length > 0) {
      // Menaxher/admin: merr për të gjithë
      const fetchHours = async () => {
        const allData = {};
        for (const emp of employees) {
          try {
            const res = await api.get(`/api/work-hours/${emp.id}`);
            allData[emp.id] = res.data || {};
          } catch {
            allData[emp.id] = {};
          }
        }
        setHourData(allData);
      };
      fetchHours();
    }
  }, [user, employees]);

  // Merr detyrat nga backend
  useEffect(() => {
    if (user?.role === "manager") {
      // Për manager-in, përdor endpoint-in e managerit
      api.get(`/api/tasks/manager/${user.employee_id}`)
        .then(res => setTasks(res.data))
        .catch(() => setTasks([]));
    } else {
      // Për admin dhe user, përdor endpoint-in e përgjithshëm
      api.get("/api/tasks")
        .then(res => setTasks(res.data))
        .catch(() => setTasks([]));
    }
  }, [employees, user]);

  // Merr statistika për menaxherin
  useEffect(() => {
    if (user?.role === "manager" && user?.employee_id) {
      setLoading(true);
      
      // Përdor endpoint-in e ri për dashboard-in e manager-it
      api.get(`/api/tasks/dashboard/manager/${user.employee_id}`)
        .then(res => {
          const stats = res.data;
                            setManagerStats({
                    totalEmployees: stats.totalEmployees || 0,
                    activeEmployees: stats.totalEmployees || 0, // Përkohësisht
                    totalHoursThisWeek: stats.weeklyHours || 0,
                    totalPayThisWeek: stats.weeklyPay || 0,
                    pendingTasks: stats.totalTasks || 0,
                    completedTasks: 0, // Përkohësisht
                    mySites: stats.managerSites || []
                  });
                  setLoading(false);
                })
                .catch(() => {
                  setLoading(false);
                });
    } else {
      setLoading(false);
    }
  }, [user, token, hourData, currentWeekLabel]);

  // Merr të dhënat e adminit
  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/api/contracts").then(res => setContracts(res.data)).catch(() => setContracts([]));
      api.get("/api/tasks").then(res => setTasks(res.data)).catch(() => setTasks([]));
      api.get("/api/invoices").then(res => setInvoices(res.data)).catch(() => setInvoices([]));
      api.get("/api/expenses").then(res => setExpenses(res.data)).catch(() => setExpenses([]));
    }
  }, [user]);

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

  const userEmployee = employees.find(emp => emp.id === user.employee_id);
  const [expandedWeeks, setExpandedWeeks] = useState([]);
  const toggleWeek = (weekLabel) => {
    setExpandedWeeks(prev =>
      prev.includes(weekLabel)
        ? prev.filter(w => w !== weekLabel)
        : [...prev, weekLabel]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Duke ngarkuar dashboard-in...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none px-2 md:px-4 lg:px-8">
      {/* Heqim titullin për admin */}
      {user.role !== "admin" && (
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 px-2">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h1>
      )}

      {/* Përdorues - Punonjës */}
      {user.role === "user" && (
        <div className="space-y-4 md:space-y-8">
          {/* Header i mirëseardhjes */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-blue-200 mx-2 md:mx-0">
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-bold">
                {userFullName ? userFullName.split(' ').map(n => n[0]).join('') : 'U'}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-lg md:text-2xl font-bold text-gray-800">Mirë se erdhe, {userFullName || 'Punonjës'}! 👋</h2>
                <p className="text-sm md:text-base text-gray-600">Këtu mund të shohësh detyrat, orët e punës dhe pagesat e tua</p>
              </div>
            </div>
          </div>

          {/* Statistika të shpejta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-0">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs md:text-sm">Orët e Javës</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold">
                    {(() => {
                      const userHours = hourData[user.employee_id] || {};
                      const currentWeek = Object.values(userHours).find(week => 
                        Object.keys(week).some(day => week[day]?.hours > 0)
                      ) || {};
                      return Object.values(currentWeek).reduce((total, day) => 
                        total + (Number(day?.hours) || 0), 0
                      );
                    })()} orë
                  </p>
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl">⏰</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs md:text-sm">Detyrat Aktive</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold">
                    {tasks.filter(t => t.assignedTo === user.email && t.status === "ongoing").length}
                  </p>
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl">📋</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs md:text-sm">Paga e Javës</p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold">
                    £{(() => {
                      const userHours = hourData[user.employee_id] || {};
                      const currentWeek = Object.values(userHours).find(week => 
                        Object.keys(week).some(day => week[day]?.hours > 0)
                      ) || {};
                      const totalHours = Object.values(currentWeek).reduce((total, day) => 
                        total + (Number(day?.hours) || 0), 0
                      );
                      const hourlyRate = employees.find(emp => emp.id === user.employee_id)?.hourly_rate || 0;
                      return (totalHours * hourlyRate).toFixed(2);
                    })()}
                  </p>
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl">💰</div>
              </div>
            </div>
          </div>

          {/* Detyrat e mia */}
          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600">📌</span>
                Detyrat e Mia
              </h3>
              <Link
                to={`/${user.role}/my-tasks`}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-4 py-2 rounded-lg transition"
              >
                Shiko të gjitha →
              </Link>
            </div>
            {tasks.filter((t) => t.assignedTo === user.email).length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-gray-500 text-lg">Nuk ke detyra aktive për momentin!</p>
                <p className="text-gray-400 text-sm">Gëzo pushimet e tua</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks
                  .filter((t) => t.assignedTo === user.email)
                  .slice(0, 3)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <h4 className="font-semibold text-gray-800">{t.description || t.title}</h4>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          {t.siteName && (
                            <span className="flex items-center gap-1">
                              <span>📍</span> {t.siteName}
                            </span>
                          )}
                          {t.dueDate && (
                            <span className={`flex items-center gap-1 ${new Date(t.dueDate) < new Date() ? 'text-red-600 font-semibold' : ''}`}>
                              <span>⏰</span> 
                              {new Date(t.dueDate) < new Date() 
                                ? "Ka kaluar afati!" 
                                : `Afat: ${new Date(t.dueDate).toLocaleDateString()}`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                          Në vazhdim
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Orët e punës të javës aktuale */}
          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-green-600">🕒</span>
              Orët e Punës të Javës Aktuale
            </h3>
            <WorkHoursTable 
              employees={employees.filter(emp => emp.id === user.employee_id)}
              weekLabel={currentWeekLabel}
              data={hourData}
              readOnly={true}
            />
          </section>

          {/* Grafik i orëve të punës */}
          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-indigo-600">📊</span>
              Orët e Punës të Javëve të Fundit
            </h3>
            {(() => {
              const userHours = hourData[user.employee_id] || {};
              const weeks = Object.keys(userHours).slice(-4); // 4 javët e fundit
              const chartData = weeks.map(week => {
                const weekData = userHours[week];
                const totalHours = Object.values(weekData || {}).reduce((total, day) => 
                  total + (Number(day?.hours) || 0), 0
                );
                return {
                  week: week.split(' - ')[0], // Merr vetëm datën e fillimit
                  hours: totalHours
                };
              }).filter(item => item.hours > 0);

              if (chartData.length === 0) {
                return (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📈</div>
                    <p className="text-gray-500">Nuk ka të dhëna për orët e punës</p>
                  </div>
                );
              }

              return (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="week" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('sq-AL', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [`${value} orë`, 'Orët']}
                      labelFormatter={(label) => `Java: ${new Date(label).toLocaleDateString('sq-AL')}`}
                    />
                    <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </section>

          {/* Pagesat e fundit */}
          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-emerald-600">💰</span>
              Pagesat e Fundit
            </h3>
            {(() => {
              // Simuloj pagesat e fundit bazuar në orët e punës
              const userHours = hourData[user.employee_id] || {};
              const hourlyRate = employees.find(emp => emp.id === user.employee_id)?.hourly_rate || 0;
              const recentPayments = Object.keys(userHours).slice(-3).map(week => {
                const weekData = userHours[week];
                const totalHours = Object.values(weekData || {}).reduce((total, day) => 
                  total + (Number(day?.hours) || 0), 0
                );
                return {
                  week,
                  hours: totalHours,
                  amount: totalHours * hourlyRate,
                  date: week.split(' - ')[0]
                };
              }).filter(payment => payment.hours > 0);

              if (recentPayments.length === 0) {
                return (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💳</div>
                    <p className="text-gray-500">Nuk ka pagesa të regjistruara</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {recentPayments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                          £
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            Java: {new Date(payment.date).toLocaleDateString('sq-AL')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.hours} orë të punuara
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-700">
                          £{payment.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          £{hourlyRate}/orë
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>

          {/* Ndryshimi i fjalëkalimit */}
          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-purple-600">🔐</span>
              Siguria e Llogarisë
            </h3>
            <ChangePassword />
          </section>

          {/* Butona të shpejtë për navigim */}
          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-cyan-600">⚡</span>
              Akses i Shpejtë
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to={`/${user.role}/work-hours`}
                className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🕒</div>
                <span className="text-sm font-semibold text-blue-800 text-center">Orët e Punës</span>
              </Link>
              
              <Link
                to={`/${user.role}/my-tasks`}
                className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                <span className="text-sm font-semibold text-green-800 text-center">Detyrat e Mia</span>
              </Link>
              
              <Link
                to={`/${user.role}/my-profile`}
                className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">👤</div>
                <span className="text-sm font-semibold text-purple-800 text-center">Profili Im</span>
              </Link>
              
              <Link
                to="/notifications"
                className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 hover:from-orange-100 hover:to-orange-200 transition-all duration-200 group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔔</div>
                <span className="text-sm font-semibold text-orange-800 text-center">Njoftimet</span>
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* Admin */}
      {user.role === "admin" && (
        <div className="space-y-6">
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
          {/* Top 5 punonjësit më produktivë */}
          <EmployeeBarChart employees={employees} hourData={hourData} />
          {/* Kontratat më të mëdha sipas vlerës */}
          <TopContractsBarChart contracts={contracts} />
        </div>
      )}

      {/* Manager */}
      {user.role === "manager" && (
        <div className="space-y-6">
          {/* Quick Stats për Menaxherin - Light Blue Gradients */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Punonjësit</p>
                  <p className="text-2xl font-bold text-blue-800">{managerStats.totalEmployees}</p>
                </div>
                <div className="text-3xl text-blue-500">👷</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-cyan-100 border border-cyan-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-600 text-sm font-medium">Orët e Javës</p>
                  <p className="text-2xl font-bold text-cyan-800">{managerStats.totalHoursThisWeek}</p>
                </div>
                <div className="text-3xl text-cyan-500">⏰</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-600 text-sm font-medium">Paga e Javës</p>
                  <p className="text-2xl font-bold text-indigo-800">£{managerStats.totalPayThisWeek.toFixed(2)}</p>
                </div>
                <div className="text-3xl text-indigo-500">💰</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-sky-100 border border-sky-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sky-600 text-sm font-medium">Detyrat</p>
                  <p className="text-2xl font-bold text-sky-800">{managerStats.pendingTasks}</p>
                </div>
                <div className="text-3xl text-sky-500">📋</div>
              </div>
            </div>
          </section>

          {/* Site-t e Menaxherit - Light Blue Theme */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-600 text-lg">🏗️</span>
              Site-t që Menaxhoni
            </h3>
            {managerStats.mySites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managerStats.mySites.map((site, index) => (
                  <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:border-blue-300 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <span className="font-semibold text-blue-700">{site}</span>
                    </div>
                    <div className="mt-2 text-sm text-blue-600">
                      Punonjës aktivë: {employees.filter(emp => 
                        emp.workplace && Array.isArray(emp.workplace) && 
                        emp.workplace.includes(site) && emp.status === 'Aktiv'
                      ).length}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-600 italic">Nuk keni site të caktuar për momentin.</p>
            )}
          </section>

          {/* Detyrat e Menaxherit - Light Blue Theme */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-blue-600 text-lg">📌</span>
              Detyrat e tua (në vazhdim)
            </h3>

            {tasks.filter((t) => t.status === "ongoing" || t.status === "pending").length === 0 ? (
              <p className="text-blue-600 italic">Nuk ke detyra aktive për momentin.</p>
            ) : (
              <ul className="space-y-3">
                {tasks
                  .filter((t) => t.status === "ongoing" || t.status === "pending")
                  .slice(0, 3)
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-col bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                        🕒 {t.title || t.description}
                        {user?.role === 'manager' && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                            {t.first_name && t.last_name ? `${t.first_name} ${t.last_name}` : `Employee #${t.assigned_to}`}
                          </span>
                        )}
                      </div>
                      {t.due_date && (
                        <div className="text-xs text-blue-600 mt-1">
                          {new Date(t.due_date) < new Date()
                            ? "❗ Ka kaluar afati!"
                            : `⏳ Afat deri më: ${new Date(t.due_date).toLocaleDateString()}`}
                        </div>
                      )}
                      {t.site_name && (
                        <div className="text-xs text-blue-600">📍 Site: {t.site_name}</div>
                      )}
                      <div className="text-xs text-blue-700 font-semibold mt-1">Statusi: {t.status === 'ongoing' ? 'Në vazhdim' : 'Në pritje'}</div>
                    </li>
                  ))}
              </ul>
            )}

            <Link
              to={`/${user.role}/my-tasks`}
              className="inline-block mt-3 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-300 border border-blue-200"
            >
              ➕ Shiko të gjitha detyrat
            </Link>
          </section>

          {/* Quick Actions për Menaxherin - Light Blue Gradients, No Reports/Payments */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100 p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-600 text-lg">⚡</span>
              Aksione të Shpejta
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/manager/employees-list"
                className="bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 text-blue-800 p-4 rounded-lg shadow-sm hover:shadow-md hover:from-blue-200 hover:to-blue-300 transition-all duration-300 text-center group"
              >
                <div className="text-2xl mb-2 text-blue-600 group-hover:scale-110 transition-transform">👷</div>
                <div className="font-semibold">Menaxho Punonjësit</div>
                <div className="text-sm opacity-80">Shto, edito dhe menaxho punonjësit</div>
              </Link>

              <Link
                to="/manager/work-hours"
                className="bg-gradient-to-br from-cyan-100 to-cyan-200 border border-cyan-300 text-cyan-800 p-4 rounded-lg shadow-sm hover:shadow-md hover:from-cyan-200 hover:to-cyan-300 transition-all duration-300 text-center group"
              >
                <div className="text-2xl mb-2 text-cyan-600 group-hover:scale-110 transition-transform">🕒</div>
                <div className="font-semibold">Orët e Punës</div>
                <div className="text-sm opacity-80">Regjistro dhe menaxho orët e punës</div>
              </Link>

              <Link
                to="/manager/my-profile"
                className="bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-300 text-indigo-800 p-4 rounded-lg shadow-sm hover:shadow-md hover:from-indigo-200 hover:to-indigo-300 transition-all duration-300 text-center group"
              >
                <div className="text-2xl mb-2 text-indigo-600 group-hover:scale-110 transition-transform">👤</div>
                <div className="font-semibold">Profili Im</div>
                <div className="text-sm opacity-80">Shiko dhe edito profilin tuaj</div>
              </Link>

              <Link
                to="/manager/my-tasks"
                className="bg-gradient-to-br from-sky-100 to-sky-200 border border-sky-300 text-sky-800 p-4 rounded-lg shadow-sm hover:shadow-md hover:from-sky-200 hover:to-sky-300 transition-all duration-300 text-center group"
              >
                <div className="text-2xl mb-2 text-sky-600 group-hover:scale-110 transition-transform">📋</div>
                <div className="font-semibold">Detyrat e Mia</div>
                <div className="text-sm opacity-80">Menaxho detyrat tuaja</div>
              </Link>
            </div>
          </section>

          {/* Informacion për Menaxherin - Light Blue Theme */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold mb-3 text-blue-800">ℹ️ Informacion për Menaxherin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 mb-2">
                  <strong>Roli juaj:</strong> Menaxher - Menaxhoni punonjësit dhe orët e punës për site-t që ju janë caktuar.
                </p>
                <p className="text-blue-700 mb-2">
                  <strong>Site-t tuaja:</strong> {managerStats.mySites.join(", ") || "Nuk keni site të caktuar"}
                </p>
              </div>
              <div>
                <p className="text-blue-700 mb-2">
                  <strong>Punonjës aktivë:</strong> {managerStats.activeEmployees} nga {managerStats.totalEmployees} total
                </p>
                <p className="text-blue-700 mb-2">
                  <strong>Detyrat e përfunduara:</strong> {managerStats.completedTasks} nga {managerStats.completedTasks + managerStats.pendingTasks} total
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Seksion për të gjitha javët e kaluara për user-in */}
      {user.role === "user" && hourData[user.employee_id] && (
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-blue-600">📅</span>
            Orët e Punës për të Gjitha Javët
          </h3>
          {Object.keys(hourData[user.employee_id]).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📆</div>
              <p className="text-gray-500">Nuk ka të dhëna për javët e kaluara</p>
            </div>
          ) : (
            Object.keys(hourData[user.employee_id]).sort().reverse().map(weekLabel => (
              <div key={weekLabel} className="mb-4">
                <button
                  className="flex items-center gap-2 text-lg font-semibold text-blue-700 hover:underline focus:outline-none mb-2"
                  onClick={() => toggleWeek(weekLabel)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{expandedWeeks.includes(weekLabel) ? '▼' : '▶'}</span>
                  Java: {weekLabel}
                </button>
                {expandedWeeks.includes(weekLabel) && userEmployee && (
                  <WorkHoursTable
                    employees={[userEmployee]}
                    weekLabel={weekLabel}
                    data={hourData}
                    readOnly={true}
                  />
                )}
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}