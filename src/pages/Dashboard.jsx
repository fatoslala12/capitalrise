import { useAuth } from "../context/AuthContext";
import TodoList from "../components/TodoList";
import ChangePassword from "../components/ChangePassword";
import WorkHoursTable from "../components/WorkHoursTable";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import DashboardStats from "../components/DashboardStats";
import api from "../api";

const getStartOfWeek = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
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
  }, []);

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
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h1>

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
            <DashboardStats />
          </section>
        </div>
      )}

      {/* Manager */}
      {user.role === "manager" && (
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
            <p className="text-gray-600">Menaxhoni punonjësit dhe orët e punës për site-t që ju janë caktuar.</p>

            <Link
              to="/admin/employees-list"
              className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              ➕ Menaxho Punonjësit
            </Link>

            <Link
              to="/manager/work-hours"
              className="inline-block mt-4 ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              🕒 Orët e Punës
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}