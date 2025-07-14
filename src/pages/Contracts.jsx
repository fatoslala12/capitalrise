// src/pages/Contracts.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../utils/useApi";
import { useDebounce } from "../utils/useDebounce";
import api from "../api";
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import NotificationService from '../utils/notifications';

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
    status: "Ne progres",
    closed_manually: false,
    closed_date: null,
    documents: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

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
        status: "Ne progres",
        closed_manually: false,
        closed_date: null,
        documents: []
      });
      
      showToastMessage("Kontrata u shtua me sukses!");
      toast.success("Kontrata u krijua me sukses!");
      
      // Clear cache to refresh data
      refetchContracts();
    } catch (err) {
      console.error("Error creating contract:", err);
      showToastMessage(err.response?.data?.error || "Gabim gjatë shtimit të kontratës!", "error");
      toast.error("Gabim gjatë krijimit të kontratës!");
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
      contract.status = today > finishDate ? "Mbyllur me vonese" : "Mbyllur";
    } else {
      contract.status = "Ne progres";
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

  // Profit calculation
  const calculateContractProfit = useCallback((contract) => {
    const contractValue = parseFloat(contract.contract_value) || 0;
    
    // Get expenses for this contract
    const contractExpenses = workHoursData?.filter(wh => 
      wh.contract_id === contract.id
    ) || [];
    
    const totalExpenses = contractExpenses.reduce((sum, expense) => {
      const hours = parseFloat(expense.hours) || 0;
      const rate = parseFloat(expense.hourly_rate) || 0;
      return sum + (hours * rate);
    }, 0);
    
    const profit = contractValue - totalExpenses;
    const profitMargin = contractValue > 0 ? (profit / contractValue) * 100 : 0;
    
    return {
      contractValue,
      totalExpenses,
      profit,
      profitMargin,
      expensesCount: contractExpenses.length
    };
  }, [workHoursData]);

  const getProfitColor = (profit) => {
    if (profit > 0) return 'text-green-700 bg-green-50';
    if (profit < 0) return 'text-red-700 bg-red-50';
    return 'text-gray-700 bg-gray-50';
  };

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

  // Bulk operations
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedContracts([]);
      setSelectAll(false);
    } else {
      setSelectedContracts(contracts.map(c => c.id));
      setSelectAll(true);
    }
  };

  const handleSelectContract = (contractId) => {
    setSelectedContracts(prev => 
      prev.includes(contractId) 
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedContracts.length === 0) {
      toast.error('Zgjidh kontratat për fshirje!');
      return;
    }
    
    if (!confirm(`A jeni të sigurt që dëshironi të fshini ${selectedContracts.length} kontrata?`)) {
      return;
    }
    
    try {
      await Promise.all(selectedContracts.map(id => api.delete(`/api/contracts/${id}`)));
      toast.success(`${selectedContracts.length} kontrata u fshinë me sukses!`);
      setSelectedContracts([]);
      setSelectAll(false);
      // Refresh data
      refetchContracts();
    } catch (err) {
      toast.error('Gabim gjatë fshirjes së kontratave!');
    }
  };

  // Export functions
  const exportToExcel = (data, filename = 'kontratat') => {
    const ws = XLSX.utils.json_to_sheet(data.map(contract => ({
      'ID': contract.id,
      'Emri i Kontratës': contract.company, // Assuming company is the contract name
      'Vendodhja': contract.site_name,
      'Vlera (£)': contract.contract_value,
      'Data e Fillimit': contract.start_date,
      'Data e Mbarimit': contract.finish_date,
      'Statusi': contract.status,
      'Adresa': contract.address,
      'Shpenzuar (£)': calculateSpentForSite(contract.site_name),
      'Fitimi (£)': Number(contract.contract_value || 0) - calculateSpentForSite(contract.site_name)
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kontratat');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = (data, filename = 'kontratat') => {
    // Simple PDF export using html2pdf
    const element = document.createElement('div');
    element.innerHTML = `
      <h2>Lista e Kontratave</h2>
      <table border="1" style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>ID</th>
            <th>Emri i Kompanisë</th>
            <th>Vendodhja</th>
            <th>Vlera (£)</th>
            <th>Data e Fillimit</th>
            <th>Data e Mbarimit</th>
            <th>Statusi</th>
            <th>Adresa</th>
            <th>Shpenzuar (£)</th>
            <th>Fitimi (£)</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(contract => `
            <tr>
              <td>${contract.id}</td>
              <td>${contract.company}</td>
              <td>${contract.site_name}</td>
              <td>${contract.contract_value}</td>
              <td>${formatDate(contract.start_date)}</td>
              <td>${formatDate(contract.finish_date)}</td>
              <td>${contract.status}</td>
              <td>${contract.address}</td>
              <td>${calculateSpentForSite(contract.site_name)}</td>
              <td>${Number(contract.contract_value || 0) - calculateSpentForSite(contract.site_name)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Use html2pdf if available
    if (window.html2pdf) {
      window.html2pdf().from(element).save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      toast.error('PDF export nuk është i disponueshëm!');
    }
  };

  const handleExport = (type) => {
    const dataToExport = selectedContracts.length > 0 
      ? contracts.filter(c => selectedContracts.includes(c.id))
      : filteredAndSortedContracts;
      
    if (dataToExport.length === 0) {
      toast.error('Nuk ka të dhëna për eksport!');
      return;
    }
    
    if (type === 'excel') {
      exportToExcel(dataToExport);
      toast.success('Eksporti në Excel u krye me sukses!');
    } else if (type === 'pdf') {
      exportToPDF(dataToExport);
      toast.success('Eksporti në PDF u krye me sukses!');
    }
  };

  // Workflow statuses and transitions
  const CONTRACT_STATUSES = [
    "Draft",
    "Anulluar",
    "Ne progres",
    "Pezulluar",
    "Mbyllur",
    "Mbyllur me vonese"
  ];

  const STATUS_TRANSITIONS = {
    [CONTRACT_STATUSES.DRAFT]: [CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.CANCELLED],
    [CONTRACT_STATUSES.ACTIVE]: [CONTRACT_STATUSES.IN_PROGRESS, CONTRACT_STATUSES.ON_HOLD, CONTRACT_STATUSES.CANCELLED],
    [CONTRACT_STATUSES.IN_PROGRESS]: [CONTRACT_STATUSES.COMPLETED, CONTRACT_STATUSES.ON_HOLD],
    [CONTRACT_STATUSES.ON_HOLD]: [CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.IN_PROGRESS, CONTRACT_STATUSES.CANCELLED],
    [CONTRACT_STATUSES.COMPLETED]: [],
    [CONTRACT_STATUSES.CANCELLED]: []
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Anulluar': 'bg-red-100 text-red-800',
      'Ne progres': 'bg-blue-100 text-blue-800',
      'Pezulluar': 'bg-yellow-100 text-yellow-800',
      'Mbyllur': 'bg-green-100 text-green-800',
      'Mbyllur me vonese': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Llogarit statusin bazuar në datat
  const calculateStatus = (contract) => {
    const today = new Date();
    const startDate = new Date(contract.start_date);
    const finishDate = new Date(contract.finish_date);
    
    if (contract.closed_manually) {
      return contract.closed_date ? "Mbyllur" : "Mbyllur me vonese";
    }
    
    if (today < startDate) {
      return "Draft";
    } else if (today >= startDate && today <= finishDate) {
      return "Ne progres";
    } else if (today > finishDate) {
      return "Mbyllur me vonese";
    }
    
    return "Ne progres"; // default
  };

  // Përditëso handleStatusChange për të përfshirë notifikimet
  const handleStatusChange = async (contractId, newStatus) => {
    try {
      await api.put(`/api/contracts/${contractId}`, { status: newStatus });
      
      // Send notification
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        await NotificationService.notifyContractStatusChange(contract, newStatus, contract.id);
        
        // Special notification for completion
        if (newStatus === CONTRACT_STATUSES.COMPLETED) {
          await NotificationService.notifyContractCompletion(contract, contract.id);
        }
      }
      
      toast.success(`Statusi i kontratës u ndryshua në "${newStatus}"`);
      refetchContracts();
    } catch (err) {
      toast.error('Gabim gjatë ndryshimit të statusit!');
    }
  };

  // UI/UX improvements
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Loading states
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Duke ngarkuar...</span>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="text-red-800">{message}</span>
      </div>
    </div>
  );

  // Success message
  const SuccessMessage = ({ message }) => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-green-800">{message}</span>
      </div>
    </div>
  );

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
          
          <div className="col-span-1">
            <select 
              name="status" 
              value={newContract.status} 
              onChange={handleChange} 
              className="p-3 border border-purple-200 rounded-lg text-base focus:ring-2 focus:ring-purple-200 transition-all shadow-sm w-full"
            >
              <option value="Draft">Draft</option>
              <option value="Anulluar">Anulluar</option>
              <option value="Ne progres">Ne progres</option>
              <option value="Pezulluar">Pezulluar</option>
              <option value="Mbyllur">Mbyllur</option>
              <option value="Mbyllur me vonese">Mbyllur me vonese</option>
            </select>
          </div>
          
          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Duke shtuar..." : "➕ Shto Kontratë"}
            </button>
            
            <button 
              type="button" 
              onClick={() => setNewContract({
                company: "",
                contract_value: "",
                site_name: "",
                contract_number: (parseInt(newContract.contract_number) + 1).toString(),
                start_date: "",
                finish_date: "",
                address: "",
                status: "Ne progres",
                closed_manually: false,
                closed_date: null,
                documents: []
              })}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200 shadow-lg"
            >
              🔄 Reset
            </button>
          </div>
        </form>
      </div>

      {/* LISTA E KONTRAVE */}
      <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 px-8 py-6 rounded-2xl shadow-lg border border-blue-100 animate-fade-in w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            📋 Lista e Kontratave
            <span className="text-lg text-gray-600">({filteredAndSortedContracts.length} kontrata)</span>
          </h3>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4"
              />
              Zgjidh të gjitha
            </label>
            {selectedContracts.length > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                >
                  Fshi të zgjedhurat ({selectedContracts.length})
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200"
                >
                  Eksporto Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  Eksporto PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Kërko kontrata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 shadow-sm"
            />
          </div>
          
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 shadow-sm"
            >
              <option value="all">Të gjitha statuset</option>
              <option value="Draft">Draft</option>
              <option value="Anulluar">Anulluar</option>
              <option value="Ne progres">Ne progres</option>
              <option value="Pezulluar">Pezulluar</option>
              <option value="Mbyllur">Mbyllur</option>
              <option value="Mbyllur me vonese">Mbyllur me vonese</option>
            </select>
          </div>
          
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 shadow-sm"
            >
              <option value="start_date-desc">Data e fillimit (më e reja)</option>
              <option value="start_date-asc">Data e fillimit (më e vjetra)</option>
              <option value="contract_value-desc">Vlera (më e larta)</option>
              <option value="contract_value-asc">Vlera (më e ulët)</option>
              <option value="company-asc">Kompania (A-Z)</option>
              <option value="company-desc">Kompania (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Shfaq {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, filteredAndSortedContracts.length)} nga {filteredAndSortedContracts.length} kontrata
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              ← Para
            </button>
            <span className="px-3 py-1 bg-blue-500 text-white rounded">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAndSortedContracts.length / 10), prev + 1))}
              disabled={currentPage >= Math.ceil(filteredAndSortedContracts.length / 10)}
              className="px-3 py-1 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              Pas →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-blue-100 via-white to-purple-100 text-blue-900 text-base font-bold">
              <tr>
                <th className="py-4 px-4 text-left">Zgjidh</th>
                <th className="py-4 px-4 text-left">Nr. Kontratës</th>
                <th className="py-4 px-4 text-left">Kompania</th>
                <th className="py-4 px-4 text-center">Vlera</th>
                <th className="py-4 px-4 text-center">Shpenzuar</th>
                <th className="py-4 px-4 text-center">Fitimi</th>
                <th className="py-4 px-4 text-center">Statusi</th>
                <th className="py-4 px-4 text-center">Progresi</th>
                <th className="py-4 px-4 text-center">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {paginatedContracts.map((c, index) => {
                const vlera = parseFloat(c.contract_value) || 0;
                const shpenzuar = workHoursData?.filter(wh => wh.contract_id === c.id)
                  .reduce((sum, wh) => sum + (parseFloat(wh.hours) * parseFloat(wh.hourly_rate)), 0) || 0;
                const fitimi = vlera - shpenzuar;
                const progres = calculateProgress(c.start_date, c.finish_date);
                const { profit, profitMargin } = calculateContractProfit(c);
                return (
                  <tr key={c.id || index} className="text-center hover:bg-purple-50 transition-all duration-200 transform hover:scale-[1.01]">
                    <td className="py-4 px-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedContracts.includes(c.id)}
                        onChange={() => handleSelectContract(c.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="py-4 px-4 align-middle font-bold text-blue-900">{c.contract_number}</td>
                    <td className="py-4 px-4 align-middle font-semibold text-blue-700 underline cursor-pointer hover:text-blue-900 transition"
    onClick={() => navigate(`/contracts/${c.id}`)}>
  {c.site_name}
</td>
                    <td className="py-4 px-4 align-middle font-bold text-blue-900">£{vlera.toFixed(2)}</td>
                    <td className="py-4 px-4 align-middle font-bold text-purple-700">£{shpenzuar.toFixed(2)}</td>
                    <td className={`py-4 px-4 align-middle font-bold ${getProfitColor(profit)}`}>
                      <div className="text-center">
                        <div className="text-lg">£{profit.toFixed(2)}</div>
                        <div className="text-xs opacity-75">{profitMargin.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <select
                        value={c.status}
                        onChange={e => handleStatusChange(c.id, e.target.value)}
                        className="px-3 py-1 rounded-full text-sm font-medium border border-blue-200 bg-white"
                      >
                        {CONTRACT_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, progres))}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">{progres.toFixed(0)}%</span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => navigate(`/contracts/${c.id}`)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors text-sm"
                        >
                          👁️ Shiko
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c.contract_number)}
                          className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 transition-colors text-sm"
                        >
                          🔄 Toggle
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
  );
}