// src/pages/Contracts.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../utils/useApi";
import { useDebounce } from "../utils/useDebounce";
import api from "../api";

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("start_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showToast, setShowToast] = useState({ show: false, message: "", type: "success" });
  const [newContract, setNewContract] = useState({
    company: "",
    contract_value: "", // renamed from company_no
    site_name: "",
    contract_number: "",
    start_date: "",
    finish_date: "",
    address: "",
    status: "Aktive",
    closed_manually: false,
    closed_date: null,
    documents: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Use optimized API hook for contracts
  const { data: contractsData, loading: contractsLoading, error: contractsError, refetch: refetchContracts } = useApi("/api/contracts", {
    cacheKey: "contracts",
    enableCache: true
  });

  // Use optimized API hook for work hours
  const { data: workHoursData } = useApi("/api/work-hours", {
    cacheKey: "workHours",
    enableCache: true
  });

  // Update contracts when data changes
  useEffect(() => {
    if (contractsData) {
      setContracts(contractsData);
      setLoading(false);
    }
  }, [contractsData]);

  // Auto-generate next contract number
  useEffect(() => {
    if (contracts.length > 0) {
      const validNumbers = contracts
        .map((c) => parseInt(c.contract_number))
        .filter((n) => !isNaN(n));
      const nextNumber = validNumbers.length === 0 ? 1 : Math.max(...validNumbers) + 1;
      setNewContract((prev) => ({
        ...prev,
        contract_number: nextNumber.toString(),
      }));
    }
  }, [contracts.length]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!newContract.company.trim()) {
      errors.company = "Emri i kompanisë është i detyrueshëm";
    }
    
    if (!newContract.contract_value || isNaN(newContract.contract_value) || parseFloat(newContract.contract_value) <= 0) {
      errors.contract_value = "Vlera e kontratës duhet të jetë një numër pozitiv";
    }
    
    if (!newContract.site_name.trim()) {
      errors.site_name = "Vendodhja është e detyrueshme";
    }
    
    if (!newContract.start_date) {
      errors.start_date = "Data e fillimit është e detyrueshme";
    }
    
    if (!newContract.finish_date) {
      errors.finish_date = "Data e mbarimit është e detyrueshme";
    }
    
    if (newContract.start_date && newContract.finish_date) {
      const startDate = new Date(newContract.start_date);
      const finishDate = new Date(newContract.finish_date);
      if (startDate >= finishDate) {
        errors.finish_date = "Data e mbarimit duhet të jetë pas datës së fillimit";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newContract]);

  // Toast notification
  const showToastMessage = useCallback((message, type = "success") => {
    setShowToast({ show: true, message, type });
    setTimeout(() => setShowToast({ show: false, message: "", type: "success" }), 3000);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, files } = e.target;
    
    if (name === "documents" && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewContract((prev) => ({
          ...prev,
          documents: [...prev.documents, {
            name: files[0].name,
            content: reader.result
          }]
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setNewContract(prev => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (formErrors[name]) {
        setFormErrors(prev => ({ ...prev, [name]: "" }));
      }
    }
  }, [formErrors]);

  // Optimized form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToastMessage("Ju lutem plotësoni të gjitha fushat e detyrueshme", "error");
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      contract_number: newContract.contract_number,
      company: newContract.company,
      contract_value: newContract.contract_value, // renamed from company_no
      site_name: newContract.site_name,
      start_date: newContract.start_date,
      finish_date: newContract.finish_date,
      status: newContract.status,
      address: newContract.address,
      closed_manually: newContract.closed_manually,
      closed_date: newContract.closed_date,
      documents: newContract.documents
    };

    try {
      const res = await api.post("/api/contracts", payload);
      setContracts(prev => [...prev, res.data]);
      
      // Reset form
      setNewContract({
        company: "",
        contract_value: "",
        site_name: "",
        contract_number: (parseInt(newContract.contract_number) + 1).toString(),
        start_date: "",
        finish_date: "",
        address: "",
        status: "Aktive",
        closed_manually: false,
        closed_date: null,
        documents: []
      });
      
      showToastMessage("Kontrata u shtua me sukses!");
      
      // Clear cache to refresh data
      refetchContracts();
    } catch (err) {
      console.error("Error creating contract:", err);
      showToastMessage(err.response?.data?.error || "Gabim gjatë shtimit të kontratës!", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [newContract, validateForm, showToastMessage, refetchContracts]);

  // Optimized status toggle
  const handleToggleStatus = useCallback(async (contract_number) => {
    const contractIndex = contracts.findIndex(c => c.contract_number === contract_number);
    if (contractIndex === -1) return;

    const updated = [...contracts];
    const contract = { ...updated[contractIndex] };
    const today = new Date();
    const finishDate = new Date(contract.finish_date);

    contract.closed_manually = !contract.closed_manually;
    contract.closed_date = today.toISOString();

    if (contract.closed_manually) {
      contract.status = today > finishDate ? "Mbyllur me vonesë" : "Mbyllur";
    } else {
      contract.status = "Aktive";
      contract.closed_date = null;
    }

    try {
      const res = await api.put(`/api/contracts/${contract.id}`, contract);
      updated[contractIndex] = res.data;
      setContracts(updated);
      showToastMessage("Statusi i kontratës u ndryshua me sukses!");
    } catch (err) {
      console.error("Error updating contract status:", err);
      showToastMessage("Gabim gjatë ndryshimit të statusit!", "error");
    }
  }, [contracts, showToastMessage]);

  // Optimized delete with confirmation
  const handleDelete = useCallback(async (contract_number) => {
    if (!window.confirm("Jeni i sigurt që doni të fshini këtë kontratë? Kjo veprim nuk mund të kthehet mbrapsht.")) {
      return;
    }
    
    const contract = contracts.find(c => c.contract_number === contract_number);
    if (!contract) {
      showToastMessage("Kontrata nuk u gjet!", "error");
      return;
    }
    
    try {
      await api.delete(`/api/contracts/${contract.id}`);
      setContracts(prev => prev.filter((c) => c.contract_number !== contract_number));
      showToastMessage("Kontrata u fshi me sukses!");
    } catch (err) {
      console.error("Error deleting contract:", err);
      showToastMessage("Gabim gjatë fshirjes!", "error");
    }
  }, [contracts, showToastMessage]);

  // Optimized calculations with useMemo
  const calculateSpentForSite = useCallback((site_name) => {
    if (!workHoursData) return 0;
    
    const allHours = workHoursData.filter(
      (wh) => wh.site === site_name || wh.site === site_name.toLowerCase()
    );
    return allHours.reduce(
      (sum, row) => sum + Number(row.hours || 0) * Number(row.hourlyRate || 0),
      0
    );
  }, [workHoursData]);

  const calculateProgress = useCallback((start_date, finish_date) => {
    const start = new Date(start_date);
    const end = new Date(finish_date);
    const now = new Date();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.floor(((now - start) / (end - start)) * 100);
  }, []);

  // Optimized filtering and sorting
  const filteredAndSortedContracts = useMemo(() => {
    let filtered = contracts;

    // Apply search filter with debounced term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(c => 
        c.company.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        c.site_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        c.contract_number.toString().includes(debouncedSearchTerm)
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === "start_date" || sortBy === "finish_date") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === "contract_value") {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [contracts, debouncedSearchTerm, filterStatus, sortBy, sortOrder]);

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAndSortedContracts.length / itemsPerPage);
  const paginatedContracts = filteredAndSortedContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("sq-AL");
  }, []);

  if (loading || contractsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar kontratat...</h2>
        </div>
      </div>
    );
  }

  if (contractsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Gabim në ngarkimin e kontratave</h2>
          <button 
            onClick={refetchContracts}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            🔄 Provoni përsëri
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full xl:max-w-[90vw] mx-auto px-4 py-8 space-y-12 bg-gradient-to-br from-blue-100 via-white to-purple-100 min-h-screen">
      {/* Toast Notification */}
      {showToast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          showToast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {showToast.message}
        </div>
      )}

      {/* HEADER MODERN */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-100 rounded-2xl shadow-lg px-8 py-4 mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Menaxhimi i Kontratave</h2>
          <div className="text-lg font-medium text-purple-700">Shto, shiko dhe menaxho kontratat</div>
        </div>
      </div>

      {/* Forma për shtim kontrate */}
      <div className="bg-gradient-to-br from-purple-100 via-white to-blue-100 px-12 py-6 rounded-2xl shadow-lg border border-purple-100 animate-fade-in w-full">
        <h3 className="font-bold mb-6 text-2xl text-blue-900 flex items-center gap-2">➕ Shto Kontratë të Re</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 w-full" onSubmit={handleSubmit}>
          <label className="col-span-1 md:col-span-2 lg:col-span-4 text-lg font-semibold text-purple-700">Nr. Kontratës: {newContract.contract_number}</label>
          
          <div className="col-span-1">
            <input 
              name="company" 
              placeholder="Emri i Kompanisë" 
              value={newContract.company} 
              onChange={handleChange} 
              className={`p-3 border rounded-lg text-base focus:ring-2 transition-all shadow-sm w-full ${
                formErrors.company ? 'border-red-500 focus:ring-red-200' : 'border-blue-200 focus:ring-blue-200'
              }`}
            />
            {formErrors.company && <p className="text-red-500 text-sm mt-1">{formErrors.company}</p>}
          </div>
          
          <div className="col-span-1">
            <input 
              name="contract_value" 
              placeholder="Vlera e Kontratës (£)" 
              value={newContract.contract_value} 
              onChange={handleChange} 
              className={`p-3 border rounded-lg text-base focus:ring-2 transition-all shadow-sm w-full ${
                formErrors.contract_value ? 'border-red-500 focus:ring-red-200' : 'border-blue-200 focus:ring-blue-200'
              }`}
            />
            {formErrors.contract_value && <p className="text-red-500 text-sm mt-1">{formErrors.contract_value}</p>}
          </div>
          
          <div className="col-span-1">
            <input 
              name="site_name" 
              placeholder="Vendodhja" 
              value={newContract.site_name} 
              onChange={handleChange} 
              className={`p-3 border rounded-lg text-base focus:ring-2 transition-all shadow-sm w-full ${
                formErrors.site_name ? 'border-red-500 focus:ring-red-200' : 'border-blue-200 focus:ring-blue-200'
              }`}
            />
            {formErrors.site_name && <p className="text-red-500 text-sm mt-1">{formErrors.site_name}</p>}
          </div>
          
          <div className="col-span-1">
            <input 
              name="address" 
              placeholder="Adresa" 
              value={newContract.address} 
              onChange={handleChange} 
              className="p-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-200 transition-all shadow-sm w-full"
            />
          </div>
          
          <div className="col-span-1">
            <label className="block text-base font-medium mb-1 text-blue-800">Data e Fillimit</label>
            <input 
              type="date" 
              name="start_date" 
              value={newContract.start_date} 
              onChange={handleChange} 
              className={`p-3 border rounded-lg w-full text-base focus:ring-2 transition-all shadow-sm ${
                formErrors.start_date ? 'border-red-500 focus:ring-red-200' : 'border-purple-200 focus:ring-purple-200'
              }`}
            />
            {formErrors.start_date && <p className="text-red-500 text-sm mt-1">{formErrors.start_date}</p>}
          </div>
          
          <div className="col-span-1">
            <label className="block text-base font-medium mb-1 text-blue-800">Data e Mbarimit</label>
            <input 
              type="date" 
              name="finish_date" 
              value={newContract.finish_date} 
              onChange={handleChange} 
              className={`p-3 border rounded-lg w-full text-base focus:ring-2 transition-all shadow-sm ${
                formErrors.finish_date ? 'border-red-500 focus:ring-red-200' : 'border-purple-200 focus:ring-purple-200'
              }`}
            />
            {formErrors.finish_date && <p className="text-red-500 text-sm mt-1">{formErrors.finish_date}</p>}
          </div>
          
          <div className="col-span-2 lg:col-span-2">
            <label className="block text-base font-medium text-blue-800 mb-1">Ngarko Dokument PDF</label>
            <input 
              type="file" 
              name="documents" 
              accept="application/pdf" 
              onChange={handleChange} 
              className="p-3 border border-blue-200 rounded-lg w-full text-base file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all duration-200" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="col-span-1 md:col-span-2 lg:col-span-4 bg-gradient-to-r from-green-300 to-blue-400 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow hover:from-blue-500 hover:to-green-500 transition-all flex items-center gap-2 justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Duke ruajtur...
              </>
            ) : (
              <>
                <span className="text-xl">💾</span> Shto Kontratë
              </>
            )}
          </button>
        </form>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white/80 px-8 py-6 rounded-2xl shadow-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="🔍 Kërko kontrata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">Të gjitha statuset</option>
              <option value="Aktive">Aktive</option>
              <option value="Mbyllur">Mbyllur</option>
              <option value="Mbyllur me vonesë">Mbyllur me vonesë</option>
            </select>
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-200"
            >
              <option value="start_date">Data e fillimit</option>
              <option value="contract_value">Vlera</option>
              <option value="company">Kompania</option>
              <option value="site_name">Vendodhja</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-200 hover:bg-blue-50"
            >
              {sortOrder === "asc" ? "↑ Rritës" : "↓ Zbritës"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista e kontratave */}
      <div className="bg-white/80 px-16 py-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in w-full">
        <h3 className="font-bold mb-8 text-3xl text-blue-900 flex items-center gap-3">
          📋 Lista e Kontratave 
          <span className="text-lg text-gray-600">({filteredAndSortedContracts.length} kontrata)</span>
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-lg bg-white shadow rounded-xl">
            <thead className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900 text-xl">
              <tr>
                <th className="py-5 px-4 text-center align-middle font-bold">Nr</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Kompania</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Vendodhja</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Datat</th>
                <th className="py-5 px-4 text-center align-middle font-bold">⏳</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Vlera (£)</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Shpenzuar (£)</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Fitimi (£)</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Statusi</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Gjendja</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {paginatedContracts.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-gray-500 italic">
                                         {debouncedSearchTerm || filterStatus !== "all" 
                       ? "Nuk u gjetën kontrata me këto kritere." 
                       : "Nuk ka kontrata akoma. Krijoni të parën!"
                     }
                  </td>
                </tr>
              ) : (
                paginatedContracts.map((c, index) => {
                  const shpenzuar = calculateSpentForSite(c.site_name);
                  const vlera = Number(c.contract_value || c.company_no || 0);
                  const fitimi = vlera - shpenzuar;
                  const progres = calculateProgress(c.start_date, c.finish_date);
                  return (
                    <tr key={c.id || index} className="text-center hover:bg-purple-50 transition-all">
                      <td className="py-4 px-4 align-middle font-semibold">{c.contract_number}</td>
                      <td className="py-4 px-4 align-middle">{c.company}</td>
                      <td className="py-4 px-4 align-middle text-blue-700 underline cursor-pointer font-bold" onClick={() => navigate(`/admin/contracts/${c.contract_number}`)}>
                        {c.site_name}
                      </td>
                      <td className="py-4 px-4 align-middle">{formatDate(c.start_date)} - {formatDate(c.finish_date)}</td>
                      <td className="py-4 px-4 align-middle">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all" style={{ width: `${progres}%` }}></div>
                        </div>
                        <div className="text-base mt-1 font-semibold text-blue-800">{progres}%</div>
                      </td>
                      <td className="py-4 px-4 align-middle font-bold text-blue-900">£{vlera.toFixed(2)}</td>
                      <td className="py-4 px-4 align-middle font-bold text-purple-700">£{shpenzuar.toFixed(2)}</td>
                      <td className="py-4 px-4 align-middle font-bold text-green-700">£{fitimi.toFixed(2)}</td>
                      <td className={`py-4 px-4 align-middle font-bold ${c.status === "Mbyllur" ? "text-green-600" : c.status === "Mbyllur me vonesë" ? "text-red-600" : "text-blue-600"}`}>
                        <span className={`px-4 py-2 rounded-full text-base font-bold shadow-md ${c.status === "Mbyllur" ? "bg-green-100 text-green-600" : c.status === "Mbyllur me vonesë" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>{c.status}</span>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className="flex flex-col items-center gap-2">
                          <input
                            type="checkbox"
                            checked={c.closed_manually}
                            onChange={() => handleToggleStatus(c.contract_number)}
                            className="w-6 h-6 accent-green-500 cursor-pointer"
                            title={c.closed_manually ? "Klik për ta riaktivizuar" : "Klik për ta mbyllur"}
                          />
                          <span className="text-xs text-gray-500">
                            {c.closed_manually ? "Mbyllur" : "Aktive"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle flex justify-center gap-2">
                        <button 
                          className="px-5 py-3 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-lg text-lg font-semibold shadow hover:from-pink-600 hover:to-red-600 transition-all flex items-center gap-2" 
                          onClick={() => handleDelete(c.contract_number)}
                        >
                          🗑 <span className="hidden md:inline">Fshi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Para
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === page 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pas →
            </button>
          </div>
        )}
      </div>

      {/* Animacion fade-in */}
      <style jsx>{`
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: none; }
      }
      .animate-fade-in { animation: fade-in 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}
