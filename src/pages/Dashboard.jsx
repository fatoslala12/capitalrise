import { useAuth } from "../context/AuthContext";
import TodoList from "../components/TodoList";
import ChangePassword from "../components/ChangePassword";
import WorkHoursTable from "../components/WorkHoursTable";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import DashboardStats from "../components/DashboardStats";
import api from "../api";
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

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [tasks, setTasks] = useState([]);
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

  // Merr orët e punës për çdo punonjës nga backend
  useEffect(() => {
    if (employees.length === 0) return;
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
  }, [employees]);

  // Merr detyrat nga backend
  useEffect(() => {
    api.get("/api/tasks")
      .then(res => setTasks(res.data))
      .catch(() => setTasks([]));
  }, [employees]);

  // Merr statistika për menaxherin
  useEffect(() => {
    if (user?.role === "manager" && user?.employee_id) {
      setLoading(true);
      
      // Merr të dhënat e menaxherit
      axios.get(`https://building-system.onrender.com/api/employees/${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const managerData = res.data;
          const managerSites = managerData.workplace || [];
          
          // Merr punonjësit që punojnë në site-t e menaxherit
          axios.get("https://building-system.onrender.com/api/employees", {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(empRes => {
              const allEmployees = empRes.data || [];
              const managerEmployees = allEmployees.filter(emp => 
                emp.workplace && Array.isArray(emp.workplace) && 
                emp.workplace.some(site => managerSites.includes(site))
              );
              
              // Merr detyrat e menaxherit
              axios.get(`https://building-system.onrender.com/api/tasks?assignedTo=${user.employee_id}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
                .then(taskRes => {
                  const managerTasks = taskRes.data || [];
                  const pendingTasks = managerTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
                  const completedTasks = managerTasks.filter(t => t.status === 'completed');
                  
                  // Llogarit orët e punës për javën aktuale
                  let totalHoursThisWeek = 0;
                  let totalPayThisWeek = 0;
                  
                  managerEmployees.forEach(emp => {
                    const empHours = hourData[emp.id] || {};
                    const weekHours = empHours[currentWeekLabel] || {};
                    Object.values(weekHours).forEach(day => {
                      if (day && day.hours) {
                        totalHoursThisWeek += Number(day.hours);
                        totalPayThisWeek += Number(day.hours) * Number(emp.hourly_rate || 0);
                      }
                    });
                  });
                  
                  setManagerStats({
                    totalEmployees: managerEmployees.length,
                    activeEmployees: managerEmployees.filter(emp => emp.status === 'Aktiv').length,
                    totalHoursThisWeek: totalHoursThisWeek,
                    totalPayThisWeek: totalPayThisWeek,
                    pendingTasks: pendingTasks.length,
                    completedTasks: completedTasks.length,
                    mySites: managerSites
                  });
                  setLoading(false);
                })
                .catch(() => {
                  setManagerStats(prev => ({ ...prev, mySites: managerSites }));
                  setLoading(false);
                });
            })
            .catch(() => setLoading(false));
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, token, hourData, currentWeekLabel]);

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
    <div className="max-w-6xl mx-auto">
      {/* Heqim titullin për admin */}
      {user.role !== "admin" && (
        <h1 className="text-2xl font-bold mb-4">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h1>
      )}

      {/* Përdorues - Punonjës */}
      {user.role === "user" && (
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-red-600 text-lg">📌</span>
              Detyrat e tua (në vazhdim)
            </h3>

            {tasks.filter((t) => t.assignedTo === user.email && t.status === "ongoing").length === 0 ? (
              <p className="text-gray-500 italic">Nuk ke detyra aktive për momentin.</p>
            ) : (
              <ul className="space-y-3">
                {tasks
                  .filter((t) => t.assignedTo === user.email && t.status === "ongoing")
                  .slice(0, 3)
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-col bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3 rounded-lg shadow hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm">
                        🕒 {t.description || t.title}
                      </div>
                      {t.dueDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(t.dueDate) < new Date()
                            ? "❗ Ka kaluar afati!"
                            : `⏳ Afat deri më: ${new Date(t.dueDate).toLocaleDateString()}`}
                        </div>
                      )}
                      {t.siteName && (
                        <div className="text-xs text-gray-500">📍 Site: {t.siteName}</div>
                      )}
                      <div className="text-xs text-green-700 font-semibold mt-1">Statusi: Në vazhdim</div>
                    </li>
                  ))}
              </ul>
            )}

            <Link
              to={`/${user.role}/my-tasks`}
              className="inline-block mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded transition"
            >
              ➕ Shiko të gjitha detyrat
            </Link>
          </section>

          <section>
            <ChangePassword />
          </section>
        </div>
      )}

      {/* Admin */}
      {user.role === "admin" && (
        <div className="space-y-6">
          <section>
            {/* Zvogëlojmë panelin e administrimit */}
            <div className="max-w-2xl mx-auto">
              <DashboardStats />
            </div>
          </section>
        </div>
      )}

      {/* Manager */}
      {user.role === "manager" && (
        <div className="space-y-6">
          {/* Quick Stats për Menaxherin */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Punonjësit</p>
                  <p className="text-2xl font-bold">{managerStats.totalEmployees}</p>
                </div>
                <div className="text-3xl">👷</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Orët e Javës</p>
                  <p className="text-2xl font-bold">{managerStats.totalHoursThisWeek}</p>
                </div>
                <div className="text-3xl">⏰</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Paga e Javës</p>
                  <p className="text-2xl font-bold">£{managerStats.totalPayThisWeek.toFixed(2)}</p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Detyrat</p>
                  <p className="text-2xl font-bold">{managerStats.pendingTasks}</p>
                </div>
                <div className="text-3xl">📋</div>
              </div>
            </div>
          </section>

          {/* Site-t e Menaxherit */}
          <section className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-600 text-lg">🏗️</span>
              Site-t që Menaxhoni
            </h3>
            {managerStats.mySites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managerStats.mySites.map((site, index) => (
                  <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-blue-800">{site}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Punonjës aktivë: {employees.filter(emp => 
                        emp.workplace && Array.isArray(emp.workplace) && 
                        emp.workplace.includes(site) && emp.status === 'Aktiv'
                      ).length}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Nuk keni site të caktuar për momentin.</p>
            )}
          </section>

          {/* Detyrat e Menaxherit */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-red-600 text-lg">📌</span>
              Detyrat e tua (në vazhdim)
            </h3>

            {tasks.filter((t) => t.assignedTo === user.email && t.status === "ongoing").length === 0 ? (
              <p className="text-gray-500 italic">Nuk ke detyra aktive për momentin.</p>
            ) : (
              <ul className="space-y-3">
                {tasks
                  .filter((t) => t.assignedTo === user.email && t.status === "ongoing")
                  .slice(0, 3)
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-col bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3 rounded-lg shadow hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm">
                        🕒 {t.description || t.title}
                      </div>
                      {t.dueDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(t.dueDate) < new Date()
                            ? "❗ Ka kaluar afati!"
                            : `⏳ Afat deri më: ${new Date(t.dueDate).toLocaleDateString()}`}
                        </div>
                      )}
                      {t.siteName && (
                        <div className="text-xs text-gray-500">📍 Site: {t.siteName}</div>
                      )}
                      <div className="text-xs text-green-700 font-semibold mt-1">Statusi: Në vazhdim</div>
                    </li>
                  ))}
              </ul>
            )}

            <Link
              to={`/${user.role}/my-tasks`}
              className="inline-block mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded transition"
            >
              ➕ Shiko të gjitha detyrat
            </Link>
          </section>

          {/* Quick Actions për Menaxherin */}
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-green-600 text-lg">⚡</span>
              Aksione të Shpejta
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/manager/employees-list"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-center"
              >
                <div className="text-2xl mb-2">👷</div>
                <div className="font-semibold">Menaxho Punonjësit</div>
                <div className="text-sm opacity-90">Shto, edito dhe menaxho punonjësit</div>
              </Link>

              <Link
                to="/manager/work-hours"
                className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all duration-300 text-center"
              >
                <div className="text-2xl mb-2">🕒</div>
                <div className="font-semibold">Orët e Punës</div>
                <div className="text-sm opacity-90">Regjistro dhe menaxho orët e punës</div>
              </Link>

              <Link
                to="/manager/payments"
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow hover:from-purple-600 hover:to-purple-700 transition-all duration-300 text-center"
              >
                <div className="text-2xl mb-2">💰</div>
                <div className="font-semibold">Pagesat</div>
                <div className="text-sm opacity-90">Menaxho pagesat e punonjësve</div>
              </Link>

              <Link
                to="/manager/my-profile"
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow hover:from-orange-600 hover:to-orange-700 transition-all duration-300 text-center"
              >
                <div className="text-2xl mb-2">👤</div>
                <div className="font-semibold">Profili Im</div>
                <div className="text-sm opacity-90">Shiko dhe edito profilin tuaj</div>
              </Link>

              <Link
                to="/manager/my-tasks"
                className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-300 text-center"
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold">Detyrat e Mia</div>
                <div className="text-sm opacity-90">Menaxho detyrat tuaja</div>
              </Link>

              <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-4 rounded-lg shadow text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-semibold">Raportet</div>
                <div className="text-sm opacity-90">Shiko raportet e performancës</div>
              </div>
            </div>
          </section>

          {/* Informacion për Menaxherin */}
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold mb-3 text-blue-800">ℹ️ Informacion për Menaxherin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-700 mb-2">
                  <strong>Roli juaj:</strong> Menaxher - Menaxhoni punonjësit dhe orët e punës për site-t që ju janë caktuar.
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Site-t tuaja:</strong> {managerStats.mySites.join(", ") || "Nuk keni site të caktuar"}
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">
                  <strong>Punonjës aktivë:</strong> {managerStats.activeEmployees} nga {managerStats.totalEmployees} total
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Detyrat e përfunduara:</strong> {managerStats.completedTasks} nga {managerStats.completedTasks + managerStats.pendingTasks} total
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}