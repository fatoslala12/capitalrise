import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { useTranslation } from "react-i18next";

export default function MyTasks() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const tr = (sq, en) => (i18n?.language === 'en' ? en : sq);
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
      case 'pending': return tr('Në pritje', 'Pending');
      case 'in_progress': return tr('Në progres', 'In Progress');
      case 'completed': return tr('Përfunduar', 'Completed');
      case 'cancelled': return tr('Anuluar', 'Cancelled');
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-green-200 border-t-emerald-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-4">Duke ngarkuar detyrat...</h2>
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
          'bg-emerald-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-green-700">
          📌 {tr('Detyrat e Mia','My Tasks')}
        </h2>
        {user?.role === "manager" && (
          <button
            onClick={() => setShowAddTaskModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ➕ {tr('Shto Detyrë të Re','Add New Task')}
          </button>
        )}
      </div>

      {/* 📊 Statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{total}</div>
          <div className="text-xs md:text-sm">{tr('Total','Total')}</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{completed}</div>
          <div className="text-xs md:text-sm">{tr('Përfunduara','Completed')}</div>
        </div>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{inProgress}</div>
          <div className="text-xs md:text-sm">{tr('Në Progres','In Progress')}</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl p-3 md:p-4 text-center">
          <div className="text-lg md:text-xl lg:text-2xl font-bold">{pending}</div>
          <div className="text-xs md:text-sm">{tr('Në Pritje','Pending')}</div>
        </div>
      </div>

      {/* 🔽 Filtra */}
      <div className="bg-white rounded-xl p-3 md:p-4 shadow-lg border border-emerald-100">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-emerald-700">{tr('Statusi:','Status:')}</label>
            <select
              className="border-2 border-emerald-200 p-2 rounded-xl focus:ring-2 focus:ring-emerald-300"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{tr('Të gjitha','All')}</option>
              <option value="pending">⏳ {tr('Në pritje','Pending')}</option>
              <option value="in_progress">🔄 {tr('Në progres','In Progress')}</option>
              <option value="completed">✅ {tr('Përfunduar','Completed')}</option>
              <option value="cancelled">❌ {tr('Anuluar','Cancelled')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-emerald-700">{tr('Prioriteti:','Priority:')}</label>
            <select
              className="border-2 border-emerald-200 p-2 rounded-xl focus:ring-2 focus:ring-emerald-300"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">{tr('Të gjitha','All')}</option>
              <option value="high">🔴 {tr('E lartë','High')}</option>
              <option value="medium">🟡 {tr('Mesatare','Medium')}</option>
              <option value="low">🟢 {tr('E ulët','Low')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-emerald-700">{tr('Site-i:','Site:')}</label>
            <select
              className="border-2 border-emerald-200 p-2 rounded-xl focus:ring-2 focus:ring-emerald-300"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
            >
              <option value="all">{tr('Të gjitha','All')}</option>
              {uniqueSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-emerald-700">{tr('Renditja:','Sort:')}</label>
            <select
              className="border-2 border-emerald-200 p-2 rounded-xl focus:ring-2 focus:ring-emerald-300"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="desc">{tr('Më të rejat fillimisht','Newest first')}</option>
              <option value="asc">{tr('Më të vjetrat fillimisht','Oldest first')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista e detyrave */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-600 mb-2">{tr('Nuk ka detyra','No tasks')}</h3>
          <p className="text-gray-500">{tr('Nuk ka detyra të caktuara për ju ose sipas filtrave të zgjedhur.','There are no tasks assigned to you or matching the selected filters.')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-emerald-200 hover:shadow-xl transition-all duration-300"
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
                  <h4 className="text-xl font-bold text-emerald-800 mb-2">
                    {task.title}
                    {user?.role === 'manager' && (
                      <span className="ml-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 align-middle">
                        {getEmployeeName(task)}
                      </span>
                    )}
                  </h4>
                  <p className="text-gray-700 mb-3">{task.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    {task.due_date && (
                      <span className="flex items-center gap-2">
                        <span>📅</span>
                        <span className="font-semibold">{tr('Afat:','Due:')}</span>
                        <span className={new Date(task.due_date) < new Date() ? 'text-red-600 font-bold' : ''}>
                          {new Date(task.due_date).toLocaleDateString()}
                          {new Date(task.due_date) < new Date() && ` ${tr('(Ka kaluar!)','(Overdue!)')}`}
                        </span>
                      </span>
                    )}
                    
                    {task.site && (
                      <span className="flex items-center gap-2">
                        <span>🏗️</span>
                        <span className="font-semibold">Site:</span>
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {task.site}
                        </span>
                      </span>
                    )}
                    
                    {task.category && (
                      <span className="flex items-center gap-2">
                        <span>🏷️</span>
                        <span className="font-semibold">{tr('Kategoria:','Category:')}</span>
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
                      className="p-2 border-2 border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300"
                    >
                      <option value="pending">⏳ {tr('Në pritje','Pending')}</option>
                      <option value="in_progress">🔄 {tr('Në progres','In Progress')}</option>
                      <option value="completed">✅ {tr('Përfunduar','Completed')}</option>
                      <option value="cancelled">❌ {tr('Anuluar','Cancelled')}</option>
                    </select>
                  )}
                  
                  {task.status === 'completed' && (
                    <span className="px-3 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold text-center">
                      ✅ {tr('Përfunduar','Completed')}
                    </span>
                  )}
                  
                  {task.status === 'cancelled' && (
                    <span className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold text-center">
                      ❌ {tr('Anuluar','Cancelled')}
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
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">➕</div>
                  <div>
                    <h3 className="text-2xl font-bold">{tr('Shto Detyrë të Re','Add New Task')}</h3>
                    <p className="text-green-100 text-sm">{tr('Cakto detyra për punonjësit e site-ve tuaj','Assign tasks to your site employees')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddTaskModal(false)}
                  className="text-white hover:text-emerald-100 text-3xl font-light transition-colors"
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
                      <span>{tr('Titulli i Detyrës','Task Title')}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg"
                      placeholder={tr('Shkruaj titullin e detyrës','Enter task title')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📝</span>
                      <span>{tr('Përshkrimi','Description')}</span>
                    </label>
                    <input
                      type="text"
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg"
                      placeholder={tr('Përshkrimi i detyrës','Task description')}
                    />
                  </div>
                </div>
                
                {/* Cakto Për dhe Site-i */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      <span>👤 {tr('Cakto Për','Assign To')}</span>
                    </label>
                    <select
                      required
                      value={newTask.assigned_to}
                      onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg bg-white"
                    >
                      <option value="">{tr('Zgjidh punonjësin','Select employee')}</option>
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
                      <span>🏗️ {tr('Site-i','Site')}</span>
                    </label>
                    <select
                      required
                      value={newTask.site_name}
                      onChange={(e) => setNewTask({...newTask, site_name: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg bg-white"
                    >
                      <option value="">{tr('Zgjidh site-in','Select site')}</option>
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
                      <span>{tr('Afati','Deadline')}</span>
                    </label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>🎯</span>
                      <span>{tr('Prioriteti','Priority')}</span>
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg bg-white"
                    >
                      <option value="low">🟢 {tr('E ulët','Low')}</option>
                      <option value="medium">🟡 {tr('Mesatare','Medium')}</option>
                      <option value="high">🔴 {tr('E lartë','High')}</option>
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
                    ❌ {tr('Anulo','Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    ✅ {tr('Shto Detyrën','Add Task')}
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