// src/pages/Contracts.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApi } from "../utils/useApi";
import { useDebounce } from "../utils/useDebounce";
import api from "../api";
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import NotificationService from '../utils/notifications';
import { StatusBadge } from "../components/ui/Badge";
import { useTranslation } from "react-i18next";

// Contract statuses - will be translated in the component
const CONTRACT_STATUSES = [
  "draft",
  "cancelled", 
  "inProgress",
  "suspended",
  "closed",
  "closedWithDelay"
];

export default function Contracts() {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterContractType, setFilterContractType] = useState("all");
  const [sortBy, setSortBy] = useState("contract_number");
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
    company_email: "", // Company email field
    contract_type: "day_work", // Added contract_type field
    status: "inProgress",
    closed_manually: false,
    closed_date: null,
    documents: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    toggleStatus: {},
    delete: {},
    bulkDelete: false,
    export: false,
    statusChange: {}
  });
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null
  });

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

  // Use optimized API hook for expenses
  const { data: expensesData } = useApi("/api/expenses", {
    cacheKey: "expenses",
    enableCache: true
  });

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
      errors.company = t('contracts.validation.companyRequired');
    }
    
    if (!newContract.contract_value || isNaN(newContract.contract_value) || parseFloat(newContract.contract_value) <= 0) {
      errors.contract_value = t('contracts.validation.valuePositive');
    }
    
    if (!newContract.site_name.trim()) {
      errors.site_name = t('contracts.validation.locationRequired');
    }
    
    if (!newContract.start_date) {
      errors.start_date = t('contracts.validation.startDateRequired');
    }
    
    if (!newContract.finish_date) {
      errors.finish_date = t('contracts.validation.endDateRequired');
    }
    
    if (newContract.start_date && newContract.finish_date) {
      const startDate = new Date(newContract.start_date);
      const finishDate = new Date(newContract.finish_date);
      if (startDate >= finishDate) {
        errors.finish_date = t('contracts.validation.endDateAfterStart');
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

  // Confirmation dialog functions
  const showConfirmDialog = useCallback((title, message, onConfirm, onCancel = null) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm: () => {
        setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        onConfirm();
      },
      onCancel: () => {
        setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        if (onCancel) onCancel();
      }
    });
  }, []);

  const hideConfirmDialog = useCallback(() => {
    setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
  }, []);

  // Modal functions
  const openAddModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
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
      showToastMessage(t('contracts.messages.fillAllRequiredFields'), "error");
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
      company_email: newContract.company_email, // Add company_email to payload
      contract_type: newContract.contract_type, // Add contract_type to payload
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
        company_email: "", // Reset company_email
        contract_type: "day_work", // Reset contract_type to default
        status: "inProgress",
        closed_manually: false,
        closed_date: null,
        documents: []
      });
      
      showToastMessage(t('contracts.messages.contractAddedSuccess'));
      toast.success(t('contracts.messages.contractCreatedSuccess'));
      
      // Clear cache to refresh data
      refetchContracts();
      closeAddModal();
    } catch (err) {
      console.error("Error creating contract:", err);
      showToastMessage(err.response?.data?.error || t('contracts.messages.contractAddError'), "error");
      toast.error(t('contracts.messages.contractAddError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [newContract, validateForm, showToastMessage, refetchContracts]);

  // Optimized status toggle
  const handleToggleStatus = useCallback(async (contract_number) => {
    const contractIndex = contracts.findIndex(c => c.contract_number === contract_number);
    if (contractIndex === -1) return;

    // Set loading state
    setLoadingStates(prev => ({ ...prev, toggleStatus: { ...prev.toggleStatus, [contract_number]: true } }));

    const updated = [...contracts];
    const contract = { ...updated[contractIndex] };
    const today = new Date();
    const finishDate = new Date(contract.finish_date);

    contract.closed_manually = !contract.closed_manually;
    contract.closed_date = today.toISOString();

    if (contract.closed_manually) {
      contract.status = today > finishDate ? 'closedWithDelay' : 'closed';
    } else {
      contract.status = "inProgress";
      contract.closed_date = null;
    }

    try {
      const res = await api.put(`/api/contracts/${contract.id}`, contract);
      updated[contractIndex] = res.data;
      setContracts(updated);
      showToastMessage(t('contracts.messages.statusChangedSuccess'));
    } catch (err) {
      console.error("Error updating contract status:", err);
      showToastMessage(t('contracts.messages.statusChangeError'), "error");
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({ ...prev, toggleStatus: { ...prev.toggleStatus, [contract_number]: false } }));
    }
  }, [contracts, showToastMessage]);

  // Optimized delete with confirmation
  const handleDelete = useCallback(async (contract_number) => {
    const contract = contracts.find(c => c.contract_number === contract_number);
    if (!contract) {
      showToastMessage(t('contracts.messages.contractNotFound'), "error");
      return;
    }
    
    showConfirmDialog(
      t('contracts.actions.delete'),
      `${t('contracts.messages.deleteContractConfirm')} "${contract.company}" (${contract.site_name})? ${t('contracts.messages.actionCannotBeUndone')}`,
      async () => {
        // Set loading state
        setLoadingStates(prev => ({ ...prev, delete: { ...prev.delete, [contract_number]: true } }));
        
        try {
          await api.delete(`/api/contracts/${contract.id}`);
          setContracts(prev => prev.filter((c) => c.contract_number !== contract_number));
          showToastMessage(t('contracts.messages.contractDeleteSuccess'));
        } catch (err) {
          console.error("Error deleting contract:", err);
          showToastMessage(t('contracts.messages.contractDeleteError'), "error");
        } finally {
          // Clear loading state
          setLoadingStates(prev => ({ ...prev, delete: { ...prev.delete, [contract_number]: false } }));
        }
      }
    );
  }, [contracts, showToastMessage, showConfirmDialog]);

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
    
    // Llogarit shpenzimet nga orët e punës
    const workHoursSpent = (Array.isArray(workHoursData) && workHoursData.length > 0)
      ? workHoursData.filter(wh => wh.contract_id === contract.id && wh.hours && wh.hourly_rate)
          .reduce((sum, wh) => sum + (parseFloat(wh.hours) * parseFloat(wh.hourly_rate)), 0)
      : 0;
    
    // Llogarit shpenzimet nga expenses/faturat
    const expensesSpent = (Array.isArray(expensesData) && expensesData.length > 0)
      ? expensesData.filter(exp => exp.contract_number === contract.contract_number)
          .reduce((sum, exp) => sum + (parseFloat(exp.gross) || 0), 0)
      : 0;
    
    // Totali i shpenzimeve
    const totalExpenses = workHoursSpent + expensesSpent;
    
    const profit = contractValue - totalExpenses;
    const profitMargin = contractValue > 0 ? (profit / contractValue) * 100 : 0;
    
    return {
      contractValue,
      totalExpenses,
      profit,
      profitMargin,
      workHoursSpent,
      expensesSpent,
      expensesCount: expensesData?.filter(exp => exp.contract_number === contract.contract_number).length || 0
    };
  }, [workHoursData, expensesData]);

  const getProfitColor = (profit) => {
    if (profit > 0) return 'text-green-700';
    if (profit < 0) return 'text-red-700';
    return 'text-gray-700';
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

  // Apply contract type filter
  if (filterContractType !== "all") {
    filtered = filtered.filter(c => c.contract_type === filterContractType);
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
              toast.error(t('contracts.selectContractsForDeletion'));
      return;
    }
    
    const selectedContractNames = contracts
      .filter(c => selectedContracts.includes(c.id))
      .map(c => `${c.company} (${c.site_name})`)
      .join(', ');
    
    showConfirmDialog(
      t('contracts.actions.delete'),
      `${t('contracts.messages.bulkDeleteConfirm')}\n\n${selectedContractNames}\n\n${t('contracts.messages.actionCannotBeUndone')}`,
      async () => {
        // Set loading state
        setLoadingStates(prev => ({ ...prev, bulkDelete: true }));
        
        try {
          await Promise.all(selectedContracts.map(id => api.delete(`/api/contracts/${id}`)));
          toast.success(t('contracts.messages.bulkDeleteSuccess'));
          setSelectedContracts([]);
          setSelectAll(false);
          // Refresh data
          refetchContracts();
        } catch (err) {
          toast.error(t('contracts.messages.contractDeleteError'));
        } finally {
          // Clear loading state
          setLoadingStates(prev => ({ ...prev, bulkDelete: false }));
        }
      }
    );
  };

  // Export functions
  const exportToExcel = (data, filename = t('contracts.contracts').toLowerCase()) => {
    const ws = XLSX.utils.json_to_sheet(data.map(contract => {
      // Llogarit shpenzimet për këtë kontratë
      const workHoursSpent = (Array.isArray(workHoursData) && workHoursData.length > 0)
        ? workHoursData.filter(wh => wh.contract_id === contract.id && wh.hours && wh.hourly_rate)
            .reduce((sum, wh) => sum + (parseFloat(wh.hours) * parseFloat(wh.hourly_rate)), 0)
        : 0;
      
      const expensesSpent = (Array.isArray(expensesData) && expensesData.length > 0)
        ? expensesData.filter(exp => exp.contract_number === contract.contract_number)
            .reduce((sum, exp) => sum + (parseFloat(exp.gross) || 0), 0)
        : 0;
      
      const totalSpent = workHoursSpent + expensesSpent;
      const profit = Number(contract.contract_value || 0) - totalSpent;
      
      return {
        'ID': contract.id,
        [t('contracts.company')]: contract.company,
        [t('contracts.exportHeaders.location')]: contract.site_name,
        [t('contracts.exportHeaders.value')]: contract.contract_value,
        [t('contracts.exportHeaders.startDate')]: contract.start_date,
        [t('contracts.exportHeaders.endDate')]: contract.finish_date,
        [t('contracts.statusHeader')]: contract.status,
        [t('contracts.detailedAddress')]: contract.address,
        [t('contracts.exportHeaders.spent')]: totalSpent.toFixed(2),
        [t('contracts.exportHeaders.profit')]: profit.toFixed(2)
      };
    }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('contracts.contractsList'));
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = (data, filename = t('contracts.contracts').toLowerCase()) => {
    // Simple PDF export using html2pdf
    const element = document.createElement('div');
    element.innerHTML = `
      <h2>{t('contracts.contractsList')}</h2>
      <table border="1" style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>ID</th>
            <th>{t('contracts.company')}</th>
            <th>{t('contracts.locationHeader')}</th>
            <th>{t('contracts.value')} (£)</th>
            <th>{t('contracts.startDate')}</th>
            <th>{t('contracts.endDate')}</th>
            <th>{t('contracts.statusHeader')}</th>
            <th>{t('contracts.detailedAddress')}</th>
            <th>{t('contracts.spent')} (£)</th>
            <th>{t('contracts.profit')} (£)</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(contract => {
            // Llogarit shpenzimet për këtë kontratë
            const workHoursSpent = (Array.isArray(workHoursData) && workHoursData.length > 0)
              ? workHoursData.filter(wh => wh.contract_id === contract.id && wh.hours && wh.hourly_rate)
                  .reduce((sum, wh) => sum + (parseFloat(wh.hours) * parseFloat(wh.hourly_rate)), 0)
              : 0;
            
            const expensesSpent = (Array.isArray(expensesData) && expensesData.length > 0)
              ? expensesData.filter(exp => exp.contract_number === contract.contract_number)
                  .reduce((sum, exp) => sum + (parseFloat(exp.gross) || 0), 0)
              : 0;
            
            const totalSpent = workHoursSpent + expensesSpent;
            const profit = Number(contract.contract_value || 0) - totalSpent;
            
            return `
              <tr>
                <td>${contract.id}</td>
                <td>${contract.company}</td>
                <td>${contract.site_name}</td>
                <td>${contract.contract_value}</td>
                <td>${formatDate(contract.start_date)}</td>
                <td>${formatDate(contract.finish_date)}</td>
                <td>${contract.status}</td>
                <td>${contract.address}</td>
                <td>${totalSpent.toFixed(2)}</td>
                <td>${profit.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    
    // Use html2pdf to generate PDF
    try {
      const opt = {
        margin: 1,
        filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
      };
      
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('contracts.messages.exportError'));
    }
  };

  const handleExport = (type) => {
    const dataToExport = selectedContracts.length > 0 
      ? contracts.filter(c => selectedContracts.includes(c.id))
      : filteredAndSortedContracts;
      
    if (dataToExport.length === 0) {
      toast.error(t('contracts.messages.noContractsFound'));
      return;
    }
    
    // Set loading state
    setLoadingStates(prev => ({ ...prev, export: true }));
    
    try {
      if (type === 'excel') {
        exportToExcel(dataToExport);
        toast.success(t('contracts.messages.exportSuccess'));
      } else if (type === 'pdf') {
        exportToPDF(dataToExport);
        toast.success(t('contracts.messages.exportSuccess'));
      }
    } catch (err) {
      toast.error(t('contracts.messages.exportError'));
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({ ...prev, export: false }));
    }
  };

  // Function to map old status values to new translation keys
  const getStatusTranslationKey = (status) => {
    const statusMap = {
      // New status keys
      'draft': 'draft',
      'cancelled': 'cancelled',
      'inProgress': 'inProgress',
      'suspended': 'suspended',
      'closed': 'closed',
      'closedWithDelay': 'closedWithDelay',
      // Legacy status mappings
      'Draft': 'draft',
      'Anulluar': 'cancelled',
      'Ne progres': 'inProgress',
      'Pezulluar': 'suspended',
      'Mbyllur': 'closed',
      'Mbyllur me vonese': 'closedWithDelay',
      'Mbyllur me vonesë': 'closedWithDelay',
      'Aktive': 'inProgress',
      'Active': 'inProgress',
      'Closed': 'closed',
      'Closed Late': 'closedWithDelay'
    };
    return statusMap[status] || 'draft';
  };

  // Function to get status display text
  const getStatusDisplayText = (status) => {
    const translationKey = getStatusTranslationKey(status);
    return t(`contracts.statuses.${translationKey}`);
  };

  // Function to get status color and icon
  const getStatusStyle = (status) => {
    const translationKey = getStatusTranslationKey(status);
    const statusConfig = {
      'draft': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: '📝' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: '❌' },
      'inProgress': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: '🔄' },
      'suspended': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: '⏸️' },
      'closed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: '✅' },
      'closedWithDelay': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: '⚠️' }
    };
    return statusConfig[translationKey] || statusConfig['draft'];
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'inProgress': 'bg-blue-100 text-blue-800',
      'suspended': 'bg-yellow-100 text-yellow-800',
      'closed': 'bg-green-100 text-green-800',
      'closedWithDelay': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Llogarit statusin bazuar në datat
  const calculateStatus = (contract) => {
    const today = new Date();
    const startDate = new Date(contract.start_date);
    const finishDate = new Date(contract.finish_date);
    
    if (contract.closed_manually) {
      return contract.closed_date ? 'closed' : 'closedWithDelay';
    }
    
    if (today < startDate) {
      return "draft";
    } else if (today >= startDate && today <= finishDate) {
      return "inProgress";
    } else if (today > finishDate) {
      return 'closedWithDelay';
    }
    
    return "inProgress"; // default
  };

  // Përditëso handleStatusChange për të përfshirë notifikimet
  const handleStatusChange = async (contractId, newStatus) => {
    // Set loading state
    setLoadingStates(prev => ({ ...prev, statusChange: { ...prev.statusChange, [contractId]: true } }));
    
    try {
      const response = await api.put(`/api/contracts/${contractId}`, { status: newStatus });
      
      // Send notification
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        await NotificationService.notifyContractStatusChange(contract, newStatus, contract.id);
        
        // Special notification for completion
        if (newStatus === "closed") {
          await NotificationService.notifyContractCompletion(contract, contract.id);
        }
      }
      
              toast.success(t('contracts.messages.statusChangedSuccess'));
      refetchContracts();
    } catch (err) {
      console.error('❌ Error updating status:', err);
              toast.error(t('contracts.messages.statusChangeError'));
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({ ...prev, statusChange: { ...prev.statusChange, [contractId]: false } }));
    }
  };

  // Funksion i ri për të llogaritur shpenzimet totale për një kontratë, si në PaymentDetails
  const calculateTotalSpent = (contract) => {
    // 1. Llogarit bruto nga orët e punës (si në PaymentDetails)
    let totalBruto = 0;
    if (workHoursData && Array.isArray(workHoursData)) {
      workHoursData.forEach(wh => {
        if (String(wh.contract_id).trim() === String(contract.id).trim()) {
          const rate = parseFloat(wh.rate || wh.hourly_rate || 0);
          const hours = parseFloat(wh.hours || 0);
          if (!isNaN(hours) && !isNaN(rate)) {
            totalBruto += hours * rate;
          }
        }
      });
    }
    // 2. Llogarit gross nga faturat/expenses (si në PaymentDetails)
    let totalInvoicesGross = 0;
    if (expensesData && Array.isArray(expensesData)) {
      // Filtro fillimisht me contract_id (si në PaymentDetails)
      let contractExpenses = expensesData.filter(exp => String(exp.contract_id).trim() === String(contract.id).trim());
      // Nëse nuk gjenden, provo edhe me contract_number (për kompatibilitet)
      if (contractExpenses.length === 0) {
        contractExpenses = expensesData.filter(exp => String(exp.contract_number).trim() === String(contract.contract_number).trim());
      }
      // Debug log
      if (contractExpenses.length > 0) {
        console.log(`[DEBUG] Expenses për kontratën ${contract.contract_number} (id: ${contract.id}):`, contractExpenses);
      }
      contractExpenses.forEach(exp => {
        const gross = parseFloat(exp.gross || 0);
        if (!isNaN(gross)) {
          totalInvoicesGross += gross;
        }
      });
    }
    return totalBruto + totalInvoicesGross;
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
          <h2 className="text-xl font-semibold text-gray-700">{t('contracts.messages.loadingContracts')}</h2>
        </div>
      </div>
    );
  }

  if (contractsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ {t('contracts.messages.errorLoadingContracts')}</h2>
          <button 
            onClick={refetchContracts}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            🔄 {t('contracts.messages.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 lg:space-y-12" style={{ maxWidth: '100%', minWidth: '100%', width: '100%' }}>
      {/* Toast Notification */}
      {showToast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          showToast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-gray-600 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('contracts.cancel')}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('contracts.actions.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER MODERN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-gradient-to-r from-blue-50 to-purple-100 rounded-xl sm:rounded-2xl shadow-lg px-4 sm:px-6 lg:px-8 py-4 sm:py-4 mb-6 sm:mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-2 sm:p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-8 h-8 sm:w-10 sm:h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">{t('contracts.title')}</h2>
          <div className="text-sm sm:text-base lg:text-lg font-medium text-purple-700">{t('contracts.subtitle')}</div>
        </div>
      </div>

      {/* Add Contract Button */}
      <div className="flex justify-center sm:justify-end mb-6">
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 sm:px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span className="text-lg sm:text-xl">➕</span> 
          <span className="text-sm sm:text-base">{t('contracts.addNewContract')}</span>
        </button>
      </div>

      {/* CONTRACTS LIST */}
      <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 animate-fade-in w-full" style={{ maxWidth: '100%', minWidth: '100%' }}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-blue-900 flex items-center gap-2">
            📋 {t('contracts.contractsList')}
            <span className="text-sm sm:text-lg text-gray-600">({filteredAndSortedContracts.length} {t('contracts.contracts')})</span>
          </h3>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4"
              />
              {t('contracts.selectAll')}
            </label>
            {selectedContracts.length > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  disabled={loadingStates.bulkDelete}
                  className="w-full sm:w-auto bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {loadingStates.bulkDelete ? (
                    <>
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('contracts.actions.deleting')}
                    </>
                  ) : (
                    <>
                      🗑️ {t('contracts.actions.delete')} ({selectedContracts.length})
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  disabled={loadingStates.export}
                  className="w-full sm:w-auto bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {loadingStates.export ? (
                    <>
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('contracts.actions.exporting')}
                    </>
                  ) : (
                    `📊 ${t('contracts.actions.export')} Excel`
                  )}
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={loadingStates.export}
                  className="w-full sm:w-auto bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {loadingStates.export ? (
                    <>
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('contracts.actions.exporting')}
                    </>
                  ) : (
                    `📄 ${t('contracts.actions.export')} PDF`
                  )}
                </button>
              </>
            )}
          </div>
        </div>

                {/* Search and Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder={t('contracts.searchContracts')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 sm:p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 shadow-sm text-sm sm:text-base"
            />
          </div>
          
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 sm:p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 shadow-sm text-sm sm:text-base"
            >
              <option value="all">{t('contracts.filters.allStatuses')}</option>
              <option value="draft">{t('contracts.statuses.draft')}</option>
              <option value="cancelled">{t('contracts.statuses.cancelled')}</option>
              <option value="inProgress">{t('contracts.statuses.inProgress')}</option>
              <option value="suspended">{t('contracts.statuses.suspended')}</option>
              <option value="closed">{t('contracts.statuses.closed')}</option>
              <option value="closedWithDelay">{t('contracts.statuses.closedWithDelay')}</option>
            </select>
          </div>

          <div>
            <select
              value={filterContractType}
              onChange={(e) => setFilterContractType(e.target.value)}
              className="w-full p-2 sm:p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 shadow-sm text-sm sm:text-base"
            >
              <option value="all">{t('contracts.filters.allTypes')}</option>
              <option value="day_work">{t('contracts.contractTypes.dayWork')}</option>
              <option value="price_work">{t('contracts.contractTypes.priceWork')}</option>
            </select>
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="w-full p-2 sm:p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 shadow-sm text-sm sm:text-base"
            >
              <option value="start_date-desc">{t('contracts.startDateNewest')}</option>
                <option value="start_date-asc">{t('contracts.startDateOldest')}</option>
                <option value="contract_value-desc">{t('contracts.valueHighest')}</option>
                <option value="contract_value-asc">{t('contracts.valueLowest')}</option>
                <option value="company-asc">{t('contracts.companyAZ')}</option>
                <option value="company-desc">{t('contracts.companyZA')}</option>
            </select>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            {t('contracts.showing')} {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, filteredAndSortedContracts.length)} {t('contracts.of')} {filteredAndSortedContracts.length} {t('contracts.contracts')}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 text-sm"
            >
              ← {t('contracts.previous')}
            </button>
            <span className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded text-sm">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAndSortedContracts.length / 10), prev + 1))}
              disabled={currentPage >= Math.ceil(filteredAndSortedContracts.length / 10)}
              className="px-2 sm:px-3 py-1 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 text-sm"
            >
              {t('contracts.next')} →
            </button>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto rounded-lg shadow-lg w-full" style={{ maxWidth: '100%', minWidth: '100%' }}>
          <div className="min-w-full bg-white">
            {/* Desktop Table */}
            <table className="hidden lg:table min-w-full">
              <thead className="bg-gradient-to-r from-blue-100 via-white to-purple-100 text-blue-900 text-sm sm:text-base font-bold">
                <tr>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.select')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.contractNumberHeader')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.type')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.locationHeader')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.company')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.value')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.spent')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.profit')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.statusHeader')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.progressHeader')}</th>
                  <th className="py-3 sm:py-4 px-2 sm:px-4 text-center">{t('contracts.actionsHeader')}</th>
                </tr>
              </thead>
            <tbody>
              {paginatedContracts.map((c, index) => {
                const vlera = parseFloat(c.contract_value) || 0;
                const shpenzuar = calculateTotalSpent(c);
                const fitimi = vlera - shpenzuar;
                const profitMargin = vlera > 0 ? (fitimi / vlera) * 100 : 0;
                const progres = calculateProgress(c.start_date, c.finish_date);
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
                    <td className="py-4 px-4 align-middle font-bold text-blue-900">
                      <Link to={`/admin/contracts/${c.contract_number}`} className="underline hover:text-purple-700 transition-colors">{c.contract_number}</Link>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          (c.contract_type || 'day_work') === 'price_work' 
                            ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {(c.contract_type || 'day_work') === 'price_work' ? `🏗️ ${t('contracts.contractTypes.priceWork')}` : `👷 ${t('contracts.contractTypes.dayWork')}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle font-semibold text-blue-700 underline cursor-pointer hover:text-blue-900 transition">
                      <Link to={`/admin/contracts/${c.contract_number}`}>{c.site_name}</Link>
                    </td>
                    <td className="py-4 px-4 align-middle font-semibold text-gray-800">{c.company}</td>
                    <td className="py-4 px-4 align-middle font-bold text-blue-900">£{vlera.toFixed(2)}</td>
                    <td className="py-4 px-4 align-middle font-bold text-purple-700">£{shpenzuar.toFixed(2)}</td>
                    <td className={`py-4 px-4 align-middle font-bold ${getProfitColor(fitimi)}`}> 
                      <div className="text-center">
                        <div className="text-lg">£{fitimi.toFixed(2)}</div>
                        <div className="text-xs opacity-75">{profitMargin.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-2 justify-center">
                        {(() => {
                          const statusStyle = getStatusStyle(c.status);
                          return (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                              <span className="mr-1">{statusStyle.icon}</span>
                              {getStatusDisplayText(c.status)}
                            </span>
                          );
                        })()}
                        <select
                          value={c.status}
                          onChange={e => handleStatusChange(c.id, e.target.value)}
                          disabled={loadingStates.statusChange[c.id]}
                          className="px-3 py-1 rounded-full text-sm font-medium border border-blue-200 bg-white disabled:opacity-50"
                        >
                          {CONTRACT_STATUSES.map(status => (
                            <option key={status} value={status}>{t(`contracts.statuses.${status}`)}</option>
                          ))}
                        </select>
                        {loadingStates.statusChange[c.id] && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
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
                          onClick={() => navigate(`/admin/contracts/${c.contract_number}`)}
                          className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all text-xl"
                          title="Shiko"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c.contract_number)}
                          disabled={loadingStates.toggleStatus[c.contract_number]}
                          className="text-purple-600 hover:text-purple-800 hover:scale-110 transition-all text-xl disabled:opacity-50 flex items-center gap-1"
                          title="Toggle"
                        >
                          {loadingStates.toggleStatus[c.contract_number] ? (
                            <>
                              <div className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            </>
                          ) : (
                            '🔄'
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(c.contract_number)}
                          disabled={loadingStates.delete[c.contract_number]}
                          className="text-red-600 hover:text-red-800 hover:scale-110 transition-all text-xl disabled:opacity-50 flex items-center gap-1"
                          title="Fshi"
                        >
                          {loadingStates.delete[c.contract_number] ? (
                            <>
                              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            </>
                          ) : (
                            '🗑️'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedContracts.map((c, index) => {
              const vlera = parseFloat(c.contract_value) || 0;
              const shpenzuar = calculateTotalSpent(c);
              const fitimi = vlera - shpenzuar;
              const profitMargin = vlera > 0 ? (fitimi / vlera) * 100 : 0;
              const progres = calculateProgress(c.start_date, c.finish_date);
              
              return (
                <div key={c.id || index} className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedContracts.includes(c.id)}
                        onChange={() => handleSelectContract(c.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <Link to={`/admin/contracts/${c.contract_number}`} className="text-lg font-bold text-blue-900 hover:text-purple-700 transition-colors">
                          #{c.contract_number}
                        </Link>
                        <span className="text-sm text-gray-600">{c.company}</span>
                      </div>
                    </div>
                    {(() => {
                      const statusStyle = getStatusStyle(c.status);
                      return (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          <span className="mr-1">{statusStyle.icon}</span>
                          {getStatusDisplayText(c.status)}
                        </span>
                      );
                    })()}
                  </div>
                  
                  {/* Contract Type */}
                  <div className="flex items-center justify-center">
                                         <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                       (c.contract_type || 'day_work') === 'price_work' 
                         ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                         : 'bg-blue-100 text-blue-700 border border-blue-200'
                     }`}>
                       {(c.contract_type || 'day_work') === 'price_work' ? `🏗️ ${t('contracts.contractTypes.priceWork')}` : `👷 ${t('contracts.contractTypes.dayWork')}`}
                     </span>
                  </div>
                  
                  {/* Location */}
                  <div className="text-center">
                    <Link to={`/admin/contracts/${c.contract_number}`} className="text-blue-700 hover:text-blue-900 transition-colors font-medium">
                      📍 {c.site_name}
                    </Link>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-xs text-gray-600">{t('contracts.value')}</div>
                      <div className="font-bold text-blue-900">£{vlera.toFixed(2)}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2">
                      <div className="text-xs text-gray-600">{t('contracts.spent')}</div>
                      <div className="font-bold text-purple-700">£{shpenzuar.toFixed(2)}</div>
                    </div>
                    <div className={`rounded-lg p-2 ${getProfitColor(fitimi).replace('text-', 'bg-').replace('bg-', 'bg-')}`}>
                      <div className="text-xs text-gray-600">{t('contracts.profit')}</div>
                      <div className={`font-bold ${getProfitColor(fitimi)}`}>£{fitimi.toFixed(2)}</div>
                      <div className="text-xs opacity-75">{profitMargin.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div className="text-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, progres))}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">{progres.toFixed(0)}% {t('contracts.progressHeader')}</span>
                  </div>
                  
                  {/* Status Change */}
                  <div className="flex items-center justify-center gap-2">
                    <select
                      value={c.status}
                      onChange={e => handleStatusChange(c.id, e.target.value)}
                      disabled={loadingStates.statusChange[c.id]}
                      className="px-3 py-1 rounded-full text-sm font-medium border border-blue-200 bg-white disabled:opacity-50"
                    >
                      {CONTRACT_STATUSES.map(status => (
                        <option key={status} value={status}>{t(`contracts.statuses.${status}`)}</option>
                      ))}
                    </select>
                    {loadingStates.statusChange[c.id] && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => navigate(`/admin/contracts/${c.contract_number}`)}
                      className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all text-xl p-2"
                      title={t('contracts.actions.view')}
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleToggleStatus(c.contract_number)}
                      disabled={loadingStates.toggleStatus[c.contract_number]}
                      className="text-purple-600 hover:text-purple-800 hover:scale-110 transition-all text-xl disabled:opacity-50 flex items-center gap-1 p-2"
                      title="Toggle"
                    >
                      {loadingStates.toggleStatus[c.contract_number] ? (
                        <div className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        '🔄'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(c.contract_number)}
                      disabled={loadingStates.delete[c.contract_number]}
                      className="text-red-600 hover:text-red-800 hover:scale-110 transition-all text-xl disabled:opacity-50 flex items-center gap-1 p-2"
                      title={t('contracts.actions.delete')}
                    >
                      {loadingStates.delete[c.contract_number] ? (
                        <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        '🗑️'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal për shtimin e kontratës */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-2 sm:p-4 pt-4 sm:pt-8"
          onClick={closeAddModal}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight flex items-center gap-2">
                  <span className="text-xl sm:text-3xl">➕</span> 
                  <span className="hidden sm:inline">{t('contracts.addNewContract')}</span>
                  <span className="sm:hidden">{t('contracts.addNewContract')}</span>
                </h3>
                <button
                  onClick={closeAddModal}
                  className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold p-1"
                >
                  ✕
                </button>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Contract Number and Type Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.contractNumber')}</label>
                      <div className="flex items-center p-3 bg-blue-100 rounded-lg border-2 border-blue-300">
                        <span className="text-2xl mr-2">📋</span>
                        <span className="text-xl font-bold text-blue-800">#{newContract.contract_number}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.contractType')}</label>
                      <select 
                        name="contract_type" 
                        value={newContract.contract_type} 
                        onChange={handleChange} 
                        className="w-full p-3 border-2 border-purple-200 rounded-lg text-base focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all shadow-sm bg-white"
                      >
                        <option value="day_work">👷 {t('contracts.contractTypes.dayWork')}</option>
                        <option value="price_work">🏗️ {t('contracts.contractTypes.priceWork')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Company Information Section */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">🏢</span> {t('contracts.companyData')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.companyName')} *</label>
                      <input 
                        name="company" 
                                                  placeholder={t('contracts.companyName')} 
                        value={newContract.company} 
                        onChange={handleChange} 
                        className={`w-full p-3 border-2 rounded-lg text-base focus:ring-2 transition-all shadow-sm ${
                          formErrors.company ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'
                        }`}
                      />
                      {formErrors.company && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><span>⚠️</span>{formErrors.company}</p>}
                    </div>
                    
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.companyEmail')}</label>
                      <input 
                        name="company_email" 
                                                  placeholder={t('contracts.companyEmail')} 
                        value={newContract.company_email} 
                        onChange={handleChange} 
                        type="email"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Information Section */}
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">🏗️</span> {t('contracts.projectData')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.location')} *</label>
                      <input 
                        name="site_name" 
                                                  placeholder={t('contracts.location')} 
                        value={newContract.site_name} 
                        onChange={handleChange} 
                        className={`w-full p-3 border-2 rounded-lg text-base focus:ring-2 transition-all shadow-sm ${
                          formErrors.site_name ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-green-200 focus:border-green-400'
                        }`}
                      />
                      {formErrors.site_name && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><span>⚠️</span>{formErrors.site_name}</p>}
                    </div>
                    
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.detailedAddress')}</label>
                      <input 
                        name="address" 
                                                  placeholder={t('contracts.detailedAddress')} 
                        value={newContract.address} 
                        onChange={handleChange} 
                        className="w-full p-3 border-2 border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all shadow-sm"
                      />
                    </div>
                    
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.contractValue')} *</label>
                      <input 
                        name="contract_value" 
                                                  placeholder={t('contracts.contractValue')} 
                        value={newContract.contract_value} 
                        onChange={handleChange} 
                        type="number"
                        min="0"
                        step="0.01"
                        className={`w-full p-3 border-2 rounded-lg text-base focus:ring-2 transition-all shadow-sm ${
                          formErrors.contract_value ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-green-200 focus:border-green-400'
                        }`}
                      />
                      {formErrors.contract_value && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><span>⚠️</span>{formErrors.contract_value}</p>}
                    </div>
                    
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.contractStatus')}</label>
                      <select 
                        name="status" 
                        value={newContract.status} 
                        onChange={handleChange} 
                        className="w-full p-3 border-2 border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all shadow-sm bg-white"
                      >
                        <option value="draft">📝 {t('contracts.statuses.draft')}</option>
                        <option value="cancelled">❌ {t('contracts.statuses.cancelled')}</option>
                        <option value="inProgress">🟡 {t('contracts.statuses.inProgress')}</option>
                        <option value="suspended">⏸️ {t('contracts.statuses.suspended')}</option>
                        <option value="closed">✅ {t('contracts.statuses.closed')}</option>
                        <option value="closedWithDelay">⏰ {t('contracts.statuses.closedWithDelay')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-xl">📅</span> {t('contracts.projectDuration')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.startDate')} *</label>
                      <input 
                        type="date" 
                        name="start_date" 
                        value={newContract.start_date} 
                        onChange={handleChange} 
                        className={`w-full p-3 border-2 rounded-lg text-base focus:ring-2 transition-all shadow-sm ${
                          formErrors.start_date ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-orange-200 focus:border-orange-400'
                        }`}
                      />
                      {formErrors.start_date && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><span>⚠️</span>{formErrors.start_date}</p>}
                    </div>
                    
                    <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('contracts.endDate')} *</label>
                      <input 
                        type="date" 
                        name="finish_date" 
                        value={newContract.finish_date} 
                        onChange={handleChange} 
                        className={`w-full p-3 border-2 rounded-lg text-base focus:ring-2 transition-all shadow-sm ${
                          formErrors.finish_date ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-orange-200 focus:border-orange-400'
                        }`}
                      />
                      {formErrors.finish_date && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><span>⚠️</span>{formErrors.finish_date}</p>}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">{t('contracts.actions.adding')}</span>
                        <span className="sm:hidden">{t('contracts.actions.adding')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">💾</span> 
                        <span className="hidden sm:inline">{t('contracts.addContract')}</span>
                        <span className="sm:hidden">{t('contracts.actions.add')}</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 justify-center"
                  >
                    <span className="text-xl">✕</span> 
                                            <span className="hidden sm:inline">{t('contracts.cancel')}</span>
                        <span className="sm:hidden">{t('contracts.actions.close')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}