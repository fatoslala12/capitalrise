// src/pages/AdminDashboard.jsx
import { useEffect, useState, Component } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Legend
} from "recharts";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid, Stack } from "../components/ui/Layout";
import { CountStatCard, MoneyStatCard } from "../components/ui/StatCard";
import { StatusBadge, PaymentBadge } from "../components/ui/Badge";
import EmptyState, { NoTasksEmpty } from "../components/ui/EmptyState";

// Global Error Boundary Component
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CRITICAL ERROR] Global error boundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Try to report the error
    try {
      if (window.reportError) {
        window.reportError(error);
      }
    } catch (reportError) {
      console.error('[ERROR] Failed to report error:', reportError);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-500 py-8">
          <h3 className="text-xl font-bold mb-4">Gabim kritik në aplikacion</h3>
          <p className="mb-4">U kap një gabim i papritur: {this.state.error?.message || 'Unknown error'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Rifresko Faqen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Chart Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR] Chart component error:', error, errorInfo);
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-center text-red-500 py-8">
          <h4>Gabim në ngarkimin e grafikut</h4>
          <p className="text-sm">{this.state.error?.message || 'Unknown chart error'}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global color palette for charts
const CHART_COLORS = ["#a5b4fc", "#fbcfe8", "#fef08a", "#bbf7d0", "#bae6fd", "#fca5a5", "#fdba74", "#ddd6fe"];

// Stronger colors for status charts (better readability)
const STATUS_CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

// Main AdminDashboard Component
export default function AdminDashboard() {
  console.debug('[DEBUG] AdminDashboard: Component starting to render');
  
  // Wrap the entire component in error boundary
  return (
    <GlobalErrorBoundary>
      <AdminDashboardContent />
    </GlobalErrorBoundary>
  );
}

function AdminDashboardContent() {
  console.debug('[DEBUG] AdminDashboardContent: Component starting to render');
  try {
    // Translation function with fallback (renamed to avoid shadowing)
    const tr = (key, fallback = key) => {
      console.debug('[DEBUG] tr() called with:', key, fallback);
      try {
        const translations = {
          'adminDashboard.title': 'Admin Dashboard',
          'adminDashboard.subtitle': 'Menaxhimi i sistemit',
          'adminDashboard.paid': 'E paguar',
          'adminDashboard.unpaid': 'E papaguar',
          'adminDashboard.noPayments': 'Nuk ka pagesa të regjistruara për këtë javë',
          'adminDashboard.expensesBySiteTitle': 'Shpenzimet (expenses_invoice.gross) + Orët e Punës (work_hours.hours × rate) sipas Site-ve',
          'adminDashboard.tasksTitle': 'Detyrat',
          'adminDashboard.filter': 'Filtro',
          'adminDashboard.onlyActive': 'Vetëm aktive',
          'adminDashboard.onlyCompleted': 'Vetëm të përfunduara',
          'adminDashboard.all': 'Të gjitha',
          'adminDashboard.total': 'Total',
          'adminDashboard.completed': 'Përfunduar',
          'adminDashboard.ongoing': 'Në progres',
          'adminDashboard.deadline': 'Afati',
          'adminDashboard.by': 'Nga',
          'adminDashboard.hoursBySiteThisWeek': 'Orët sipas site-ve këtë javë',
          'adminDashboard.totalHoursWorked': 'Totali i orëve të punuara',
          'adminDashboard.noWorkHours': 'Nuk ka orë të punuara',
          'adminDashboard.contractsProgressTitle': 'Progresi i kontratave',
          'adminDashboard.noActiveContracts': 'Nuk ka kontrata aktive',
          'adminDashboard.topPaidEmployees': 'Top 5 punonjësit më të paguar',
          'adminDashboard.loadingStats': 'Duke ngarkuar...',
          'adminDashboard.loading': 'Duke ngarkuar...',
          'adminDashboard.noInvoiceData': 'Nuk ka të dhëna',
          'adminDashboard.noExpenseData': 'Nuk ka të dhëna',
          'adminDashboard.calcExplanation': 'Shpjegimi i llogaritjes',
          'adminDashboard.calcExpenses': 'Llogaritja e shpenzimeve',
          'adminDashboard.calcWorkHours': 'Llogaritja e orëve',
          'adminDashboard.calcTotal': 'Totali i përgjithshëm',
          'adminDashboard.totalAmount': 'Shuma totale',
          'adminDashboard.expenses': 'Shpenzimet',
          'adminDashboard.workHours': 'Orët e punuara',
          'adminDashboard.active': 'Aktiv',
          'adminDashboard.suspended': 'I pezulluar',
          'adminDashboard.completed': 'I përfunduar',
          'adminDashboard.cancelled': 'I anulluar',
          'adminDashboard.pending': 'Në pritje',
          'adminDashboard.inProgress': 'Në progres',
          'adminDashboard.closedWithDelay': 'I mbyllur me vonesë',
          'adminDashboard.closed': 'I mbyllur',
          'adminDashboard.noContractData': 'Nuk ka të dhëna të kontratave',
          'adminDashboard.allInvoicesPaid': 'Të gjitha faturat janë paguar',
          'adminDashboard.contract': 'Kontrata',
          'adminDashboard.invoiceNumber': 'Numri i faturës',
          'adminDashboard.site': 'Site',
          'adminDashboard.unpaidExpensesTitle': 'Shpenzimet e papaguara',
          'adminDashboard.allExpensesPaid': 'Të gjitha shpenzimet janë paguar',
          'workHours.hours': 'Hours',
          'common.progress': 'Progress',
          'common.total': 'Total',
          'payments.expenses': 'Shpenzimet',
          
          // English translations
          'adminDashboard.title.en': 'Admin Dashboard',
          'adminDashboard.subtitle.en': 'System Management',
          'adminDashboard.paid.en': 'Paid',
          'adminDashboard.unpaid.en': 'Unpaid',
          'adminDashboard.noPayments.en': 'No payments recorded for this week',
          'adminDashboard.expensesBySiteTitle.en': 'Expenses (expenses_invoice.gross) + Work Hours (work_hours.hours × rate) by Site',
          'adminDashboard.tasksTitle.en': 'Tasks',
          'adminDashboard.filter.en': 'Filter',
          'adminDashboard.onlyActive.en': 'Active only',
          'adminDashboard.onlyCompleted.en': 'Completed only',
          'adminDashboard.all.en': 'All',
          'adminDashboard.total.en': 'Total',
          'adminDashboard.completed.en': 'Completed',
          'adminDashboard.ongoing.en': 'In Progress',
          'adminDashboard.deadline.en': 'Deadline',
          'adminDashboard.by.en': 'By',
          'adminDashboard.hoursBySiteThisWeek.en': 'Hours by sites this week',
          'adminDashboard.totalHoursWorked.en': 'Total hours worked',
          'adminDashboard.noWorkHours.en': 'No work hours',
          'adminDashboard.contractsProgressTitle.en': 'Contracts Progress',
          'adminDashboard.noActiveContracts.en': 'No active contracts',
          'adminDashboard.topPaidEmployees.en': 'Top 5 highest paid employees',
          'adminDashboard.loadingStats.en': 'Loading...',
          'adminDashboard.loading.en': 'Loading...',
          'adminDashboard.noInvoiceData.en': 'No data',
          'adminDashboard.noExpenseData.en': 'No data',
          'adminDashboard.calcExplanation.en': 'Calculation explanation',
          'adminDashboard.calcExpenses.en': 'Expenses calculation',
          'adminDashboard.calcWorkHours.en': 'Work hours calculation',
          'adminDashboard.calcTotal.en': 'Total calculation',
          'adminDashboard.totalAmount.en': 'Total amount',
          'adminDashboard.expenses.en': 'Expenses',
          'adminDashboard.workHours.en': 'Work Hours',
          'adminDashboard.active.en': 'Active',
          'adminDashboard.suspended.en': 'Suspended',
          'adminDashboard.completed.en': 'Completed',
          'adminDashboard.cancelled.en': 'Cancelled',
          'adminDashboard.pending.en': 'Pending',
          'adminDashboard.inProgress.en': 'In Progress',
          'adminDashboard.closedWithDelay.en': 'Closed with Delay',
          'adminDashboard.closed.en': 'Closed',
          'adminDashboard.noContractData.en': 'No contract data',
        };
        
        const userLanguage = localStorage.getItem('language') || 'sq';
        const langKey = userLanguage === 'en' ? `${key}.en` : key;
        
        return translations[langKey] || translations[key] || fallback || key;
      } catch (err) {
        console.error('[ERROR] tr() function error:', err);
        return fallback || key;
      }
    };

    // State variables
    console.debug('[DEBUG] AdminDashboardContent: Setting up state variables');
    const [dashboardStats, setDashboardStats] = useState({
      totalHoursThisWeek: 0,
      totalPaid: 0
    });
    const [activeSites, setActiveSites] = useState([]);
    const [activeEmployees, setActiveEmployees] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [taskFilter, setTaskFilter] = useState('ongoing');
    const [allExpenses, setAllExpenses] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [structuredWorkHours, setStructuredWorkHours] = useState({});
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtered tasks
    const filteredTasks = allTasks.filter(t => {
      if (!t || typeof t !== 'object') return false;
      if (taskFilter === 'all') return true;
      return t.status === taskFilter;
    });

    // Fetch data effect
    console.debug('[DEBUG] AdminDashboard: Setting up useEffect for data fetching');
    useEffect(() => {
      async function fetchData() {
        console.debug('[DEBUG] fetchData: Starting to fetch data');
        try {
          setLoading(true);
          setError(null);

          // Fetch all data in parallel
          console.debug('[DEBUG] fetchData: Making API calls');
          const [
            sitesResponse,
            employeesResponse,
            tasksResponse,
            expensesResponse,
            contractsResponse,
            workHoursResponse,
            paymentsResponse
          ] = await Promise.all([
            api.get('/sites'),
            api.get('/employees'),
            api.get('/tasks'),
            api.get('/expenses'),
            api.get('/contracts'),
            api.get('/work-hours'),
            api.get('/payments')
          ]);
          console.debug('[DEBUG] fetchData: API calls completed');

          // Process sites
          const sites = sitesResponse.data || [];
          setActiveSites(sites.filter(site => site.status === 'active'));

          // Process employees
          const employees = employeesResponse.data || [];
          setActiveEmployees(employees.filter(emp => emp.status === 'active'));

          // Process tasks
          setAllTasks(tasksResponse.data || []);

          // Process expenses
          setAllExpenses(expensesResponse.data || []);

          // Process contracts
          setContracts(contractsResponse.data || []);

          // Process work hours
          const workHours = workHoursResponse.data || [];
          const structured = {};
          let totalHoursThisWeek = 0;
          
          workHours.forEach(wh => {
            if (wh.site_id && wh.hours) {
              if (!structured[wh.site_id]) {
                structured[wh.site_id] = { hours: 0, rate: wh.rate || 0 };
              }
              structured[wh.site_id].hours += parseFloat(wh.hours) || 0;
              totalHoursThisWeek += parseFloat(wh.hours) || 0;
            }
          });
          
          setStructuredWorkHours(structured);
          setDashboardStats(prev => ({ ...prev, totalHoursThisWeek }));

          // Process payments
          const payments = paymentsResponse.data || [];
          const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          setAllPayments(payments);
          setDashboardStats(prev => ({ ...prev, totalPaid }));

          setLoading(false);
          console.debug('[DEBUG] fetchData: Data fetch completed successfully');
        } catch (error) {
          console.error('[ERROR] fetchData: Failed to fetch admin dashboard data:', error);
          setError(error.message || 'Failed to load dashboard data');
          setLoading(false);
          console.debug('[DEBUG] fetchData: Error handling completed');
        }
      }

      fetchData();
    }, []);

    // Chart Components - defined inside the main component to use hooks properly
    console.debug('[DEBUG] AdminDashboard: Defining VonesaFaturashChart');
    const VonesaFaturashChart = () => {
      console.debug('[DEBUG] VonesaFaturashChart: Component starting');
      try {
        const [data, setData] = useState([]);
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          console.debug('[DEBUG] VonesaFaturashChart: useEffect starting');
          try {
            async function fetchInvoices() {
              console.debug('[DEBUG] VonesaFaturashChart: fetchInvoices starting');
              try {
                setLoading(true);
                const res = await api.get("/api/invoices");
                const invoices = res.data || [];
                
                const result = { "Paguar": 0, "Pa paguar": 0 };
                
                invoices.forEach(inv => {
                  if (inv.paid) {
                    result["Paguar"]++;
                  } else {
                    result["Pa paguar"]++;
                  }
                });
                
                const totalInvoices = invoices.length;
                const chartData = Object.entries(result).map(([name, value], index) => ({
                  name: `${name}: ${value} (${totalInvoices > 0 ? ((value / totalInvoices) * 100).toFixed(1) : 0}%)`,
                  value,
                  color: STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]
                }));
                
                setData(chartData);
                setLoading(false);
                console.debug('[DEBUG] VonesaFaturashChart: fetchInvoices completed');
              } catch (error) {
                console.error('[ERROR] VonesaFaturashChart: fetchInvoices error:', error);
                setData([
                  { name: "Paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[0] },
                  { name: "Pa paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[1] }
                ]);
                console.debug('[DEBUG] VonesaFaturashChart: fetchInvoices error handling completed');
              } finally {
                setLoading(false);
              }
            }
            
            fetchInvoices();
            console.debug('[DEBUG] VonesaFaturashChart: useEffect completed');
          } catch (err) {
            console.error('[ERROR] VonesaFaturashChart: useEffect error:', err);
          }
        }, []);

        if (loading) {
          console.debug('[DEBUG] VonesaFaturashChart: Returning loading state');
          return <div className="text-center py-8">Duke ngarkuar...</div>;
        }

        if (data.length === 0) {
          console.debug('[DEBUG] VonesaFaturashChart: Returning empty state');
          return <div className="text-center text-gray-400 py-8">Nuk ka të dhëna për statusin e invoice-ve</div>;
        }

        console.debug('[DEBUG] VonesaFaturashChart: Rendering chart with data length:', data.length);
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={140}
                innerRadius={70}
                dataKey="value"
                label={({ name }) => `${name}`}
                labelLine={true}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#fffbe9', 
                  border: '1px solid #fbbf24', 
                  borderRadius: 12, 
                  fontSize: 16, 
                  color: '#78350f' 
                }}
                formatter={(value, name) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      } catch (err) {
        console.error('[ERROR] VonesaFaturashChart: Render error:', err);
        return <div className="text-center text-red-500 py-8">Gabim në render: {err.message}</div>;
      }
    };

    console.debug('[DEBUG] AdminDashboard: Defining StatusiShpenzimeveChart');
    const StatusiShpenzimeveChart = () => {
      console.debug('[DEBUG] StatusiShpenzimeveChart: Component starting');
      try {
        const [data, setData] = useState([]);
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          console.debug('[DEBUG] StatusiShpenzimeveChart: useEffect starting');
          try {
            async function fetchExpensesInvoices() {
              console.debug('[DEBUG] StatusiShpenzimeveChart: fetchExpensesInvoices starting');
              try {
                setLoading(true);
                const res = await api.get("/api/expenses");
                const expenses = res.data || [];
                
                const result = { "Paguar": 0, "Pa paguar": 0 };
                
                expenses.forEach(exp => {
                  if (exp.paid) {
                    result["Paguar"]++;
                  } else {
                    result["Pa paguar"]++;
                  }
                });
                
                const totalExpenses = expenses.length;
                const chartData = Object.entries(result).map(([name, value], index) => ({
                  name: `${name}: ${value} (${totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0}%)`,
                  value,
                  color: STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]
                }));
                
                setData(chartData);
                setLoading(false);
                console.debug('[DEBUG] StatusiShpenzimeveChart: fetchExpensesInvoices completed');
              } catch (error) {
                console.error('[ERROR] StatusiShpenzimeveChart: fetchExpensesInvoices error:', error);
                setData([
                  { name: "Paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[0] },
                  { name: "Pa paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[1] }
                ]);
                console.debug('[DEBUG] StatusiShpenzimeveChart: fetchExpensesInvoices error handling completed');
              } finally {
                setLoading(false);
              }
            }
            
            fetchExpensesInvoices();
            console.debug('[DEBUG] StatusiShpenzimeveChart: useEffect completed');
          } catch (err) {
            console.error('[ERROR] StatusiShpenzimeveChart: useEffect error:', err);
          }
        }, []);

        if (loading) {
          console.debug('[DEBUG] StatusiShpenzimeveChart: Returning loading state');
          return <div className="text-center py-8">Duke ngarkuar...</div>;
        }

        if (data.length === 0) {
          console.debug('[DEBUG] StatusiShpenzimeveChart: Returning empty state');
          return <div className="text-center text-gray-400 py-8">Nuk ka të dhëna për statusin e faturave të shpenzimeve</div>;
        }

        console.debug('[DEBUG] StatusiShpenzimeveChart: Rendering chart with data length:', data.length);
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={140}
                innerRadius={70}
                dataKey="value"
                label={({ name }) => `${name}`}
                labelLine={true}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#fffbe9', 
                  border: '1px solid #fbbf24', 
                  borderRadius: 12, 
                  fontSize: 16, 
                  color: '#78350f' 
                }}
                formatter={(value, name) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      } catch (err) {
        console.error('[ERROR] StatusiShpenzimeveChart: Render error:', err);
        return <div className="text-center text-red-500 py-8">Gabim në render: {err.message}</div>;
      }
    };

    console.debug('[DEBUG] AdminDashboard: Defining ShpenzimePerSiteChart');
    const ShpenzimePerSiteChart = ({ allExpenses, contracts, structuredWorkHours, allPayments }) => {
      console.debug('[DEBUG] ShpenzimePerSiteChart: Component starting with props:', { allExpenses: allExpenses?.length, contracts: contracts?.length, structuredWorkHours: Object.keys(structuredWorkHours || {}).length, allPayments: allPayments?.length });
      try {
        const [data, setData] = useState([]);
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          console.debug('[DEBUG] ShpenzimePerSiteChart: useEffect starting');
          try {
            async function fetchAllExpensesData() {
              console.debug('[DEBUG] ShpenzimePerSiteChart: fetchAllExpensesData starting');
              try {
                setLoading(true);
                
                const expensesRes = await api.get("/api/expenses");
                const expenses = expensesRes.data || [];
                
                const workHoursRes = await api.get("/api/work-hours");
                const workHours = workHoursRes.data || [];
                
                const employeesRes = await api.get("/api/employees");
                const employees = employeesRes.data || [];
                
                const expensesBySite = {};
                
                expenses.forEach(exp => {
                  if (exp.contract_id) {
                    const contract = contracts.find(c => c.id === exp.contract_id);
                    if (contract) {
                      const site = contract.site_name || contract.siteName || 'Unknown';
                      if (!expensesBySite[site]) {
                        expensesBySite[site] = { 
                          expenses: 0, 
                          workHours: 0, 
                          total: 0
                        };
                      }
                      expensesBySite[site].expenses += parseFloat(exp.gross || 0);
                    }
                  }
                });
                
                workHours.forEach(wh => {
                  if (wh.contract_id && wh.site) {
                    const site = wh.site;
                    if (!expensesBySite[site]) {
                      expensesBySite[site] = { 
                        expenses: 0, 
                        workHours: 0, 
                        total: 0
                      };
                    }
                    const hours = parseFloat(wh.hours || 0);
                    const rate = parseFloat(wh.rate || 0);
                    const workHoursCost = hours * rate;
                    expensesBySite[site].workHours += workHoursCost;
                  }
                });
                
                Object.keys(expensesBySite).forEach(site => {
                  expensesBySite[site].total = 
                    expensesBySite[site].expenses + 
                    expensesBySite[site].workHours;
                });
                
                const chartData = Object.entries(expensesBySite)
                  .map(([site, data]) => ({
                    site,
                    expenses: parseFloat(data.expenses),
                    workHours: parseFloat(data.workHours),
                    total: parseFloat(data.total)
                  }))
                  .sort((a, b) => b.total - a.total);
                
                setData(chartData);
                console.debug('[DEBUG] ShpenzimePerSiteChart: fetchAllExpensesData completed, chartData length:', chartData.length);
                
              } catch (error) {
                console.error('[ERROR] ShpenzimePerSiteChart: fetchAllExpensesData error:', error);
                setData([]);
                console.debug('[DEBUG] ShpenzimePerSiteChart: fetchAllExpensesData error handling completed');
              } finally {
                setLoading(false);
              }
            }
            
            fetchAllExpensesData();
            console.debug('[DEBUG] ShpenzimePerSiteChart: useEffect completed');
          } catch (err) {
            console.error('[ERROR] ShpenzimePerSiteChart: useEffect error:', err);
          }
        }, [allExpenses, contracts, structuredWorkHours, allPayments]);
        
        if (loading) {
          console.debug('[DEBUG] ShpenzimePerSiteChart: Returning loading state');
          return <div className="text-center py-8">Duke ngarkuar...</div>;
        }
        
        if (data.length === 0) {
          console.debug('[DEBUG] ShpenzimePerSiteChart: Returning empty state');
          return <div className="text-center text-gray-400 py-8">Nuk ka të dhëna për shpenzimet sipas site-ve</div>;
        }
        
        console.debug('[DEBUG] ShpenzimePerSiteChart: Rendering chart with data length:', data.length);
        return (
          <div>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">📊 Shpjegim i llogaritjes:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Shpenzime:</strong> Shpenzimet nga tabela expenses_invoice - kolona [gross] sipas site-ve</p>
                <p><strong>Orët e Punës:</strong> Orët e punuara × rate nga tabela work_hours - kolona [hours] × kolona [rate]</p>
                <p><strong>Totali:</strong> Shpenzime + Orët e Punës</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={data} layout="vertical" margin={{ left: 50, right: 50, top: 20, bottom: 20 }} barCategoryGap={18}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: "Shuma totale (£)", position: "insideBottomRight", offset: -5 }} tick={{ fontSize: 14 }} />
                <YAxis type="category" dataKey="site" width={220} tick={{ fontSize: 16, fontWeight: 'bold', fill: '#0284c7' }} />
                <Tooltip 
                  contentStyle={{ background: '#fffbe9', border: '1px solid #fbbf24', borderRadius: 12, fontSize: 16, color: '#78350f' }} 
                  formatter={(v, n) => [`£${Number(v).toFixed(2)}`, n === 'total' ? 'Totali' : n]} 
                />
                <Legend />
                <Bar dataKey="expenses" stackId="a" fill={CHART_COLORS[0]} name="Shpenzime (expenses_invoice.gross)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="workHours" stackId="a" fill={CHART_COLORS[1]} name="Orët e Punës (work_hours.hours × rate)" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      } catch (err) {
        console.error('[ERROR] ShpenzimePerSiteChart: Render error:', err);
        return <div className="text-center text-red-500 py-8">Gabim në render: {err.message}</div>;
      }
    };

    console.debug('[DEBUG] AdminDashboard: Defining StatusiKontrataveChart');
    const StatusiKontrataveChart = ({ contracts }) => {
      console.debug('[DEBUG] StatusiKontrataveChart: Component starting with contracts length:', contracts?.length);
      try {
        const [data, setData] = useState([]);
        
        const statusColors = {
          'active': '#10b981',
          'suspended': '#f59e0b',
          'completed': '#3b82f6',
          'cancelled': '#ef4444',
          'pending': '#8b5cf6',
          'ne progres': '#10b981',
          'pezulluar': '#f59e0b',
          'mbyllur me vonese': '#ef4444',
          'anulluar': '#ef4444',
          'mbyllur': '#3b82f6'
        };
        
        useEffect(() => {
          console.debug('[DEBUG] StatusiKontrataveChart: useEffect starting');
          try {
            if (!contracts || contracts.length === 0) {
              console.debug('[DEBUG] StatusiKontrataveChart: No contracts data');
              return;
            }
            
            const statusCount = {};
            contracts.forEach(contract => {
              const status = contract.status || contract.contract_status || 'pending';
              const statusKey = status.toLowerCase();
              statusCount[statusKey] = (statusCount[statusKey] || 0) + 1;
            });
            
            const chartData = Object.entries(statusCount).map(([status, count]) => ({
              name: status === 'active' ? 'Aktive' : 
                    status === 'suspended' ? 'Të pezulluara' :
                    status === 'completed' ? 'Të mbyllura' :
                    status === 'cancelled' ? 'Të anuluara' :
                    status === 'pending' ? 'Në pritje' :
                    status === 'ne progres' ? 'Në progres' :
                    status === 'pezulluar' ? 'Të pezulluara' :
                    status === 'mbyllur me vonese' ? 'Mbyllur me vonesë' :
                    status === 'anulluar' ? 'Të anuluara' :
                    status === 'mbyllur' ? 'Të mbyllura' : status,
              value: count,
              color: statusColors[status] || '#6b7280'
            }));
            
            setData(chartData);
            console.debug('[DEBUG] StatusiKontrataveChart: useEffect completed, chartData length:', chartData.length);
          } catch (err) {
            console.error('[ERROR] StatusiKontrataveChart: useEffect error:', err);
          }
        }, [contracts]);

        if (data.length === 0) {
          console.debug('[DEBUG] StatusiKontrataveChart: Returning empty state');
          return <div className="text-center text-gray-400 py-8">Nuk ka të dhëna për statusin e kontratave</div>;
        }

        console.debug('[DEBUG] StatusiKontrataveChart: Rendering chart with data length:', data.length);
        return (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${Number(percent * 100).toFixed(0)}%)`}
                labelLine={true}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#fffbe9', 
                  border: '1px solid #fbbf24', 
                  borderRadius: 12, 
                  fontSize: 16, 
                  color: '#78350f' 
                }}
                formatter={(value, name) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      } catch (err) {
        console.error('[ERROR] StatusiKontrataveChart: Render error:', err);
        return <div className="text-center text-red-500 py-8">Gabim në render: {err.message}</div>;
      }
    };

    // Error handling
    console.debug('[DEBUG] AdminDashboard: Checking error state:', error);
    if (error) {
      console.debug('[DEBUG] AdminDashboard: Rendering error state');
      return (
        <div className="text-center text-red-500 py-8">
          <h3 className="text-xl font-bold mb-4">Gabim në ngarkimin e dashboard</h3>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Provoni Përsëri
          </button>
        </div>
      );
    }

    // Loading state
    console.debug('[DEBUG] AdminDashboard: Checking loading state:', loading);
    if (loading) {
      console.debug('[DEBUG] AdminDashboard: Rendering loading state');
      return <LoadingSpinner />;
    }

    console.debug('[DEBUG] AdminDashboard: Starting main render');
    try {
      return (
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8 lg:py-10 space-y-4 md:space-y-8 lg:space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
          {/* HEADER MODERN */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl md:rounded-2xl shadow-lg px-4 md:px-10 py-4 md:py-6 mb-6 md:mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
            <div className="flex-shrink-0 bg-blue-100 rounded-xl p-2 md:p-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-8 h-8 md:w-12 md:h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
              </svg>
            </div>
            <div className="text-center md:text-left">
              <div className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">
                {tr('adminDashboard.title') || 'Admin Dashboard'}
              </div>
              <div className="text-sm md:text-lg font-medium text-purple-700">
                {tr('adminDashboard.subtitle') || 'Menaxhimi i sistemit'}
              </div>
            </div>
            
            {/* Language Switcher */}
            <div className="flex-shrink-0">
              <select 
                value={localStorage.getItem('language') || 'sq'} 
                onChange={(e) => {
                  localStorage.setItem('language', e.target.value);
                  window.location.reload(); // Reload to apply language change
                }}
                className="bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sq">🇦🇱 Shqip</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>

          {/* Statistika kryesore */}
          <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md" className="mb-6 md:mb-12">
            <CountStatCard
              title="Site aktive"
              count={activeSites.length}
              icon="📍"
              color="blue"
            />
            <CountStatCard
              title="Punonjës aktivë"
              count={activeEmployees.length}
              icon="👷"
              color="green"
            />
            <CountStatCard
              title="Orë të punuara këtë javë"
              value={dashboardStats.totalHoursThisWeek || 0}
              icon="⏰"
              color="purple"
            />
            <MoneyStatCard
              title="Pagesa për punëtorët këtë javë"
              value={`£${dashboardStats.totalPaid || 0}`}
              icon="💰"
              color="yellow"
            />
          </Grid>

          {/* Detyrat - më të dukshme */}
          <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-xl col-span-full border border-yellow-200">
            <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">
              📋 {tr('adminDashboard.tasksTitle') || 'Detyrat'}
            </h3>
            <div className="mb-4 flex flex-col sm:flex-row gap-2 md:gap-4 items-start sm:items-center">
              <label className="font-medium text-sm md:text-base">
                {tr('adminDashboard.filter') || 'Filtro'}
              </label>
              <select 
                value={taskFilter} 
                onChange={(event) => setTaskFilter(event.target.value)} 
                className="border p-2 rounded text-sm md:text-base"
              >
                <option value="ongoing">{tr('adminDashboard.onlyActive') || 'Vetëm aktive'}</option>
                <option value="completed">{tr('adminDashboard.onlyCompleted') || 'Vetëm të përfunduara'}</option>
                <option value="all">{tr('adminDashboard.all') || 'Të gjitha'}</option>
              </select>
            </div>
            <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-2 md:gap-6">
              <div className="bg-blue-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-blue-800 font-bold shadow text-sm md:text-base">
                {tr('adminDashboard.total') || 'Total'}: {allTasks.length}
              </div>
              <div className="bg-green-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-green-800 font-bold shadow text-sm md:text-base">
                ✅ {tr('adminDashboard.completed') || 'Përfunduar'}: {allTasks.filter(t => t && t.status === 'completed').length}
              </div>
              <div className="bg-yellow-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-yellow-800 font-bold shadow text-sm md:text-base">
                🕒 {tr('adminDashboard.ongoing') || 'Në progres'}: {allTasks.filter(t => t && t.status === 'ongoing').length}
              </div>
            </div>
            {filteredTasks.length > 0 ? (
              <ul className="space-y-3">
                {filteredTasks.map((task, idx) => (
                  <li key={task.id || idx} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-white rounded-xl p-3 md:p-4 shadow border border-blue-100">
                    <StatusBadge status={task.status === 'completed' ? 'completed' : 'ongoing'} />
                    <span className="font-semibold flex-1 text-sm md:text-lg">
                      {task.description || task.title || ''}
                    </span>
                    <span className="text-sm md:text-lg text-blue-700 font-bold">
                      {task.site_name || task.siteName || ''}
                    </span>
                    <span className="text-sm md:text-lg text-purple-700 font-bold">
                      {tr('adminDashboard.deadline') || 'Afati'} {task.due_date || task.dueDate ? new Date(task.due_date || task.dueDate).toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {tr('adminDashboard.by') || 'Nga'} {task.assigned_by || task.assignedBy || ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <NoTasksEmpty />
            )}
          </div>

          {/* Grafik për site */}
          <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">
              📊 {tr('adminDashboard.hoursBySiteThisWeek') || 'Orët sipas site-ve këtë javë'}
            </h3>
            <div className="h-80">
              <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
                <ShpenzimePerSiteChart 
                  allExpenses={allExpenses}
                  contracts={contracts}
                  structuredWorkHours={structuredWorkHours}
                  allPayments={allPayments}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Grafik për kontratat */}
          <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">
              📋 {tr('adminDashboard.contractsProgressTitle') || 'Progresi i kontratave'}
            </h3>
            <div className="h-80">
              <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
                <StatusiKontrataveChart contracts={contracts} />
              </ErrorBoundary>
            </div>
          </div>

          {/* Grafik për shpenzimet */}
          <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">
              💰 Statusi i Shpenzimeve
            </h3>
            <div className="h-80">
              <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
                <StatusiShpenzimeveChart />
              </ErrorBoundary>
            </div>
          </div>

          {/* Grafik për faturat */}
          <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">
              📄 Statusi i Faturave
            </h3>
            <div className="h-80">
              <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
                <VonesaFaturashChart />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      );
    } catch (err) {
      console.error('[ERROR] AdminDashboard: Main render error:', err);
      return (
        <div className="text-center text-red-500 py-8">
          <h3 className="text-xl font-bold mb-4">Gabim në render</h3>
          <p className="mb-4">{err.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Provoni Përsëri
          </button>
        </div>
      );
    }
  } catch (err) {
    console.error('[ERROR] AdminDashboard: Component initialization error:', err);
    return (
      <div className="text-center text-red-500 py-8">
        <h3 className="text-xl font-bold mb-4">Gabim në inicializimin e komponentit</h3>
        <p className="mb-4">{err.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Provoni Përsëri
        </button>
      </div>
    );
  }
}