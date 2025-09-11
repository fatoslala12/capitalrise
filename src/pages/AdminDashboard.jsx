// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Legend
} from "recharts";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLoader from "../components/ui/PageLoader";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid, Stack } from "../components/ui/Layout";
import { CountStatCard, MoneyStatCard } from "../components/ui/StatCard";
import { StatusBadge, PaymentBadge } from "../components/ui/Badge";
import EmptyState, { NoTasksEmpty } from "../components/ui/EmptyState";

// Global color palette for charts
const CHART_COLORS = ["#a5b4fc", "#fbcfe8", "#fef08a", "#bbf7d0", "#bae6fd", "#fca5a5", "#fdba74", "#ddd6fe"];

// Stronger colors for status charts (better readability)
const STATUS_CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

// Translation function
const tr = (key, fallback = key) => {
  const userLanguage = localStorage.getItem('language') || 'en';
  const translations = {
    'adminDashboard.title': 'Admin Panel',
    'adminDashboard.subtitle': 'Statistics, tasks, payments and more',
    'adminDashboard.activeSites': 'Active Sites',
    'adminDashboard.activeEmployees': 'Active Employees',
    'adminDashboard.weeklyHours': 'Weekly Hours',
    'adminDashboard.weeklyPayments': 'Weekly Payments',
    'adminDashboard.tasks': 'Tasks',
    'adminDashboard.filter': 'Filter',
    'adminDashboard.onlyActive': 'Active only',
    'adminDashboard.onlyCompleted': 'Completed only',
    'adminDashboard.all': 'All',
    'adminDashboard.total': 'Total',
    'adminDashboard.completed': 'Completed',
    'adminDashboard.ongoing': 'In Progress',
    'adminDashboard.deadline': 'Deadline',
    'adminDashboard.by': 'By',
    'adminDashboard.weeklyHoursBySite': 'Weekly Hours by Site',
    'adminDashboard.contractProgress': 'Contract Progress',
    'adminDashboard.expenseStatus': 'Expense Status',
    'adminDashboard.invoiceStatus': 'Invoice Status',
    'adminDashboard.unpaidInvoices': 'Unpaid Invoices',
    'adminDashboard.unpaidExpenses': 'Unpaid Expenses',
    'adminDashboard.allInvoicesPaid': 'All invoices are paid',
    'adminDashboard.allExpensesPaid': 'All expenses are paid',
    'adminDashboard.contract': 'Contract',
    'adminDashboard.invoiceNumber': 'Invoice Number',
    'adminDashboard.site': 'Site',
    'adminDashboard.amount': 'Amount',
    'adminDashboard.date': 'Date',
    'adminDashboard.type': 'Type',
    'adminDashboard.description': 'Description',
    'adminDashboard.loading': 'Loading...',
    'adminDashboard.noData': 'No data',
    'adminDashboard.noWorkHours': 'No work hours recorded for this week',
    'adminDashboard.noActiveContracts': 'No active contracts at the moment',
    'adminDashboard.noPayments': 'No payments recorded for this week',
    'adminDashboard.contractNumber': 'Contract #',
    'adminDashboard.overdue': 'Overdue!',
    'adminDashboard.dueBy': 'Due by',
    'adminDashboard.status': 'Status',
    'adminDashboard.inProgress': 'In Progress',
    'adminDashboard.suspended': 'Suspended',
    'adminDashboard.completed': 'Completed',
    'adminDashboard.cancelled': 'Cancelled',
    'adminDashboard.pending': 'Pending',
    'adminDashboard.closedWithDelay': 'Closed with Delay',
    'adminDashboard.closed': 'Closed',
    'adminDashboard.active': 'Active',
    'adminDashboard.pezulluar': 'Suspended',
    'adminDashboard.mbyllurMeVonese': 'Closed with Delay',
    'adminDashboard.anulluar': 'Cancelled',
    'adminDashboard.mbyllur': 'Closed',
    'adminDashboard.neProgres': 'In Progress',
    'adminDashboard.aktive': 'Active',
    'adminDashboard.tePezulluara': 'Suspended',
    'adminDashboard.teMbyllura': 'Closed',
    'adminDashboard.teAnuluara': 'Cancelled',
    'adminDashboard.nePritje': 'Pending',
    
    // Albanian translations
    'adminDashboard.title.sq': 'Paneli i Administrimit',
    'adminDashboard.subtitle.sq': 'Statistika, detyra, pagesa dhe më shumë',
    'adminDashboard.activeSites.sq': 'Site aktive',
    'adminDashboard.activeEmployees.sq': 'Punonjës aktivë',
    'adminDashboard.weeklyHours.sq': 'Orë të punuara këtë javë',
    'adminDashboard.weeklyPayments.sq': 'Pagesa për punëtorët këtë javë',
    'adminDashboard.tasks.sq': 'Detyrat',
    'adminDashboard.filter.sq': 'Filtro',
    'adminDashboard.onlyActive.sq': 'Vetëm aktive',
    'adminDashboard.onlyCompleted.sq': 'Vetëm të përfunduara',
    'adminDashboard.all.sq': 'Të gjitha',
    'adminDashboard.total.sq': 'Total',
    'adminDashboard.completed.sq': 'Përfunduar',
    'adminDashboard.ongoing.sq': 'Në progres',
    'adminDashboard.deadline.sq': 'Afati',
    'adminDashboard.by.sq': 'Nga',
    'adminDashboard.weeklyHoursBySite.sq': 'Orët sipas site-ve këtë javë',
    'adminDashboard.contractProgress.sq': 'Progresi i kontratave',
    'adminDashboard.expenseStatus.sq': 'Statusi i Shpenzimeve',
    'adminDashboard.invoiceStatus.sq': 'Statusi i Faturave',
    'adminDashboard.unpaidInvoices.sq': 'Faturat e Papaguara',
    'adminDashboard.unpaidExpenses.sq': 'Shpenzimet e Papaguara',
    'adminDashboard.allInvoicesPaid.sq': 'Të gjitha faturat janë të paguara',
    'adminDashboard.allExpensesPaid.sq': 'Të gjitha shpenzimet janë të paguara',
    'adminDashboard.contract.sq': 'Kontrata',
    'adminDashboard.invoiceNumber.sq': 'Nr. Fature',
    'adminDashboard.site.sq': 'Site',
    'adminDashboard.amount.sq': 'Shuma',
    'adminDashboard.date.sq': 'Data',
    'adminDashboard.type.sq': 'Tipi',
    'adminDashboard.description.sq': 'Përshkrimi',
    'adminDashboard.loading.sq': 'Duke ngarkuar...',
    'adminDashboard.noData.sq': 'Nuk ka të dhëna',
    'adminDashboard.noWorkHours.sq': 'Nuk ka orë pune të regjistruara për këtë javë',
    'adminDashboard.noActiveContracts.sq': 'Nuk ka kontrata aktive për momentin',
    'adminDashboard.noPayments.sq': 'Nuk ka pagesa të regjistruara për këtë javë',
    'adminDashboard.contractNumber.sq': 'Kontrata #',
    'adminDashboard.overdue.sq': 'Ka kaluar afati!',
    'adminDashboard.dueBy.sq': 'Afat deri më',
    'adminDashboard.status.sq': 'Statusi',
    'adminDashboard.inProgress.sq': 'Në progres',
    'adminDashboard.suspended.sq': 'I pezulluar',
    'adminDashboard.completed.sq': 'I përfunduar',
    'adminDashboard.cancelled.sq': 'I anulluar',
    'adminDashboard.pending.sq': 'Në pritje',
    'adminDashboard.closedWithDelay.sq': 'I mbyllur me vonesë',
    'adminDashboard.closed.sq': 'I mbyllur',
    'adminDashboard.active.sq': 'Aktiv',
    'adminDashboard.pezulluar.sq': 'I pezulluar',
    'adminDashboard.mbyllurMeVonese.sq': 'I mbyllur me vonesë',
    'adminDashboard.anulluar.sq': 'I anulluar',
    'adminDashboard.mbyllur.sq': 'I mbyllur',
    'adminDashboard.neProgres.sq': 'Në progres',
    'adminDashboard.aktive.sq': 'Aktive',
    'adminDashboard.tePezulluara.sq': 'Të pezulluara',
    'adminDashboard.teMbyllura.sq': 'Të mbyllura',
    'adminDashboard.teAnuluara.sq': 'Të anuluara',
    'adminDashboard.nePritje.sq': 'Në pritje',
    
    // Missing translations that are used with t() function
    'adminDashboard.hoursBySiteThisWeek': 'Weekly Hours by Site',
    'adminDashboard.hoursBySiteThisWeek.sq': 'Orët sipas site-ve këtë javë',
    'adminDashboard.totalHoursWorked': 'Total Hours Worked',
    'adminDashboard.totalHoursWorked.sq': 'Orët totale të punuara',
    'adminDashboard.topPaidEmployees': 'Top Paid Employees',
    'adminDashboard.topPaidEmployees.sq': 'Top 5 Punonjësit më të paguar',
    'adminDashboard.contractsProgressTitle': 'Contract Status Distribution',
    'adminDashboard.contractsProgressTitle.sq': 'Shpërndarja e Statusit të Kontratave',
    'adminDashboard.weeklyStaffPayments': 'Weekly Staff Payments',
    'adminDashboard.weeklyStaffPayments.sq': 'Pagesa Javore për stafin',
    'adminDashboard.noDeadline': 'No deadline',
    'adminDashboard.noDeadline.sq': 'Pa afat',
    'adminDashboard.paid': 'Paid',
    'adminDashboard.paid.sq': 'E paguar',
    'adminDashboard.unpaid': 'Unpaid',
    'adminDashboard.unpaid.sq': 'E papaguar',
    'adminDashboard.loadingStats': 'Loading statistics...',
    'adminDashboard.loadingStats.sq': 'Duke ngarkuar statistikat...',
    'adminDashboard.noWorkHoursThisWeek': 'No work hours recorded for this week',
    'adminDashboard.noWorkHoursThisWeek.sq': 'Nuk ka orë pune të regjistruara për këtë javë',
    'adminDashboard.noContractStatusData': 'No data for contract status',
    'adminDashboard.noContractStatusData.sq': 'Nuk ka të dhëna për statusin e kontratave',
    'adminDashboard.noInvoiceStatusData': 'No data for invoice status',
    'adminDashboard.noInvoiceStatusData.sq': 'Nuk ka të dhëna për statusin e invoice-ve',
    'adminDashboard.noExpenseStatusData': 'No data for expense status',
    'adminDashboard.noExpenseStatusData.sq': 'Nuk ka të dhëna për statusin e faturave të shpenzimeve',
    'adminDashboard.noExpensesBySiteData': 'No data for expenses by site',
    'adminDashboard.noExpensesBySiteData.sq': 'Nuk ka të dhëna për shpenzimet sipas site-ve',
    'adminDashboard.hours': 'Hours',
    'adminDashboard.hours.sq': 'Orë',
    'adminDashboard.progress': 'Progress',
    'adminDashboard.progress.sq': 'Progresi',
    'adminDashboard.payment': 'Payment',
    'adminDashboard.payment.sq': 'Pagesa',
    'adminDashboard.total': 'Total',
    'adminDashboard.total.sq': 'Totali',
    'adminDashboard.expenses': 'Expenses',
    'adminDashboard.expenses.sq': 'Shpenzime',
    'adminDashboard.workHours': 'Work Hours',
    'adminDashboard.workHours.sq': 'Orët e Punës',
    'adminDashboard.calculationExplanation': 'Calculation explanation:',
    'adminDashboard.calculationExplanation.sq': 'Shpjegim i llogaritjes:',
    'adminDashboard.expensesFromTable': 'Expenses from expenses_invoice table - column [gross] by sites',
    'adminDashboard.expensesFromTable.sq': 'Shpenzimet nga tabela expenses_invoice - kolona [gross] sipas site-ve',
    'adminDashboard.workHoursCalculation': 'Work hours × rate from work_hours table - column [hours] × column [rate]',
    'adminDashboard.workHoursCalculation.sq': 'Orët e punuara × rate nga tabela work_hours - kolona [hours] × kolona [rate]',
    'adminDashboard.totalCalculation': 'Total: Expenses + Work Hours',
    'adminDashboard.totalCalculation.sq': 'Totali: Shpenzime + Orët e Punës',
    'adminDashboard.totalAmount': 'Total Amount (£)',
    'adminDashboard.totalAmount.sq': 'Shuma totale (£)',
    'adminDashboard.expensesFromInvoice': 'Expenses (expenses_invoice.gross)',
    'adminDashboard.expensesFromInvoice.sq': 'Shpenzime (expenses_invoice.gross)',
    'adminDashboard.workHoursFromTable': 'Work Hours (work_hours.hours × rate)',
    'adminDashboard.workHoursFromTable.sq': 'Orët e Punës (work_hours.hours × rate)'
  };
  
  const langKey = userLanguage === 'sq' ? `${key}.sq` : key;
  return translations[langKey] || translations[key] || fallback;
};

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
  const { t } = useTranslation();
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
        const thisWeekPayments = allPayments.filter(p => (p.weekLabel || p.week_label) === weekToUse);
        
        // Gjej pagesat e paguara për këtë javë
        const paidThisWeek = thisWeekPayments.filter(p => (p.isPaid || p.is_paid) === true);
        
        // Llogarit totalin e paguar
        const totalPaid = paidThisWeek.reduce((sum, p) => sum + parseFloat(p.grossAmount || p.gross_amount || 0), 0);
        
        // Llogarit orët e punuara për këtë javë
        let totalWorkHours = 0;
        const siteHours = {};
        
        Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
          const weekData = empData[weekToUse] || {};
          
          Object.values(weekData).forEach(dayData => {
            if (dayData?.hours) {
              const hours = parseFloat(dayData.hours);
              totalWorkHours += hours;
              if (dayData.site) {
                siteHours[dayData.site] = (siteHours[dayData.site] || 0) + hours;
              }
            }
          });
        });
        
        // Llogarit total gross për këtë javë nga work_hours
        let totalGrossThisWeek = 0;
        Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
          const weekData = empData[weekToUse] || {};
          const emp = employees.find(e => e.id === empId);
          const hourlyRate = parseFloat(emp?.hourlyRate || emp?.hourly_rate || 0);
          
          Object.values(weekData).forEach(dayData => {
            if (dayData?.hours) {
              const hours = parseFloat(dayData.hours);
              totalGrossThisWeek += hours * hourlyRate;
            }
          });
        });
        
        // Top 5 punonjësit më të paguar (vetëm të paguarat)
        const top5Employees = paidThisWeek
          .sort((a, b) => parseFloat(b.grossAmount || b.gross_amount || 0) - parseFloat(a.grossAmount || a.gross_amount || 0))
          .slice(0, 5)
          .map(p => {
            const emp = employees.find(e => e.id === (p.employeeId || p.employee_id));
            return {
              id: p.employeeId || p.employee_id,
              employee_id: p.employeeId || p.employee_id, // Add this for consistency
              name: emp ? `${emp.firstName || emp.first_name || emp.name || 'Unknown'} ${emp.lastName || emp.last_name || ''}`.trim() : 'Unknown',
              grossAmount: parseFloat(p.grossAmount || p.gross_amount || 0),
              isPaid: p.isPaid || p.is_paid,
              photo: emp?.photo || null,
              // Add these fields for better name display
              firstName: emp?.firstName || emp?.first_name || '',
              lastName: emp?.lastName || emp?.last_name || ''
            };
          });
        
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
          if (inv && !inv.paid && Array.isArray(inv.items)) {
            const net = inv.items.reduce((a, i) => a + (i.amount || 0), 0);
            const vat = net * 0.2;
            const total = net + vat + parseFloat(inv.other || 0);
            if (total <= 0) return;
            const contract = contractsRes.data.find(c => c.contract_number === inv.contract_number);
            unpaidList.push({
              contractNumber: inv.contractNumber,
              invoiceNumber: inv.invoiceNumber || "-",
              total,
              siteName: contract?.site_name || "-"
            });
          }
        });
        setUnpaid(unpaidList);
        
        // Process unpaid expenses
        const unpaidExpensesList = allExpenses.filter(exp => !exp.paid).map(exp => ({
          id: exp.id,
          date: exp.date,
          type: exp.type || exp.description,
          gross: exp.gross || exp.amount,
          description: exp.description,
          contract_id: exp.contractId || exp.contract_id
        }));
        setUnpaidExpenses(unpaidExpensesList);
        
        // Process weekly profit data
        const weekLabels = [...new Set(allPayments.map(p => p.weekLabel || p.week_label))].sort();
        const weeklyData = weekLabels.map(week => {
          const weekPayments = allPayments.filter(p => (p.weekLabel || p.week_label) === week);
          const totalPaid = weekPayments.reduce((sum, p) => sum + parseFloat(p.grossAmount || p.gross_amount || 0), 0);
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
  const activeSites = contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar" || c.status === "In Progress" || c.status === "Suspended");
  const activeEmployees = employees.filter(e => e.status === "active" || e.status === "Aktiv");

  // Filtro detyrat
  const filteredTasks = allTasks.filter(t => {
    if (taskFilter === 'ongoing') return t.status === 'ongoing';
    if (taskFilter === 'completed') return t.status === 'completed';
    return true; // all
  });

  // Merr emër + mbiemër për user-in (mos shfaq email në asnjë rast)
  const user = JSON.parse(localStorage.getItem("user"));
  const userFullName = (user?.first_name && user?.last_name)
    ? `${user.first_name} ${user.last_name}`
    : (user?.firstName && user?.lastName)
      ? `${user.firstName} ${user.lastName}`
      : "";

  if (loading) {
    return <PageLoader text={tr('adminDashboard.loadingStats')} />;
  }

  return (
    <div className="w-full px-4 md:px-6 py-4 md:py-8 lg:py-10 space-y-6 md:space-y-8 lg:space-y-12 bg-gradient-to-br from-[#32938b]/5 via-white to-[#2a6b66]/5 min-h-screen">
      {/* HEADER MODERN */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 rounded-xl md:rounded-2xl shadow-lg px-6 md:px-10 py-6 md:py-8 mb-6 md:mb-8 border-b-2 border-[#32938b]/20 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-[#32938b]/10 rounded-xl p-3 md:p-4 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-10 h-10 md:w-12 md:h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div className="text-center sm:text-left">
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#32938b] to-[#2a6b66] tracking-tight mb-2 drop-shadow">
            {localStorage.getItem('language') === 'sq' ? 'Paneli i Administrimit' : 'Admin Panel'}
          </div>
          <div className="text-base md:text-lg font-medium text-[#2a6b66]">
            {localStorage.getItem('language') === 'sq' ? 'Statistika, detyra, pagesa dhe më shumë' : 'Statistics, tasks, payments and more'}
          </div>
        </div>
      </div>

      {/* Statistika kryesore */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-12">
        <CountStatCard
          title={tr('adminDashboard.activeSites')}
          count={activeSites.length}
          icon="📍"
          color="blue"
        />
        <CountStatCard
          title={tr('adminDashboard.activeEmployees')}
          count={activeEmployees.length}
          icon="👷"
          color="green"
        />
        {/* Orë të punuara këtë javë */}
        <CountStatCard
          title={tr('adminDashboard.weeklyHours')}
          value={dashboardStats.totalHoursThisWeek || 0}
          icon="⏰"
          color="purple"
        />
        {/* Pagesa për punëtorët këtë javë */}
        <MoneyStatCard
          title={tr('adminDashboard.weeklyPayments')}
          value={`£${dashboardStats.totalPaid || 0}`}
          icon="💰"
          color="yellow"
        />
      </div>

      {/* Detyrat - më të dukshme */}
      <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-xl col-span-full border border-yellow-200">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📋 {tr('adminDashboard.tasks')}</h3>
        <div className="mb-4 flex flex-col sm:flex-row gap-2 md:gap-4 items-start sm:items-center">
          <label className="font-medium text-sm md:text-base">{tr('adminDashboard.filter')}:</label>
          <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="border p-2 rounded text-sm md:text-base">
            <option value="ongoing">{tr('adminDashboard.onlyActive')}</option>
            <option value="completed">{tr('adminDashboard.onlyCompleted')}</option>
            <option value="all">{tr('adminDashboard.all')}</option>
          </select>
        </div>
        <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
          <div className="bg-[#32938b]/10 px-4 md:px-6 py-3 md:py-4 rounded-xl text-[#32938b] font-bold shadow text-sm md:text-base">{tr('adminDashboard.total')}: {allTasks.length}</div>
          <div className="bg-green-100 px-4 md:px-6 py-3 md:py-4 rounded-xl text-green-800 font-bold shadow text-sm md:text-base">✅ {tr('adminDashboard.completed')}: {allTasks.filter(t => t.status === 'completed').length}</div>
          <div className="bg-yellow-100 px-4 md:px-6 py-3 md:py-4 rounded-xl text-yellow-800 font-bold shadow text-sm md:text-base">🕒 {tr('adminDashboard.ongoing')}: {allTasks.filter(t => t.status === 'ongoing').length}</div>
        </div>
        {filteredTasks.length > 0 ? (
          <ul className="space-y-4">
            {filteredTasks.map((t, idx) => (
              <li key={t.id || idx} className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 bg-white rounded-xl p-4 md:p-6 shadow border border-[#32938b]/20">
                <div className="flex items-center gap-3">
                  <StatusBadge status={t.status === 'completed' ? 'completed' : 'ongoing'} />
                  <span className="font-semibold flex-1 text-sm md:text-lg">{t.description || t.title || ''}</span>
                </div>
                <div className="flex flex-col sm:flex-row lg:items-center gap-2 lg:gap-4 text-sm md:text-base">
                  <span className="text-[#32938b] font-bold">{t.site_name || t.siteName || ''}</span>
                  <span className="text-[#2a6b66] font-bold">{tr('adminDashboard.deadline')}: {t.due_date || t.dueDate ? new Date(t.due_date || t.dueDate).toLocaleDateString() : tr('adminDashboard.noDeadline')}</span>
                  <span className="text-gray-500">{tr('adminDashboard.by')}: {t.assigned_by || t.assignedBy || ''}</span>
                </div>
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
            📊 {tr('adminDashboard.hoursBySiteThisWeek')}
          </h3>
        <div className="mb-4 text-sm md:text-lg font-semibold text-gray-700">
          {tr('adminDashboard.totalHoursWorked')} <span className="text-[#32938b]">{dashboardStats.totalWorkHours}</span> {tr('adminDashboard.hours')}
        </div>
        {dashboardStats.workHoursBysite && dashboardStats.workHoursBysite.length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={dashboardStats.workHoursBysite} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: tr('adminDashboard.hours'), position: "insideBottomRight", offset: -5 }} />
              <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#a21caf' }} />
              <Tooltip formatter={v => [v, tr('adminDashboard.hours')]} />
              <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={32}>
                {dashboardStats.workHoursBysite.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{tr('adminDashboard.noWorkHoursThisWeek')}</p>
        )}
      </div>

      {/* Grafik për progresin e kontratave aktive */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📈 {tr('adminDashboard.contractProgress')} (%)</h3>
        {contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar" || c.status === "In Progress" || c.status === "Suspended").length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar" || c.status === "In Progress" || c.status === "Suspended").map(c => {
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
              <Tooltip formatter={v => [`${v}%`, tr('adminDashboard.progress')]} />
              <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={30}>
                {contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar" || c.status === "In Progress" || c.status === "Suspended").map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{tr('adminDashboard.noActiveContracts')}</p>
        )}
      </div>

      {/* Top 5 më të paguar */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🏅 {tr('adminDashboard.topPaidEmployees')}
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
                <li key={e.id} className="flex items-center gap-6 bg-[#32938b]/5 p-5 rounded-2xl shadow-md border border-[#32938b]/20">
                  <div className="relative w-14 h-14">
                    {employeeData?.photo ? (
                      <img 
                        src={photoSrc} 
                        alt={displayName} 
                        className="w-full h-full rounded-full object-cover border-2 border-[#32938b]/30 shadow"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full rounded-full border-2 border-[#32938b]/30 shadow flex items-center justify-center text-[#32938b] font-bold text-lg ${employeeData?.photo ? 'hidden' : 'flex'}`}
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
                    <span className="absolute -top-2 -left-2 bg-[#32938b] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      {displayName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {e.isPaid ? `✅ ${tr('adminDashboard.paid')}` : `⏳ ${tr('adminDashboard.unpaid')}`}
                    </p>
                  </div>
                  <div className="text-[#32938b] font-extrabold text-xl">£{Number(amount).toFixed(2)}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{tr('adminDashboard.noPaymentsThisWeek')}</p>
        )}
      </div>


      



      {/* Grafik për statusin e kontratave */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📊 {tr('adminDashboard.contractsProgressTitle')}</h3>
        <StatusiKontrataveChart contracts={contracts} />
      </div>

      {/* Grafik për pagesat javore */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">💸 {tr('adminDashboard.weeklyStaffPayments')}</h3>
        {weeklyProfitData.filter(w => w.totalPaid > 0).length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={weeklyProfitData.filter(w => w.totalPaid > 0)} margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6366f1', angle: -30, textAnchor: 'end' }} interval={0} height={80} />
              <YAxis label={{ value: `${tr('adminDashboard.payment')} (£)`, angle: -90, position: "insideLeft", offset: 0 }} tick={{ fontSize: 14, fill: '#6366f1' }} />
              <Tooltip formatter={v => [`£${Number(v).toFixed(2)}`, tr('adminDashboard.payment')]} />
              <Bar dataKey="totalPaid" radius={[6, 6, 0, 0]} barSize={32}>
                {weeklyProfitData.filter(w => w.totalPaid > 0).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">{tr('adminDashboard.noPaymentsThisWeek')}</p>
        )}
      </div>

      {/* Grafik për vonesat në pagesa/fatura */}
      <div className="bg-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📊 {tr('adminDashboard.invoiceStatus')}</h3>
        <VonesaFaturashChart />
      </div>

      {/* Grafik për statusin e faturave të shpenzimeve */}
      <div className="bg-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📈 {tr('adminDashboard.expenseStatus')}</h3>
        <StatusiShpenzimeveChart />
      </div>

      {/* Faturat e papaguara */}
      <div className="bg-white p-3 md:p-6 lg:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📌 {tr('adminDashboard.unpaidInvoices')}</h3>
        {unpaid.length === 0 ? (
          <p className="text-gray-500 italic">{tr('adminDashboard.allInvoicesPaid')} ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaid.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <a href={`/admin/contracts/${item.contractNumber}`} className="font-bold text-red-700 underline cursor-pointer">
                  🔴 {tr('adminDashboard.contract')} #{item.contractNumber || ''}
                </a>
                                  <span className="font-bold text-black">{tr('adminDashboard.invoiceNumber')}: <b>{item.invoiceNumber || ''}</b></span>
                                  <span className="font-bold text-[#32938b] flex items-center gap-1">🏢 {tr('adminDashboard.site')}: {(() => {
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
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📂 {tr('adminDashboard.unpaidExpenses')}</h3>
        {unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic">{tr('adminDashboard.allExpensesPaid')} ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold flex items-center gap-1">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                <span className="font-bold text-lg">{item.type || ''}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.gross !== undefined ? `£${Number(item.gross).toFixed(2)}` : ''}</span>
                <span className="font-bold text-[#32938b] flex items-center gap-1">
                  🏢 {tr('adminDashboard.site')}: {(() => {
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        const res = await api.get("/api/invoices");
        const invoices = res.data || [];
        
        // Get user language for translations
        const userLanguage = localStorage.getItem('language') || 'en';
        const paidLabel = t('payments.paid');
        const unpaidLabel = t('payments.unpaid');
        
        const result = { [paidLabel]: 0, [unpaidLabel]: 0 };
        
        invoices.forEach(inv => {
          if (inv.paid) {
            result[paidLabel]++;
          } else {
            result[unpaidLabel]++;
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
        // Nëse ka error, vendos të dhëna bosh
        setData([
          { name: `${t('payments.paid')}: 0 (0%)`, value: 0, color: STATUS_CHART_COLORS[0] },
          { name: `${t('payments.unpaid')}: 0 (0%)`, value: 0, color: STATUS_CHART_COLORS[1] }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchInvoices();
  }, []);

  if (loading) {
    return <div className="text-center py-8">{tr('adminDashboard.loading')}</div>;
  }

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{tr('adminDashboard.noInvoiceStatusData')}</div>;
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchExpensesInvoices() {
      try {
        setLoading(true);
        // Merr të gjitha shpenzimet nga expenses
        const res = await api.get("/api/expenses");
        const expenses = res.data || [];
        
        // Get user language for translations
        const userLanguage = localStorage.getItem('language') || 'en';
        const paidLabel = t('payments.paid');
        const unpaidLabel = t('payments.unpaid');
        
        // Llogarit statusin e pagesës për shpenzimet
        const result = { [paidLabel]: 0, [unpaidLabel]: 0 };
        
        expenses.forEach(exp => {
          if (exp.paid) {
            result[paidLabel]++;
          } else {
            result[unpaidLabel]++;
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
        // Nëse ka error, vendos të dhëna bosh
        setData([
          { name: `${t('payments.paid')}: 0 (0%)`, value: 0, color: STATUS_CHART_COLORS[0] },
          { name: `${t('payments.unpaid')}: 0 (0%)`, value: 0, color: STATUS_CHART_COLORS[1] }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchExpensesInvoices();
  }, []);

  if (loading) {
    return <div className="text-center py-8">{tr('adminDashboard.loading')}</div>;
  }

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{tr('adminDashboard.noExpenseStatusData')}</div>;
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
    return <div className="text-center py-8">{tr('adminDashboard.loading')}</div>;
  }
  
  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{tr('adminDashboard.noExpensesBySiteData')}</div>;
  }
  
  return (
    <div>
      <div className="mb-4 p-4 bg-[#32938b]/5 rounded-lg border border-[#32938b]/20">
        <h4 className="font-semibold text-blue-800 mb-2">📊 {tr('adminDashboard.calculationExplanation')}</h4>
        <div className="text-sm text-[#32938b] space-y-1">
          <p><strong>{tr('adminDashboard.expenses')}:</strong> {tr('adminDashboard.expensesFromTable')}</p>
          <p><strong>{tr('adminDashboard.workHours')}:</strong> {tr('adminDashboard.workHoursCalculation')}</p>
          <p><strong>{tr('adminDashboard.total')}:</strong> {tr('adminDashboard.totalCalculation')}</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={data} layout="vertical" margin={{ left: 50, right: 50, top: 20, bottom: 20 }} barCategoryGap={18}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" label={{ value: tr('adminDashboard.totalAmount'), position: "insideBottomRight", offset: -5 }} tick={{ fontSize: 14 }} />
          <YAxis type="category" dataKey="site" width={220} tick={{ fontSize: 16, fontWeight: 'bold', fill: '#0284c7' }} />
          <Tooltip 
            contentStyle={{ background: '#fffbe9', border: '1px solid #fbbf24', borderRadius: 12, fontSize: 16, color: '#78350f' }} 
            formatter={(v, n) => [`£${Number(v).toFixed(2)}`, n === 'total' ? tr('adminDashboard.total') : n]} 
          />
          <Legend />
          <Bar dataKey="expenses" stackId="a" fill={CHART_COLORS[0]} name={tr('adminDashboard.expensesFromInvoice')} radius={[0, 0, 0, 0]} />
          <Bar dataKey="workHours" stackId="a" fill={CHART_COLORS[1]} name={tr('adminDashboard.workHoursFromTable')} radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusiKontrataveChart({ contracts }) {
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
    
    const chartData = Object.entries(statusCount).map(([status, count]) => {
      const userLanguage = localStorage.getItem('language') || 'en';
      let translatedName;
      
      if (userLanguage === 'sq') {
        // Albanian translations
        translatedName = status === 'active' ? 'Aktive' : 
            status === 'suspended' ? 'Të pezulluara' :
            status === 'completed' ? 'Të mbyllura' :
            status === 'cancelled' ? 'Të anuluara' :
            status === 'pending' ? 'Në pritje' :
            status === 'ne progres' ? 'Në progres' :
            status === 'pezulluar' ? 'Të pezulluara' :
            status === 'mbyllur me vonese' ? 'Mbyllur me vonesë' :
            status === 'anulluar' ? 'Të anuluara' :
                        status === 'mbyllur' ? 'Të mbyllura' : status;
      } else {
        // English translations
        translatedName = status === 'active' ? 'Active' : 
                        status === 'suspended' ? 'Suspended' :
                        status === 'completed' ? 'Completed' :
                        status === 'cancelled' ? 'Cancelled' :
                        status === 'pending' ? 'Pending' :
                        status === 'ne progres' ? 'In Progress' :
                        status === 'pezulluar' ? 'Suspended' :
                        status === 'mbyllur me vonese' ? 'Closed with Delay' :
                        status === 'anulluar' ? 'Cancelled' :
                        status === 'mbyllur' ? 'Closed' : status;
      }
      
      return {
        name: translatedName,
      value: count,
      color: statusColors[status] || '#6b7280'
      };
    });
    
    setData(chartData);
  }, [contracts]);

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">{tr('adminDashboard.noContractStatusData')}</div>;
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