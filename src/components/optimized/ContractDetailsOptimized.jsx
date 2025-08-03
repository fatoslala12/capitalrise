import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { loadPdfLibraries, loadChartLibraries } from "../../utils/lazyImports";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Lazy load heavy components
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));

// Loading component for charts
const ChartLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function ContractDetailsOptimized() {
  const { contract_number } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: "", shifts: "", rate: "", amount: 0 }],
    other: 0,
    paid: false,
    date: new Date().toISOString().split("T")[0],
    description: "",
    invoice_number: "",
    shifts: "",
    rate: "",
    total: 0,
    total_net: 0,
    vat: 0,
    created_by: "",
    status: "Draft",
    notes: "",
    actions: []
  });
  
  // Search and filter states
  const [workHoursSearch, setWorkHoursSearch] = useState("");
  const [workHoursFilter, setWorkHoursFilter] = useState("all");
  const [invoicesSearch, setInvoicesSearch] = useState("");
  const [invoicesFilter, setInvoicesFilter] = useState("all");
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    documentUpload: false,
    documentDelete: false,
    addComment: false,
    saveInvoice: false,
    deleteInvoice: {},
    togglePaid: {},
    exportPDF: false,
    sendEmail: {},
    sendContractEmail: false
  });
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  
  const token = localStorage.getItem("token");

  // Load heavy libraries on component mount
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        await Promise.all([
          loadPdfLibraries(),
          loadChartLibraries()
        ]);
        setLibrariesLoaded(true);
      } catch (error) {
        console.error('Failed to load libraries:', error);
      }
    };
    
    loadLibraries();
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

  // Fetch data with optimized loading
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch data in parallel for better performance
      const [contractRes, invoicesRes, workHoursRes, employeesRes] = await Promise.all([
        axios.get(`/api/contracts/${contract_number}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/contracts/${contract_number}/invoices`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/contracts/${contract_number}/work-hours`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/employees', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setContract(contractRes.data);
      setInvoices(invoicesRes.data);
      setWorkHours(workHoursRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [contract_number, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimized PDF export with lazy loading
  const exportToPDF = useCallback(async () => {
    if (!librariesLoaded) {
      console.log('Libraries not loaded yet');
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, exportPDF: true }));
      
      const [{ default: html2pdf }] = await Promise.all([
        import('html2pdf.js')
      ]);

      const element = document.getElementById('contract-details');
      const opt = {
        margin: 1,
        filename: `contract-${contract_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, exportPDF: false }));
    }
  }, [contract_number, librariesLoaded]);

  // Render chart with lazy loading
  const renderChart = () => {
    if (!librariesLoaded) {
      return <ChartLoading />;
    }

    const chartData = getProgressChartData();
    
    return (
      <Suspense fallback={<ChartLoading />}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </Suspense>
    );
  };

  const getProgressChartData = () => {
    // Chart data logic here
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6" id="contract-details">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Contract Details: {contract?.contract_number}
        </h1>
      </div>

      {/* Chart Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Progress Chart</h2>
        {renderChart()}
      </div>

      {/* Export Button */}
      <button
        onClick={exportToPDF}
        disabled={loadingStates.exportPDF || !librariesLoaded}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loadingStates.exportPDF ? 'Exporting...' : 'Export PDF'}
      </button>
    </div>
  );
}