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

  // Function to translate contract status
  const translateStatus = (status) => {
    const userLanguage = localStorage.getItem('language') || 'en';
    
    if (userLanguage === 'sq') {
      return status;
    }
    
    const statusMap = {
      'Ne progres': 'In Progress',
      'Draft': 'Draft',
      'Anulluar': 'Cancelled',
      'Pezulluar': 'Suspended',
      'Mbyllur': 'Closed',
      'Mbyllur me vonese': 'Closed with Delay'
    };
    
    return statusMap[status] || status;
  };

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

  // Përllogaritjet e orëve të punës
  const rows = [];
  let totalBruto = 0;
  let totalNeto = 0;

  if (workHours && typeof workHours === 'object' && Object.keys(workHours).length > 0 && contract) {
    Object.entries(workHours).forEach(([employeeId, weeks]) => {
      Object.entries(weeks).forEach(([weekLabel, days]) => {
        const filteredDays = Object.values(days).filter(
          (day) => day.contract_id && contract && String(day.contract_id) === String(contract.id)
        );
        const totalHours = filteredDays.reduce((sum, d) => sum + Number(d.hours || 0), 0);
        if (totalHours === 0) return;
        
        const emp = employees.find((e) => String(e.id) === String(employeeId));
        const rate = parseFloat(emp?.hourlyRate || emp?.hourly_rate || 0);
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
      });
    });
  }

  // Filtro shpenzimet
  const filteredExpenses = expensesInvoices.filter(expense => {
    const matchesSearch = expense.expense_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDateFilter = !dateFilter.start || !dateFilter.end || 
      (expense.date >= dateFilter.start && expense.date <= dateFilter.end);
    return matchesSearch && matchesDateFilter;
  });

  // Filtro orët e punës
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
          <h2 className="text-xl font-semibold text-gray-700">{t('paymentDetails.loadingDetails')}</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ {t('paymentDetails.error')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t('paymentDetails.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (contract === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ {t('paymentDetails.contractNotFound')}</h2>
          <p className="text-gray-600">{t('paymentDetails.contractNotFoundError')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-4 md:py-8 space-y-4 sm:space-y-6 lg:space-y-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      {/* HEADER SECTION */}
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
                  {t('paymentDetails.title')}
                </h1>
                <div className="text-base sm:text-lg font-semibold text-slate-600">
                  {t('paymentDetails.contractNumber')}{contract_number}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTRACT INFO SECTION */}
      {contract && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">📌</span>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Project</div>
                  <div className="font-semibold text-gray-900">{contract.site_name}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">🏢</span>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Company</div>
                  <div className="font-semibold text-gray-900">{contract.company}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">🗓</span>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Start Date</div>
                  <div className="font-semibold text-gray-900">{formatContractDate(contract.start_date)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">📅</span>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">End Date</div>
                  <div className="font-semibold text-gray-900">{formatContractDate(contract.finish_date)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                <span className="text-lg">💰</span>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Value</div>
                  <div className="font-bold text-emerald-600">£{parseFloat(contract.contract_value || 0).toLocaleString()}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-lg">📊</span>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    contract.status === 'Ne progres' ? 'bg-blue-100 text-blue-700' :
                    contract.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                    contract.status === 'Anulluar' ? 'bg-red-100 text-red-700' :
                    contract.status === 'Pezulluar' ? 'bg-yellow-100 text-yellow-700' :
                    contract.status === 'Mbyllur' ? 'bg-green-100 text-green-700' :
                    contract.status === 'Mbyllur me vonese' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {translateStatus(contract.status)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORK HOURS SECTION */}
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <h4 className="text-xl sm:text-2xl font-bold text-emerald-700 mb-6 flex items-center gap-2">
            👷‍♂️ {t('paymentDetails.workHoursAndPayments')}
          </h4>
          
          {filteredWorkHoursRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white shadow-lg rounded-xl overflow-hidden">
                <thead className="bg-gradient-to-r from-emerald-100 to-blue-100">
                  <tr>
                    <th className="py-3 px-2 text-left font-semibold text-emerald-800">{t('paymentDetails.employee')}</th>
                    <th className="py-3 px-2 text-center font-semibold text-emerald-800 hidden sm:table-cell">{t('paymentDetails.week')}</th>
                    <th className="py-3 px-2 text-center font-semibold text-emerald-800">{t('paymentDetails.hours')}</th>
                    <th className="py-3 px-2 text-center font-semibold text-emerald-800">{t('paymentDetails.grossAmount')}</th>
                    <th className="py-3 px-2 text-center font-semibold text-emerald-800">{t('paymentDetails.netAmount')}</th>
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
                    <td colSpan={2} className="py-4 px-2 text-right font-bold text-emerald-800 sm:hidden">{t('paymentDetails.totals')}:</td>
                    <td colSpan={3} className="py-4 px-2 text-right font-bold text-emerald-800 hidden sm:table-cell">{t('paymentDetails.totals')}:</td>
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
              <p className="text-slate-500 text-lg font-medium">{t('paymentDetails.noWorkHoursRecorded')}</p>
              <p className="text-slate-400 text-sm">për këtë kontratë akoma</p>
            </div>
          )}
        </div>
      </div>

      {/* EXPENSES SECTION */}
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <h4 className="text-xl sm:text-2xl font-bold text-blue-700 flex items-center gap-2">
            🧾 {t('paymentDetails.expensesAndInvoices')} 
            <span className="text-sm sm:text-base font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {filteredExpenses.length}
            </span>
          </h4>
          
          {filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-base text-blue-900">
                <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                  <tr>
                    <th className="py-3 px-3 text-left">{t('paymentDetails.type')}</th>
                    <th className="py-3 px-3 text-center">{t('paymentDetails.date')}</th>
                    <th className="py-3 px-3 text-center">{t('paymentDetails.gross')} (£)</th>
                    <th className="py-3 px-3 text-center">{t('paymentDetails.net')} (£)</th>
                    <th className="py-3 px-3 text-center">{t('paymentDetails.tax')} (£)</th>
                    <th className="py-3 px-3 text-center">{t('paymentDetails.status')}</th>
                    <th className="py-3 px-3 text-center">{t('paymentDetails.deleteAction')}</th>
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
                            title={t('paymentDetails.attachDocument')}
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
                        <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                          inv.paid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          {inv.paid ? t('paymentDetails.paid') : t('paymentDetails.unpaid')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm(t('paymentDetails.deleteExpenseConfirm'))) {
                              // Handle delete
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-all text-xl"
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
                    <td colSpan={2} className="py-2 px-3 text-right">{t('paymentDetails.totals')}:</td>
                    <td className="py-2 px-3 text-center text-blue-700">£{filteredExpenses.reduce((sum, inv) => sum + parseFloat(inv.gross || 0), 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center text-green-700">£{filteredExpenses.reduce((sum, inv) => sum + parseFloat(inv.net || 0), 0).toFixed(2)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 italic">
              {t('paymentDetails.noExpenseData')}
            </div>
          )}
        </div>
      </div>

      {/* CHART SECTION */}
      {chartData.length > 0 && (
        <div className="bg-white/80 p-6 rounded-2xl shadow-xl border border-blue-100 space-y-4 mt-10">
          <h4 className="text-xl font-bold text-blue-800 mb-2">📊 {t('paymentDetails.expensesTrend')}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`£${value}`, 'Shuma']} />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}