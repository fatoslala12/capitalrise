import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
    status: "Aktiv",
    qualification: "CSS",
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
  if (!user) return <div className="p-4 text-center">Duke u ngarkuar...</div>;
  const isManager = user?.role === "manager";
  const managerSites = user?.workplace || [];

  // Merr kontratat nga backend
  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get("https://building-system.onrender.com/api/contracts", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get("https://building-system.onrender.com/api/employees", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get("https://building-system.onrender.com/api/work-hours", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get("https://building-system.onrender.com/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(([contractsRes, employeesRes, workHoursRes, tasksRes]) => {
      const contractsData = snakeToCamel(contractsRes.data);
      setContracts(contractsData);
      const uniqueSites = [...new Set(contractsData.map(c => c.siteName).filter(Boolean))];
      setSiteOptions(uniqueSites);
      
      setEmployees(snakeToCamel(employeesRes.data));
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
    if (isManager) {
      const invalidSites = newEmployee.workplace.filter(
        (wp) => !managerSites.includes(wp)
      );
      if (invalidSites.length > 0) {
        alert("Nuk mund të shtoni punonjës në site që nuk ju përkasin.");
        return;
      }
    }
    try {
      // 1. Shto punonjësin me workplace në payload
      const payload = { ...toSnakeCase(newEmployee), workplace: newEmployee.workplace };
      const res = await axios.post("https://building-system.onrender.com/api/employees", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 201) {
        // 2. Merr punonjësin e ri nga response
        const newEmp = snakeToCamel(res.data);
        
        // 3. Përditëso listën lokale
        setEmployees(prev => [...prev, newEmp]);
        
        // 4. Reset forma dhe mbyll modalit
        resetForm();
        setShowAddModal(false);
        
        alert("Punonjësi u shtua me sukses!");
      }
    } catch (error) {
      console.error("Gabim në shtimin e punonjësit:", error);
      alert("Gabim në shtimin e punonjësit. Provoni përsëri.");
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
      status: "Aktiv",
      qualification: "CSS",
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
        await axios.delete(`https://building-system.onrender.com/api/employees/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Rifresko listën nga backend
        const res = await axios.get("https://building-system.onrender.com/api/employees", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployees(res.data);
      } catch (err) {
        alert("Gabim gjatë fshirjes së punonjësit!");
      }
    }
  };

  // Filtrim i avancuar për menaxherin bazuar në contract_id të përbashkët
  const getManagerContractIds = () => {
    if (!isManager) return [];
    // Gjej të gjitha contract_id ku menaxheri ka punuar
    const myHours = workHours.filter(h => h.employeeId === user.employeeId);
    const myContractIds = Array.from(new Set(myHours.map(h => h.contractId)));
    return myContractIds;
  };

  const filteredEmployees = employees
    .filter((emp) => {
      const statusMatch = filterStatus === "All" || emp.status === filterStatus;
      let contractMatch = true;
      if (isManager) {
        const managerContractIds = getManagerContractIds();
        if (managerContractIds.length === 0) {
          // Nëse menaxheri nuk ka kontrata, shfaq vetëm veten
          contractMatch = emp.id === user.employeeId;
        } else {
          // Gjej të gjitha contract_id të punonjësit
          const empHours = workHours.filter(h => h.employeeId === emp.id);
          const empContractIds = new Set(empHours.map(h => h.contractId));
          // Kontrollo nëse ka të paktën një contract_id të përbashkët
          contractMatch = Array.from(empContractIds).some(cid => managerContractIds.includes(cid));
          // Shto gjithmonë veten
          if (emp.id === user.employeeId) contractMatch = true;
        }
      } else {
        contractMatch = filterWorkplace === "All" || (Array.isArray(emp.workplace) && emp.workplace.includes(filterWorkplace));
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
      const matchesWorkplace =
        filterWorkplace === "All" || e.workplace.includes(filterWorkplace);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar punonjësit...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header me butonin për të hapur modalit */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight flex items-center gap-2">
          <span className="text-4xl">👥</span> Lista e Punonjësve
        </h2>
        <button
          onClick={openAddModal}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
        >
          <span className="text-xl">➕</span> Shto Punonjës
        </button>
      </div>

      {/* Modal për shtimin e punonjësit */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeAddModal}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight flex items-center gap-2">
                  <span className="text-3xl">➕</span> Shto Punonjës të Ri
                </h3>
                <button
                  onClick={closeAddModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                onSubmit={handleSubmit}
              >
                <label className="col-span-2 text-blue-700 italic mb-2">Lutem plotësoni të gjithë fushat e nevojshme</label>
                <input type="text" name="firstName" placeholder="Emri *" required value={newEmployee.firstName} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <input type="text" name="lastName" placeholder="Mbiemri *" required value={newEmployee.lastName} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <div>
                  <label className="block text-blue-800 font-semibold mb-1">Data e Fillimit *</label>
                  <input type="date" name="startDate" required value={newEmployee.startDate} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl w-full text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                </div>
                <div>
                  <label className="block text-blue-800 font-semibold mb-1">Datëlindja</label>
                  <input type="date" name="dob" value={newEmployee.dob} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl w-full text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                </div>
                <input type="text" name="pob" placeholder="Shtetësia" value={newEmployee.pob} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <input type="text" name="residence" placeholder="Vendbanimi" value={newEmployee.residence} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <input type="email" name="email" placeholder="Email *" required value={newEmployee.email} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <input type="text" name="nid" placeholder="NID *" required value={newEmployee.nid} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <label className="col-span-2 text-blue-800 font-semibold mt-2">Zgjidh Vendet e Punës *</label>
                <div className="col-span-2 flex flex-wrap gap-3 mb-2">
                  {siteOptions.map((siteName) => {
                    const canSelect = !isManager || managerSites.includes(siteName);
                    if (!canSelect) return null;
                    return (
                      <label key={siteName} className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-sm cursor-pointer">
                        <input
                          type="checkbox"
                          name="workplace"
                          value={siteName}
                          onChange={handleChange}
                          checked={newEmployee.workplace.includes(siteName)}
                          className="accent-blue-600 w-5 h-5"
                        /> {siteName}
                      </label>
                    );
                  })}
                </div>
                <input type="text" name="phone" placeholder="Telefoni *" required value={newEmployee.phone} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <input type="text" name="nextOfKin" placeholder="Next of Kin" value={newEmployee.nextOfKin || ""} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <input type="text" name="nextOfKinPhone" placeholder="Next of Kin Phone" value={newEmployee.nextOfKinPhone || ""} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <div>
                  <label className="block font-semibold mb-1 text-blue-800">Label Type</label>
                  <select
                    name="labelType"
                    value={newEmployee.labelType}
                    onChange={handleChange}
                    className="border-2 border-blue-200 p-4 w-full rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm"
                  >
                    <option value="NI">NI</option>
                    <option value="UTR">UTR</option>
                  </select>
                </div>
                <select
                  name="role"
                  value={newEmployee.role}
                  onChange={handleChange}
                  className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm"
                >
                  <option value="user">Punonjës</option>
                  <option value="manager">Menaxher</option>
                </select>
                <input type="number" name="hourlyRate" placeholder="Paga / Orë (£)" value={newEmployee.hourlyRate} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" />
                <select name="qualification" value={newEmployee.qualification} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm">
                  <option value="CSS">CSS</option>
                  <option value="NVQ">NVQ</option>
                  <option value="Blue Card">Blue Card</option>
                </select>
                <select name="status" required value={newEmployee.status} onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm">
                  <option value="Aktiv">Aktiv</option>
                  <option value="Joaktiv">Joaktiv</option>
                </select>
                <label className="col-span-2 text-blue-800 font-semibold mt-2">Ngarko Foto</label>
                <input type="file" name="photo" accept="image/*" onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl col-span-2 bg-blue-50 shadow-sm" />
                <label className="col-span-2 text-blue-800 font-semibold mt-2">Ngarko Dokument PDF</label>
                <input type="file" name="documents" accept="application/pdf" onChange={handleChange} className="p-4 border-2 border-blue-200 rounded-xl col-span-2 bg-blue-50 shadow-sm" />
                
                <div className="col-span-2 flex gap-4 mt-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 justify-center"
                  >
                    <span className="text-2xl">➕</span> Shto Punonjës
                  </button>
                  <button 
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 justify-center"
                  >
                    <span className="text-2xl">✕</span> Anulo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-3 border-2 border-blue-200 rounded-xl shadow-sm">
            <option value="All">Gjithë statuset</option>
            <option value="Aktiv">Aktiv</option>
            <option value="Joaktiv">Joaktiv</option>
          </select>
          <select value={filterWorkplace} onChange={(e) => setFilterWorkplace(e.target.value)} className="p-3 border-2 border-blue-200 rounded-xl shadow-sm">
            <option value="All">Të gjitha vendet</option>
            {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="p-3 border-2 border-blue-200 rounded-xl shadow-sm">
            <option value="All">Gjithë rolet</option>
            <option value="user">Punonjës</option>
            <option value="manager">Menaxher</option>
          </select>
          <select value={filterTax} onChange={(e) => setFilterTax(e.target.value)} className="p-3 border-2 border-blue-200 rounded-xl shadow-sm">
            <option value="All">Gjithë taksimet</option>
            <option value="NI">NI</option>
            <option value="UTR">UTR</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-3 border-2 border-blue-200 rounded-xl shadow-sm">
            <option value="default">Pa sortim</option>
            <option value="salaryHigh">Paga ↓</option>
            <option value="salaryLow">Paga ↑</option>
            <option value="nameAZ">Emri A-Z</option>
          </select>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100 p-6 mb-8 overflow-x-auto animate-fade-in">
          <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-6 text-center flex items-center gap-2 justify-center">
            <span className="text-3xl">📋</span> Tabela e Punonjësve
          </h3>
          <table className="min-w-full text-base text-blue-900 rounded-2xl overflow-hidden shadow-xl">
            <thead className="bg-gradient-to-r from-blue-100 via-white to-purple-100 text-blue-900 text-base font-bold">
              <tr>
                <th className="py-4 px-3 text-center">Foto</th>
                <th className="py-4 px-3 text-center">ID</th>
                <th className="py-4 px-3 text-center">Emër</th>
                <th className="py-4 px-3 text-center">Mbiemër</th>
                <th className="py-4 px-3 text-center">Roli</th>
                <th className="py-4 px-3 text-center">Vendet e punës</th>
                <th className="py-4 px-3 text-center">Tel</th>
                <th className="py-4 px-3 text-center">Paga</th>
                <th className="py-4 px-3 text-center">Statusi</th>
                <th className="py-4 px-3 text-center">Taksimi</th>
                <th className="py-4 px-3 text-center">Veprime</th>
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
                  <tr key={emp.id} className="text-center hover:bg-purple-50 transition-all duration-200 rounded-xl shadow-sm">
                    <td className="py-3 px-3 flex items-center justify-center">
                      {emp.photo ? (
                        <img src={emp.photo} alt="Foto" className="w-14 h-14 rounded-full object-cover border-2 border-blue-200 shadow" />
                      ) : (
                        <span className="rounded-full bg-blue-200 text-blue-700 px-5 py-4 text-2xl font-bold shadow">{firstName[0]}{lastName[0]}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-blue-900">{emp.id || ""}</td>
                    <td className="py-3 px-3 font-semibold">{firstName}</td>
                    <td className="py-3 px-3 font-semibold">{lastName}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-3 py-1 rounded-full shadow uppercase tracking-wide">{role}</span>
                    </td>
                    <td className="py-3 px-3 text-sm">
                      {Array.isArray(emp.workplace) ? emp.workplace.join(", ") : (emp.workplace || "")}
                    </td>
                    <td className="py-3 px-3">{emp.phone || ""}</td>
                    <td className="py-3 px-3 font-bold text-green-700">{emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate !== "" ? `£${emp.hourlyRate}` : (emp.hourly_rate !== undefined && emp.hourly_rate !== null && emp.hourly_rate !== "" ? `£${emp.hourly_rate}` : "")}</td>
                    <td className="py-3 px-3">
                      <span className={`px-4 py-1 rounded-full border text-base font-bold shadow-md ${statusColor}`}>{status}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-blue-700">{emp.labelType || emp.label_type || ""}</td>
                    <td className="py-3 px-3 flex items-center gap-2 justify-center">
                      <button onClick={() => navigate(`/admin/employee/${emp.id}`)} className="p-2 text-blue-600 hover:text-blue-800 hover:scale-110 transition-all text-xl" title="Shiko Detaje">
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleExtract(emp)}
                        className="p-2 text-green-600 hover:text-green-800 hover:scale-110 transition-all text-xl"
                        title="Eksporto të dhënat"
                      >
                        📥
                      </button>
                      <button onClick={() => handleDelete(emp.id)} className="p-2 text-red-600 hover:text-red-800 hover:scale-110 transition-all text-xl" title="Fshi">
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          onClick={exportToCSV}
          className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg flex items-center gap-2 mx-auto"
        >
          <span className="text-2xl">📤</span> Eksporto punonjësit (CSV)
        </button>
      </div>
    </div>
  );
}