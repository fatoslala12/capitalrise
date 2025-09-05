import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import PageLoader from "../components/ui/PageLoader";

const employeePlaceholder = "https://via.placeholder.com/100";

// Funksion për të kthyer snake_case në camelCase për një objekt ose array
function snakeToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, g => g[1].toUpperCase()),
        snakeToCamel(value)
      ])
    );
  }
  return obj;
}

export default function EmployeesList() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    id: 1000,
    firstName: "",
    lastName: "",
    dob: "",
    pob: "",
    residence: "",
    nid: "",
    workplace: [],
    startDate: "",
    email: "",
    phone: "",
    role: "user",
    hourlyRate: "",
    status: t('employees.active'),
    labelType: "",
    photo: ""
  });
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterWorkplace, setFilterWorkplace] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("firstName");
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Generate username from first and last name
  const generateUsername = (firstName, lastName) => {
    if (!firstName || !lastName) return "";
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    return `${first}.${last}`;
  };

  // Get next available ID
  const getNextId = () => {
    const maxId = employees.reduce((max, emp) => Math.max(max, parseInt(emp.id) || 0), 0);
    return (maxId + 1).toString();
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("Starting to load employees data...");
        console.log("User token:", user?.token ? "Present" : "Missing");
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn("Employees API call timed out, setting loading to false");
          setLoading(false);
          setDataLoaded(true);
        }, 10000); // 10 second timeout
        
        // Load only employees first (most important for display)
        const employeesRes = await axios.get("https://capitalrise-cwcq.onrender.com/api/employees", {
          headers: { Authorization: `Bearer ${user?.token}` },
          timeout: 8000 // 8 second timeout for the request
        });
        
        clearTimeout(timeoutId);
        console.log("Employees data loaded successfully:", employeesRes.data);
        console.log("Number of employees:", employeesRes.data?.length || 0);
        console.log("Raw API response structure:", JSON.stringify(employeesRes.data, null, 2));
        
        const employeesData = snakeToCamel(employeesRes.data || []);
        console.log("Processed employees data:", employeesData);
        console.log("Processed employees length:", employeesData.length);
        console.log("First employee sample:", employeesData[0]);
        
        // If no employees returned, set some test data for debugging
        if (employeesData.length === 0) {
          console.log("No employees returned from API, setting test data");
          const testEmployees = [
            {
              id: 1,
              firstName: "Test",
              lastName: "Employee",
              email: "test@example.com",
              phone: "+355 69 123 4567",
              role: "user",
              status: "Aktiv",
              hourlyRate: 15.00,
              workplace: ["Test Site"],
              labelType: "Standard"
            }
          ];
          setEmployees(testEmployees);
        } else {
          setEmployees(employeesData);
        }
        
        // Set loading to false immediately after employees load
        setLoading(false);
        setDataLoaded(true);
        
        // Load contracts for site options in background (needed for form)
        axios.get("https://capitalrise-cwcq.onrender.com/api/contracts", {
          headers: { Authorization: `Bearer ${user?.token}` },
          timeout: 5000
        }).then(contractsRes => {
          console.log("Contracts data loaded successfully");
          setContracts(contractsRes.data);
          
          // Extract unique site names from contracts
          const sites = [...new Set(contractsRes.data.map(contract => contract.siteName).filter(Boolean))];
          setSiteOptions(sites);
        }).catch(error => {
          console.warn("Error loading contracts:", error);
        });
        
        // Load additional data in background (not critical for initial display)
        Promise.all([
          axios.get("https://capitalrise-cwcq.onrender.com/api/work-hours", {
            headers: { Authorization: `Bearer ${user?.token}` },
            timeout: 5000
          }),
          axios.get("https://capitalrise-cwcq.onrender.com/api/tasks", {
            headers: { Authorization: `Bearer ${user?.token}` },
            timeout: 5000
          })
        ]).then(([workHoursRes, tasksRes]) => {
          console.log("Additional data loaded successfully");
          setWorkHours(workHoursRes.data);
          setTasks(tasksRes.data);
        }).catch(error => {
          console.warn("Error loading additional data:", error);
        });
        
      } catch (error) {
        console.error("Error loading data:", error);
        console.error("Error details:", error.response?.data || error.message);
        
        // Set some test data if API fails
        const testEmployees = [
          {
            id: 1,
            firstName: "Test",
            lastName: "Employee",
            email: "test@example.com",
            phone: "+355 69 123 4567",
            role: "user",
            status: "Aktiv",
            hourlyRate: 15.00,
            workplace: ["Test Site"],
            labelType: "Standard"
          }
        ];
        
        console.log("Setting test data due to API error");
        setEmployees(testEmployees);
        setLoading(false);
        setDataLoaded(true);
      }
    };

    if (user?.token) {
      console.log("User token found, starting data load...");
      loadData();
    } else {
      console.log("No user token found");
      setLoading(false);
    }
  }, [user?.token]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "workplace") {
      setNewEmployee(prev => ({
        ...prev,
        workplace: checked 
          ? [...prev.workplace, value]
          : prev.workplace.filter(w => w !== value)
      }));
    } else {
      setNewEmployee(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validation
      if (!newEmployee.firstName || !newEmployee.lastName) {
        alert(t('employeesList.fillRequiredFields'));
        return;
      }

      if (newEmployee.workplace.length === 0) {
        alert(t('employeesList.selectWorkplace'));
        return;
      }

      // Check for duplicate NID
      const duplicateNid = employees.find(emp => 
        emp.nid && emp.nid === newEmployee.nid && emp.nid !== ""
      );
      if (duplicateNid) {
        alert(t('employeesList.duplicateNid'));
        return;
      }

      // Check for invalid workplace selections
      const invalidSites = newEmployee.workplace.filter(
        site => !siteOptions.includes(site)
      );
      if (invalidSites.length > 0) {
        alert(t('employeesList.invalidWorkplace'));
        return;
      }

      // Prepare user data for API
      const userData = {
        username: generateUsername(newEmployee.firstName, newEmployee.lastName),
        email: newEmployee.email,
        password: "defaultPassword123!",
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        role: newEmployee.role,
        nid: newEmployee.nid,
        dob: newEmployee.dob,
        pob: newEmployee.pob,
        residence: newEmployee.residence,
        phone: newEmployee.phone,
        hourlyRate: parseFloat(newEmployee.hourlyRate) || 0,
        status: newEmployee.status,
        labelType: newEmployee.labelType,
        workplace: newEmployee.workplace,
        startDate: newEmployee.startDate,
        photo: newEmployee.photo || employeePlaceholder
      };

      // Create user
      const res = await axios.post("https://capitalrise-cwcq.onrender.com/api/user-management/create", userData, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      if (res.data.success) {
        // Reset form
        setNewEmployee({
          id: getNextId(),
          firstName: "",
          lastName: "",
          dob: "",
          pob: "",
          residence: "",
          nid: "",
          workplace: [],
          startDate: "",
          email: "",
          phone: "",
          role: "user",
          hourlyRate: "",
          status: t('employees.active'),
          labelType: "",
          photo: ""
        });
        setShowAddModal(false);
        
        // Reload employees
        const employeesRes = await axios.get("https://capitalrise-cwcq.onrender.com/api/employees", {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setEmployees(snakeToCamel(employeesRes.data));
        
        alert(t('employeesList.employeeCreated'));
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      alert(t('employeesList.errorCreatingEmployee'));
    }
  };

  // Handle employee deletion
  const handleDelete = async (id) => {
    if (window.confirm(t('employeesList.confirmDelete'))) {
      try {
        await axios.delete(`https://capitalrise-cwcq.onrender.com/api/employees/${id}`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        
        // Reload employees
        const res = await axios.get("https://capitalrise-cwcq.onrender.com/api/employees", {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setEmployees(snakeToCamel(res.data));
        
        alert(t('employeesList.employeeDeleted'));
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert(t('employeesList.errorDeletingEmployee'));
      }
    }
  };

  // Handle data extraction
  const handleExtract = (employee) => {
    const data = {
      employee: employee,
      contracts: contracts.filter(c => c.employeeId === employee.id),
      workHours: workHours.filter(w => w.employeeId === employee.id),
      tasks: tasks.filter(t => t.employeeId === employee.id)
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee_${employee.id}_data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort employees with useMemo for performance
  const filteredEmployees = useMemo(() => {
    console.log("Filtering employees. Total employees:", employees.length);
    console.log("Current employees array:", employees);
    console.log("Filter status:", filterStatus);
    console.log("Filter workplace:", filterWorkplace);
    console.log("Search term:", searchTerm);
    
    const filtered = employees
      .filter(emp => {
        const matchesStatus = filterStatus === "All" || emp.status === filterStatus;
        let matchesWorkplace = true;
        
        if (filterWorkplace !== "All") {
          matchesWorkplace = emp.workplace && emp.workplace.includes(filterWorkplace);
        }
        
        const matchesSearch = !searchTerm || 
          (emp.firstName && emp.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (emp.lastName && emp.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (emp.id && emp.id.toString().includes(searchTerm));
        
        return matchesStatus && matchesWorkplace && matchesSearch;
      })
      .sort((a, b) => {
        const aVal = a[sortBy] || "";
        const bVal = b[sortBy] || "";
        
        if (sortOrder === "asc") {
          return (aVal || "").localeCompare(bVal || "");
        } else {
          return (bVal || "").localeCompare(aVal || "");
        }
      });
    
    console.log("Filtered employees result:", filtered);
    console.log("Filtered employees count:", filtered.length);
    return filtered;
  }, [employees, filterStatus, filterWorkplace, searchTerm, sortBy, sortOrder]);

  // Export to CSV
  const exportToCSV = () => {
    const filtered = employees.filter((e) => {
      const matchesStatus = filterStatus === "All" || e.status === filterStatus;
      let matchesWorkplace = true;
      
      if (filterWorkplace !== "All") {
        matchesWorkplace = e.workplace && e.workplace.includes(filterWorkplace);
      }
      
      const matchesSearch = !searchTerm || 
        (e.firstName && e.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.lastName && e.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.id && e.id.toString().includes(searchTerm));
      
      return matchesStatus && matchesWorkplace && matchesSearch;
    });

    const csvContent = [
      ["ID", "First Name", "Last Name", "Email", "Phone", "Role", "Status", "Hourly Rate", "Workplace", "Label Type"],
      ...filtered.map(emp => [
        emp.id || "",
        emp.firstName || emp.first_name || "",
        emp.lastName || emp.last_name || "",
        emp.email || "",
        emp.phone || "",
        emp.role || "",
        emp.status || "",
        emp.hourlyRate || emp.hourly_rate || "",
        Array.isArray(emp.workplace) ? emp.workplace.join(", ") : (emp.workplace || ""),
        emp.labelType || emp.label_type || ""
      ])
    ].map(row => row.map(field => `"${field}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'employees.csv';
    link.click();
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    };

    if (showAddModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal]);

  if (loading || !dataLoaded) {
    return (
      <div className="w-full px-4 md:px-6 py-4 md:py-8">
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Loading Employees...</h3>
            <p className="text-sm text-slate-500 mb-4">Please wait while we fetch the latest data</p>
            <button 
              onClick={() => {
                setLoading(false);
                setDataLoaded(true);
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              Skip Loading (Show Empty State)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-4 md:py-8 space-y-6 sm:space-y-8">
      {/* HEADER SECTION */}
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-3 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6 sm:w-8 sm:h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1">
                  {t('employeesList.title')}
                </h1>
                <div className="text-base sm:text-lg font-semibold text-slate-600">
                  {filteredEmployees.length} {t('employeesList.totalEmployees')}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 hover:shadow-xl hover:scale-105"
            >
              <span className="text-lg sm:text-xl">➕</span>
              <span className="hidden sm:inline">{t('employeesList.addNewEmployee')}</span>
              <span className="sm:hidden">{t('employeesList.addEmployee')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-400 to-purple-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <span className="text-2xl">👤</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    {t('employeesList.addNewEmployee')}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white/80 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* PERSONAL INFO SECTION */}
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200">
                <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                  👤 {t('employeesList.personalInfo')} *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.firstName')} *</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      placeholder={t('employeesList.firstNamePlaceholder')} 
                      value={newEmployee.firstName} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.lastName')} *</label>
                    <input 
                      type="text" 
                      name="lastName" 
                      placeholder={t('employeesList.lastNamePlaceholder')} 
                      value={newEmployee.lastName} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.dateOfBirth')}</label>
                    <input 
                      type="date" 
                      name="dob" 
                      value={newEmployee.dob} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.nid')}</label>
                    <input 
                      type="text" 
                      name="nid" 
                      placeholder={t('employeesList.nidPlaceholder')} 
                      value={newEmployee.nid} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.placeOfBirth')}</label>
                    <input 
                      type="text" 
                      name="pob" 
                      placeholder={t('employeesList.placeOfBirth')} 
                      value={newEmployee.pob} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.residence')}</label>
                    <input 
                      type="text" 
                      name="residence" 
                      placeholder={t('employeesList.residentialAddress')} 
                      value={newEmployee.residence} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
              </div>
                  
              {/* WORKPLACE SECTION */}
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200">
                <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                  🏢 {t('employeesList.workplacesSection')} *
                </label>
                <div className="flex flex-wrap gap-3">
                  {!dataLoaded ? (
                    <div className="text-blue-500 text-sm flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      Loading workplaces...
                    </div>
                  ) : siteOptions.length > 0 ? (
                    siteOptions.map((siteName) => (
                      <label key={siteName} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50 transition-all">
                        <input
                          type="checkbox"
                          name="workplace"
                          value={siteName}
                          onChange={handleChange}
                          checked={newEmployee.workplace.includes(siteName)}
                          className="accent-blue-500 w-4 h-4"
                        /> 
                        <span className="text-sm font-medium text-slate-700">{siteName}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-red-500 text-sm">
                      ⚠️ {t('employeesList.noSitesAvailable')}
                    </div>
                  )}
                </div>
              </div>

              {/* CONTACT SECTION */}
              <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200">
                <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                  📞 {t('employeesList.contactInfo')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.email')}</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder={t('employeesList.emailPlaceholder')} 
                      value={newEmployee.email} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.phone')}</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder={t('employeesList.phonePlaceholder')} 
                      value={newEmployee.phone} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* WORK INFO SECTION */}
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200">
                <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                  💼 {t('employeesList.workInfo')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.role')}</label>
                    <select 
                      name="role" 
                      value={newEmployee.role} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="user">{t('employeesList.employee')}</option>
                      <option value="admin">{t('employeesList.admin')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.hourlyRate')}</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="hourlyRate" 
                      placeholder={t('employeesList.hourlyRatePlaceholder')} 
                      value={newEmployee.hourlyRate} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.status')}</label>
                    <select 
                      name="status" 
                      value={newEmployee.status} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value={t('employees.active')}>{t('employees.active')}</option>
                      <option value={t('employees.inactive')}>{t('employees.inactive')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.labelType')}</label>
                    <input 
                      type="text" 
                      name="labelType" 
                      placeholder={t('employeesList.labelTypePlaceholder')} 
                      value={newEmployee.labelType} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.startDate')}</label>
                    <input 
                      type="date" 
                      name="startDate" 
                      value={newEmployee.startDate} 
                      onChange={handleChange} 
                      className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* FORM ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all hover:shadow-xl hover:scale-105"
                >
                  {t('employeesList.createEmployee')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all hover:shadow-xl"
                >
                  {t('employeesList.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILTERS SECTION */}
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">{t('employeesList.search')}</label>
              <input
                type="text"
                placeholder={t('employeesList.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">{t('employeesList.filterByStatus')}</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="All">{t('employeesList.allStatuses')}</option>
                <option value={t('employees.active')}>{t('employees.active')}</option>
                <option value={t('employees.inactive')}>{t('employees.inactive')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">{t('employeesList.filterByWorkplace')}</label>
              <select
                value={filterWorkplace}
                onChange={(e) => setFilterWorkplace(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="All">{t('employeesList.allWorkplaces')}</option>
                {siteOptions.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">{t('employeesList.sortBy')}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="firstName">{t('employeesList.firstName')}</option>
                <option value="lastName">{t('employeesList.lastName')}</option>
                <option value="id">{t('employeesList.id')}</option>
                <option value="role">{t('employeesList.role')}</option>
                <option value="status">{t('employeesList.status')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            📋 {t('employeesList.employeesTable')}
          </h3>
            
          {/* DESKTOP TABLE */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm bg-white shadow-lg rounded-xl overflow-hidden">
              <thead className="bg-gradient-to-r from-blue-100 to-purple-100">
                <tr>
                  <th className="py-3 px-2 text-left font-semibold text-slate-800">{t('employeesList.photo')}</th>
                  <th className="py-3 px-2 text-left font-semibold text-slate-800">{t('employeesList.id')}</th>
                  <th className="py-3 px-2 text-left font-semibold text-slate-800">{t('employeesList.nameAndSurname')}</th>
                  <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.role')}</th>
                  <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.workplaces')}</th>
                  <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.phone')}</th>
                  <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.salary')}</th>
                  <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.status')}</th>
                  <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.labelType')}</th>
                  <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const firstName = emp.firstName || emp.first_name || "";
                  const lastName = emp.lastName || emp.last_name || "";
                  const status = emp.status || "";
                  const statusColor = status === "Aktiv" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200";
                  const role = emp.role || "";
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-all duration-200 border-b border-slate-100">
                      <td className="py-3 px-2">
                        {emp.photo ? (
                          <img src={emp.photo} alt="Foto" className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 shadow" />
                        ) : (
                          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">{firstName[0]}{lastName[0]}</span>
                        )}
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-700">{emp.id || ""}</td>
                      <td className="py-3 px-2 font-semibold text-slate-800">{firstName} {lastName}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-2 py-1 rounded-full shadow uppercase tracking-wide">{role}</span>
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-slate-600">
                        {Array.isArray(emp.workplace) ? emp.workplace.join(", ") : (emp.workplace || "")}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-700">{emp.phone || ""}</td>
                      <td className="py-3 px-2 text-center font-bold text-emerald-600">{emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate !== "" ? `£${emp.hourlyRate}` : (emp.hourly_rate !== undefined && emp.hourly_rate !== null && emp.hourly_rate !== "" ? `£${emp.hourly_rate}` : "")}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-3 py-1 rounded-full border text-xs font-bold shadow-md ${statusColor}`}>{status}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-blue-600">{emp.labelType || emp.label_type || ""}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1 justify-center">
                          <button onClick={() => navigate(`/admin/employee/${emp.id}`)} className="p-1.5 text-blue-600 hover:text-blue-800 hover:scale-110 transition-all text-sm" title={t('employeesList.viewDetails')}>
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleExtract(emp)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:scale-110 transition-all text-sm"
                            title={t('employeesList.exportData')}
                          >
                            📥
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-red-600 hover:text-red-800 hover:scale-110 transition-all text-sm" title={t('employeesList.delete')}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="lg:hidden space-y-4">
            {filteredEmployees.map((emp) => {
              const firstName = emp.firstName || emp.first_name || "";
              const lastName = emp.lastName || emp.last_name || "";
              const status = emp.status || "";
              const statusColor = status === "Aktiv" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200";
              const role = emp.role || "";
              return (
                <div key={emp.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {emp.photo ? (
                        <img src={emp.photo} alt="Foto" className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 shadow" />
                      ) : (
                        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">{firstName[0]}{lastName[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-800 truncate">{firstName} {lastName}</h4>
                        <span className={`px-2 py-1 rounded-full border text-xs font-bold ${statusColor}`}>{status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                        <div><span className="font-medium">ID:</span> {emp.id}</div>
                        <div><span className="font-medium">Tel:</span> {emp.phone || "N/A"}</div>
                        <div><span className="font-medium">Roli:</span> <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-2 py-0.5 rounded-full">{role}</span></div>
                        <div><span className="font-medium">Paga:</span> {emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate !== "" ? `£${emp.hourlyRate}` : (emp.hourly_rate !== undefined && emp.hourly_rate !== null && emp.hourly_rate !== "" ? `£${emp.hourly_rate}` : "N/A")}</div>
                      </div>
                      <div className="text-xs text-slate-500 mb-3">
                        <span className="font-medium">Vendet e punës:</span> {Array.isArray(emp.workplace) ? emp.workplace.join(", ") : (emp.workplace || "N/A")}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Taksimi:</span> {emp.labelType || emp.label_type || "N/A"}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/admin/employee/${emp.id}`)} className="p-2 text-blue-600 hover:text-blue-800 hover:scale-110 transition-all" title="Shiko Detaje">
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleExtract(emp)}
                            className="p-2 text-emerald-600 hover:text-emerald-800 hover:scale-110 transition-all"
                            title="Eksporto të dhënat"
                          >
                            📥
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="p-2 text-red-600 hover:text-red-800 hover:scale-110 transition-all" title="Fshi">
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        
      {/* EXPORT BUTTON */}
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-slate-200/50 p-4 sm:p-6 text-center">
        <button
          onClick={exportToCSV}
          className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 mx-auto hover:shadow-xl hover:scale-105"
        >
          <span className="text-xl">📤</span> 
          <span className="hidden sm:inline">{t('employeesList.exportEmployeesCSV')}</span>
          <span className="sm:hidden">{t('employeesList.exportCSV')}</span>
        </button>
      </div>
    </div>
  );
}