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
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [availableSites, setAvailableSites] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    site_name: '',
    due_date: '',
    priority: 'medium',
    category: 'general'
  });
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
    
    // Përdor endpoint të ndryshëm për manager vs user
    const endpoint = user?.role === "manager" 
      ? `https://capitalrise-cwcq.onrender.com/api/tasks/manager/${user.employee_id}`
      : `https://capitalrise-cwcq.onrender.com/api/tasks?assignedTo=${user.employee_id}`;
    
    axios
      .get(endpoint, {
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

  // Merr punonjësit dhe site-t e managerit për të shtuar detyra të reja
  useEffect(() => {
    if (user?.role === "manager" && user?.employee_id) {
      // Merr punonjësit e site-ve të managerit
      axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/manager/${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const managerData = res.data;
        setAvailableEmployees(managerData.employees || []);
        setAvailableSites(managerData.managerSites || []);
      })
      .catch(err => {
        console.error('Error fetching manager data:', err);
        setAvailableEmployees([]);
        setAvailableSites([]);
      });
    }
  }, [user, token]);

  // Përditëso statusin e detyrës në backend
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(
        `https://capitalrise-cwcq.onrender.com/api/tasks/${taskId}`,
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

  // Formati i emrit të punonjësit (për manager-in)
  const getEmployeeName = (task) => {
    if (task.first_name || task.last_name) {
      return `${task.first_name || ''} ${task.last_name || ''}`.trim();
    }
    return task.assigned_to ? `Employee #${task.assigned_to}` : '';
  };

  // Funksion për të shtuar detyrë të re
  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'https://capitalrise-cwcq.onrender.com/api/tasks',
        {
          ...newTask,
          assigned_by: user.employee_id,
          status: 'pending'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTasks(prev => [response.data, ...prev]);
      setNewTask({
        title: '',
        description: '',
        assigned_to: '',
        site_name: '',
        due_date: '',
        priority: 'medium',
        category: 'general'
      });
      setShowAddTaskModal(false);
      showToast('Detyra u shtua me sukses!', 'success');
    } catch (error) {
      console.error('Error adding task:', error);
      showToast('Gabim gjatë shtimit të detyrës!', 'error');
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
    <div className="w-full px-4 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-16 md:top-20 right-2 md:right-4 z-50 px-4 md:px-6 py-3 md:py-4 rounded-lg shadow-lg text-white font-semibold transform transition-all duration-300 text-sm md:text-base ${
          toast.type === 'success' ? 'bg-green-500' : 
          toast.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700">
          📌 Detyrat e Mia
        </h2>
        {user?.role === "manager" && (
          <button
            onClick={() => setShowAddTaskModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ➕ Shto Detyrë të Re
          </button>
        )}
      </div>

      {/* 📊 Statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{total}</div>
          <div className="text-xs md:text-sm">Total</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{completed}</div>
          <div className="text-xs md:text-sm">Përfunduara</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{inProgress}</div>
          <div className="text-xs md:text-sm">Në Progres</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{pending}</div>
          <div className="text-xs md:text-sm">Në Pritje</div>
        </div>
      </div>

      {/* 🔽 Filtra */}
      <div className="bg-white rounded-xl p-3 md:p-4 shadow-lg border border-blue-100">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 flex-wrap">
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
                  <h4 className="text-xl font-bold text-blue-800 mb-2">
                    {task.title}
                    {user?.role === 'manager' && (
                      <span className="ml-2 text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 align-middle">
                        {getEmployeeName(task)}
                      </span>
                    )}
                  </h4>
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

      {/* Modal për të shtuar detyrë të re (vetëm për manager) */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header me gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">➕</div>
                  <div>
                    <h3 className="text-2xl font-bold">Shto Detyrë të Re</h3>
                    <p className="text-blue-100 text-sm">Cakto detyra për punonjësit e site-ve tuaj</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddTaskModal(false)}
                  className="text-white hover:text-blue-100 text-3xl font-light transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Form body */}
            <div className="p-6">
              <form onSubmit={handleAddTask} className="space-y-6">
                {/* Titulli dhe Përshkrimi */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      <span>Titulli i Detyrës</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                      placeholder="Shkruaj titullin e detyrës"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📝</span>
                      <span>Përshkrimi</span>
                    </label>
                    <input
                      type="text"
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                      placeholder="Përshkrimi i detyrës"
                    />
                  </div>
                </div>
                
                {/* Cakto Për dhe Site-i */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      <span>👤 Cakto Për</span>
                    </label>
                    <select
                      required
                      value={newTask.assigned_to}
                      onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg bg-white"
                    >
                      <option value="">Zgjidh punonjësin</option>
                      {availableEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      <span>🏗️ Site-i</span>
                    </label>
                    <select
                      required
                      value={newTask.site_name}
                      onChange={(e) => setNewTask({...newTask, site_name: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg bg-white"
                    >
                      <option value="">Zgjidh site-in</option>
                      {availableSites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Afati dhe Prioriteti */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📅</span>
                      <span>Afati</span>
                    </label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>🎯</span>
                      <span>Prioriteti</span>
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg bg-white"
                    >
                      <option value="low">🟢 E ulët</option>
                      <option value="medium">🟡 Mesatare</option>
                      <option value="high">🔴 E lartë</option>
                    </select>
                  </div>
                </div>
                
                {/* Butona */}
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddTaskModal(false)}
                    className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-lg"
                  >
                    ❌ Anulo
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    ✅ Shto Detyrën
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}