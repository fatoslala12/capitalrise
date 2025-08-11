// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Cell as PieCell
} from "recharts";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid, Stack } from "../components/ui/Layout";
import { CountStatCard, MoneyStatCard } from "../components/ui/StatCard";
import { StatusBadge, PaymentBadge } from "../components/ui/Badge";
import EmptyState, { NoTasksEmpty } from "../components/ui/EmptyState";

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

export default function DashboardStats() {
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
        
        // Calculate current week
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const thisWeek = `${monday.toISOString().slice(0, 10)} - ${sunday.toISOString().slice(0, 10)}`;
        
        // Llogarit dashboard stats manualisht
        // Gjej pagesat për këtë javë
        const thisWeekPayments = allPayments.filter(p => p.weekLabel === thisWeek);
        
        // Gjej pagesat e paguara për këtë javë
        const paidThisWeek = thisWeekPayments.filter(p => p.isPaid === true);
        
        // Llogarit totalin e paguar
        const totalPaid = paidThisWeek.reduce((sum, p) => sum + parseFloat(p.grossAmount || 0), 0);
        
        // Llogarit orët e punuara për këtë javë
        let totalWorkHours = 0;
        const siteHours = {};
        
        Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
          const weekData = empData[thisWeek] || {};
          
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
        
        // Top 5 punonjësit më të paguar (vetëm të paguarat)
        const top5Employees = paidThisWeek
          .sort((a, b) => parseFloat(b.grossAmount || 0) - parseFloat(a.grossAmount || 0))
          .slice(0, 5)
          .map(p => {
            const emp = employees.find(e => e.id === p.employeeId);
            return {
              id: p.employeeId,
              name: emp ? `${emp.firstName || emp.first_name} ${emp.lastName || emp.last_name}` : 'Unknown',
              grossAmount: parseFloat(p.grossAmount || 0),
              isPaid: p.isPaid,
              photo: emp?.photo || null
            };
          });
        
        // Llogarit total gross për këtë javë nga work_hours
        let totalGrossThisWeek = 0;
        Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
          const weekData = empData[thisWeek] || {};
          const emp = employees.find(e => e.id === empId);
          const hourlyRate = parseFloat(emp?.hourlyRate || emp?.hourly_rate || 0);
          
          Object.values(weekData).forEach(dayData => {
            if (dayData?.hours) {
              const hours = parseFloat(dayData.hours);
              totalGrossThisWeek += hours * hourlyRate;
            }
          });
        });
        
        setDashboardStats({
          thisWeek: thisWeek,
          totalPaid: totalPaid,
          totalProfit: totalPaid * 0.20,
          workHoursBysite: Object.entries(siteHours).map(([site, hours]) => ({ site, hours })),
          top5Employees: top5Employees,
          totalWorkHours: totalWorkHours,
          totalHoursThisWeek: totalWorkHours,
          totalGrossThisWeek: totalGrossThisWeek,
          paidEmployeesCount: paidThisWeek.length,
          totalEmployeesWithHours: Object.keys(structuredWorkHours).length
        });
        
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
        const weekLabels = [...new Set(allPayments.map(p => p.weekLabel))].sort();
        const weeklyData = weekLabels.map(week => {
          const weekPayments = allPayments.filter(p => p.weekLabel === week);
          const totalPaid = weekPayments.reduce((sum, p) => sum + parseFloat(p.grossAmount || 0), 0);
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
  const activeSites = contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar");
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
    return <LoadingSpinner fullScreen={true} size="xl" text="Duke ngarkuar statistikat..." />;
  }

  const progressBarColors = ["#a5b4fc", "#fbcfe8", "#fef08a", "#bbf7d0", "#bae6fd", "#fca5a5", "#fdba74", "#ddd6fe"]; // pastel

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 py-6 md:py-10 space-y-6 md:space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* HEADER MODERN */}
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl md:rounded-2xl shadow-lg px-4 md:px-10 py-4 md:py-6 mb-6 md:mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-2 md:p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-8 h-8 md:w-12 md:h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div className="text-center md:text-left">
         
          <div className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Paneli i Administrimit</div>
          <div className="text-sm md:text-lg font-medium text-purple-700">Statistika, detyra, pagesa dhe më shumë</div>
        </div>
      </div>

      {/* Statistika kryesore */}
      <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="lg" className="mb-8 md:mb-12">
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
        <MoneyStatCard
          title="Orë të punuara këtë javë"
          amount={`${Number(dashboardStats.totalHoursThisWeek || dashboardStats.totalWorkHours || 0).toFixed(2)} orë`}
          color="purple"
        />
        <MoneyStatCard
          title="Pagesa këtë javë"
          amount={`£${Number(dashboardStats.totalPaid || 0).toFixed(2)}`}
          color="amber"
        />
      </Grid>

      {/* Detyrat - më të dukshme */}
      <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-4 md:p-8 rounded-xl md:rounded-2xl shadow-xl col-span-full border border-yellow-200">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📋 Detyrat</h3>
        <div className="mb-4 flex flex-col sm:flex-row gap-2 md:gap-4 items-start sm:items-center">
          <label className="font-medium text-sm md:text-base">Filtro:</label>
          <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="border p-2 rounded text-sm md:text-base">
            <option value="ongoing">Vetëm aktive</option>
            <option value="completed">Vetëm të përfunduara</option>
            <option value="all">Të gjitha</option>
          </select>
        </div>
        <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-2 md:gap-6">
          <div className="bg-blue-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-blue-800 font-bold shadow text-sm md:text-base">Totali: {allTasks.length}</div>
          <div className="bg-green-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-green-800 font-bold shadow text-sm md:text-base">✅ Të përfunduara: {allTasks.filter(t => t.status === 'completed').length}</div>
          <div className="bg-yellow-100 px-3 md:px-6 py-2 md:py-3 rounded-xl text-yellow-800 font-bold shadow text-sm md:text-base">🕒 Në vazhdim: {allTasks.filter(t => t.status === 'ongoing').length}</div>
        </div>
        {filteredTasks.length > 0 ? (
          <ul className="space-y-3">
            {filteredTasks.map((t, idx) => (
              <li key={t.id || idx} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-white rounded-xl p-3 md:p-4 shadow border border-blue-100">
                <StatusBadge status={t.status === 'completed' ? 'completed' : 'ongoing'} />
                <span className="font-semibold flex-1 text-sm md:text-lg">{t.description || t.title || ''}</span>
                <span className="text-sm md:text-lg text-blue-700 font-bold">{t.site_name || t.siteName || ''}</span>
                <span className="text-sm md:text-lg text-purple-700 font-bold">Afati: {t.due_date || t.dueDate ? new Date(t.due_date || t.dueDate).toLocaleDateString() : 'Pa afat'}</span>
                <span className="text-xs text-gray-500">Nga: {t.assigned_by || t.assignedBy || ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <NoTasksEmpty />
        )}
      </div>

      {/* Grafik për site */}
      <div className="bg-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-md col-span-full">
        <h3 className="text-lg md:text-2xl font-bold mb-4 flex items-center gap-2">📊 Ora të punuara këtë javë sipas site-ve ({dashboardStats.thisWeek})</h3>
        <div className="mb-4 text-sm md:text-lg font-semibold text-gray-700">
          Total orë të punuara: <span className="text-blue-600">{dashboardStats.totalWorkHours}</span> orë
        </div>
        {dashboardStats.workHoursBysite && dashboardStats.workHoursBysite.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dashboardStats.workHoursBysite} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: "Orë", position: "insideBottomRight", offset: -5 }} />
              <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#3b82f6' }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka orë pune të regjistruara për këtë javë</p>
        )}
      </div>

      {/* Grafik për progresin e kontratave aktive */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📈 Progresi i kontratave aktive (%)</h3>
        {contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
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
              <Tooltip formatter={v => [`${v}%`, "Progresi"]} />
              <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={30}>
                {contracts.filter(c => c.status === "Ne progres" || c.status === "Pezulluar").map((_, i) => (
                  <Cell key={i} fill={progressBarColors[i % progressBarColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka kontrata aktive për momentin</p>
        )}
      </div>

      {/* Top 5 më të paguar */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">🏅 Top 5 punonjësit më të paguar këtë javë</h3>
        {dashboardStats.top5Employees && dashboardStats.top5Employees.length > 0 ? (
          <ul className="space-y-3 text-gray-800">
            {dashboardStats.top5Employees.map((e, i) => {
              const amount = e.grossAmount ?? e.amount ?? 0;
              const photoSrc = e.photo
                ? e.photo.startsWith('data:image')
                  ? e.photo
                  : e.photo
                : '/placeholder.png';
              return (
                <li key={e.id} className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
                  <div className="relative w-14 h-14">
                    <img src={photoSrc} alt="foto" className="w-full h-full rounded-full object-cover border-2 border-blue-300 shadow" />
                    <span className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      {e.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {e.isPaid ? '✅ E paguar' : '⏳ E papaguar'}
                    </p>
                  </div>
                  <div className="text-blue-700 font-extrabold text-xl">£{Number(amount).toFixed(2)}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka pagesa të regjistruara për këtë javë</p>
        )}
      </div>


      

      {/* Grafik për shpenzimet sipas site-ve */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">💸 Shpenzimet sipas Site-ve</h3>
        <ShpenzimePerSiteChart allExpenses={allExpenses} structuredWorkHours={structuredWorkHours} contracts={contracts} />
      </div>

      {/* Grafik për statusin e kontratave */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📊 Statusi i kontratave</h3>
        <StatusiKontrataveChart contracts={contracts} />
      </div>

      {/* Grafik për pagesat javore */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">💸 Pagesa Javore për stafin</h3>
        {weeklyProfitData.filter(w => w.totalPaid > 0).length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={weeklyProfitData.filter(w => w.totalPaid > 0)} margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6366f1', angle: -30, textAnchor: 'end' }} interval={0} height={80} />
              <YAxis label={{ value: 'Pagesa (£)', angle: -90, position: 'insideLeft', offset: 10 }} />
              <Tooltip formatter={(v, n) => [`£${Number(v).toFixed(2)}`, n === 'totalPaid' ? 'Pagesa' : n]} />
              <Bar dataKey="totalPaid" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka të dhëna të mjaftueshme për pagesat javore</p>
        )}
      </div>

      {/* Grafik për vonesat në pagesa/fatura */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">⏰ Vonesat në Pagesa/Fatura</h3>
        <VonesaFaturashChart />
      </div>

      {/* Faturat e papaguara */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📌 Faturat e Papaguara</h3>
        {unpaid.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha faturat janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaid.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <a href={`/admin/contracts/${item.contractNumber}`} className="font-bold text-red-700 underline cursor-pointer">
                  🔴 Kontrata #{item.contractNumber || ''}
                </a>
                <span className="font-bold text-black">Nr. Fature: <b>{item.invoiceNumber || ''}</b></span>
                <span className="font-bold text-blue-700 flex items-center gap-1">🏢 Site: {(() => {
                  let c = null;
                  if (item.contract_id && contracts.length) {
                    c = contracts.find(c => String(c.id) === String(item.contract_id));
                  }
                  if (!c && item.contractNumber && contracts.length) {
                    c = contracts.find(c => String(c.contract_number) === String(item.contractNumber));
                  }
                  return c ? `${c.site_name || c.siteName || ''}` : '';
                })()}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.total !== undefined ? `£${item.total.toFixed(2)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shpenzimet e papaguara */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full mb-8">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📂 Shpenzimet e Papaguara</h3>
        {unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha shpenzimet janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold flex items-center gap-1">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                <span className="font-bold text-lg">{item.type || ''}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.gross !== undefined ? `£${item.gross.toFixed(2)}` : ''}</span>
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        const res = await api.get("/api/invoices");
        const invoices = res.data || [];
        
        // Për çdo faturë, llogarit statusin e pagesës
        const result = { "Paguar në kohë": 0, "Paguar me vonesë": 0, "Pa paguar": 0 };
        
        invoices.forEach(inv => {
          if (!inv.paid) {
            result["Pa paguar"]++;
          } else {
            // Përdor updated_at si datë pagese nëse nuk ka paid_date
            const invoiceDate = inv.date ? new Date(inv.date) : null;
            const paidDate = inv.paid_date ? new Date(inv.paid_date) : (inv.updated_at ? new Date(inv.updated_at) : null);
            
            if (invoiceDate && paidDate) {
              const daysDiff = Math.ceil((paidDate - invoiceDate) / (1000 * 60 * 60 * 24));
              if (daysDiff <= 30) {
                result["Paguar në kohë"]++;
              } else {
                result["Paguar me vonesë"]++;
              }
            } else {
              result["Pa paguar"]++;
            }
          }
        });
        
        const chartData = Object.entries(result).map(([name, value]) => ({
          name,
          value,
          color: name === "Paguar në kohë" ? "#10b981" : 
                 name === "Paguar me vonesë" ? "#f59e0b" : "#ef4444"
        }));
        
        setData(chartData);
      } catch (error) {
        console.error('[ERROR] Failed to fetch invoices:', error);
        // Nëse ka error, vendos të dhëna bosh
        setData([
          { name: "Paguar në kohë", value: 0, color: "#10b981" },
          { name: "Paguar me vonesë", value: 0, color: "#f59e0b" },
          { name: "Pa paguar", value: 0, color: "#ef4444" }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchInvoices();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Duke ngarkuar...</div>;
  }

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">Nuk ka të dhëna për vonesat në pagesa</div>;
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
          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
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

function ShpenzimePerSiteChart({ allExpenses, structuredWorkHours, contracts }) {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Llogarit shpenzimet sipas site-ve
    const expensesBySite = {};
    allExpenses.forEach(exp => {
      if (exp.contract_id) {
        const contract = contracts.find(c => c.id === exp.contract_id);
        if (contract) {
          const site = contract.site_name || contract.siteName || 'Unknown';
          expensesBySite[site] = (expensesBySite[site] || 0) + parseFloat(exp.gross || exp.amount || 0);
        }
      }
    });
    
    // Llogarit orët e punuara sipas site-ve
    const workHoursBySite = {};
    Object.values(structuredWorkHours).forEach(empData => {
      Object.values(empData).forEach(weekData => {
        Object.values(weekData).forEach(dayData => {
          if (dayData?.site && dayData?.hours) {
            workHoursBySite[dayData.site] = (workHoursBySite[dayData.site] || 0) + parseFloat(dayData.hours);
          }
        });
      });
    });
    
    // Bashko të dhënat
    const combined = Object.keys({ ...expensesBySite, ...workHoursBySite }).map(site => ({
      site,
      expenses: expensesBySite[site] || 0,
      workHours: workHoursBySite[site] || 0,
      total: (expensesBySite[site] || 0) + (workHoursBySite[site] || 0)
    })).sort((a, b) => b.total - a.total);
    
    setData(combined);
  }, [allExpenses, structuredWorkHours, contracts]);
  
  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">Nuk ka të dhëna për shpenzimet sipas site-ve</div>;
  }
  
  const pastelColors = ["#a5b4fc", "#fbcfe8", "#fef08a", "#bbf7d0", "#bae6fd", "#fca5a5", "#fdba74", "#ddd6fe"];
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} layout="vertical" margin={{ left: 50 }} barCategoryGap={18}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" label={{ value: "Shpenzime totale (£)", position: "insideBottomRight", offset: -5 }} tick={{ fontSize: 14 }} />
        <YAxis type="category" dataKey="site" width={220} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#0284c7' }} />
        <Tooltip contentStyle={{ background: '#fffbe9', border: '1px solid #fbbf24', borderRadius: 12, fontSize: 16, color: '#78350f' }} formatter={(v, n) => [`£${Number(v).toFixed(2)}`, n === 'total' ? 'Totali' : n]} />
        <Bar dataKey="total" radius={[0, 12, 12, 0]} barSize={32} >
          {data.map((_, i) => (
            <Cell key={i} fill={pastelColors[i % pastelColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
  }, [contracts]);

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">Nuk ka të dhëna për statusin e kontratave</div>;
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
          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
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