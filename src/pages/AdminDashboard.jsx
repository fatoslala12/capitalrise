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


// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR] Chart component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>;
    }

    return this.props.children;
  }
}

// Global color palette for charts
const CHART_COLORS = ["#a5b4fc", "#fbcfe8", "#fef08a", "#bbf7d0", "#bae6fd", "#fca5a5", "#fdba74", "#ddd6fe"];

// Stronger colors for status charts (better readability)
const STATUS_CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

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

export default function AdminDashboard() {
  // Translation function with fallback
  const t = (key, fallback = key) => {
    // Simple translation mapping for Albanian/English
    const translations = {
      // Albanian translations
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
      'adminDashboard.allInvoicesPaid.en': 'All invoices are paid',
      'adminDashboard.contract.en': 'Contract',
      'adminDashboard.invoiceNumber.en': 'Invoice number',
      'adminDashboard.site.en': 'Site',
      'adminDashboard.unpaidExpensesTitle.en': 'Unpaid expenses',
      'adminDashboard.allExpensesPaid.en': 'All expenses are paid',
      'workHours.hours.en': 'Hours',
      'common.progress.en': 'Progress',
      'common.total.en': 'Total',
      'payments.expenses.en': 'Expenses',
    };
    
    // Check if user prefers English (you can add logic here to detect language preference)
    const userLanguage = localStorage.getItem('language') || 'sq'; // Default to Albanian
    const langKey = userLanguage === 'en' ? `${key}.en` : key;
    
    return translations[langKey] || translations[key] || fallback || key;
  };
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    thisWeek: '',
    totalPaid: 0,
    totalProfit: 0,
    workHoursBysite: [],
    top5Employees: [],
    totalWorkHours: 0,
    paidEmployeesCount: 0,
    totalEmployeesWithHours: 0,
    totalHoursThisWeek: 0,
    totalGrossThisWeek: 0
  });
  const [unpaid, setUnpaid] = useState([]);
  const [unpaidExpenses, setUnpaidExpenses] = useState([]);
  const [taskStats, setTaskStats] = useState({ totalTasks: 0, completedTasks: 0, ongoingTasks: 0 });
  const [taskFilter, setTaskFilter] = useState('ongoing');
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyProfitData, setWeeklyProfitData] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [structuredWorkHours, setStructuredWorkHours] = useState({});
  const [allPayments, setAllPayments] = useState([]);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // useEffect për të marrë të dhënat dhe llogaritë dashboard stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Merr të gjitha të dhënat në paralel
        const [contractsRes, employeesRes, tasksRes, paymentsRes, expensesRes] = await Promise.all([
          api.get("/api/contracts", { headers }),
          api.get("/api/employees", { headers }),
          api.get("/api/tasks", { headers }),
          api.get("/api/payments", { headers }),
          api.get("/api/expenses", { headers })
        ]);

        // Validate data before setting state
        const contractsData = Array.isArray(contractsRes.data) ? contractsRes.data : [];
        const employeesData = Array.isArray(employeesRes.data) ? employeesRes.data : [];
        const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        const paymentsData = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
        const expensesData = Array.isArray(expensesRes.data) ? expensesRes.data : [];

        setContracts(contractsData);
        setEmployees(employeesData);
        setAllTasks(tasksData);
        setAllPayments(paymentsData);
        setAllExpenses(expensesData);
        
        // Kontrollo nëse ka token
        const token = localStorage.getItem("token");
        
        if (!token) {
          console.warn('[WARNING] No token found, dashboard will show empty data');
          setDashboardStats({
            thisWeek: '',
            totalPaid: 0,
            totalProfit: 0,
            workHoursBysite: [],
            top5Employees: [],
            totalWorkHours: 0,
            totalHoursThisWeek: 0,
            totalGrossThisWeek: 0,
            paidEmployeesCount: 0,
            totalEmployeesWithHours: 0
          });
          setAllTasks([]);
          setUnpaid([]);
          setUnpaidExpenses([]);
          setWeeklyProfitData([]);
          setLoading(false);
          return;
        }
        
        // Merr të gjitha të dhënat paralelisht me error handling
        let workHoursRes;
        
        try {
          workHoursRes = await api.get("/api/work-hours/structured", { headers });
        } catch (apiError) {
          console.error('[ERROR] API call failed:', apiError);
          // Nëse API call dështon, përdor të dhëna bosh
          workHoursRes = { data: {} };
        }
        
        // Validate API responses
        if (!workHoursRes?.data || typeof workHoursRes.data !== 'object') {
          console.warn('[WARNING] Invalid work hours data, using empty object');
          workHoursRes = { data: {} };
        }
        
        setStructuredWorkHours(snakeToCamel(workHoursRes.data || {}));
        
        // Calculate current week - FIXED to match backend getWeekLabel exactly
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(today.setDate(diff));
        const thisWeek = monday.toISOString().split('T')[0];
        
        // Calculate dashboard stats
        const finalStats = {
          thisWeek,
          totalPaid: 0,
          totalProfit: 0,
          workHoursBysite: [],
          top5Employees: [],
          totalWorkHours: 0,
          totalHoursThisWeek: 0,
          totalGrossThisWeek: 0,
          paidEmployeesCount: 0,
          totalEmployeesWithHours: 0
        };
        
        // Calculate work hours by site for this week
        let workHoursBySite = {};
        let totalHoursThisWeek = 0;
        let totalGrossThisWeek = 0;
        
        // Process work hours data with error handling
        try {
          if (workHoursRes.data && typeof workHoursRes.data === 'object') {
            Object.entries(workHoursRes.data).forEach(([site, weeks]) => {
              if (weeks && typeof weeks === 'object' && weeks[thisWeek]) {
                const weekData = weeks[thisWeek];
                if (Array.isArray(weekData)) {
                  weekData.forEach(wh => {
                    if (wh && typeof wh === 'object') {
                      const hours = parseFloat(wh.hours || 0);
                      const rate = parseFloat(wh.rate || 0);
                      const gross = hours * rate;
                      
                      if (!workHoursBySite[site]) {
                        workHoursBySite[site] = { hours: 0, gross: 0 };
                      }
                      workHoursBySite[site].hours += hours;
                      workHoursBySite[site].gross += gross;
                      totalHoursThisWeek += hours;
                      totalGrossThisWeek += gross;
                    }
                  });
                }
              }
            });
          }
        } catch (error) {
          console.error('[ERROR] Failed to process work hours data:', error);
          // Use empty data if processing fails
          workHoursBySite = {};
          totalHoursThisWeek = 0;
          totalGrossThisWeek = 0;
        }
        
        // Convert to array format for charts
        finalStats.workHoursBysite = Object.entries(workHoursBySite).map(([site, data]) => ({
          site,
          hours: parseFloat(data.hours.toFixed(2)),
          gross: parseFloat(data.gross.toFixed(2))
        })).sort((a, b) => b.hours - a.hours);
        
        finalStats.totalHoursThisWeek = parseFloat(totalHoursThisWeek.toFixed(2));
        finalStats.totalGrossThisWeek = parseFloat(totalGrossThisWeek.toFixed(2));
        
        // Calculate top 5 employees by payment
        const employeePayments = {};
        try {
          paymentsData.forEach(payment => {
            if (payment && typeof payment === 'object' && payment.employee_id) {
              const empId = payment.employee_id;
              if (!employeePayments[empId]) {
                employeePayments[empId] = { total: 0, payments: [] };
              }
              const amount = parseFloat(payment.grossAmount || payment.gross_amount || 0);
              employeePayments[empId].total += amount;
              employeePayments[empId].payments.push(payment);
            }
          });
        } catch (error) {
          console.error('[ERROR] Failed to process employee payments:', error);
          // Use empty data if processing fails
        }
        
        finalStats.top5Employees = Object.entries(employeePayments)
          .map(([empId, data]) => ({
            id: empId,
            grossAmount: data.total,
            isPaid: true
          }))
          .sort((a, b) => b.grossAmount - a.grossAmount)
          .slice(0, 5);
        
        // Calculate total work hours
        let totalWorkHours = 0;
        try {
          if (workHoursRes.data && typeof workHoursRes.data === 'object') {
            Object.values(workHoursRes.data).forEach(weeks => {
              if (weeks && typeof weeks === 'object') {
                Object.values(weeks).forEach(weekData => {
                  if (Array.isArray(weekData)) {
                    weekData.forEach(wh => {
                      if (wh && typeof wh === 'object') {
                        totalWorkHours += parseFloat(wh.hours || 0);
                      }
                    });
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error('[ERROR] Failed to calculate total work hours:', error);
          totalWorkHours = 0;
        }
        finalStats.totalWorkHours = parseFloat(totalWorkHours.toFixed(2));
        
        // Calculate paid employees count
        const paidEmployees = new Set();
        try {
          paymentsData.forEach(payment => {
            if (payment && typeof payment === 'object' && payment.employee_id) {
              paidEmployees.add(payment.employee_id);
            }
          });
        } catch (error) {
          console.error('[ERROR] Failed to calculate paid employees count:', error);
          // Use empty set if processing fails
        }
        finalStats.paidEmployeesCount = paidEmployees.size;
        
        // Calculate total employees with hours
        const employeesWithHours = new Set();
        try {
          if (workHoursRes.data && typeof workHoursRes.data === 'object') {
            Object.values(workHoursRes.data).forEach(weeks => {
              if (weeks && typeof weeks === 'object') {
                Object.values(weeks).forEach(weekData => {
                  if (Array.isArray(weekData)) {
                    weekData.forEach(wh => {
                      if (wh && typeof wh === 'object' && wh.employee_id) {
                        employeesWithHours.add(wh.employee_id);
                      }
                    });
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error('[ERROR] Failed to calculate total employees with hours:', error);
          // Use empty set if processing fails
        }
        finalStats.totalEmployeesWithHours = employeesWithHours.size;
        
        setDashboardStats(finalStats);
        
        // Process unpaid invoices
        const unpaidList = [];
        // This will be populated based on your business logic
        setUnpaid(unpaidList);
        
        // Process unpaid expenses
        const unpaidExpensesList = [];
        try {
          expensesData.forEach(exp => {
            if (exp && typeof exp === 'object' && !exp.paid) {
              unpaidExpensesList.push(exp);
            }
          });
        } catch (error) {
          console.error('[ERROR] Failed to process unpaid expenses:', error);
          // Use empty list if processing fails
        }
        setUnpaidExpenses(unpaidExpensesList);
        
        // Calculate weekly profit data
        const weekLabels = [];
        const weeklyData = [];
        try {
          weekLabels.push(...new Set(
            paymentsData
              .filter(p => p && typeof p === 'object' && (p.weekLabel || p.week_label))
              .map(p => p.weekLabel || p.week_label)
              .filter(Boolean)
          ));
          weekLabels.sort();
          
          weeklyData.push(...weekLabels.map(week => {
            const weekPayments = paymentsData.filter(p => p && (p.weekLabel || p.week_label) === week);
            const totalPaid = weekPayments.reduce((sum, p) => {
              if (!p || typeof p !== 'object') return sum;
              const amount = parseFloat(p.grossAmount || p.gross_amount || 0);
              return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            return { week, totalPaid };
          }));
        } catch (error) {
          console.error('[ERROR] Failed to calculate weekly profit data:', error);
          // Use empty data if processing fails
        }
        setWeeklyProfitData(weeklyData);
        
      } catch (error) {
        console.error('[ERROR] Failed to fetch dashboard data:', error);
        // Nëse ka error, vendos të dhëna bosh
        setDashboardStats({
          thisWeek: '',
          totalPaid: 0,
          totalProfit: 0,
          workHoursBysite: [],
          top5Employees: [],
          totalWorkHours: 0,
          totalHoursThisWeek: 0,
          totalGrossThisWeek: 0,
          paidEmployeesCount: 0,
          totalEmployeesWithHours: 0
        });
        setAllTasks([]);
        setUnpaid([]);
        setUnpaidExpenses([]);
        setWeeklyProfitData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Llogarit site-t aktive dhe punonjësit aktivë
  const activeSites = contracts.filter(c => c && typeof c === 'object' && (c.status === "Ne progres" || c.status === "Pezulluar"));
  const activeEmployees = employees.filter(e => e && typeof e === 'object' && (e.status === "active" || e.status === "Aktiv"));

  // Filtro detyrat
  const filteredTasks = allTasks.filter(t => {
    if (!t || typeof t !== 'object') return false;
    if (taskFilter === 'ongoing') return t.status === 'ongoing';
    if (taskFilter === 'completed') return t.status === 'completed';
    return true; // all
  });

  // Merr emër + mbiemër për user-in (mos shfaq email në asnjë rast)
  let user = null;
  let userFullName = "";
  
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      user = JSON.parse(userStr);
      userFullName = (user?.first_name && user?.last_name)
        ? `${user.first_name} ${user.last_name}`
        : (user?.firstName && user?.lastName)
          ? `${user.firstName} ${user.lastName}`
          : "";
    }
  } catch (error) {
    console.warn('[WARNING] Failed to parse user from localStorage:', error);
    user = null;
    userFullName = "";
  }

  // Ensure all chart data is properly validated
  const safeChartData = {
    workHoursBysite: Array.isArray(dashboardStats.workHoursBysite) ? dashboardStats.workHoursBysite : [],
    top5Employees: Array.isArray(dashboardStats.top5Employees) ? dashboardStats.top5Employees : [],
    weeklyProfitData: Array.isArray(weeklyProfitData) ? weeklyProfitData : [],
    contracts: Array.isArray(contracts) ? contracts : [],
    employees: Array.isArray(employees) ? employees : [],
    allTasks: Array.isArray(allTasks) ? allTasks : [],
    unpaid: Array.isArray(unpaid) ? unpaid : [],
    unpaidExpenses: Array.isArray(unpaidExpenses) ? unpaidExpenses : [],
    allExpenses: Array.isArray(allExpenses) ? allExpenses : []
  };

  // Additional validation to ensure all data is safe
  try {
    // Validate chart data structure
    if (!safeChartData.workHoursBysite || !Array.isArray(safeChartData.workHoursBysite)) {
      safeChartData.workHoursBysite = [];
    }
    if (!safeChartData.top5Employees || !Array.isArray(safeChartData.top5Employees)) {
      safeChartData.top5Employees = [];
    }
    if (!safeChartData.weeklyProfitData || !Array.isArray(safeChartData.weeklyProfitData)) {
      safeChartData.weeklyProfitData = [];
    }
    if (!safeChartData.contracts || !Array.isArray(safeChartData.contracts)) {
      safeChartData.contracts = [];
    }
    if (!safeChartData.employees || !Array.isArray(safeChartData.employees)) {
      safeChartData.employees = [];
    }
    if (!safeChartData.allTasks || !Array.isArray(safeChartData.allTasks)) {
      safeChartData.allTasks = [];
    }
    if (!safeChartData.unpaid || !Array.isArray(safeChartData.unpaid)) {
      safeChartData.unpaid = [];
    }
    if (!safeChartData.unpaidExpenses || !Array.isArray(safeChartData.unpaidExpenses)) {
      safeChartData.unpaidExpenses = [];
    }
    if (!safeChartData.allExpenses || !Array.isArray(safeChartData.allExpenses)) {
      safeChartData.allExpenses = [];
    }
  } catch (error) {
    console.error('[ERROR] Failed to validate chart data:', error);
    // Use empty arrays if validation fails
    safeChartData.workHoursBysite = [];
    safeChartData.top5Employees = [];
    safeChartData.weeklyProfitData = [];
    safeChartData.contracts = [];
    safeChartData.employees = [];
    safeChartData.allTasks = [];
    safeChartData.unpaid = [];
    safeChartData.unpaidExpenses = [];
    safeChartData.allExpenses = [];
  }

  // Additional safety check for chart rendering
  try {
    // Ensure all chart data arrays are safe for rendering
    safeChartData.workHoursBysite = safeChartData.workHoursBysite.filter(item => 
      item && typeof item === 'object' && typeof item.site === 'string' && typeof item.hours === 'number'
    );
    safeChartData.top5Employees = safeChartData.top5Employees.filter(item => 
      item && typeof item === 'object' && typeof item.id === 'string' && typeof item.grossAmount === 'number'
    );
    safeChartData.weeklyProfitData = safeChartData.weeklyProfitData.filter(item => 
      item && typeof item === 'object' && typeof item.week === 'string' && typeof item.totalPaid === 'number'
    );
    safeChartData.contracts = safeChartData.contracts.filter(item => 
      item && typeof item === 'object' && typeof item.id === 'string'
    );
    safeChartData.employees = safeChartData.employees.filter(item => 
      item && typeof item === 'object' && typeof item.id === 'string'
    );
    safeChartData.allTasks = safeChartData.allTasks.filter(item => 
      item && typeof item === 'object' && typeof item.id === 'string'
    );
    safeChartData.unpaid = safeChartData.unpaid.filter(item => 
      item && typeof item === 'object' && typeof item.contractNumber === 'string'
    );
    safeChartData.unpaidExpenses = safeChartData.unpaidExpenses.filter(item => 
      item && typeof item === 'object' && typeof item.id === 'string'
    );
    safeChartData.allExpenses = safeChartData.allExpenses.filter(item => 
      item && typeof item === 'object' && typeof item.id === 'string'
    );
  } catch (error) {
    console.error('[ERROR] Failed to filter chart data:', error);
    // Use empty arrays if filtering fails
    safeChartData.workHoursBysite = [];
    safeChartData.top5Employees = [];
    safeChartData.weeklyProfitData = [];
    safeChartData.contracts = [];
    safeChartData.employees = [];
    safeChartData.allTasks = [];
    safeChartData.unpaid = [];
    safeChartData.unpaidExpenses = [];
    safeChartData.allExpenses = [];
  }

  // Final safety check to ensure all data is safe for rendering
  try {
    // Ensure all chart data is safe for rendering
    safeChartData.workHoursBysite = safeChartData.workHoursBysite.map(item => {
      if (item && typeof item === 'object') {
        return {
          site: String(item.site || ''),
          hours: Number(item.hours || 0),
          gross: Number(item.gross || 0)
        };
      }
      return null;
    }).filter(Boolean);

    safeChartData.top5Employees = safeChartData.top5Employees.map(item => {
      if (item && typeof item === 'object') {
        return {
          id: String(item.id || ''),
          employee_id: String(item.employee_id || ''),
          grossAmount: Number(item.grossAmount || 0),
          isPaid: Boolean(item.isPaid),
          firstName: String(item.firstName || ''),
          lastName: String(item.lastName || '')
        };
      }
      return null;
    }).filter(Boolean);

    safeChartData.weeklyProfitData = safeChartData.weeklyProfitData.map(item => {
      if (item && typeof item === 'object') {
        return {
          week: String(item.week || ''),
          totalPaid: Number(item.totalPaid || 0)
        };
      }
      return null;
    }).filter(Boolean);

    safeChartData.contracts = safeChartData.contracts.map(item => {
      if (item && typeof item === 'object') {
        return {
          id: String(item.id || ''),
          contract_number: String(item.contract_number || ''),
          site_name: String(item.site_name || ''),
          siteName: String(item.siteName || ''),
          status: String(item.status || ''),
          startDate: item.startDate || null,
          start_date: item.start_date || null,
          finishDate: item.finishDate || null,
          finish_date: item.finish_date || null
        };
      }
      return null;
    }).filter(Boolean);

    safeChartData.employees = safeChartData.employees.map(item => {
      if (item && typeof item === 'object') {
        return {
          id: String(item.id || ''),
          firstName: String(item.firstName || ''),
          first_name: String(item.first_name || ''),
          lastName: String(item.lastName || ''),
          last_name: String(item.last_name || ''),
          status: String(item.status || ''),
          photo: item.photo || null
        };
      }
      return null;
    }).filter(Boolean);
  } catch (error) {
    console.error('[ERROR] Failed to sanitize chart data:', error);
    // Use empty arrays if sanitization fails
    safeChartData.workHoursBysite = [];
    safeChartData.top5Employees = [];
    safeChartData.weeklyProfitData = [];
    safeChartData.contracts = [];
    safeChartData.employees = [];
  }

  // Final validation to ensure all data is safe for rendering
  try {
    // Ensure all chart data is safe for rendering
    if (!Array.isArray(safeChartData.workHoursBysite)) {
      safeChartData.workHoursBysite = [];
    }
    if (!Array.isArray(safeChartData.top5Employees)) {
      safeChartData.top5Employees = [];
    }
    if (!Array.isArray(safeChartData.weeklyProfitData)) {
      safeChartData.weeklyProfitData = [];
    }
    if (!Array.isArray(safeChartData.contracts)) {
      safeChartData.contracts = [];
    }
    if (!Array.isArray(safeChartData.employees)) {
      safeChartData.employees = [];
    }
    if (!Array.isArray(safeChartData.allTasks)) {
      safeChartData.allTasks = [];
    }
    if (!Array.isArray(safeChartData.unpaid)) {
      safeChartData.unpaid = [];
    }
    if (!Array.isArray(safeChartData.unpaidExpenses)) {
      safeChartData.unpaidExpenses = [];
    }
    if (!Array.isArray(safeChartData.allExpenses)) {
      safeChartData.allExpenses = [];
    }
  } catch (error) {
    console.error('[ERROR] Failed to finalize chart data validation:', error);
    // Use empty arrays if final validation fails
    safeChartData.workHoursBysite = [];
    safeChartData.top5Employees = [];
    safeChartData.weeklyProfitData = [];
    safeChartData.contracts = [];
    safeChartData.employees = [];
    safeChartData.allTasks = [];
    safeChartData.unpaid = [];
    safeChartData.unpaidExpenses = [];
    safeChartData.allExpenses = [];
  }

  // Ultimate safety check to ensure all data is safe for rendering
  try {
    // Ensure all chart data is safe for rendering
    safeChartData.workHoursBysite = safeChartData.workHoursBysite || [];
    safeChartData.top5Employees = safeChartData.top5Employees || [];
    safeChartData.weeklyProfitData = safeChartData.weeklyProfitData || [];
    safeChartData.contracts = safeChartData.contracts || [];
    safeChartData.employees = safeChartData.employees || [];
    safeChartData.allTasks = safeChartData.allTasks || [];
    safeChartData.unpaid = safeChartData.unpaid || [];
    safeChartData.unpaidExpenses = safeChartData.unpaidExpenses || [];
    safeChartData.allExpenses = safeChartData.allExpenses || [];
  } catch (error) {
    console.error('[ERROR] Failed to ultimate chart data validation:', error);
    // Use empty arrays if ultimate validation fails
    safeChartData.workHoursBysite = [];
    safeChartData.top5Employees = [];
    safeChartData.weeklyProfitData = [];
    safeChartData.contracts = [];
    safeChartData.employees = [];
    safeChartData.allTasks = [];
    safeChartData.unpaid = [];
    safeChartData.unpaidExpenses = [];
    safeChartData.allExpenses = [];
  }

  if (loading) {
    return <LoadingSpinner fullScreen={true} size="xl" text={t('adminDashboard.loadingStats') || 'Duke ngarkuar...'} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8 lg:py-10 space-y-4 md:space-y-8 lg:space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
             {/* HEADER MODERN */}
       <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl md:rounded-2xl shadow-lg px-4 md:px-10 py-4 md:py-6 mb-6 md:mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
         <div className="flex-shrink-0 bg-blue-100 rounded-xl p-2 md:p-3 shadow-sm">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-8 h-8 md:w-12 md:h-12">
             <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
           </svg>
         </div>
         <div className="text-center md:text-left flex-1">
          
           <div className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">{t('adminDashboard.title') || 'Admin Dashboard'}</div>
           <div className="text-sm md:text-lg font-medium text-purple-700">{t('adminDashboard.subtitle') || 'Menaxhimi i sistemit'}</div>
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
        {/* Orë të punuara këtë javë */}
        <CountStatCard
          title="Orë të punuara këtë javë"
          value={dashboardStats.totalHoursThisWeek || 0}
          icon="⏰"
          color="purple"
        />
        {/* Pagesa për punëtorët këtë javë */}
        <MoneyStatCard
          title="Pagesa për punëtorët këtë javë"
          value={`£${dashboardStats.totalPaid || 0}`}
          icon="💰"
          color="yellow"
        />
      </Grid>

      {/* Detyrat - më të dukshme */}
      <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-xl col-span-full border border-yellow-200">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📋 {t('adminDashboard.tasksTitle') || 'Detyrat'}</h3>
        <div className="mb-4 flex flex-col sm:flex-row gap-2 md:gap-4 items-start sm:items-center">
          <label className="font-medium text-sm md:text-base">{t('adminDashboard.filter') || 'Filtro'}</label>
          <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)} className="border p-2 rounded text-sm md:text-base">
            <option value="ongoing">{t('adminDashboard.onlyActive') || 'Vetëm aktive'}</option>
            <option value="completed">{t('adminDashboard.onlyCompleted') || 'Vetëm të përfunduara'}</option>
            <option value="all">{t('adminDashboard.all') || 'Të gjitha'}</option>
          </select>
        </div>
        <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-2 md:gap-6">
          <div className="bg-blue-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-blue-800 font-bold shadow text-sm md:text-base">{t('adminDashboard.total') || 'Total'}: {allTasks.length}</div>
          <div className="bg-green-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-green-800 font-bold shadow text-sm md:text-base">✅ {t('adminDashboard.completed') || 'Përfunduar'}: {allTasks.filter(t => t && t.status === 'completed').length}</div>
          <div className="bg-yellow-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-yellow-800 font-bold shadow text-sm md:text-base">🕒 {t('adminDashboard.ongoing') || 'Në progres'}: {allTasks.filter(t => t && t.status === 'ongoing').length}</div>
        </div>
        {filteredTasks.length > 0 ? (
          <ul className="space-y-3">
            {filteredTasks.map((t, idx) => (
              <li key={t.id || idx} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-white rounded-xl p-3 md:p-4 shadow border border-blue-100">
                <StatusBadge status={t.status === 'completed' ? 'completed' : 'ongoing'} />
                <span className="font-semibold flex-1 text-sm md:text-lg">{t.description || t.title || ''}</span>
                <span className="text-sm md:text-lg text-blue-700 font-bold">{t.site_name || t.siteName || ''}</span>
                <span className="text-sm md:text-lg text-purple-700 font-bold">{t('adminDashboard.deadline') || 'Afati'} {t.due_date || t.dueDate ? new Date(t.due_date || t.dueDate).toLocaleDateString() : 'N/A'}</span>
                <span className="text-xs text-gray-500">{t('adminDashboard.by') || 'Nga'} {t.assigned_by || t.assignedBy || ''}</span>
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
            📊 {t('adminDashboard.hoursBySiteThisWeek') || 'Orët sipas site-ve këtë javë'}
          </h3>
                  <div className="mb-4 text-sm md:text-lg font-semibold text-gray-700">
            {t('adminDashboard.totalHoursWorked') || 'Totali i orëve të punuara'} <span className="text-blue-600">{dashboardStats.totalWorkHours || 0}</span>
          </div>
        {safeChartData.workHoursBysite && safeChartData.workHoursBysite.length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={safeChartData.workHoursBysite} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: t('workHours.hours') || 'Hours', position: "insideBottomRight", offset: -5 }} />
              <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#a21caf' }} />
              <Tooltip formatter={v => {
                try {
                  return [v, t('workHours.hours') || 'Hours'];
                } catch (error) {
                  console.error('[ERROR] Tooltip formatter error:', error);
                  return [v, 'Hours'];
                }
              }} />
              <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={32}>
                {safeChartData.workHoursBysite.map((_, i) => {
                  try {
                    return <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />;
                  } catch (error) {
                    console.error('[ERROR] Failed to render chart cell:', error);
                    return <Cell key={i} fill={CHART_COLORS[0]} />;
                  }
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{t('adminDashboard.noWorkHours') || 'Nuk ka orë të punuara'}</p>
        )}
      </div>

      {/* Grafik për progresin e kontratave aktive */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📈 {t('adminDashboard.contractsProgressTitle') || 'Progresi i kontratave'}</h3>
        {safeChartData.contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={safeChartData.contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").map(c => {
                const start = c.startDate ? new Date(c.startDate) : (c.start_date ? new Date(c.start_date) : null);
                const end = c.finishDate ? new Date(c.finishDate) : (c.finish_date ? new Date(c.finish_date) : null);
                const now = new Date();
                let progress = 0;
                if (!start || !end || isNaN(start) || isNaN(end)) progress = 0;
                else if (now < start) progress = 0;
                else if (now > end) progress = 100;
                else progress = Math.floor(((now - start) / (end - start)) * 100);
                return {
                  name: c.site_name || c.siteName || c.company || (c.contract_number ? `Kontrata #${c.contract_number}` : '') || 'Pa emër',
                  progress
                };
              })}
              layout="vertical"
              margin={{ left: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} label={{ value: "%", position: "insideBottomRight", offset: -5 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#a21caf' }} />
              <Tooltip formatter={v => {
                try {
                  return [`${v}%`, t('common.progress') || 'Progress'];
                } catch (error) {
                  console.error('[ERROR] Tooltip formatter error:', error);
                  return [`${v}%`, 'Progress'];
                }
              }} />
              <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={30}>
                {safeChartData.contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").map((_, i) => {
                  try {
                    return <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />;
                  } catch (error) {
                    console.error('[ERROR] Failed to render chart cell:', error);
                    return <Cell key={i} fill={CHART_COLORS[0]} />;
                  }
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{t('adminDashboard.noActiveContracts') || 'Nuk ka kontrata aktive'}</p>
        )}
      </div>

      {/* Top 5 më të paguar */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🏅 {t('adminDashboard.topPaidEmployees') || 'Top 5 punonjësit më të paguar'}
          </h3>
        {safeChartData.top5Employees && safeChartData.top5Employees.length > 0 ? (
          <ul className="space-y-3 text-gray-800">
            {safeChartData.top5Employees.map((employee, i) => {
              const amount = employee.grossAmount ?? employee.amount ?? 0;
              
              // Merr të dhënat e plota të punonjësit nga employees array
              const employeeData = safeChartData.employees.find(emp => emp.id === employee.employee_id || emp.id === employee.id);
              
              const employeeName = employeeData 
                ? `${employeeData.firstName || employeeData.first_name || employeeData.user_first_name || ''} ${employeeData.lastName || employeeData.last_name || employeeData.user_last_name || ''}`.trim()
                : employee.name || 'Unknown';
              
              // Use the name from the top5Employees data if available
              const displayName = employee.firstName && employee.lastName 
                ? `${employee.firstName} ${employee.lastName}`.trim()
                : employeeName;
              
              const photoSrc = employeeData?.photo
                ? employeeData.photo.startsWith('data:image')
                  ? employeeData.photo
                  : employeeData.photo
                : '/placeholder.png';
              
              return (
                <li key={employee.id} className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
                  <div className="relative w-14 h-14">
                    {employeeData?.photo ? (
                      <img 
                        src={photoSrc} 
                        alt={displayName} 
                        className="w-full h-full rounded-full object-cover border-2 border-blue-300 shadow"
                        onError={(event) => {
                          if (event.target && event.target.nextSibling) {
                            event.target.style.display = 'none';
                            event.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full rounded-full border-2 border-blue-300 shadow flex items-center justify-center text-blue-600 font-bold text-lg ${employeeData?.photo ? 'hidden' : 'flex'}`}
                      style={{
                        background: '#e0e7ef',
                        display: employeeData?.photo ? 'none' : 'flex'
                      }}
                    >
                      {displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      {displayName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {employee.isPaid ? `✅ ${t('adminDashboard.paid') || 'Paguar'}` : `⏳ ${t('adminDashboard.unpaid') || 'Pa paguar'}`}
                    </p>
                  </div>
                  <div className="text-blue-700 font-extrabold text-xl">£{Number(amount).toFixed(2)}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{t('adminDashboard.noPayments') || 'Nuk ka pagesa'}</p>
        )}
      </div>


      

      {/* Grafik për shpenzimet sipas site-ve */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">💸 {t('adminDashboard.expensesBySiteTitle') || 'Shpenzimet sipas site-ve'}</h3>
        <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
          <ShpenzimePerSiteChart 
            allExpenses={safeChartData.allExpenses} 
            contracts={safeChartData.contracts} 
            structuredWorkHours={structuredWorkHours} 
            allPayments={safeChartData.weeklyProfitData} 
          />
        </ErrorBoundary>
      </div>

      {/* Grafik për statusin e kontratave */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📊 Statusi i kontratave</h3>
        <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
          <StatusiKontrataveChart contracts={safeChartData.contracts} />
        </ErrorBoundary>
      </div>

      {/* Grafik për pagesat javore */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">💸 Pagesa Javore për stafin</h3>
        {safeChartData.weeklyProfitData.filter(w => w.totalPaid > 0).length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={safeChartData.weeklyProfitData.filter(w => w.totalPaid > 0)} margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6366f1', angle: -30, textAnchor: 'end' }} interval={0} height={80} />
              <YAxis label={{ value: "Pagesa totale (£)", angle: -90, position: "insideLeft", offset: 0 }} tick={{ fontSize: 14, fill: '#6366f1' }} />
              <Tooltip formatter={v => {
                try {
                  return [`£${Number(v).toFixed(2)}`, "Pagesa"];
                } catch (error) {
                  console.error('[ERROR] Tooltip formatter error:', error);
                  return [`£${Number(v).toFixed(2)}`, "Payment"];
                }
              }} />
              <Bar dataKey="totalPaid" radius={[6, 6, 0, 0]} barSize={32}>
                {safeChartData.weeklyProfitData.filter(w => w.totalPaid > 0).map((_, i) => {
                  try {
                    return <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />;
                  } catch (error) {
                    console.error('[ERROR] Failed to render chart cell:', error);
                    return <Cell key={i} fill={CHART_COLORS[0]} />;
                  }
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{t('adminDashboard.noPayments') || 'Nuk ka pagesa'}</p>
        )}
      </div>

      {/* Grafik për vonesat në pagesa/fatura */}
      <div className="bg-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📊 Statusi i Invoice-ve të dërguar</h3>
        <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
          <VonesaFaturashChart />
        </ErrorBoundary>
      </div>

      {/* Grafik për statusin e faturave të shpenzimeve */}
      <div className="bg-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📈 Statusi i faturave të shpenzimeve</h3>
        <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
          <StatusiShpenzimeveChart />
        </ErrorBoundary>
      </div>

      {/* Faturat e papaguara */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📌 Faturat e Papaguara</h3>
        {safeChartData.unpaid.length === 0 ? (
          <p className="text-gray-500 italic">{t('adminDashboard.allInvoicesPaid') || 'Të gjitha faturat janë paguar'}</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {safeChartData.unpaid.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <a href={`/admin/contracts/${item.contractNumber}`} className="font-bold text-red-700 underline cursor-pointer">
                  🔴 {t('adminDashboard.contract') || 'Kontrata'} #{item.contractNumber || ''}
                </a>
                <span className="font-bold text-black">{t('adminDashboard.invoiceNumber') || 'Numri i faturës'} <b>{item.invoiceNumber || ''}</b></span>
                <span className="font-bold text-blue-700 flex items-center gap-1">🏢 {t('adminDashboard.site') || 'Site'} {(() => {
                  let c = null;
                  if (item.contract_id && safeChartData.contracts.length) {
                    c = safeChartData.contracts.find(c => String(c.id) === String(item.contract_id));
                  }
                  if (!c && item.contractNumber && safeChartData.contracts.length) {
                    c = safeChartData.contracts.find(c => String(c.contract_number) === String(item.contractNumber));
                  }
                  return c ? `${c.site_name || c.siteName || ''}` : '';
                })()}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.total !== undefined ? `£${Number(item.total).toFixed(2)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shpenzimet e papaguara */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full mb-6 md:mb-8">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📂 {t('adminDashboard.unpaidExpensesTitle') || 'Shpenzimet e papaguara'}</h3>
        {safeChartData.unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic">{t('adminDashboard.allExpensesPaid') || 'Të gjitha shpenzimet janë paguar'}</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {safeChartData.unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold flex items-center gap-1">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                <span className="font-bold text-lg">{item.type || ''}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.gross !== undefined ? `£${Number(item.gross).toFixed(2)}` : ''}</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  🏢 {(() => {
                    if (!item.contract_id || !safeChartData.contracts.length) return '';
                    const c = safeChartData.contracts.find(c => String(c.id) === String(item.contract_id));
                    return c ? `${c.site_name || c.siteName || ''}` : '';
                  })()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VonesaFaturashChart() {
  // Simple translation function for this component
  const t = (key, fallback = key) => {
    const translations = {
      'adminDashboard.loading': 'Duke ngarkuar...',
      'adminDashboard.noInvoiceData': 'Nuk ka të dhëna',
      'adminDashboard.loading.en': 'Loading...',
      'adminDashboard.noInvoiceData.en': 'No data',
    };
    
    const userLanguage = localStorage.getItem('language') || 'sq';
    const langKey = userLanguage === 'en' ? `${key}.en` : key;
    
    return translations[langKey] || translations[key] || fallback || key;
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        setError(false);
        const res = await api.get("/api/invoices");
        const invoices = res.data || [];
        
        // Validate data structure
        if (!Array.isArray(invoices)) {
          throw new Error('Invalid invoices data structure');
        }
        
        // Thjeshtëzo: vetëm paid TRUE vs FALSE
        const result = { "Paguar": 0, "Pa paguar": 0 };
        
        invoices.forEach(inv => {
          if (inv && typeof inv === 'object' && inv.paid) {
            result["Paguar"]++;
          } else if (inv && typeof inv === 'object') {
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
      } catch (error) {
        console.error('[ERROR] Failed to fetch invoices:', error);
        setError(true);
        // Nëse ka error, vendos të dhëna bosh
        setData([
          { name: "Paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[0] },
          { name: "Pa paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[1] }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchInvoices();
  }, []);

  if (loading) {
    return <div className="text-center py-8">{t('adminDashboard.loading') || 'Duke ngarkuar...'}</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-8">Gabim në ngarkimin e të dhënave</div>;
  }

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{t('adminDashboard.noInvoiceData') || 'Nuk ka të dhëna'}</div>;
  }

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
          label={({ name, value, percent }) => `${name}`}
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
          formatter={(value, name) => {
            try {
              return [value, name];
            } catch (error) {
              console.error('[ERROR] Tooltip formatter error:', error);
              return [value, 'Unknown'];
            }
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function StatusiShpenzimeveChart() {
  // Simple translation function for this component
  const t = (key, fallback = key) => {
    const translations = {
      'adminDashboard.loading': 'Duke ngarkuar...',
      'adminDashboard.noExpenseData': 'Nuk ka të dhëna',
      'adminDashboard.loading.en': 'Loading...',
      'adminDashboard.noExpenseData.en': 'No data',
    };
    
    const userLanguage = localStorage.getItem('language') || 'sq';
    const langKey = userLanguage === 'en' ? `${key}.en` : key;
    
    return translations[langKey] || translations[key] || fallback || key;
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    async function fetchExpensesInvoices() {
      try {
        setLoading(true);
        setError(false);
        // Merr të gjitha shpenzimet nga expenses
        const res = await api.get("/api/expenses");
        const expenses = res.data || [];
        
        // Validate data structure
        if (!Array.isArray(expenses)) {
          throw new Error('Invalid expenses data structure');
        }
        
        // Llogarit statusin e pagesës për shpenzimet
        const result = { "Paguar": 0, "Pa paguar": 0 };
        
        expenses.forEach(exp => {
          if (exp && typeof exp === 'object' && exp.paid) {
            result["Paguar"]++;
          } else if (exp && typeof exp === 'object') {
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
      } catch (error) {
        console.error('[ERROR] Failed to fetch expenses:', error);
        setError(true);
        // Nëse ka error, vendos të dhëna bosh
        setData([
          { name: "Paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[0] },
          { name: "Pa paguar: 0 (0%)", value: 0, color: STATUS_CHART_COLORS[1] }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchExpensesInvoices();
  }, []);

  if (loading) {
    return <div className="text-center py-8">{t('adminDashboard.loading') || 'Duke ngarkuar...'}</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-8">Gabim në ngarkimin e të dhënave</div>;
  }

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{t('adminDashboard.noExpenseData') || 'Nuk ka të dhëna'}</div>;
  }

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
          label={({ name, value, percent }) => `${name}`}
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
          formatter={(value, name) => {
            try {
              return [value, name];
            } catch (error) {
              console.error('[ERROR] Tooltip formatter error:', error);
              return [value, 'Unknown'];
            }
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ShpenzimePerSiteChart({ allExpenses, contracts, structuredWorkHours, allPayments }) {
  // Simple translation function for this component
  const t = (key, fallback = key) => {
    const translations = {
      'adminDashboard.loading': 'Duke ngarkuar...',
      'adminDashboard.noExpenseData': 'Nuk ka të dhëna',
      'adminDashboard.calcExplanation': 'Shpjegimi i llogaritjes',
      'adminDashboard.calcExpenses': 'Llogaritja e shpenzimeve',
      'adminDashboard.calcWorkHours': 'Llogaritja e orëve',
      'adminDashboard.calcTotal': 'Totali i përgjithshëm',
      'adminDashboard.totalAmount': 'Shuma totale',
      'adminDashboard.expenses': 'Shpenzimet',
      'adminDashboard.workHours': 'Orët e punuara',
      'common.total': 'Total',
      'adminDashboard.loading.en': 'Loading...',
      'adminDashboard.noExpenseData.en': 'No data',
      'adminDashboard.calcExplanation.en': 'Calculation explanation',
      'adminDashboard.calcExpenses.en': 'Expenses calculation',
      'adminDashboard.calcWorkHours.en': 'Work hours calculation',
      'adminDashboard.calcTotal.en': 'Total calculation',
      'adminDashboard.totalAmount.en': 'Total amount',
      'adminDashboard.expenses.en': 'Expenses',
      'adminDashboard.workHours.en': 'Work Hours',
      'common.total.en': 'Total',
    };
    
    const userLanguage = localStorage.getItem('language') || 'sq';
    const langKey = userLanguage === 'en' ? `${key}.en` : key;
    
    return translations[langKey] || translations[key] || fallback || key;
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchAllExpensesData() {
      try {
        setLoading(true);
        
        // Merr të gjitha shpenzimet nga expenses_invoice table
        const expensesRes = await api.get("/api/expenses");
        const expenses = expensesRes.data || [];
        
        // Merr të gjitha work_hours për të llogaritur hours * rate
        const workHoursRes = await api.get("/api/work-hours");
        const workHours = workHoursRes.data || [];
        
        // Merr të gjitha punonjësit për hourly rates
        const employeesRes = await api.get("/api/employees");
        const employees = employeesRes.data || [];
        
        // Llogarit shpenzimet totale sipas site-ve
        const expensesBySite = {};
        
        // 1. Shto shpenzimet nga expenses_invoice table - kolona [gross] sipas site-ve
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
              // Përdor kolonën [gross] nga expenses_invoice
              expensesBySite[site].expenses += parseFloat(exp.gross || 0);
            }
          }
        });
        
        // 2. Shto work_hours: kolona [hours] × kolona [rate] sipas site-ve
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
            // Llogarit si: hours * rate nga work_hours table
            const hours = parseFloat(wh.hours || 0);
            const rate = parseFloat(wh.rate || 0);
            const workHoursCost = hours * rate;
            expensesBySite[site].workHours += workHoursCost;
          }
        });
        
        // 3. Llogarit totalin për çdo site
        Object.keys(expensesBySite).forEach(site => {
          expensesBySite[site].total = 
            expensesBySite[site].expenses + 
            expensesBySite[site].workHours;
        });
        
        // Konverto në array dhe sorto
        const chartData = Object.entries(expensesBySite)
          .map(([site, data]) => ({
            site,
            expenses: parseFloat(data.expenses),
            workHours: parseFloat(data.workHours),
            total: parseFloat(data.total)
          }))
          .sort((a, b) => b.total - a.total);
        
        setData(chartData);
        
      } catch (error) {
        console.error('[ERROR] Failed to fetch expenses data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllExpensesData();
  }, [allExpenses, contracts, structuredWorkHours, allPayments]);
  
  if (loading) {
    return <div className="text-center py-8">{t('adminDashboard.loading') || 'Duke ngarkuar...'}</div>;
  }
  
  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{t('adminDashboard.noExpenseData') || 'Nuk ka të dhëna'}</div>;
  }
  
  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">📊 {t('adminDashboard.calcExplanation') || 'Shpjegimi i llogaritjes'}</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>{t('payments.expenses') || 'Shpenzimet'}:</strong> {t('adminDashboard.calcExpenses') || 'Llogaritja e shpenzimeve'}</p>
          <p><strong>{t('workHours.title') || 'Orët e punuara'}:</strong> {t('adminDashboard.calcWorkHours') || 'Llogaritja e orëve'}</p>
          <p><strong>{t('common.total') || 'Total'}:</strong> {t('adminDashboard.calcTotal') || 'Totali i përgjithshëm'}</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={data} layout="vertical" margin={{ left: 50, right: 50, top: 20, bottom: 20 }} barCategoryGap={18}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" label={{ value: t('adminDashboard.totalAmount') || 'Shuma totale', position: "insideBottomRight", offset: -5 }} tick={{ fontSize: 14 }} />
          <YAxis type="category" dataKey="site" width={220} tick={{ fontSize: 16, fontWeight: 'bold', fill: '#0284c7' }} />
          <Tooltip 
            contentStyle={{ background: '#fffbe9', border: '1px solid #fbbf24', borderRadius: 12, fontSize: 16, color: '#78350f' }} 
            formatter={(v, n) => {
              try {
                return [`£${Number(v).toFixed(2)}`, n === 'total' ? t('common.total') : n];
              } catch (error) {
                console.error('[ERROR] Tooltip formatter error:', error);
                return [`£${Number(v).toFixed(2)}`, 'Unknown'];
              }
            }} 
          />
          <Legend />
          <Bar dataKey="expenses" stackId="a" fill={CHART_COLORS[0]} name={t('adminDashboard.expenses') || 'Shpenzimet'} radius={[0, 0, 0, 0]} />
          <Bar dataKey="workHours" stackId="a" fill={CHART_COLORS[1]} name={t('adminDashboard.workHours') || 'Orët e punuara'} radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusiKontrataveChart({ contracts }) {
  // Simple translation function for this component
  const t = (key, fallback = key) => {
    const translations = {
      'adminDashboard.active': 'Aktiv',
      'adminDashboard.suspended': 'I pezulluar',
      'adminDashboard.completed': 'I përfunduar',
      'adminDashboard.cancelled': 'I anulluar',
      'adminDashboard.pending': 'Në pritje',
      'adminDashboard.inProgress': 'Në progres',
      'adminDashboard.closedWithDelay': 'I mbyllur me vonesë',
      'adminDashboard.closed': 'I mbyllur',
      'adminDashboard.noContractData': 'Nuk ka të dhëna të kontratave',
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
  };

  const [data, setData] = useState([]);
  
  // Ngjyra të ndryshme për çdo status
  const statusColors = {
    'active': '#10b981',      // Jeshile
    'suspended': '#f59e0b',   // Portokalli
    'completed': '#3b82f6',   // Blu
    'cancelled': '#ef4444',   // E kuqe
    'pending': '#8b5cf6',     // Vjollcë
    'ne progres': '#10b981',  // Jeshile për "në progres"
    'pezulluar': '#f59e0b',   // Portokalli për "të pezulluara"
    'mbyllur me vonese': '#ef4444', // E kuqe për "të mbyllura me vonesë"
    'anulluar': '#ef4444',    // E kuqe për "të anuluara"
    'mbyllur': '#3b82f6'      // Blu për "të mbyllura"
  };
  
  useEffect(() => {
    if (!contracts || contracts.length === 0) return;
    
    const statusCount = {};
    contracts.forEach(contract => {
      const status = contract.status || contract.contract_status || 'pending';
      const statusKey = status.toLowerCase();
      statusCount[statusKey] = (statusCount[statusKey] || 0) + 1;
    });
    
    const chartData = Object.entries(statusCount).map(([status, count]) => ({
      name: status === 'active' ? t('adminDashboard.active') || 'Aktiv' : 
            status === 'suspended' ? t('adminDashboard.suspended') || 'I pezulluar' :
            status === 'completed' ? t('adminDashboard.completed') || 'I përfunduar' :
            status === 'cancelled' ? t('adminDashboard.cancelled') || 'I anulluar' :
            status === 'pending' ? t('adminDashboard.pending') || 'Në pritje' :
            status === 'ne progres' ? t('adminDashboard.inProgress') || 'Në progres' :
            status === 'pezulluar' ? t('adminDashboard.suspended') || 'I pezulluar' :
            status === 'mbyllur me vonese' ? t('adminDashboard.closedWithDelay') || 'I mbyllur me vonesë' :
            status === 'anulluar' ? t('adminDashboard.cancelled') || 'I anulluar' :
            status === 'mbyllur' ? t('adminDashboard.closed') || 'I mbyllur' : status,
      value: count,
      color: statusColors[status] || '#6b7280'
    }));
    
    setData(chartData);
  }, [contracts]);

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{t('adminDashboard.noContractData') || 'Nuk ka të dhëna të kontratave'}</div>;
  }

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
          formatter={(value, name) => {
            try {
              return [value, name];
            } catch (error) {
              console.error('[ERROR] Tooltip formatter error:', error);
              return [value, 'Unknown'];
            }
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}