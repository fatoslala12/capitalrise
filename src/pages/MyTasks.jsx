import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [siteFilter, setSiteFilter] = useState("all");
  const token = localStorage.getItem("token");

  // Merr detyrat nga backend për user-in aktiv
  useEffect(() => {
    if (!user?.email) return;
    axios
      .get(`http://localhost:5000/api/tasks?assignedTo=${user.email}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTasks(res.data || []))
      .catch(() => setTasks([]));
  }, [user, token]);

  // Përditëso statusin e detyrës në backend
  const handleComplete = async (id) => {
    try {
      await axios.put(
        `http://localhost:5000/api/tasks/${id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t))
      );
    } catch {
      alert("Gabim gjatë përditësimit të statusit!");
    }
  };

  const uniqueSites = [...new Set(tasks.map((t) => t.siteName).filter(Boolean))];

  const filteredTasks = tasks
    .filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (siteFilter !== "all" && t.siteName !== siteFilter) return false;
      return true;
    })
    .sort((a, b) =>
      sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const ongoing = tasks.filter((t) => t.status === "ongoing").length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-2">📌 Detyrat e mia</h2>

      {/* 📊 Statistika */}
      <div className="flex gap-6 text-sm text-gray-600">
        <span>📋 Total: <strong>{total}</strong></span>
        <span>✅ Përfunduara: <strong>{completed}</strong></span>
        <span>🕒 Në vazhdim: <strong>{ongoing}</strong></span>
      </div>

      {/* 🔽 Filtra */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Statusi:</label>
          <select
            className="border p-2 rounded"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Të gjitha</option>
            <option value="ongoing">Në vazhdim</option>
            <option value="completed">Të përfunduara</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Site-i:</label>
          <select
            className="border p-2 rounded"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
          >
            <option value="all">Të gjitha</option>
            {uniqueSites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Renditja:</label>
          <select
            className="border p-2 rounded"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Më të rejat fillimisht</option>
            <option value="asc">Më të vjetrat fillimisht</option>
          </select>
        </div>
      </div>

      {/* Lista e detyrave */}
      {filteredTasks.length === 0 ? (
        <p className="text-gray-500 italic mt-4">Nuk ka detyra sipas filtrave të zgjedhur.</p>
      ) : (
        <ul className="space-y-4 mt-4">
          {filteredTasks.map((t) => (
            <li
              key={t.id}
              className={`p-4 rounded shadow flex justify-between items-start flex-col sm:flex-row sm:items-center ${
                t.status === "completed"
                  ? "bg-green-50 border-l-4 border-green-500 text-green-800"
                  : "bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800"
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {t.status === "completed" ? "✅" : "🕒"}
                  </span>
                  <span className="font-medium">{t.description || t.title}</span>
                </div>
                {t.dueDate && (
                  <span className="text-xs text-gray-500 mt-1">
                    {new Date(t.dueDate) < new Date()
                      ? "❗ Ka kaluar afati!"
                      : `⏳ Afat deri më: ${new Date(t.dueDate).toLocaleDateString()}`}
                  </span>
                )}
                {t.siteName && (
                  <span className="text-xs text-gray-500">📍 Site: {t.siteName}</span>
                )}
              </div>

              <div className="mt-2 sm:mt-0">
                {t.status === "ongoing" ? (
                  <button
                    onClick={() => handleComplete(t.id)}
                    className="text-green-700 hover:underline text-sm"
                  >
                    ✅ U krye
                  </button>
                ) : (
                  <span className="text-xs italic">Përfunduar</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}