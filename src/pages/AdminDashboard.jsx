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
import { useTranslation } from "react-i18next";

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
  let t;
  
  try {
    const translation = useTranslation();
    t = translation.t;
  } catch (error) {
    console.warn('[WARNING] Translation hook failed, using fallback:', error);
    // Fallback function for translations
    t = (key, fallback = key) => fallback;
  }
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
        let contractsRes, employeesRes, invoicesRes, tasksRes, expensesRes, paymentsRes, workHoursRes;
        
        try {
          [contractsRes, employeesRes, invoicesRes, tasksRes, expensesRes, paymentsRes, workHoursRes] = await Promise.all([
            api.get("/api/contracts"),
            api.get("/api/employees"),
            api.get("/api/invoices"),
            api.get("/api/tasks"),
            api.get("/api/expenses"),
            api.get("/api/payments"),
            api.get("/api/work-hours/structured"),
          ]);
        } catch (apiError) {
          console.error('[ERROR] API call failed:', apiError);
          // Nëse API call dështon, përdor të dhëna bosh
          contractsRes = { data: [] };
          employeesRes = { data: [] };
          invoicesRes = { data: [] };
          tasksRes = { data: [] };
          expensesRes = { data: [] };
          paymentsRes = { data: [] };
          workHoursRes = { data: {} };
        }
        
        // Validate API responses
        if (!contractsRes?.data || !Array.isArray(contractsRes.data)) {
          console.warn('[WARNING] Invalid contracts data, using empty array');
          contractsRes = { data: [] };
        }
        if (!employeesRes?.data || !Array.isArray(employeesRes.data)) {
          console.warn('[WARNING] Invalid employees data, using empty array');
          employeesRes = { data: [] };
        }
        if (!invoicesRes?.data || !Array.isArray(invoicesRes.data)) {
          console.warn('[WARNING] Invalid invoices data, using empty array');
          invoicesRes = { data: [] };
        }
        if (!tasksRes?.data || !Array.isArray(tasksRes.data)) {
          console.warn('[WARNING] Invalid tasks data, using empty array');
          tasksRes = { data: [] };
        }
        if (!expensesRes?.data || !Array.isArray(expensesRes.data)) {
          console.warn('[WARNING] Invalid expenses data, using empty array');
          expensesRes = { data: [] };
        }
        if (!paymentsRes?.data || !Array.isArray(paymentsRes.data)) {
          console.warn('[WARNING] Invalid payments data, using empty array');
          paymentsRes = { data: [] };
        }
        if (!workHoursRes?.data || typeof workHoursRes.data !== 'object') {
          console.warn('[WARNING] Invalid work hours data, using empty object');
          workHoursRes = { data: {} };
        }
        
        setContracts(snakeToCamel(contractsRes.data || []));
        setEmployees(snakeToCamel(employeesRes.data || []));
        
        const invoices = snakeToCamel(invoicesRes.data || []);
        const allTasksData = snakeToCamel(tasksRes.data || []);
        const allExpenses = snakeToCamel(expensesRes.data || []);
        const allPayments = snakeToCamel(paymentsRes.data || []);
        const structuredWorkHours = snakeToCamel(workHoursRes.data || {});
        
        setAllExpenses(allExpenses);
        setStructuredWorkHours(structuredWorkHours);
        
        // Store allPayments in component state for use in charts
        setAllPayments(allPayments);
        
        // Calculate current week - FIXED to match backend getWeekLabel exactly
        const today = new Date();
        const day = today.getDay();
        
        // Backend uses Monday-Sunday week, so we need to match exactly
        let diff;
        if (day === 0) {
          // Sunday - go back 6 days to get to Monday
          diff = -6;
        } else {
          // Monday-Saturday - go back (day-1) days to get to Monday
          diff = -(day - 1);
        }
        
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const thisWeek = `${monday.toISOString().slice(0, 10)} - ${sunday.toISOString().slice(0, 10)}`;
        
        // Gjej javën e fundit që ka të dhëna
        let weekToUse = thisWeek;
        let weekHasData = false;
        
        // Kontrollo nëse jawa aktuale ka të dhëna
        const currentWeekData = allPayments.filter(p => (p.weekLabel || p.week_label) === thisWeek);
        if (currentWeekData.length > 0) {
          weekToUse = thisWeek;
          weekHasData = true;
        } else {
          // Gjej javën e fundit që ka të dhëna
          const allWeeks = [...new Set(allPayments.map(p => p.weekLabel || p.week_label))].sort();
          if (allWeeks.length > 0) {
            weekToUse = allWeeks[allWeeks.length - 1]; // Jawa e fundit
            weekHasData = true;
          }
        }
        
        // Gjej pagesat për këtë javë
        const thisWeekPayments = allPayments.filter(p => p && (p.weekLabel || p.week_label) === weekToUse);
        
        // Gjej pagesat e paguara për këtë javë
        const paidThisWeek = thisWeekPayments.filter(p => p && (p.isPaid || p.is_paid) === true);
        
        // Llogarit totalin e paguar
        const totalPaid = paidThisWeek.reduce((sum, p) => {
          if (!p) return sum;
          const amount = parseFloat(p.grossAmount || p.gross_amount || 0);
          return isNaN(amount) ? sum : sum + amount;
        }, 0);
        
        // Llogarit orët e punuara për këtë javë
        let totalWorkHours = 0;
        const siteHours = {};
        
        if (structuredWorkHours && typeof structuredWorkHours === 'object') {
          Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
            if (!empData || typeof empData !== 'object') return;
            
            const weekData = empData[weekToUse] || {};
            
            Object.values(weekData).forEach(dayData => {
              if (dayData && dayData.hours) {
                const hours = parseFloat(dayData.hours);
                if (!isNaN(hours)) {
                  totalWorkHours += hours;
                  if (dayData.site) {
                    siteHours[dayData.site] = (siteHours[dayData.site] || 0) + hours;
                  }
                }
              }
            });
          });
        }
        
        // Llogarit total gross për këtë javë nga work_hours
        let totalGrossThisWeek = 0;
        if (structuredWorkHours && typeof structuredWorkHours === 'object') {
          Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
            if (!empData || typeof empData !== 'object') return;
            
            const weekData = empData[weekToUse] || {};
            const emp = employees.find(e => e && e.id === empId);
            const hourlyRate = parseFloat(emp?.hourlyRate || emp?.hourly_rate || 0);
            
            if (isNaN(hourlyRate)) return;
            
            Object.values(weekData).forEach(dayData => {
              if (dayData && dayData.hours) {
                const hours = parseFloat(dayData.hours);
                if (!isNaN(hours)) {
                  totalGrossThisWeek += hours * hourlyRate;
                }
              }
            });
          });
        }
        
        // Top 5 punonjësit më të paguar (vetëm të paguarat)
        const top5Employees = paidThisWeek
          .filter(p => p && typeof p === 'object')
          .sort((a, b) => {
            const aAmount = parseFloat(a?.grossAmount || a?.gross_amount || 0);
            const bAmount = parseFloat(b?.grossAmount || b?.gross_amount || 0);
            return isNaN(bAmount) ? -1 : isNaN(aAmount) ? 1 : bAmount - aAmount;
          })
          .slice(0, 5)
          .map(p => {
            if (!p) return null;
            
            const emp = employees.find(e => e && e.id === (p.employeeId || p.employee_id));
            const grossAmount = parseFloat(p.grossAmount || p.gross_amount || 0);
            
            return {
              id: p.employeeId || p.employee_id,
              employee_id: p.employeeId || p.employee_id, // Add this for consistency
              name: emp ? `${emp.firstName || emp.first_name || emp.name || 'Unknown'} ${emp.lastName || emp.last_name || ''}`.trim() : 'Unknown',
              grossAmount: isNaN(grossAmount) ? 0 : grossAmount,
              isPaid: p.isPaid || p.is_paid,
              photo: emp?.photo || null,
              // Add these fields for better name display
              firstName: emp?.firstName || emp?.first_name || '',
              lastName: emp?.lastName || emp?.last_name || ''
            };
          })
          .filter(Boolean); // Remove any null entries
        
        const finalStats = {
          thisWeek: weekToUse,
          totalPaid: totalPaid,
          totalProfit: totalPaid * 0.20,
          workHoursBysite: Object.entries(siteHours).map(([site, hours]) => ({ site, hours })),
          top5Employees: top5Employees,
          totalWorkHours: totalWorkHours,
          totalHoursThisWeek: totalWorkHours,
          totalGrossThisWeek: totalGrossThisWeek,
          paidEmployeesCount: paidThisWeek.length,
          totalEmployeesWithHours: Object.keys(structuredWorkHours).length,
          isCurrentWeek: weekToUse === thisWeek,
          weekLabel: weekToUse
        };
        
        setDashboardStats(finalStats);
        
        setAllTasks(allTasksData);
        
        // Process unpaid invoices
        const unpaidList = [];
        invoices.forEach(inv => {
          if (inv && typeof inv === 'object' && !inv.paid && Array.isArray(inv.items)) {
            try {
              const net = inv.items.reduce((a, i) => {
                if (!i || typeof i !== 'object') return a;
                const amount = parseFloat(i.amount || 0);
                return a + (isNaN(amount) ? 0 : amount);
              }, 0);
              
              if (isNaN(net) || net <= 0) return;
              
              const vat = net * 0.2;
              const other = parseFloat(inv.other || 0);
              const total = net + vat + (isNaN(other) ? 0 : other);
              
              if (total <= 0) return;
              
              const contract = contractsRes.data.find(c => c && c.contract_number === inv.contract_number);
              unpaidList.push({
                contractNumber: inv.contractNumber || inv.contract_number || "-",
                invoiceNumber: inv.invoiceNumber || "-",
                total,
                siteName: contract?.site_name || contract?.siteName || "-"
              });
            } catch (error) {
              console.warn('[WARNING] Failed to process invoice:', inv, error);
            }
          }
        });
        setUnpaid(unpaidList);
        
        // Process unpaid expenses
        const unpaidExpensesList = allExpenses
          .filter(exp => exp && typeof exp === 'object' && !exp.paid)
          .map(exp => ({
            id: exp.id || exp.expense_id || '',
            date: exp.date || exp.expense_date || '',
            type: exp.type || exp.description || exp.expense_type || '',
            gross: exp.gross || exp.amount || exp.expense_amount || 0,
            description: exp.description || exp.expense_description || '',
            contract_id: exp.contractId || exp.contract_id || exp.contractId || ''
          }))
          .filter(exp => exp.id && exp.gross > 0); // Only include valid expenses
        setUnpaidExpenses(unpaidExpensesList);
        
        // Process weekly profit data
        const weekLabels = [...new Set(allPayments
          .filter(p => p && typeof p === 'object')
          .map(p => p.weekLabel || p.week_label)
          .filter(Boolean)
        )].sort();
        
        const weeklyData = weekLabels.map(week => {
          const weekPayments = allPayments.filter(p => p && (p.weekLabel || p.week_label) === week);
          const totalPaid = weekPayments.reduce((sum, p) => {
            if (!p || typeof p !== 'object') return sum;
            const amount = parseFloat(p.grossAmount || p.gross_amount || 0);
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
          return { week, totalPaid };
        });
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
        <div className="text-center md:text-left">
         
          <div className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">{t('adminDashboard.title') || 'Admin Dashboard'}</div>
          <div className="text-sm md:text-lg font-medium text-purple-700">{t('adminDashboard.subtitle') || 'Menaxhimi i sistemit'}</div>
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
          <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="border p-2 rounded text-sm md:text-base">
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
            {t('adminDashboard.totalHoursWorked') || 'Totali i orëve të punuara'} <span className="text-blue-600">{dashboardStats.totalWorkHours}</span>
          </div>
        {dashboardStats.workHoursBysite && dashboardStats.workHoursBysite.length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dashboardStats.workHoursBysite} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: t('workHours.hours'), position: "insideBottomRight", offset: -5 }} />
              <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#a21caf' }} />
              <Tooltip formatter={v => [v, t('workHours.hours')]} />
              <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={32}>
                {dashboardStats.workHoursBysite.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
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
        {contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").map(c => {
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
              <Tooltip formatter={v => [`${v}%`, t('common.progress')]} />
              <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={30}>
                {contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
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
        {dashboardStats.top5Employees && dashboardStats.top5Employees.length > 0 ? (
          <ul className="space-y-3 text-gray-800">
            {dashboardStats.top5Employees.map((e, i) => {
              const amount = e.grossAmount ?? e.amount ?? 0;
              
              // Merr të dhënat e plota të punonjësit nga employees array
              const employeeData = employees.find(emp => emp.id === e.employee_id || emp.id === e.id);
              
              const employeeName = employeeData 
                ? `${employeeData.firstName || employeeData.first_name || employeeData.user_first_name || ''} ${employeeData.lastName || employeeData.last_name || employeeData.user_last_name || ''}`.trim()
                : e.name || 'Unknown';
              
              // Use the name from the top5Employees data if available
              const displayName = e.firstName && e.lastName 
                ? `${e.firstName} ${e.lastName}`.trim()
                : employeeName;
              
              const photoSrc = employeeData?.photo
                ? employeeData.photo.startsWith('data:image')
                  ? employeeData.photo
                  : employeeData.photo
                : '/placeholder.png';
              
              return (
                <li key={e.id} className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
                  <div className="relative w-14 h-14">
                    {employeeData?.photo ? (
                      <img 
                        src={photoSrc} 
                        alt={displayName} 
                        className="w-full h-full rounded-full object-cover border-2 border-blue-300 shadow"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
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
                      {e.isPaid ? `✅ ${t('adminDashboard.paid') || 'Paguar'}` : `⏳ ${t('adminDashboard.unpaid') || 'Pa paguar'}`}
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
          <ShpenzimePerSiteChart allExpenses={allExpenses} contracts={contracts} structuredWorkHours={structuredWorkHours} allPayments={allPayments} />
        </ErrorBoundary>
      </div>

      {/* Grafik për statusin e kontratave */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📊 Statusi i kontratave</h3>
        <ErrorBoundary fallback={<div className="text-center text-red-500 py-8">Gabim në ngarkimin e grafikut</div>}>
          <StatusiKontrataveChart contracts={contracts} />
        </ErrorBoundary>
      </div>

      {/* Grafik për pagesat javore */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">💸 Pagesa Javore për stafin</h3>
        {weeklyProfitData.filter(w => w.totalPaid > 0).length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={weeklyProfitData.filter(w => w.totalPaid > 0)} margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6366f1', angle: -30, textAnchor: 'end' }} interval={0} height={80} />
              <YAxis label={{ value: "Pagesa totale (£)", angle: -90, position: "insideLeft", offset: 0 }} tick={{ fontSize: 14, fill: '#6366f1' }} />
              <Tooltip formatter={v => [`£${Number(v).toFixed(2)}`, "Pagesa"]} />
              <Bar dataKey="totalPaid" radius={[6, 6, 0, 0]} barSize={32}>
                {weeklyProfitData.filter(w => w.totalPaid > 0).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
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
        {unpaid.length === 0 ? (
          <p className="text-gray-500 italic">{t('adminDashboard.allInvoicesPaid') || 'Të gjitha faturat janë paguar'}</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaid.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <a href={`/admin/contracts/${item.contractNumber}`} className="font-bold text-red-700 underline cursor-pointer">
                  🔴 {t('adminDashboard.contract') || 'Kontrata'} #{item.contractNumber || ''}
                </a>
                <span className="font-bold text-black">{t('adminDashboard.invoiceNumber') || 'Numri i faturës'} <b>{item.invoiceNumber || ''}</b></span>
                <span className="font-bold text-blue-700 flex items-center gap-1">🏢 {t('adminDashboard.site') || 'Site'} {(() => {
                  let c = null;
                  if (item.contract_id && contracts.length) {
                    c = contracts.find(c => String(c.id) === String(item.contract_id));
                  }
                  if (!c && item.contractNumber && contracts.length) {
                    c = contracts.find(c => String(c.contract_number) === String(item.contractNumber));
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
        {unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic">{t('adminDashboard.allExpensesPaid') || 'Të gjitha shpenzimet janë paguar'}</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold flex items-center gap-1">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                <span className="font-bold text-lg">{item.type || ''}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.gross !== undefined ? `£${Number(item.gross).toFixed(2)}` : ''}</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  🏢 {(() => {
                    if (!item.contract_id || !contracts.length) return '';
                    const c = contracts.find(c => String(c.id) === String(item.contract_id));
                    return c ? `${c.site_name || c.siteName || ''}` : '';
                  })()}
                </span>
                <span className="text-gray-700">{item.description || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VonesaFaturashChart() {
  const { t } = useTranslation();
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
          formatter={(value, name) => [value, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function StatusiShpenzimeveChart() {
  const { t } = useTranslation();
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
          formatter={(value, name) => [value, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ShpenzimePerSiteChart({ allExpenses, contracts, structuredWorkHours, allPayments }) {
  const { t } = useTranslation();
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
            formatter={(v, n) => [`£${Number(v).toFixed(2)}`, n === 'total' ? t('common.total') : n]} 
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
  const { t } = useTranslation();
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
          formatter={(value, name) => [value, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}