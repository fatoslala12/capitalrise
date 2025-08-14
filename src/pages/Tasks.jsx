import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import axios from "axios";
import toast from 'react-hot-toast';

export default function Tasks() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" or "kanban"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newTask, setNewTask] = useState({
    description: "",
    assignedTo: "",
    siteName: "",
    dueDate: "",
    priority: "medium",
    category: "general"
  });
  
  const [overdueStats, setOverdueStats] = useState(null);
  const [isCheckingDeadlines, setIsCheckingDeadlines] = useState(false);
  
  const token = localStorage.getItem("token");

  // Merr të dhënat nga backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [employeesRes, contractsRes, tasksRes] = await Promise.all([
          axios.get("https://building-system.onrender.com/api/employees", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://building-system.onrender.com/api/contracts", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://building-system.onrender.com/api/tasks", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setEmployees(employeesRes.data || []);
        setContracts(contractsRes.data || []);
        setTasks(tasksRes.data || []);
        
      } catch (error) {
        console.error("Error fetching tasks data:", error);
        toast.error("Gabim gjatë ngarkimit të të dhënave!");
        setEmployees([]);
        setContracts([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token]);

  // Load overdue stats when component mounts
  useEffect(() => {
    if (token && user?.role === 'admin') {
      handleGetOverdueStats();
    }
  }, [token, user?.role]);

  // Filtro site-t sipas workplace të punonjësit të zgjedhur
  const selectedEmployee = employees.find(e => String(e.id) === String(newTask.assignedTo));
  const filteredSites = selectedEmployee && Array.isArray(selectedEmployee.workplace)
    ? selectedEmployee.workplace
    : contracts.map(c => c.site_name);

  const handleChange = (e) => {
    setNewTask({ ...newTask, [e.target.name]: e.target.value });
  };

  // Funksion për të kthyer camelCase në snake_case për payload-in e detyrës
  function toSnakeCaseTask(obj) {
    return {
      assigned_to: obj.assignedTo,
      title: obj.description,
      description: obj.description,
      status: obj.status || 'ongoing',
      site_name: obj.siteName || null,
      due_date: obj.dueDate || null,
      assigned_by: obj.assignedBy || obj.assigned_by || null,
      priority: obj.priority || 'medium',
      category: obj.category || 'general'
    };
  }

  const handleAssign = async () => {
    const now = new Date().toISOString();
    let receivers = [];

    if (newTask.assignedTo) {
      receivers = [newTask.assignedTo];
    } else if (newTask.siteName) {
      receivers = employees
        .filter((e) => Array.isArray(e.workplace) && e.workplace.includes(newTask.siteName))
        .map((e) => e.id);
    }

    if (!newTask.description.trim() || receivers.length === 0) {
      toast.error("Plotëso përshkrimin dhe zgjidh marrësit!");
      return;
    }

    setIsSubmitting(true);
    try {
      const newEntries = await Promise.all(receivers.map(async (id) => {
        const entry = toSnakeCaseTask({
          assignedTo: parseInt(id, 10),
          description: newTask.description,
          status: "ongoing",
          siteName: newTask.siteName || null,
          dueDate: newTask.dueDate || null,
          priority: newTask.priority,
          category: newTask.category,
          assignedBy: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email
        });
        console.log('[DEBUG] Task payload:', entry);
        const res = await axios.post("https://building-system.onrender.com/api/tasks", entry, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
      }));
      setTasks((prev) => [...prev, ...newEntries]);
      setNewTask({ description: "", assignedTo: "", siteName: "", dueDate: "", priority: "medium", category: "general" });
      setShowForm(false);
      toast.success(`${newEntries.length} detyrë u caktuan me sukses!`);
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error("Gabim gjatë caktimit të detyrës!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Jeni i sigurt që doni të fshini këtë detyrë?")) return;
    try {
      await axios.delete(`https://building-system.onrender.com/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Detyra u fshi me sukses!");
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error("Gabim gjatë fshirjes së detyrës!");
    }
  };

  // Funksion për të ndryshuar statusin e detyrës
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await axios.put(`https://building-system.onrender.com/api/tasks/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
      toast.success(`Statusi u ndryshua në "${newStatus === 'completed' ? 'Përfunduar' : 'Në vazhdim'}"`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error("Gabim gjatë ndryshimit të statusit!");
    }
  };

  // Filtro dhe rendit detyrat
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // Filtro sipas kërkimit
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assigned_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro sipas statusit
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Filtro sipas prioritetit
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Filtro sipas site
    if (siteFilter !== "all") {
      filtered = filtered.filter(task => task.site_name === siteFilter);
    }

    // Filtro sipas punonjësit të caktuar
    if (assignedFilter !== "all") {
      filtered = filtered.filter(task => String(task.assigned_to) === assignedFilter);
    }

    // Rendit
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === "created_at" || sortBy === "due_date") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, siteFilter, assignedFilter, sortBy, sortOrder]);

  // Statistika
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const ongoing = tasks.filter(t => t.status === "ongoing").length;
    const overdue = tasks.filter(t => {
      if (!t.due_date || t.status === "completed") return false;
      return new Date(t.due_date) < new Date();
    }).length;
    const highPriority = tasks.filter(t => t.priority === "high").length;
    
    return { total, completed, ongoing, overdue, highPriority };
  }, [tasks]);

  // Kategoritë unike
  const uniqueCategories = [...new Set(tasks.map(t => t.category).filter(Boolean))];
  const uniqueSites = [...new Set(tasks.map(t => t.site_name).filter(Boolean))];

  // Funksion për të marrë emrin e punonjësit
  const getEmployeeName = (assignedTo) => {
    const emp = employees.find(e => String(e.id) === String(assignedTo));
    return emp ? `${emp.first_name} ${emp.last_name}` : `ID: ${assignedTo}`;
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

  // Funksion për të marrë ikonën e prioritetit
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  // Funksionet për deadline notifications
  const handleCheckOverdueTasks = async () => {
    if (isCheckingDeadlines) return;
    
    setIsCheckingDeadlines(true);
    try {
      const response = await axios.post(
        "https://building-system.onrender.com/api/task-deadlines/check-overdue",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh stats
        handleGetOverdueStats();
      }
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
      toast.error("Gabim gjatë kontrollit të detyrave jashtë afatit!");
    } finally {
      setIsCheckingDeadlines(false);
    }
  };

  const handleCheckUpcomingDeadlines = async () => {
    if (isCheckingDeadlines) return;
    
    setIsCheckingDeadlines(true);
    try {
      const response = await axios.post(
        "https://building-system.onrender.com/api/task-deadlines/check-upcoming",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh stats
        handleGetOverdueStats();
      }
    } catch (error) {
      console.error('Error checking upcoming deadlines:', error);
      toast.error("Gabim gjatë kontrollit të afateve që përfundojnë së shpejti!");
    } finally {
      setIsCheckingDeadlines(false);
    }
  };

  const handleRunDailyCheck = async () => {
    if (isCheckingDeadlines) return;
    
    setIsCheckingDeadlines(true);
    try {
      const response = await axios.post(
        "https://building-system.onrender.com/api/task-deadlines/run-daily-check",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh stats
        handleGetOverdueStats();
      }
    } catch (error) {
      console.error('Error running daily check:', error);
      toast.error("Gabim gjatë kontrollit ditor të afateve!");
    } finally {
      setIsCheckingDeadlines(false);
    }
  };

  const handleGetOverdueStats = async () => {
    try {
      const response = await axios.get(
        "https://building-system.onrender.com/api/task-deadlines/overdue-stats",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setOverdueStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error getting overdue stats:', error);
      toast.error("Gabim gjatë marrjes së statistikave!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-600">Duke ngarkuar detyrat...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full xl:max-w-[90vw] mx-auto px-4 py-8 space-y-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      
      {/* HEADER MODERN */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-md px-4 sm:px-8 py-4 mb-8 border border-blue-100 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Menaxhimi i Detyrave</h2>
          <div className="text-lg font-medium text-purple-700">Cakto, shiko dhe menaxho detyrat</div>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 p-4 sm:p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-xs sm:text-sm font-medium">Total Detyra</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="text-2xl sm:text-4xl">📋</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-100 to-green-200 text-green-800 p-4 sm:p-6 rounded-xl shadow-sm border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-xs sm:text-sm font-medium">Përfunduara</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.completed}</p>
            </div>
            <div className="text-2xl sm:text-4xl">✅</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 p-4 sm:p-6 rounded-xl shadow-sm border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-700 text-xs sm:text-sm font-medium">Në Vazhdim</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.ongoing}</p>
            </div>
            <div className="text-2xl sm:text-4xl">🕒</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-100 to-red-200 text-red-800 p-4 sm:p-6 rounded-xl shadow-sm border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 text-xs sm:text-sm font-medium">Me Vonesë</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.overdue}</p>
            </div>
            <div className="text-2xl sm:text-4xl">⚠️</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 p-4 sm:p-6 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-xs sm:text-sm font-medium">Prioritet i Lartë</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.highPriority}</p>
            </div>
            <div className="text-2xl sm:text-4xl">🔴</div>
          </div>
        </div>
      </div>

      {/* KONTROLLET E KRYESORE */}
      <div className="bg-white/60 rounded-xl shadow-sm border border-blue-100 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-blue-800">🎯 Kontrolli i Detyrave</h3>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  viewMode === "table" 
                    ? "bg-white text-blue-600 shadow-sm border border-gray-200" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📊 Tabelë
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  viewMode === "kanban" 
                    ? "bg-white text-blue-600 shadow-sm border border-gray-200" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🎯 Kanban
              </button>
            </div>
            
            {/* Add Task Button */}
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 text-sm sm:text-base"
            >
              {showForm ? "❌ Mbyll" : "➕ Shto Detyrë"}
            </button>
          </div>
        </div>

        {/* DEADLINE NOTIFICATION CONTROLS */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-4 mb-6">
          <h4 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            ⏰ Kontrolli i Afateve dhe Njoftimeve
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={handleCheckOverdueTasks}
              className="bg-gradient-to-r from-red-400 to-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-red-500 hover:to-red-600 transition-all shadow-sm"
            >
              🔍 Kontrollo Jashtë Afatit
            </button>
            
            <button
              onClick={handleCheckUpcomingDeadlines}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-sm"
            >
              ⏰ Kontrollo Afatet e Afert
            </button>
            
            <button
              onClick={handleRunDailyCheck}
              className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-500 hover:to-blue-600 transition-all shadow-sm"
            >
              📅 Kontrolli Ditor
            </button>
            
            <button
              onClick={handleGetOverdueStats}
              className="bg-gradient-to-r from-purple-400 to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-500 hover:to-purple-600 transition-all shadow-sm"
            >
              📊 Statistikat
            </button>
          </div>
          
          {overdueStats && (
            <div className="mt-4 p-3 bg-white/60 rounded-lg border border-amber-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{overdueStats.overdue?.total_overdue || 0}</div>
                  <div className="text-red-700">Jashtë Afatit</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{overdueStats.upcoming?.total_upcoming || 0}</div>
                  <div className="text-yellow-700">Përfundojnë Nesër</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{overdueStats.overdue?.notifications_sent || 0}</div>
                  <div className="text-blue-700">Njoftime Dërguar</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{overdueStats.overdue?.notifications_pending || 0}</div>
                  <div className="text-purple-700">Njoftime në Pritje</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FORMA E SHTIMIT */}
        {showForm && (
          <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl shadow-sm border border-blue-200 p-4 sm:p-6 mb-6">
            <h4 className="text-xl font-bold text-blue-900 mb-4">➕ Krijo Detyrë të Re</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-2">📝 Përshkrimi i Detyrës</label>
                  <textarea
                    name="description"
                    placeholder="Shkruani përshkrimin e detyrës..."
                    value={newTask.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">👤 Zgjidh Punonjësin</label>
                    <select
                      name="assignedTo"
                      value={newTask.assignedTo}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 transition-all"
                    >
                      <option value="">-- Zgjidh punonjësin --</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.first_name} {e.last_name} ({e.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">🏗 Ose Zgjidh Site</label>
                    <select
                      name="siteName"
                      value={newTask.siteName}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 transition-all"
                    >
                      <option value="">-- Zgjidh site --</option>
                      {filteredSites.map((site) => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">📅 Afati</label>
                    <input
                      type="date"
                      name="dueDate"
                      value={newTask.dueDate}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">🔴 Prioriteti</label>
                    <select
                      name="priority"
                      value={newTask.priority}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 transition-all"
                    >
                      <option value="low">🟢 I Ulët</option>
                      <option value="medium">🟡 Mesatar</option>
                      <option value="high">🔴 I Lartë</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-2">📂 Kategoria</label>
                  <select
                    name="category"
                    value={newTask.category}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 transition-all"
                  >
                    <option value="general">📋 E Përgjithshme</option>
                    <option value="construction">🏗️ Ndërtim</option>
                    <option value="maintenance">🔧 Mirëmbajtje</option>
                    <option value="cleaning">🧹 Pastrim</option>
                    <option value="safety">🛡️ Siguri</option>
                    <option value="admin">📝 Administrativ</option>
                  </select>
                </div>

                <button
                  onClick={handleAssign}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Duke shtuar...
                    </div>
                  ) : (
                    "📤 Cakto Detyrën"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FILTRAT DHE KËRKIMI */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 sm:p-6 mb-6">
          <h4 className="text-base sm:text-lg font-semibold text-purple-800 mb-4">🔍 Filtra dhe Kërkim</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <input
              type="text"
              placeholder="🔍 Kërko në detyra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 sm:p-3 border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-300 transition-all text-sm"
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 sm:p-3 border border-blue-200 rounded-lg focus:ring-1 focus:ring-blue-300 transition-all text-sm"
            >
              <option value="all">📊 Të gjitha statuset</option>
              <option value="ongoing">🕒 Në vazhdim</option>
              <option value="completed">✅ Përfunduar</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="p-2 sm:p-3 border border-yellow-200 rounded-lg focus:ring-1 focus:ring-yellow-300 transition-all text-sm"
            >
              <option value="all">🔴 Të gjitha prioritetet</option>
              <option value="high">🔴 I lartë</option>
              <option value="medium">🟡 Mesatar</option>
              <option value="low">🟢 I ulët</option>
            </select>
            
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="p-2 sm:p-3 border border-green-200 rounded-lg focus:ring-1 focus:ring-green-300 transition-all text-sm"
            >
              <option value="all">🏗️ Të gjitha site-t</option>
              {uniqueSites.map((site) => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="p-2 sm:p-3 border border-indigo-200 rounded-lg focus:ring-1 focus:ring-indigo-300 transition-all text-sm"
            >
              <option value="all">👤 Të gjithë punonjësit</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="p-2 sm:p-3 border border-orange-200 rounded-lg focus:ring-1 focus:ring-orange-300 transition-all text-sm"
            >
              <option value="created_at-desc">📅 Data (më e reja)</option>
              <option value="created_at-asc">📅 Data (më e vjetra)</option>
              <option value="due_date-asc">⏰ Afati (më i afërt)</option>
              <option value="due_date-desc">⏰ Afati (më i largët)</option>
            </select>
            
            <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
              📊 {filteredAndSortedTasks.length} detyra të gjetura
            </div>
          </div>
        </div>
      </div>

      {/* LISTA E DETYRAVE */}
      <div className="bg-white/60 rounded-xl shadow-sm border border-blue-100 p-4 sm:p-6">
        <h3 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 sm:mb-6 flex items-center gap-2">
          📋 Lista e Detyrave
          <span className="text-sm sm:text-lg text-gray-600">({filteredAndSortedTasks.length} detyra)</span>
        </h3>
        
        {filteredAndSortedTasks.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">📝</div>
            <p className="text-lg sm:text-xl text-gray-600 mb-2">Nuk ka detyra të gjetura</p>
            <p className="text-sm sm:text-base text-gray-500">Provoni të ndryshoni filtra ose shtoni detyra të reja</p>
          </div>
        ) : viewMode === "table" ? (
          // TABLE VIEW
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 text-blue-800 text-sm sm:text-base font-bold">
                <tr>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center">Statusi</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-left">Përshkrimi</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center hidden sm:table-cell">Për</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center hidden lg:table-cell">Site</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center">Prioriteti</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center">Afati</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center hidden lg:table-cell">Nga</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center hidden md:table-cell">Data</th>
                  <th className="py-2 sm:py-4 px-2 sm:px-4 text-center">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTasks.map((t) => {
                  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";
                  return (
                    <tr key={t.id} className={`text-center hover:bg-purple-50 transition-all duration-200 ${isOverdue ? 'bg-red-50 border-l-4 border-red-500' : ''}`}>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle">
                        <div className="flex flex-col items-center gap-1 sm:gap-2">
                          <span className={`px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm ${
                            t.status === "ongoing" 
                              ? "bg-yellow-100 text-yellow-700 border border-yellow-200" 
                              : "bg-green-100 text-green-700 border border-green-200"
                          }`}>
                            {t.status === "ongoing" ? "🕒 Në vazhdim" : "✅ Përfunduar"}
                          </span>
                          {t.status === "ongoing" && (
                            <button
                              onClick={() => handleStatusChange(t.id, "completed")}
                              className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 transition-all transform hover:scale-105"
                            >
                              ✅ Përfundo
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle text-left">
                        <div className="font-semibold text-blue-800 text-xs sm:text-sm">{t.description || t.title}</div>
                        {t.category && (
                          <div className="text-xs text-gray-500 mt-1">
                            📂 {t.category}
                          </div>
                        )}
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle font-semibold text-purple-700 hidden sm:table-cell">
                        <span className="text-xs sm:text-sm">{getEmployeeName(t.assigned_to)}</span>
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle hidden lg:table-cell">
                        <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          {t.site_name || "-"}
                        </span>
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(t.priority)}`}>
                          {getPriorityIcon(t.priority)} {t.priority === 'high' ? 'I Lartë' : t.priority === 'medium' ? 'Mesatar' : 'I Ulët'}
                        </span>
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle">
                        {t.due_date ? (
                          <div className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold ${
                            isOverdue 
                              ? "bg-red-100 text-red-700 border border-red-200" 
                              : "bg-green-100 text-green-700 border border-green-200"
                          }`}>
                            {format(new Date(t.due_date), "dd/MM/yyyy")}
                            {isOverdue && <div className="text-xs">⚠️ Me vonesë!</div>}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                        {t.assigned_by || "-"}
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                        {t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy") : "-"}
                      </td>
                      <td className="py-2 sm:py-4 px-2 sm:px-4 align-middle">
                        <div className="flex gap-1 sm:gap-2 justify-center">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="px-2 sm:px-3 py-1 sm:py-2 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded text-xs font-semibold shadow-sm hover:from-pink-600 hover:to-red-600 transition-all transform hover:scale-105"
                          >
                            🗑️ Fshi
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // KANBAN VIEW
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Në Vazhdim */}
            <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border border-yellow-200">
              <h4 className="text-base sm:text-lg font-bold text-yellow-800 mb-3 sm:mb-4 flex items-center gap-2">
                🕒 Në Vazhdim
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs sm:text-sm">
                  {filteredAndSortedTasks.filter(t => t.status === "ongoing").length}
                </span>
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {filteredAndSortedTasks
                  .filter(t => t.status === "ongoing")
                  .map((t) => (
                    <div key={t.id} className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-yellow-200">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-gray-900 text-xs sm:text-sm">{t.description || t.title}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(t.priority)}`}>
                          {getPriorityIcon(t.priority)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>👤 {getEmployeeName(t.assigned_to)}</div>
                        {t.site_name && <div>🏗️ {t.site_name}</div>}
                        {t.due_date && (
                          <div className={new Date(t.due_date) < new Date() ? "text-red-600 font-semibold" : ""}>
                            ⏰ {format(new Date(t.due_date), "dd/MM/yyyy")}
                            {new Date(t.due_date) < new Date() && " ⚠️ Me vonesë!"}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleStatusChange(t.id, "completed")}
                          className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 transition-all"
                        >
                          ✅ Përfundo
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600 transition-all"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Përfunduar */}
            <div className="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-200">
              <h4 className="text-base sm:text-lg font-bold text-green-800 mb-3 sm:mb-4 flex items-center gap-2">
                ✅ Përfunduar
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs sm:text-sm">
                  {filteredAndSortedTasks.filter(t => t.status === "completed").length}
                </span>
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {filteredAndSortedTasks
                  .filter(t => t.status === "completed")
                  .map((t) => (
                    <div key={t.id} className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-green-200 opacity-75">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-gray-900 text-xs sm:text-sm line-through">{t.description || t.title}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(t.priority)}`}>
                          {getPriorityIcon(t.priority)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>👤 {getEmployeeName(t.assigned_to)}</div>
                        {t.site_name && <div>🏗️ {t.site_name}</div>}
                        {t.due_date && <div>⏰ {format(new Date(t.due_date), "dd/MM/yyyy")}</div>}
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="w-full px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600 transition-all"
                        >
                          🗑️ Fshi
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Me Vonesë */}
            <div className="bg-red-50 rounded-xl p-3 sm:p-4 border border-red-200">
              <h4 className="text-base sm:text-lg font-bold text-red-800 mb-3 sm:mb-4 flex items-center gap-2">
                ⚠️ Me Vonesë
                <span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs sm:text-sm">
                  {filteredAndSortedTasks.filter(t => 
                    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
                  ).length}
                </span>
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {filteredAndSortedTasks
                  .filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")
                  .map((t) => (
                    <div key={t.id} className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-red-200">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-gray-900 text-xs sm:text-sm">{t.description || t.title}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(t.priority)}`}>
                          {getPriorityIcon(t.priority)}
                        </span>
                      </div>
                      <div className="text-xs text-red-600 space-y-1">
                        <div>👤 {getEmployeeName(t.assigned_to)}</div>
                        {t.site_name && <div>🏗️ {t.site_name}</div>}
                        <div className="font-semibold">
                          ⏰ {format(new Date(t.due_date), "dd/MM/yyyy")} ⚠️ Me vonesë!
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleStatusChange(t.id, "completed")}
                          className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 transition-all"
                        >
                          ✅ Përfundo
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600 transition-all"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}