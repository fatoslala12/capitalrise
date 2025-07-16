import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [siteFilter, setSiteFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const token = localStorage.getItem("token");

  // Funksion për toast notifications
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // Merr detyrat nga backend për user-in aktiv
  useEffect(() => {
    if (!user?.employee_id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    axios
      .get(`https://building-system.onrender.com/api/tasks?assignedTo=${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setTasks(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setTasks([]);
        setLoading(false);
      });
  }, [user, token]);

  // Përditëso statusin e detyrës në backend
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(
        `https://building-system.onrender.com/api/tasks/${taskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      showToast(`Statusi u ndryshua në ${getStatusLabel(newStatus)}!`, "success");
    } catch (error) {
      console.error('Error updating task status:', error);
      showToast("Gabim gjatë përditësimit të statusit!", "error");
    }
  };

  // Funksion për të marrë emrin e statusit
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Në pritje';
      case 'in_progress': return 'Në progres';
      case 'completed': return 'Përfunduar';
      case 'cancelled': return 'Anuluar';
      default: return status;
    }
  };

  // Funksion për të marrë ngjyrën e statusit
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  // Funksion për të marrë ikonën e prioritetit
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  // Funksion për të marrë ngjyrën e prioritetit
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const uniqueSites = [...new Set(tasks.map((t) => t.site).filter(Boolean))];

  const filteredTasks = tasks
    .filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (siteFilter !== "all" && t.site !== siteFilter) return false;
      return true;
    })
    .sort((a, b) =>
      sortOrder === "asc"
        ? new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt)
        : new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
    );

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const pending = tasks.filter((t) => t.status === "pending").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Duke ngarkuar detyrat...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-semibold transform transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500' : 
          toast.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}

      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700">
        📌 Detyrat e Mia
      </h2>

      {/* 📊 Statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-sm">Total</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{completed}</div>
          <div className="text-sm">Përfunduara</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{inProgress}</div>
          <div className="text-sm">Në Progres</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{pending}</div>
          <div className="text-sm">Në Pritje</div>
        </div>
      </div>

      {/* 🔽 Filtra */}
      <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100">
        <div className="flex flex-col md:flex-row items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-blue-700">Statusi:</label>
            <select
              className="border-2 border-blue-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-300"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Të gjitha</option>
              <option value="pending">⏳ Në pritje</option>
              <option value="in_progress">🔄 Në progres</option>
              <option value="completed">✅ Përfunduar</option>
              <option value="cancelled">❌ Anuluar</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-blue-700">Prioriteti:</label>
            <select
              className="border-2 border-blue-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-300"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">Të gjitha</option>
              <option value="high">🔴 E lartë</option>
              <option value="medium">🟡 Mesatare</option>
              <option value="low">🟢 E ulët</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-blue-700">Site-i:</label>
            <select
              className="border-2 border-blue-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-300"
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
            <label className="text-sm font-medium text-blue-700">Renditja:</label>
            <select
              className="border-2 border-blue-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-300"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="desc">Më të rejat fillimisht</option>
              <option value="asc">Më të vjetrat fillimisht</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista e detyrave */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">Nuk ka detyra</h3>
          <p className="text-gray-500">Nuk ka detyra të caktuara për ju ose sipas filtrave të zgjedhur.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Prioriteti dhe statusi */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getPriorityIcon(task.priority)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? 'E lartë' : task.priority === 'medium' ? 'Mesatare' : 'E ulët'}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>

                {/* Detajet kryesore */}
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-blue-800 mb-2">{task.title}</h4>
                  <p className="text-gray-700 mb-3">{task.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    {task.due_date && (
                      <span className="flex items-center gap-2">
                        <span>📅</span>
                        <span className="font-semibold">Afat:</span>
                        <span className={new Date(task.due_date) < new Date() ? 'text-red-600 font-bold' : ''}>
                          {new Date(task.due_date).toLocaleDateString()}
                          {new Date(task.due_date) < new Date() && ' (Ka kaluar!)'}
                        </span>
                      </span>
                    )}
                    
                    {task.site && (
                      <span className="flex items-center gap-2">
                        <span>🏗️</span>
                        <span className="font-semibold">Site:</span>
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          {task.site}
                        </span>
                      </span>
                    )}
                    
                    {task.category && (
                      <span className="flex items-center gap-2">
                        <span>🏷️</span>
                        <span className="font-semibold">Kategoria:</span>
                        <span>{task.category}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Butona e veprimeve */}
                <div className="flex flex-col gap-2 min-w-[120px]">
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="p-2 border-2 border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="pending">⏳ Në pritje</option>
                      <option value="in_progress">🔄 Në progres</option>
                      <option value="completed">✅ Përfunduar</option>
                      <option value="cancelled">❌ Anuluar</option>
                    </select>
                  )}
                  
                  {task.status === 'completed' && (
                    <span className="px-3 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold text-center">
                      ✅ Përfunduar
                    </span>
                  )}
                  
                  {task.status === 'cancelled' && (
                    <span className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold text-center">
                      ❌ Anuluar
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}