import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";

// Funksion për formatimin e datës
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('sq-AL', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};

// Funksion për formatimin e datës së kontratës
const formatContractDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('sq-AL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export default function PaymentDetails() {
  const { t } = useTranslation();
  const { contract_number } = useParams();
  const [contract, setContract] = useState(null);
  const [expensesInvoices, setExpensesInvoices] = useState([]);
  const [workHours, setWorkHours] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  // Filtra të rinj për orët e punës
  const [workHoursSearchTerm, setWorkHoursSearchTerm] = useState("");
  const [workHoursDateFilter, setWorkHoursDateFilter] = useState({ start: "", end: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpenseInvoice, setNewExpenseInvoice] = useState({
    companyName: "",
    expense_type: "",
    date: new Date().toISOString().split("T")[0],
    net: "",
    gross: "",
    tax: "",
    paid: false,
    file: null,
  });
  const token = localStorage.getItem("token");

  // Merr të dhënat nga backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [contractRes, workHoursRes, employeesRes, expensesRes] = await Promise.all([
          axios.get(`https://capitalrise-cwcq.onrender.com/api/contracts/contract-number/${contract_number}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`https://capitalrise-cwcq.onrender.com/api/work-hours/structured`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://capitalrise-cwcq.onrender.com/api/employees", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`https://capitalrise-cwcq.onrender.com/api/expenses/${contract_number}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        console.log('[DEBUG] Contract data:', contractRes.data);
        console.log('[DEBUG] Work hours data:', workHoursRes.data);
        console.log('[DEBUG] Employees data:', employeesRes.data);
        console.log('[DEBUG] Expenses response:', expensesRes.data);
        
        setContract(contractRes.data);
        setWorkHours(workHoursRes.data || {});
        setEmployees(employeesRes.data || []);
        setExpensesInvoices(expensesRes.data || []);
        setNewExpenseInvoice((prev) => ({ ...prev, companyName: contractRes.data.company || "" }));
        
      } catch (error) {
        console.error("Error fetching payment details:", error);
        setError(t('paymentDetails.loadingError'));
        setContract(null);
        setWorkHours({});
        setEmployees([]);
        setExpensesInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [contract_number, token]);

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

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === "gross") {
      const gross = parseFloat(value) || 0;
      const net = (gross * 0.8).toFixed(2);
      const tax = (gross - net).toFixed(2);
      setNewExpenseInvoice((prev) => ({ ...prev, gross: value, net, tax }));
    } else if (type === "checkbox") {
      setNewExpenseInvoice((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setNewExpenseInvoice((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setNewExpenseInvoice((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Shto shpenzim të ri në backend
  const handleAddExpenseInvoice = async (e) => {
    e.preventDefault();

    // Validimi i formës
    if (!newExpenseInvoice.expense_type.trim()) {
      alert("Ju lutem plotësoni llojin e shpenzimit!");
      return;
    }

    if (!newExpenseInvoice.gross || parseFloat(newExpenseInvoice.gross) <= 0) {
              alert(t('paymentDetails.fillGrossAmount'));
      return;
    }

    let fileContent = "";
    let receiptPath = null;
    
    if (newExpenseInvoice.file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        fileContent = reader.result;
        // Ruaj si receipt_path në vend të file
        receiptPath = fileContent;
        await saveExpense(receiptPath);
      };
      reader.readAsDataURL(newExpenseInvoice.file);
    } else {
      await saveExpense(null);
    }

    async function saveExpense(receiptPath) {
      const expenseInvoice = {
        ...newExpenseInvoice,
        contract_number,
        fileName: newExpenseInvoice.file?.name || "",
        receipt_path: receiptPath, // Ruaj në receipt_path
        file: null, // Mos ruaj në file
      };
      try {
        await axios.post(
          `https://capitalrise-cwcq.onrender.com/api/expenses/${contract_number}`,
          expenseInvoice,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Rifresko të gjithë expenses-et pas shtimit
        const expensesRes = await axios.get(
          `https://capitalrise-cwcq.onrender.com/api/expenses/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Expenses pas shtimit:', expensesRes.data);
        setExpensesInvoices(expensesRes.data || []);
        
        // Reset forma dhe mbyll modalit
        resetForm();
        setShowAddModal(false);
        
        alert("Shpenzimi u shtua me sukses!");
      } catch (error) {
        console.error('Error adding expense:', error);
        alert("Gabim gjatë shtimit të shpenzimit: " + (error.response?.data?.error || error.message));
      }
    }
  };

  const resetForm = () => {
    setNewExpenseInvoice({
      companyName: contract?.company || "",
      expense_type: "",
      date: new Date().toISOString().split("T")[0],
      net: "",
      gross: "",
      tax: "",
      paid: false,
      file: null,
    });
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  // Fshi shpenzim nga backend
  const handleDelete = async (id) => {
          if (!confirm(t('paymentDetails.deleteExpenseConfirm'))) {
      return;
    }

    try {
      await axios.delete(
        `https://capitalrise-cwcq.onrender.com/api/expenses/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko faturat pas fshirjes
      const res = await axios.get(
        `https://capitalrise-cwcq.onrender.com/api/expenses/${contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Faturat pas fshirjes:', res.data);
      setExpensesInvoices(Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []));
              alert(t('paymentDetails.expenseDeletedSuccess'));
    } catch (error) {
      console.error('Error deleting expense:', error);
              alert(t('paymentDetails.deleteError') + " " + (error.response?.data?.error || error.message));
    }
  };

  // Ndrysho statusin e pagesës në backend
  const togglePaid = async (id) => {
    try {
      await axios.put(
        `https://capitalrise-cwcq.onrender.com/api/expenses/${id}/toggle-paid`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko faturat pas ndryshimit të statusit
      const res = await axios.get(
        `https://capitalrise-cwcq.onrender.com/api/expenses/${contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Faturat pas ndryshimit të statusit:', res.data);
      setExpensesInvoices(Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []));
              alert(t('paymentDetails.paymentStatusChangedSuccess'));
    } catch (error) {
      console.error('Error toggling payment status:', error);
              alert(t('paymentDetails.statusChangeError') + " " + (error.response?.data?.error || error.message));
    }
  };

  // Përllogaritjet e orëve të punës - RREGULLUAR
  const rows = [];
  let totalBruto = 0;
  let totalNeto = 0;

  console.log('[DEBUG PaymentDetails] workHours data:', workHours);
  console.log('[DEBUG PaymentDetails] contract data:', contract);
  console.log('[DEBUG PaymentDetails] employees data:', employees);

  if (workHours && typeof workHours === 'object' && Object.keys(workHours).length > 0 && contract) {
    Object.entries(workHours).forEach(([employeeId, weeks]) => {
      console.log(`[DEBUG PaymentDetails] Processing employee ${employeeId}, weeks:`, weeks);
      Object.entries(weeks).forEach(([weekLabel, days]) => {
        console.log(`[DEBUG PaymentDetails] Processing week ${weekLabel}, days:`, days);
        // RREGULLIMI: Filtro vetëm për këtë kontratë me krahasim të saktë
        const filteredDays = Object.values(days).filter(
          (day) => {
            console.log(`[DEBUG PaymentDetails] Day data:`, day);
            console.log(`[DEBUG PaymentDetails] Contract ID check: day.contract_id=${day.contract_id}, contract.id=${contract?.id}`);
            // RREGULLIMI: Krahasimi i saktë duke konvertuar në string
            return day.contract_id && contract && String(day.contract_id) === String(contract.id);
          }
        );
        console.log(`[DEBUG PaymentDetails] Filtered days for contract ${contract?.id}:`, filteredDays);
        const totalHours = filteredDays.reduce((sum, d) => sum + Number(d.hours || 0), 0);
        console.log(`[DEBUG PaymentDetails] Total hours for ${employeeId} in ${weekLabel}: ${totalHours}`);
        if (totalHours === 0) return;
        
        // RREGULLIMI: Employee matching i saktë
        const emp = employees.find((e) => String(e.id) === String(employeeId));
        console.log(`[DEBUG PaymentDetails] Employee found:`, emp);
        const rate = parseFloat(emp?.hourlyRate || emp?.hourly_rate || 0);
        console.log(`[DEBUG PaymentDetails] Employee rate: ${rate}`);
        const bruto = totalHours * rate;
        const neto = bruto * (emp?.labelType === "NI" ? 0.7 : 0.8);
        totalBruto += bruto;
        totalNeto += neto;
        rows.push({
          name: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${employeeId}`,
          week: weekLabel,
          hours: totalHours,
          bruto,
          neto,
        });
        console.log(`[DEBUG PaymentDetails] Added row:`, { name: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${employeeId}`, week: weekLabel, hours: totalHours, bruto, neto });
      });
    });
  }

  console.log('[DEBUG PaymentDetails] Final rows:', rows);
  console.log('[DEBUG PaymentDetails] Total bruto:', totalBruto, 'Total neto:', totalNeto);
  console.log('[DEBUG PaymentDetails] expensesInvoices before render:', expensesInvoices);
  console.log('[DEBUG PaymentDetails] expensesInvoices length:', expensesInvoices.length);
  console.log('[DEBUG PaymentDetails] expensesInvoices array:', expensesInvoices);

  // RREGULLIMI: Validimi i expenses për të shmangur NaN
  const totalInvoicesGross = expensesInvoices.reduce((sum, inv) => {
    const gross = parseFloat(inv.gross || 0);
    return sum + (isNaN(gross) ? 0 : gross);
  }, 0);
  
  const totalInvoicesNet = expensesInvoices.reduce((sum, inv) => {
    const net = parseFloat(inv.net || 0);
    return sum + (isNaN(net) ? 0 : net);
  }, 0);
  
  const totalOverallGross = totalBruto + totalInvoicesGross;
  const totalOverallNet = totalNeto + totalInvoicesNet;

  // Llogaritja e parave të mbetura
  const contractValue = parseFloat(contract?.contract_value || 0);
  const remainingAmount = contractValue - totalOverallGross;

  // Filtro shpenzimet sipas kërkimit dhe datës
  const filteredExpenses = expensesInvoices.filter(expense => {
    const matchesSearch = expense.expense_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDateFilter = !dateFilter.start || !dateFilter.end || 
      (expense.date >= dateFilter.start && expense.date <= dateFilter.end);
    return matchesSearch && matchesDateFilter;
  });

  // Filtro orët e punës sipas kërkimit dhe datës
  const filteredWorkHoursRows = rows.filter(row => {
    const matchesSearch = row.name.toLowerCase().includes(workHoursSearchTerm.toLowerCase()) ||
                         row.week.toLowerCase().includes(workHoursSearchTerm.toLowerCase());
    const matchesDateFilter = !workHoursDateFilter.start || !workHoursDateFilter.end || 
      (new Date(row.week) >= new Date(workHoursDateFilter.start) && new Date(row.week) <= new Date(workHoursDateFilter.end));
    return matchesSearch && matchesDateFilter;
  });

  // Përgatit të dhënat për grafikun
  const chartData = filteredExpenses.map(expense => ({
    date: formatDate(expense.date),
    amount: parseFloat(expense.gross || 0),
    type: expense.expense_type
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar detajet e pagesës...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Gabim</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Provoni përsëri
          </button>
        </div>
      </div>
    );
  }

  if (contract === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Kontrata nuk u gjet</h2>
          <p className="text-gray-600">Kontrata nuk ekziston ose ka ndodhur një gabim!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* HEADER SECTION - MOBILE RESPONSIVE */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl p-3 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6 sm:w-8 sm:h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H4.5m2.25 0v3m0 0v.375c0 .621-.504 1.125-1.125 1.125H4.5m2.25 0a9 9 0 013.75-6.75m0 0h3.75m0 0v3.75m0 0a9 9 0 013.75-6.75" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-blue-700 tracking-tight mb-1">
                    Detajet e Pagesës
                  </h1>
                  <div className="text-base sm:text-lg font-semibold text-slate-600">
                    Kontrata #{contract_number}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTRACT INFO SECTION - MOBILE RESPONSIVE */}
        {contract && (
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">📌 Projekti</span>
                    <span className="text-lg sm:text-xl font-bold text-slate-800">{contract.site_name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">🏢 Kompania</span>
                    <span className="text-base sm:text-lg font-semibold text-slate-800">{contract.company}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">🗓 Fillimi</span>
                    <span className="text-base sm:text-lg font-semibold text-slate-800">{formatContractDate(contract.start_date)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">💰 Vlera</span>
                    <span className="text-base sm:text-lg font-bold text-emerald-600">£{parseFloat(contract.contract_value || 0).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-start lg:items-end justify-start lg:justify-center">
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">📊 Statusi</span>
                  <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold border ${
                    contract.status === 'Ne progres' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    contract.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                    contract.status === 'Anulluar' ? 'bg-red-100 text-red-700 border-red-200' :
                    contract.status === 'Pezulluar' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    contract.status === 'Mbyllur' ? 'bg-green-100 text-green-700 border-green-200' :
                    contract.status === 'Mbyllur me vonese' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                    'bg-gray-200 text-gray-700 border-gray-300'
                  }`}>
                    {contract.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PËR SHTIMIN E SHPENZIMEVE - ELEGANT DESIGN */}
        {showAddModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeAddModal}
          >
            <div 
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL HEADER */}
              <div className="bg-gradient-to-r from-emerald-400 to-blue-400 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      <span className="text-2xl">💰</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Shto Shpenzim/Faturë të Ri
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
                <form className="space-y-6" onSubmit={handleAddExpenseInvoice}>
                  {/* BASIC INFO SECTION */}
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200">
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                      📝 Informacionet Bazë
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Lloji i Shpenzimit</label>
                        <input 
                          name="expense_type" 
                          placeholder="p.sh. Material, Transport, Shërbime" 
                          value={newExpenseInvoice.expense_type} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" 
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Data</label>
                        <input 
                          type="date" 
                          name="date" 
                          value={newExpenseInvoice.date} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" 
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* AMOUNTS SECTION */}
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200">
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                      💰 Shumat Financiare
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Shuma Bruto (£)</label>
                        <input 
                          name="gross" 
                          placeholder="0.00" 
                          value={newExpenseInvoice.gross} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" 
                          type="number"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Shuma Neto (£)</label>
                        <input 
                          name="net" 
                          placeholder="Llogaritet automatikisht" 
                          value={newExpenseInvoice.net} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg bg-slate-100 text-base font-semibold text-slate-700" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">TVSH (£)</label>
                        <input 
                          name="tax" 
                          placeholder="Llogaritet automatikisht" 
                          value={newExpenseInvoice.tax} 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg bg-slate-100 text-base font-semibold text-slate-700" 
                          readOnly 
                        />
                      </div>
                    </div>
                  </div>

                  {/* FILE & STATUS SECTION */}
                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200">
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-4 block">
                      📎 Dokumenti & Statusi
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Bashkëngjit Dokument</label>
                        <input 
                          type="file" 
                          name="file" 
                          accept="application/pdf,image/*" 
                          onChange={handleChange} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg text-base file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 transition-all duration-200" 
                        />
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-slate-200">
                        <input 
                          type="checkbox" 
                          name="paid" 
                          checked={newExpenseInvoice.paid} 
                          onChange={handleChange} 
                          className="w-5 h-5 accent-emerald-500" 
                        />
                        <label className="text-base font-medium text-slate-700">Paguar</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-500 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-bold text-base shadow-lg transition-all flex items-center gap-2 justify-center hover:shadow-xl hover:scale-105"
                    >
                      <span className="text-xl">💾</span>
                      <span className="hidden sm:inline">Shto Shpenzim</span>
                      <span className="sm:hidden">Shto</span>
                    </button>
                    <button 
                      type="button"
                      onClick={closeAddModal}
                      className="flex-1 bg-slate-400 hover:bg-slate-500 text-white px-6 py-3 rounded-xl font-bold text-base shadow-lg transition-all flex items-center gap-2 justify-center hover:shadow-xl hover:scale-105"
                    >
                      <span className="text-xl">✕</span>
                      <span className="hidden sm:inline">Anulo</span>
                      <span className="sm:hidden">Mbyll</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* GRID LAYOUT - PARALEL NË WEB, VERTIKAL NË MOBILE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* ORËT E PUNËS SECTION - MOBILE RESPONSIVE */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-8">
            <h4 className="text-xl sm:text-2xl font-bold text-emerald-700 mb-6 flex items-center gap-2">
              👷‍♂️ Orët e Punës & Pagesat
            </h4>
            
            {/* Filtra për orët e punës - MOBILE RESPONSIVE */}
            <div className="bg-emerald-50/50 rounded-xl p-4 mb-6 border border-emerald-200">
              <h5 className="text-base sm:text-lg font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                🔍 Filtra për Orët e Punës
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Kërko punonjës ose javë..."
                  value={workHoursSearchTerm}
                  onChange={(e) => setWorkHoursSearchTerm(e.target.value)}
                  className="p-3 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                />
                <input
                  type="date"
                  placeholder="Data fillimit"
                  value={workHoursDateFilter.start}
                  onChange={(e) => setWorkHoursDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="p-3 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                />
                <input
                  type="date"
                  placeholder="Data fundit"
                  value={workHoursDateFilter.end}
                  onChange={(e) => setWorkHoursDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="p-3 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
            </div>

            {filteredWorkHoursRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm bg-white shadow-lg rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-emerald-100 to-blue-100">
                    <tr>
                      <th className="py-3 px-2 text-left font-semibold text-emerald-800">Punonjësi</th>
                      <th className="py-3 px-2 text-center font-semibold text-emerald-800 hidden sm:table-cell">Java</th>
                      <th className="py-3 px-2 text-center font-semibold text-emerald-800">Orë</th>
                      <th className="py-3 px-2 text-center font-semibold text-emerald-800">Bruto (£)</th>
                      <th className="py-3 px-2 text-center font-semibold text-emerald-800">Neto (£)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkHoursRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50 transition-all border-b border-slate-100">
                        <td className="py-3 px-2 font-semibold text-slate-800">
                          <div className="flex flex-col">
                            <span>{r.name}</span>
                            <span className="text-xs text-slate-500 sm:hidden">{r.week}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-600 hidden sm:table-cell">{r.week}</td>
                        <td className="py-3 px-2 text-center font-bold text-blue-600">{r.hours}</td>
                        <td className="py-3 px-2 text-center font-bold text-orange-600">£{r.bruto.toFixed(2)}</td>
                        <td className="py-3 px-2 text-center font-bold text-emerald-600">£{r.neto.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-100">
                    <tr>
                      <td colSpan={2} className="py-4 px-2 text-right font-bold text-emerald-800 sm:hidden">Totalet:</td>
                      <td colSpan={3} className="py-4 px-2 text-right font-bold text-emerald-800 hidden sm:table-cell">Totalet:</td>
                      <td className="py-4 px-2 text-center font-bold text-orange-700 text-base">
                        £{filteredWorkHoursRows.reduce((sum, r) => sum + r.bruto, 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-2 text-center font-bold text-emerald-700 text-base">
                        £{filteredWorkHoursRows.reduce((sum, r) => sum + r.neto, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-slate-400 text-4xl mb-4">👷‍♂️</div>
                <p className="text-slate-500 text-lg font-medium">Nuk ka orë pune të regjistruara</p>
                <p className="text-slate-400 text-sm">për këtë kontratë akoma</p>
              </div>
            )}
            </div>
          </div>

          {/* SHPENZIMET/FATURAT SECTION - MOBILE RESPONSIVE */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h4 className="text-xl sm:text-2xl font-bold text-blue-700 flex items-center gap-2">
                🧾 Shpenzime & Fatura 
                <span className="text-sm sm:text-base font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {filteredExpenses.length}
                </span>
              </h4>
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 justify-center text-sm sm:text-base hover:shadow-xl hover:scale-105"
              >
                <span className="text-lg sm:text-xl">➕</span>
                <span className="hidden sm:inline">Shto Shpenzim/Faturë</span>
                <span className="sm:hidden">Shto Shpenzim</span>
              </button>
            </div>
            
            {/* Filtra për shpenzimet - MOBILE RESPONSIVE */}
            <div className="bg-blue-50/50 rounded-xl p-4 mb-6 border border-blue-200">
              <h5 className="text-base sm:text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
                🔍 Filtra për Shpenzimet
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Kërko në shpenzime..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
                <input
                  type="date"
                  placeholder="Data fillimit"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="p-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
                <input
                  type="date"
                  placeholder="Data fundit"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="p-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            {filteredExpenses.length > 0 ? (
              <table className="w-full text-base text-blue-900">
                <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                  <tr>
                    <th className="py-3 px-3 text-left">Lloji</th>
                    <th className="py-3 px-3 text-center">Data</th>
                    <th className="py-3 px-3 text-center">Bruto (£)</th>
                    <th className="py-3 px-3 text-center">Neto (£)</th>
                    <th className="py-3 px-3 text-center">TVSH (£)</th>
                    <th className="py-3 px-3 text-center">Statusi</th>
                    <th className="py-3 px-3 text-center">Fshi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((inv) => (
                    <tr key={inv.id} className="hover:bg-purple-50 transition-all">
                      <td className="py-2 px-3 font-semibold">
                        {(inv.receipt_path || inv.file) ? (
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = inv.receipt_path || inv.file;
                              link.download = `${inv.expense_type}_${inv.date}.pdf`;
                              link.click();
                            }}
                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
                            title="Klikoni për të shkarkuar dokumentin"
                          >
                            {inv.expense_type}
                          </button>
                        ) : (
                          <span className="text-gray-600">{inv.expense_type}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">{formatDate(inv.date)}</td>
                      <td className="py-2 px-3 text-center font-bold text-blue-700">£{Number(inv.gross || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-bold text-green-700">£{Number(inv.net || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-bold text-purple-700">£{Number(inv.tax || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => togglePaid(inv.id)}
                          className={`px-3 py-1 rounded-full font-bold shadow border text-sm transition-all duration-200
                            ${inv.paid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}
                          `}
                        >
                          {inv.paid ? 'Paguar' : 'Jo i paguar'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-red-600 hover:text-red-800 hover:scale-110 transition-all text-xl"
                          title="Fshi"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-purple-50 font-bold">
                    <td colSpan={2} className="py-2 px-3 text-right">Totali:</td>
                    <td className="py-2 px-3 text-center text-blue-700">£{filteredExpenses.reduce((sum, inv) => sum + parseFloat(inv.gross || 0), 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center text-green-700">£{filteredExpenses.reduce((sum, inv) => sum + parseFloat(inv.net || 0), 0).toFixed(2)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500 italic">
                Nuk ka expenses për këtë kontratë
              </div>
            )}
            
            {/* Note për shkarkimin */}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 text-center">
                💡 <strong>Shënim:</strong> Klikoni në llojin e shpenzimit për të shkarkuar dokumentin e bashkëngjitur
              </p>
            </div>
          </div>
        </div>
        
        </div> {/* Mbyll grid-in paralel */}

        {/* TOTALI I PËRGJITHSHËM - MOBILE RESPONSIVE */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-lg sm:text-xl font-bold text-slate-800">💼 Totali i Përgjithshëm</div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">Bruto:</span>
                <span className="text-lg sm:text-xl font-bold text-orange-600">£{totalOverallGross.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">Neto:</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-600">£{totalOverallNet.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>



        {/* PARA TË MBETURA - MOBILE RESPONSIVE */}
        <div className="bg-gradient-to-r from-emerald-100 to-blue-100 rounded-2xl sm:rounded-3xl shadow-xl border border-emerald-200 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-lg sm:text-xl font-bold text-emerald-800 flex items-center gap-2">
              💰 Para të Mbetura
            </div>
            <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${remainingAmount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              £{remainingAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Grafikë i trendit të shpenzimeve - FARE NË FUND */}
        <div className="bg-white/80 p-6 rounded-2xl shadow-xl border border-blue-100 space-y-4 mt-10">
          <h4 className="text-xl font-bold text-blue-800 mb-2">📊 Trendi i Shpenzimeve</h4>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`£${value}`, 'Shuma']} />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500 italic">
              Nuk ka të dhëna për grafikun
            </div>
          )}
        </div>
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