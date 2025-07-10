import { useEffect, useState } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

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

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = async () => {
      const [contractsRes, employeesRes, paidStatusRes] = await Promise.all([
        api.get("/api/contracts"),
        api.get("/api/employees"),
        api.get("/api/work-hours/paid-status"),
      ]);
      setContracts(contractsRes.data || []);
      setEmployees(employeesRes.data || []);
      setPaidStatus(paidStatusRes.data || {});

      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const end = new Date(monday);
      end.setDate(monday.getDate() + 6);
      setThisWeekLabel(`${monday.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!thisWeekLabel || employees.length === 0) return;

    const fetchWorkHoursAndInvoices = async () => {
      const [workHoursRes, invoicesRes, tasksRes, expensesRes] = await Promise.all([
        api.get("/api/work-hours/all"),
        api.get("/api/invoices"),
        api.get("/api/tasks"),
        api.get("/api/expenses"),
      ]);
      const workHours = workHoursRes.data || [];
      const invoices = invoicesRes.data || [];
      const allTasks = tasksRes.data || [];
      const allExpenses = expensesRes.data || [];

      let totalPaidNow = 0;
      const payments = [];
      const siteMap = {};

      employees.forEach(emp => {
        const wh = workHours.find(w => w.employeeId === emp.id);
        const weekData = wh?.weeks?.[thisWeekLabel] || {};
        const hourlyRate = parseFloat(weekData.hourlyRate || emp.hourlyRate || 0);
        let totalHours = 0;

        Object.values(weekData).forEach(val => {
          if (val?.hours) {
            totalHours += parseFloat(val.hours);
            if (val.site) {
              siteMap[val.site] = (siteMap[val.site] || 0) + parseFloat(val.hours);
            }
          }
        });

        const gross = totalHours * hourlyRate;
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
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.status === "completed").length;
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
  }, [thisWeekLabel, employees, paidStatus, contracts, headers]);

  const activeSites = [...new Set(contracts.filter(c => c.status === "Aktive").map(c => c.siteName))];
  const activeEmployees = employees.filter(e => e.status === "Aktiv");
  const profit = totalPaid * 0.2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Statistika kryesore */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-semibold mb-2">📍 Site aktive</h3>
        <p className="text-4xl text-blue-700 font-bold">{activeSites.length}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-semibold mb-2">👷 Punonjës aktivë</h3>
        <p className="text-4xl text-green-700 font-bold">{activeEmployees.length}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-semibold mb-2">💷 Paguar këtë javë</h3>
        <p className="text-4xl text-indigo-700 font-bold">£{totalPaid.toFixed(2)}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-semibold mb-2">📈 Fitimi (20%)</h3>
        <p className="text-4xl text-emerald-700 font-bold">£{profit.toFixed(2)}</p>
      </div>

      {/* Detyrat */}
      <div className="bg-white p-6 rounded-2xl shadow-md col-span-full">
        <h3 className="text-xl font-semibold mb-2">📋 Detyrat</h3>
        <p className="text-sm text-gray-600 mb-2">
          Totali: <strong>{taskStats.totalTasks}</strong> | ✅ Të përfunduara: <strong>{taskStats.completedTasks}</strong> | 🕒 Në vazhdim: <strong>{taskStats.ongoingTasks}</strong>
        </p>
        {taskStats.totalTasks > 0 ? (
          <div className="w-full bg-gray-200 rounded-full h-4 mt-2 overflow-hidden">
            <div
              className="bg-green-500 h-4 text-xs text-white text-center"
              style={{ width: `${(taskStats.completedTasks / taskStats.totalTasks) * 100}%` }}
            >
              {Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100)}%
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic mt-2">Nuk ka ende detyra të dhëna.</p>
        )}
      </div>

      {/* Top 5 më të paguar */}
      <div className="bg-white p-6 rounded-2xl shadow-md col-span-full">
        <h3 className="text-xl font-semibold mb-4">🏅 Top 5 punonjësit më të paguar këtë javë</h3>
        <ul className="space-y-3 text-gray-800">
          {mostPaidEmployees.map((e, i) => (
            <li key={e.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded shadow-sm">
              <img src={e.photo} alt="Foto" className="w-10 h-10 rounded-full object-cover border" />
              <div className="flex-1">
                <p className="font-semibold text-base">
                  {i + 1}. {e.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{e.role}</p>
              </div>
              <div className="text-blue-700 font-bold text-sm">£{e.gross.toFixed(2)}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Grafik për site */}
      <div className="bg-white p-6 rounded-2xl shadow-md col-span-full">
        <h3 className="text-xl font-semibold mb-4">📊 Ora të punuara këtë javë sipas site-ve</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={siteSummary} layout="vertical" margin={{ left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: "Orë", position: "insideBottomRight", offset: -5 }} />
            <YAxis type="category" dataKey="site" width={150} />
            <Tooltip />
            <Bar dataKey="hours" fill="#3b82f6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Faturat e papaguara */}
      <div className="bg-white p-6 rounded-2xl shadow-md col-span-full">
        <h3 className="text-xl font-semibold mb-4">📌 Faturat e Papaguara</h3>
        {unpaid.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha faturat janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-sm">
            {unpaid.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-2 rounded shadow-sm border border-red-200">
                🔴 Kontrata #{item.contractNumber} | Fatura #{item.invoiceNumber} | {item.siteName} — <strong>£{item.total.toFixed(2)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shpenzimet e papaguara */}
      <div className="bg-white p-6 rounded-2xl shadow-md col-span-full">
        <h3 className="text-xl font-semibold mb-4">📂 Shpenzimet e Papaguara</h3>
        {unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha shpenzimet janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-sm">
            {unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-2 rounded shadow-sm border border-red-200">
                🔴 {item.date} | {item.type} — <strong>£{item.gross.toFixed(2)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
