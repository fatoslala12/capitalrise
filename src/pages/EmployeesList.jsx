import { useState, useEffect } from "react";
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
    qualification: "CSS",
    labelType: "UTR",
    photo: employeePlaceholder,
    username: "",
    password: "12345678",
    documents: [],
    nextOfKin: "",
    nextOfKinPhone: ""
  });
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterWorkplace, setFilterWorkplace] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [filterTax, setFilterTax] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  if (!user) return <div className="p-4 text-center">{t('common.loading')}</div>;
  const isManager = user?.role === "manager";
  const managerSites = Array.isArray(user?.workplace) ? user.workplace : [];

  // Merr kontratat nga backend
  useEffect(() => {
    setLoading(true);
    
    // Përdor endpoint të ndryshëm për manager vs admin
    const employeesEndpoint = isManager 
      ? `https://capitalrise-cwcq.onrender.com/api/employees/manager/${user.employee_id}`
      : "https://capitalrise-cwcq.onrender.com/api/employees";
    
    Promise.all([
      axios.get("https://capitalrise-cwcq.onrender.com/api/contracts", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(employeesEndpoint, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get("https://capitalrise-cwcq.onrender.com/api/work-hours", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get("https://capitalrise-cwcq.onrender.com/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(([contractsRes, employeesRes, workHoursRes, tasksRes]) => {
      const contractsData = snakeToCamel(contractsRes.data);
      setContracts(contractsData);
      
      // Për manager, përdor vetëm site-t e tij
      let availableSites;
      if (isManager) {
        const managerData = employeesRes.data;
        console.log(`[DEBUG] Raw manager data:`, managerData);
        
        // Merr site-t dhe punonjësit nga API response
        let returnedEmployees = [];
        let returnedSites = [];
        
        if (managerData && typeof managerData === 'object') {
          // API kthen { employees: [...], managerSites: [...] }
          if (managerData.employees && Array.isArray(managerData.employees)) {
            returnedEmployees = managerData.employees;
            returnedSites = Array.isArray(managerData.managerSites) ? managerData.managerSites : [];
            console.log(`[DEBUG] Got employees: ${returnedEmployees.length}, sites: ${returnedSites.length} from API`);
          }
        }
        
        // Nëse API nuk ka site, përdor user.workplace
        if (returnedSites.length === 0) {
          returnedSites = user?.workplace || [];
          console.log(`[DEBUG] Using user.workplace as fallback:`, returnedSites);
        }
        
        availableSites = returnedSites;
        const managerEmployees = returnedEmployees.length > 0 ? returnedEmployees : [];
        
        setEmployees(snakeToCamel(managerEmployees));
        console.log(`[DEBUG] Final - Manager employees:`, managerEmployees.length);
        console.log(`[DEBUG] Final - Manager sites:`, availableSites);
      } else {
        // Admin: show all active sites from contracts for workplace selection
        const activeContracts = contractsData.filter(c => c.status === 'Ne progres');
        availableSites = [...new Set(activeContracts.map(c => c.siteName).filter(Boolean))];
        setEmployees(snakeToCamel(employeesRes.data));
        console.log(`[DEBUG] Admin - Available sites: ${availableSites.length} sites`);
        console.log(`[DEBUG] Admin - Active contracts: ${activeContracts.length} contracts`);
      }
      
      setSiteOptions(availableSites);
      console.log(`[DEBUG] Available sites for ${isManager ? 'manager' : 'admin'}: ${availableSites.length} sites`);
      
      setWorkHours(snakeToCamel(workHoursRes.data));
      setTasks(snakeToCamel(tasksRes.data));
    })
    .catch(() => {
      setContracts([]);
      setEmployees([]);
      setWorkHours([]);
      setTasks([]);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [token]);

  // Debug logging for siteOptions changes
  useEffect(() => {
    console.log(`[DEBUG] siteOptions changed:`, siteOptions);
    console.log(`[DEBUG] Current user:`, user);
    console.log(`[DEBUG] Is manager:`, isManager);
    console.log(`[DEBUG] User workplace:`, user?.workplace);
    console.log(`[DEBUG] User employee_id:`, user?.employee_id);
  }, [siteOptions, user, isManager]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showAddModal) {
        closeAddModal();
      }
    };

    if (showAddModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal]);

  useEffect(() => {
    setNewEmployee((prev) => ({
      ...prev,
      username: generateUsername(prev.firstName, prev.lastName),
      id: getNextId()
    }));
    // eslint-disable-next-line
  }, [employees.length]);

  const getNextId = () => {
    if (employees.length === 0) return 1000;
    const maxId = Math.max(...employees.map((e) => parseInt(e.id)));
    return maxId + 1;
  };

  const generateUsername = (first, last) => {
    const base = `${first.toLowerCase()}.${last.toLowerCase()}`;
    const existing = employees.filter((e) => e.username?.startsWith(base));
    return existing.length > 0 ? `${base}${existing.length + 1}` : base;
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name === "workplace") {
      const updatedWorkplace = checked
        ? [...newEmployee.workplace, value]
        : newEmployee.workplace.filter((wp) => wp !== value);
      setNewEmployee({ ...newEmployee, workplace: updatedWorkplace });
    } else if (name === "photo" && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, photo: reader.result });
      };
      reader.readAsDataURL(files[0]);
    } else if (name === "documents" && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee((prev) => ({
          ...prev,
          documents: [...prev.documents, {
            name: files[0].name,
            content: reader.result
          }]
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setNewEmployee({ ...newEmployee, [name]: value });
    }
  };

  // Funksion për të kthyer camelCase në snake_case për fushat e punonjësit
  function toSnakeCase(obj) {
    return {
      first_name: obj.firstName,
      last_name: obj.lastName,
      dob: obj.dob ? obj.dob : null,
      pob: obj.pob,
      residence: obj.residence,
      nid: obj.nid,
      start_date: obj.startDate ? obj.startDate : null,
      email: obj.email,
      phone: obj.phone,
      next_of_kin: obj.nextOfKin || "",
      next_of_kin_phone: obj.nextOfKinPhone || "",
      label_type: obj.labelType || "",
      qualification: obj.qualification,
      status: obj.status,
      photo: obj.photo,
      hourly_rate: obj.hourlyRate ? obj.hourlyRate : null,
      username: obj.username,
      password: obj.password,
      created_by: user?.id || 1,
      role: obj.role
    };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that at least one workplace is selected
    if (!newEmployee.workplace || newEmployee.workplace.length === 0) {
      alert("Ju lutem zgjidhni të paktën një vend pune!");
      return;
    }
    
    if (isManager) {
      const invalidSites = newEmployee.workplace.filter(
        (wp) => !siteOptions.includes(wp)
      );
      if (invalidSites.length > 0) {
        alert("Nuk mund të shtoni punonjës në site që nuk ju përkasin.");
        return;
      }
    }
    try {
      // Përdor API-n e re për user management me email
      const userData = {
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        email: newEmployee.email,
        password: newEmployee.password,
        role: newEmployee.role,
        phone: newEmployee.phone,
        address: newEmployee.residence,
        position: newEmployee.qualification,
        hourlyRate: newEmployee.hourlyRate,
        startDate: newEmployee.startDate,
        status: newEmployee.status,
        qualification: newEmployee.qualification,
        labelType: newEmployee.labelType,
        nextOfKin: newEmployee.nextOfKin,
        nextOfKinPhone: newEmployee.nextOfKinPhone,
        dob: newEmployee.dob,
        pob: newEmployee.pob,
        nid: newEmployee.nid,
        workplace: newEmployee.workplace
      };

      const res = await axios.post("https://capitalrise-cwcq.onrender.com/api/user-management/create", userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        // Shto punonjësin në listë
        const newEmp = {
          id: res.data.data.id,
          firstName: res.data.data.firstName,
          lastName: res.data.data.lastName,
          email: res.data.data.email,
          role: res.data.data.role,
          status: res.data.data.status,
          workplace: newEmployee.workplace,
          phone: res.data.data.phone,
          residence: res.data.data.residence || res.data.data.address,
          hourlyRate: res.data.data.hourlyRate,
          startDate: res.data.data.startDate,
          qualification: res.data.data.qualification,
          nextOfKin: res.data.data.nextOfKin,
          nextOfKinPhone: res.data.data.nextOfKinPhone,
          dob: res.data.data.dob,
          pob: res.data.data.pob,
          nid: res.data.data.nid,
          labelType: res.data.data.labelType
        };
        
        setEmployees(prev => [...prev, newEmp]);
        resetForm();
        setShowAddModal(false);
        
        // Shfaq mesazh suksesi me të dhënat e plota
        const successMessage = `✅ Punonjësi u krijua me sukses!

👤 Informacionet e Punonjësit:
   Emri: ${res.data.data.firstName} ${res.data.data.lastName}
   Email: ${res.data.data.email}
   Roli: ${res.data.data.role}
   Statusi: ${res.data.data.status}
   Telefoni: ${res.data.data.phone || 'N/A'}
   Adresa: ${res.data.data.residence || res.data.data.address || 'N/A'}
   Kualifikimi: ${res.data.data.qualification || 'N/A'}
   Paga për orë: £${res.data.data.hourlyRate || 'N/A'}
   Data e fillimit: ${res.data.data.startDate || 'N/A'}
   Kontakti i ngushtë: ${res.data.data.nextOfKin || 'N/A'}
   Telefoni i kontaktit: ${res.data.data.nextOfKinPhone || 'N/A'}
   NID: ${res.data.data.nid || 'N/A'}
   Label Type: ${res.data.data.labelType || 'N/A'}

🔐 Kredencialet e hyrjes:
   Email: ${res.data.data.email}
   Fjalëkalimi: ${res.data.data.password}

📧 Statusi i email-it: ${res.data.data.emailSent ? '✅ U dërgua' : '❌ Nuk u dërgua'}

⚠️ Ju lutem ndryshoni fjalëkalimin pas hyrjes së parë për sigurinë e llogarisë.`;

        alert(successMessage);
      }
    } catch (error) {
      console.error("Gabim në shtimin e punonjësit:", error);
      
      let errorMessage = "Gabim në shtimin e punonjësit. Provoni përsëri.";
      
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.status === 409) {
        errorMessage = "Email-i ekziston tashmë në sistem";
      } else if (error.response?.status === 400) {
        errorMessage = "Të dhënat nuk janë të vlefshme. Kontrolloni fushat e detyrueshme.";
      } else if (error.response?.status === 403) {
        errorMessage = "Nuk keni leje për të krijuar punonjës";
      }
      
      alert(`❌ ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setNewEmployee({
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
      status: t('employeesList.active'),
      qualification: "CSS",
      labelType: "UTR",
      photo: employeePlaceholder,
      username: "",
      password: "12345678",
      documents: [],
      nextOfKin: "",
      nextOfKinPhone: ""
    });
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (window.confirm("A jeni i sigurt që doni të fshini këtë punonjës?")) {
      try {
        await axios.delete(`https://capitalrise-cwcq.onrender.com/api/employees/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Rifresko listën nga backend
        const res = await axios.get("https://capitalrise-cwcq.onrender.com/api/employees", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployees(res.data);
      } catch (err) {
        alert("Gabim gjatë fshirjes së punonjësit!");
      }
    }
  };



  const filteredEmployees = employees
    .filter((emp) => {
      const statusMatch = filterStatus === "All" || emp.status === filterStatus;
      let contractMatch = true;
      if (isManager) {
        // For manager, show employees based on workplace filter
        if (filterWorkplace === "All") {
          // Show all employees that manager has access to
          contractMatch = true;
        } else {
          // Check if employee has the selected workplace
          contractMatch = Array.isArray(emp.workplace) && emp.workplace.includes(filterWorkplace);
        }
      } else {
        // Admin filtering: filter by workplace if selected, or show all if "All" is selected
        if (filterWorkplace === "All") {
          contractMatch = true; // Show all employees for admin
        } else {
          // Check if employee has the selected workplace
          contractMatch = Array.isArray(emp.workplace) && emp.workplace.includes(filterWorkplace);
        }
      }
      const roleMatch = filterRole === "All" || emp.role === filterRole;
      const taxMatch = filterTax === "All" || emp.labelType === filterTax;
      return statusMatch && contractMatch && roleMatch && taxMatch;
    })
    .sort((a, b) => {
      if (sortBy === "salaryHigh") {
        return parseFloat(b.hourlyRate) - parseFloat(a.hourlyRate);
      } else if (sortBy === "salaryLow") {
        return parseFloat(a.hourlyRate) - parseFloat(b.hourlyRate);
      } else if (sortBy === "nameAZ") {
        return (a.firstName || "").localeCompare(b.firstName || "");
      }
      return 0;
    });

  const exportToCSV = () => {
    const filtered = employees.filter((e) => {
      const matchesStatus = filterStatus === "All" || e.status === filterStatus;
      let matchesWorkplace = true;
      
      if (filterWorkplace !== "All") {
        if (isManager) {
          // For manager, check if employee has the selected workplace
          matchesWorkplace = Array.isArray(e.workplace) && e.workplace.includes(filterWorkplace);
        } else {
          // For admin, check if employee has the selected workplace
          matchesWorkplace = Array.isArray(e.workplace) && e.workplace.includes(filterWorkplace);
        }
      }
      
      return matchesStatus && matchesWorkplace;
    });

    const headers = "ID,Full Name,Email,Phone,Status\n";
    const rows = filtered
      .map((e) =>
        [e.id, `${e.firstName} ${e.lastName}`, e.email, e.phone, e.status].join(",")
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExtract = (emp) => {
    const empContracts = contracts.filter(c => c.employeeId === emp.id);
    const empHours = workHours.filter(h => h.employeeId === emp.id);
    const empTasks = tasks.filter(t => t.assignedTo === emp.email);

    let csvContent = "SECTION,KEY,VALUE\n";

    Object.entries(emp).forEach(([key, value]) => {
      csvContent += `Employee,${key},${value}\n`;
    });

    empContracts.forEach((contract, i) => {
      Object.entries(contract).forEach(([key, value]) => {
        csvContent += `Contract ${i + 1},${key},${value}\n`;
      });
    });

    empHours.forEach((hour, i) => {
      Object.entries(hour).forEach(([key, value]) => {
        csvContent += `WorkHour ${i + 1},${key},${value}\n`;
      });
    });

    empTasks.forEach((task, i) => {
      Object.entries(task).forEach(([key, value]) => {
        csvContent += `Task ${i + 1},${key},${value}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee_${emp.id}_full.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <PageLoader text={t('employees.loading')} />;
  }

  return (
    <div className="w-full px-4 md:px-6 py-4 md:py-8 space-y-6 sm:space-y-8">
        
        {/* HEADER SECTION - MOBILE RESPONSIVE */}
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
          onClick={openAddModal}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 justify-center text-sm sm:text-base hover:shadow-xl hover:scale-105"
        >
                <span className="text-lg sm:text-xl">➕</span>
                <span className="hidden sm:inline">{t('employeesList.addNewEmployee')}</span>
                <span className="sm:hidden">{t('employeesList.addEmployee')}</span>
        </button>
            </div>
          </div>
      </div>

        {/* MODAL PËR SHTIMIN E PUNONJËSIT - ELEGANT DESIGN */}
      {showAddModal && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeAddModal}
        >
          <div 
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
              {/* MODAL HEADER */}
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
                  onClick={closeAddModal}
                    className="text-white/80 hover:text-white text-2xl font-bold transition-colors p-1"
                >
                  ✕
                </button>
                </div>
              </div>
              
              {/* MODAL CONTENT */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              
                <form className="space-y-6" onSubmit={handleSubmit}>
                  
                  {/* BASIC INFO SECTION */}
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200">
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                      👤 {t('employeesList.personalInfo')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.firstName')} *</label>
                        <input 
                          type="text" 
                          name="firstName" 
                          placeholder={t('employeesList.firstName')} 
                          required 
                          value={newEmployee.firstName} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                        />
                </div>
                <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.lastName')} *</label>
                        <input 
                          type="text" 
                          name="lastName" 
                          placeholder={t('employeesList.lastName')} 
                          required 
                          value={newEmployee.lastName} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                        />
                </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.email')} *</label>
                        <input 
                          type="email" 
                          name="email" 
                          placeholder={t('employeesList.email')} 
                          required 
                          value={newEmployee.email} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.nationalId')} *</label>
                        <input 
                          type="text" 
                          name="nid" 
                          placeholder="National ID" 
                          required 
                          value={newEmployee.nid} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.startDate')} *</label>
                        <input 
                          type="date" 
                          name="startDate" 
                          required 
                          value={newEmployee.startDate} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
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
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.citizenship')}</label>
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
                      {siteOptions.length > 0 ? (
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.phoneNumber')} *</label>
                        <input 
                          type="text" 
                          name="phone" 
                          placeholder={t('employeesList.phoneNumber')} 
                          required 
                          value={newEmployee.phone} 
                    onChange={handleChange}
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                        />
                </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.nextOfKin')}</label>
                        <input 
                          type="text" 
                          name="nextOfKin" 
                          placeholder={t('employeesList.nextOfKin')} 
                          value={newEmployee.nextOfKin || ""} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                        />
                      </div>
                <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.nextOfKinPhone')}</label>
                        <input 
                          type="text" 
                          name="nextOfKinPhone" 
                          placeholder={t('employeesList.nextOfKinPhone')} 
                          value={newEmployee.nextOfKinPhone || ""} 
                    onChange={handleChange}
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                        />
                      </div>
                    </div>
                </div>
                  
                  {/* WORK DETAILS SECTION */}
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200">
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                      💼 {t('employeesList.workDetails')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.role')}</label>
                <select
                  name="role"
                  value={newEmployee.role}
                  onChange={handleChange}
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                >
                  <option value="user">{t('employeesList.employee')}</option>
                  <option value="manager">{t('employeesList.manager')}</option>
                </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.salaryPerHour')}</label>
                        <input 
                          type="number" 
                          name="hourlyRate" 
                          placeholder="0.00" 
                          value={newEmployee.hourlyRate} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.qualification')}</label>
                        <select 
                          name="qualification" 
                          value={newEmployee.qualification} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        >
                  <option value="CSS">CSS</option>
                  <option value="NVQ">NVQ</option>
                  <option value="Blue Card">Blue Card</option>
                </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Label Type</label>
                        <select
                          name="labelType"
                          value={newEmployee.labelType}
                          onChange={handleChange}
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        >
                          <option value="NI">NI</option>
                          <option value="UTR">UTR</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.status')} *</label>
                        <select 
                          name="status" 
                          required 
                          value={newEmployee.status} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        >
                  <option value="Aktiv">{t('employeesList.active')}</option>
                  <option value="Joaktiv">{t('employeesList.inactive')}</option>
                </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* FILES SECTION */}
                  <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-200">
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                      📁 {t('employeesList.documents')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.uploadPhoto')}</label>
                        <input 
                          type="file" 
                          name="photo" 
                          accept="image/*" 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 transition-all duration-200" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">{t('employeesList.uploadPdfDocument')}</label>
                        <input 
                          type="file" 
                          name="documents" 
                          accept="application/pdf" 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 transition-all duration-200" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    type="submit" 
                      className="flex-1 bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-bold text-base shadow-lg transition-all flex items-center gap-2 justify-center hover:shadow-xl hover:scale-105"
                  >
                      <span className="text-xl">➕</span>
                      <span className="hidden sm:inline">{t('employeesList.addEmployee')}</span>
                      <span className="sm:hidden">{t('employeesList.add')}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={closeAddModal}
                      className="flex-1 bg-slate-400 hover:bg-slate-500 text-white px-6 py-3 rounded-xl font-bold text-base shadow-lg transition-all flex items-center gap-2 justify-center hover:shadow-xl hover:scale-105"
                  >
                      <span className="text-xl">✕</span>
                      <span className="hidden sm:inline">{t('employeesList.cancel')}</span>
                      <span className="sm:hidden">{t('employeesList.close')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

        {/* FILTERS SECTION - MOBILE RESPONSIVE */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              🔍 {t('employeesList.filterAndSort')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)} 
                className="p-2 sm:p-3 border-2 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
            <option value="All">{t('employeesList.allStatuses')}</option>
            <option value="Aktiv">{t('employeesList.active')}</option>
            <option value="Joaktiv">{t('employeesList.inactive')}</option>
          </select>
              <select 
                value={filterWorkplace} 
                onChange={(e) => setFilterWorkplace(e.target.value)} 
                className="p-2 sm:p-3 border-2 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
            <option value="All">{t('employeesList.allWorkplaces')}</option>
            {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
          </select>
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)} 
                className="p-2 sm:p-3 border-2 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
            <option value="All">{t('employeesList.allRoles')}</option>
            <option value="user">{t('employeesList.employee')}</option>
            <option value="manager">{t('employeesList.manager')}</option>
          </select>
              <select 
                value={filterTax} 
                onChange={(e) => setFilterTax(e.target.value)} 
                className="p-2 sm:p-3 border-2 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
            <option value="All">{t('employeesList.allTaxTypes')}</option>
            <option value="NI">NI</option>
            <option value="UTR">UTR</option>
          </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                className="p-2 sm:p-3 border-2 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
            <option value="default">{t('employeesList.noSorting')}</option>
            <option value="salaryHigh">{t('employeesList.salaryHigh')}</option>
            <option value="salaryLow">{t('employeesList.salaryLow')}</option>
            <option value="nameAZ">{t('employeesList.nameAZ')}</option>
          </select>
            </div>
          </div>
        </div>

        {/* TABLE SECTION - MOBILE RESPONSIVE */}
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
                    <th className="py-3 px-2 text-center font-semibold text-slate-800">{t('employeesList.taxation')}</th>
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
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
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
    </div>
  );
}

export default EmployeesList;