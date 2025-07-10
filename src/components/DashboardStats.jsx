import { useEffect, useState } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

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
  const [paidStatus, setPaidStatus] = useState({});
  const [thisWeekLabel, setThisWeekLabel] = useState("");
  const [totalPaid, setTotalPaid] = useState(0);
  const [mostPaidEmployees, setMostPaidEmployees] = useState([]);
  const [siteSummary, setSiteSummary] = useState([]);
  const [unpaid, setUnpaid] = useState([]);
  const [unpaidExpenses, setUnpaidExpenses] = useState([]);
  const [taskStats, setTaskStats] = useState({ totalTasks: 0, completedTasks: 0, ongoingTasks: 0 });
  const [taskFilter, setTaskFilter] = useState('ongoing');
  // Shto këtë state për të mbajtur të gjitha detyrat
  const [allTasks, setAllTasks] = useState([]);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // useEffect për të marrë të dhënat vetëm një herë në mount
  useEffect(() => {
    const fetchData = async () => {
      const [contractsRes, employeesRes, paidStatusRes] = await Promise.all([
        api.get("/api/contracts"),
        api.get("/api/employees"),
        api.get("/api/work-hours/paid-status"),
      ]);
      setContracts(snakeToCamel(contractsRes.data || []));
      setEmployees(snakeToCamel(employeesRes.data || []));
      setPaidStatus(snakeToCamel(paidStatusRes.data || {}));
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const end = new Date(monday);
      end.setDate(monday.getDate() + 6);
      setThisWeekLabel(`${monday.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    };
    fetchData();
    // dependency array bosh që të mos bëjë loop
  }, []);

  // useEffect për të marrë të dhënat e javës vetëm kur ndryshon thisWeekLabel
  useEffect(() => {
    if (!thisWeekLabel || employees.length === 0) return;
    const fetchWorkHoursAndInvoices = async () => {
      const [workHoursRes, invoicesRes, tasksRes, expensesRes] = await Promise.all([
        api.get("/api/work-hours/structured"),
        api.get("/api/invoices"),
        api.get("/api/tasks"),
        api.get("/api/expenses"),
      ]);
      const structuredWorkHours = snakeToCamel(workHoursRes.data || {});
      const invoices = snakeToCamel(invoicesRes.data || []);
      const allTasksData = snakeToCamel(tasksRes.data || []);
      setAllTasks(allTasksData);
      const allExpenses = snakeToCamel(expensesRes.data || []);
      console.log('[DEBUG] structuredWorkHours camel:', structuredWorkHours);
      console.log('[DEBUG] invoices camel:', invoices);
      console.log('[DEBUG] tasks camel:', allTasksData);
      console.log('[DEBUG] expenses camel:', allExpenses);

      let totalPaidNow = 0;
      const payments = [];
      const siteMap = {};

      employees.forEach(emp => {
        const empWeeks = structuredWorkHours[emp.id] || {};
        const weekData = empWeeks[thisWeekLabel] || {};
        let totalHours = 0;
        let hourlyRate = parseFloat(emp.hourlyRate || 0);
        Object.values(weekData).forEach(val => {
          if (val?.hours) {
            totalHours += parseFloat(val.hours);
            if (val.site) {
              siteMap[val.site] = (siteMap[val.site] || 0) + parseFloat(val.hours);
            }
            if (val.rate) hourlyRate = parseFloat(val.rate);
          }
        });
        const gross = totalHours * hourlyRate;
        // Paid status by week/employee nuk është e thjeshtë, por ruajmë logjikën ekzistuese
        const isPaid = paidStatus[`${thisWeekLabel}_${emp.id}`];
        if (isPaid) totalPaidNow += gross;
        payments.push({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          gross
        });
      });

      setTotalPaid(totalPaidNow);

      const topEarners = payments.sort((a, b) => b.gross - a.gross).slice(0, 5).map(te => {
        const emp = employees.find(e => e.id === te.id);
        return {
          ...te,
          photo: emp?.photo || "https://via.placeholder.com/40",
          role: emp?.role || "user",
        };
      });
      setMostPaidEmployees(topEarners);

      const siteArray = Object.entries(siteMap).map(([site, hours]) => ({ site, hours }));
      setSiteSummary(siteArray);

      // Unpaid invoices
      const unpaidList = [];
      invoices.forEach(inv => {
        if (inv && !inv.paid && Array.isArray(inv.items)) {
          const net = inv.items.reduce((a, i) => a + (i.amount || 0), 0);
          const vat = net * 0.2;
          const total = net + vat + parseFloat(inv.other || 0);
          if (total <= 0) return;
          const contract = contracts.find(c => c.contractNumber === inv.contractNumber);
          unpaidList.push({
            contractNumber: inv.contractNumber,
            invoiceNumber: inv.invoiceNumber || "-",
            total,
            siteName: contract?.siteName || "-"
          });
        }
      });
      setUnpaid(unpaidList);

      // Tasks
      const totalTasks = allTasksData.length;
      const completedTasks = allTasksData.filter(t => t.status === "completed").length;
      const ongoingTasks = totalTasks - completedTasks;
      setTaskStats({ totalTasks, completedTasks, ongoingTasks });

      // Unpaid expenses
      const unpaidExpensesList = [];
      allExpenses.forEach(exp => {
        if (exp && !exp.paid) {
          unpaidExpensesList.push({
            id: exp.id,
            date: exp.date,
            type: exp.expenseType,
            gross: parseFloat(exp.gross || 0)
          });
        }
      });
      setUnpaidExpenses(unpaidExpensesList);
    };
    fetchWorkHoursAndInvoices();
    // dependency array vetëm nga thisWeekLabel dhe employees.length
  }, [thisWeekLabel, employees.length]);

  const activeSites = [...new Set(contracts.filter(c => c.status === "Aktive").map(c => c.siteName))];
  const activeEmployees = employees.filter(e => e.status === "Aktiv");
  const profit = totalPaid * 0.2;

  // Filtrim i detyrave sipas statusit
  const filteredTasks = allTasks.filter(t => taskFilter === 'all' ? true : t.status === taskFilter);

  // Merr emër + mbiemër për user-in (mos shfaq email në asnjë rast)
  const user = JSON.parse(localStorage.getItem("user"));
  const userFullName = (user?.first_name && user?.last_name)
    ? `${user.first_name} ${user.last_name}`
    : (user?.firstName && user?.lastName)
      ? `${user.firstName} ${user.lastName}`
      : "";

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* HEADER MODERN */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl shadow-lg px-10 py-6 mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h2>
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Paneli i Administrimit</div>
          <div className="text-lg font-medium text-purple-700">Statistika, detyra, pagesa dhe më shumë</div>
        </div>
      </div>

      {/* Statistika kryesore */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-md flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">📍 Site aktive</h3>
          <p className="text-5xl text-blue-700 font-extrabold">{activeSites.length}</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-md flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">👷 Punonjës aktivë</h3>
          <p className="text-5xl text-green-700 font-extrabold">{activeEmployees.length}</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-md flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">💷 Paguar këtë javë</h3>
          <p className="text-5xl text-indigo-700 font-extrabold">£{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-md flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">📈 Fitimi (20%)</h3>
          <p className="text-5xl text-emerald-700 font-extrabold">£{profit.toFixed(2)}</p>
        </div>
      </div>

      {/* Detyrat - më të dukshme */}
      <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-8 rounded-2xl shadow-xl col-span-full border border-yellow-200">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📋 Detyrat</h3>
        <div className="mb-4 flex gap-4 items-center">
          <label className="font-medium">Filtro:</label>
          <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="border p-2 rounded">
            <option value="ongoing">Vetëm aktive</option>
            <option value="completed">Vetëm të përfunduara</option>
            <option value="all">Të gjitha</option>
          </select>
        </div>
        <div className="mb-4 flex flex-wrap gap-6">
          <div className="bg-blue-100 px-6 py-3 rounded-xl text-blue-800 font-bold shadow">Totali: {allTasks.length}</div>
          <div className="bg-green-100 px-6 py-3 rounded-xl text-green-800 font-bold shadow">✅ Të përfunduara: {allTasks.filter(t => t.status === 'completed').length}</div>
          <div className="bg-yellow-100 px-6 py-3 rounded-xl text-yellow-800 font-bold shadow">🕒 Në vazhdim: {allTasks.filter(t => t.status === 'ongoing').length}</div>
        </div>
        {filteredTasks.length > 0 ? (
          <ul className="space-y-3">
            {filteredTasks.map((t, idx) => (
              <li key={t.id || idx} className="flex flex-col md:flex-row md:items-center gap-4 bg-white rounded-xl p-4 shadow border border-blue-100">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md border ${t.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>{t.status === 'completed' ? 'Përfunduar' : 'Në vazhdim'}</span>
                <span className="font-semibold flex-1 text-lg">{t.description || t.title || ''}</span>
                <span className="text-lg text-blue-700 font-bold">{t.site_name || t.siteName || ''}</span>
                <span className="text-lg text-purple-700 font-bold">Afati: {t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}</span>
                <span className="text-xs text-gray-500">Nga: {t.assigned_by || t.assignedBy || ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic mt-2">Nuk ka ende detyra të dhëna.</p>
        )}
      </div>

      {/* Grafik për site */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📊 Ora të punuara këtë javë sipas site-ve</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={siteSummary} layout="vertical" margin={{ left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: "Orë", position: "insideBottomRight", offset: -5 }} />
            <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#3b82f6' }} />
            <Tooltip />
            <Bar dataKey="hours" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 më të paguar */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">🏅 Top 5 punonjësit më të paguar këtë javë</h3>
        <ul className="space-y-3 text-gray-800">
          {mostPaidEmployees.map((e, i) => (
            <li key={e.id} className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
              <img src={e.photo} alt="Foto" className="w-14 h-14 rounded-full object-cover border-2 border-blue-300 shadow" />
              <div className="flex-1">
                <p className="font-bold text-lg">
                  {i + 1}. {e.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{e.role}</p>
              </div>
              <div className="text-blue-700 font-extrabold text-xl">£{e.gross.toFixed(2)}</div>
            </li>
          ))}
        </ul>
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
                <span className="font-bold">🔴 Kontrata #{item.contractNumber || ''}</span>
                <span className="font-bold text-black">Nr. Fature: <b>{item.invoiceNumber || ''}</b></span>
                <span className="font-bold text-black flex items-center gap-1">🏢 Site: <b>{item.siteName || ''}</b></span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.total !== undefined ? `£${item.total.toFixed(2)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shpenzimet e papaguara */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
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
                <span className="font-bold text-blue-700 flex items-center gap-1">🏢 {(() => {
                  if (!item.contract_id || !contracts.length) return '';
                  const c = contracts.find(c => String(c.id) === String(item.contract_id));
                  return c ? `${c.site_name || c.siteName || ''}` : '';
                })()}</span>
                <span className="text-gray-700">{item.description || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
