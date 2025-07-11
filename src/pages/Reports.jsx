import { useState, useEffect } from "react";
import {
  format,
  startOfYear,
  endOfYear,
  eachMonthOfInterval
} from "date-fns";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
// Funksion universal për të kthyer snake_case në camelCase
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

export default function Reports() {
  const [filteredHours, setFilteredHours] = useState([]);
  const [summary, setSummary] = useState({ totalHours: 0, totalPaid: 0 });
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [employeeEfficiency, setEmployeeEfficiency] = useState([]);
  const [invoiceStatus, setInvoiceStatus] = useState([]);
  const [siteFilter, setSiteFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [siteOptions, setSiteOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [allWorkHours, setAllWorkHours] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const token = localStorage.getItem("token");

  // Merr të gjitha të dhënat nga backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DEBUG] Reports: Fetching data...');
        
        const [contractsRes, employeesRes, workHoursRes, invoicesRes, paymentsRes, expensesRes] = await Promise.all([
          api.get("/api/contracts"),
          api.get("/api/employees"),
          api.get("/api/work-hours/"),
          api.get("/api/invoices"),
          api.get("/api/payments"),
          api.get("/api/expenses"),
        ]);
        
        const contracts = snakeToCamel(contractsRes.data || []);
        const employees = snakeToCamel(employeesRes.data || []);
        const workHours = snakeToCamel(workHoursRes.data || []);
        const invoices = snakeToCamel(invoicesRes.data || []);
        const payments = snakeToCamel(paymentsRes.data || []);
        const expenses = snakeToCamel(expensesRes.data || []);

        console.log('[DEBUG] Reports: Data fetched', {
          contracts: contracts.length,
          employees: employees.length,
          workHours: workHours.length,
          invoices: invoices.length,
          payments: payments.length,
          expenses: expenses.length
        });

        // Site options from contracts
        const sites = [...new Set(contracts.map(c => c.siteName || c.site_name).filter(Boolean))];
        setSiteOptions(sites);

        // Employee options
        const employeeNames = employees.map(e => ({
          id: e.id,
          employeeName: `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim()
        }));
        setEmployeeOptions(employeeNames);

        // Process work hours for reporting
        const allHours = [];
        workHours.forEach((wh) => {
          const emp = employees.find(e => String(e.id) === String(wh.employeeId || wh.employee_id));
          const empName = emp ? `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() : `Punonjës ${wh.employeeId || wh.employee_id}`;
          
          // Find contract/site info
          const contract = contracts.find(c => String(c.id) === String(wh.contractId || wh.contract_id));
          const siteName = contract ? (contract.siteName || contract.site_name) : (wh.site || 'Unknown Site');
          
          allHours.push({
            employeeId: wh.employeeId || wh.employee_id,
            employeeName: empName,
            site: siteName,
            date: wh.date,
            hours: parseFloat(wh.hours || 0),
            rate: parseFloat(wh.rate || emp?.hourlyRate || emp?.hourly_rate || 0)
          });
        });
        setAllWorkHours(allHours);

        // Process invoices for reporting
        const allInvs = [];
        invoices.forEach(inv => {
          if (!inv) return;
          const items = inv.items || [];
          const subtotal = items.length > 0
            ? items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
            : parseFloat(inv.gross || 0);
          const vat = subtotal * 0.2;
          const other = parseFloat(inv.other || 0);
          const total = subtotal + vat + other;
          
          const contract = contracts.find(c => c.contractNumber === inv.contractNumber || c.contract_number === inv.contract_number);
          
          allInvs.push({
            ...inv,
            total,
            paid: inv.paid,
            paidLate: !!inv.paidLate,
            siteName: contract ? (contract.siteName || contract.site_name) : 'Unknown Site'
          });
        });
        setAllInvoices(allInvs);

      } catch (err) {
        console.error('[ERROR] Reports: Failed to fetch data:', err);
        setSiteOptions([]);
        setEmployeeOptions([]);
        setAllWorkHours([]);
        setAllInvoices([]);
      }
    };
    fetchData();
  }, [token]);

  // Process filters and summaries
  useEffect(() => {
    console.log('[DEBUG] Reports: Processing filters...', {
      workHours: allWorkHours.length,
      invoices: allInvoices.length,
      siteFilter,
      employeeFilter,
      excludeWeekends
    });

    const workHours = allWorkHours;
    const invoices = allInvoices;

    const filtered = workHours.filter(w => {
      // Check if date is weekend
      const date = new Date(w.date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
      
      return (!excludeWeekends || !isWeekend) &&
        (!siteFilter || w.site === siteFilter) &&
        (!employeeFilter || w.employeeName === employeeFilter);
    });

    console.log('[DEBUG] Reports: Filtered work hours:', filtered.length);

    const totalHours = filtered.reduce((sum, w) => sum + (parseFloat(w.hours) || 0), 0);
    const totalPaid = invoices
      .filter(inv => inv.paid)
      .reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

    console.log('[DEBUG] Reports: Totals calculated:', { totalHours, totalPaid });

    // Group by employee
    const groupedByEmployee = {};
    const groupedBySite = {};
    
    for (let w of filtered) {
      const empName = w.employeeName || 'Unknown Employee';
      const site = w.site || 'Unknown Site';
      
      if (!groupedByEmployee[empName]) groupedByEmployee[empName] = 0;
      groupedByEmployee[empName] += parseFloat(w.hours || 0);

      if (!groupedBySite[site]) groupedBySite[site] = 0;
      groupedBySite[site] += parseFloat(w.hours || 0);
    }

    const barBySite = Object.entries(groupedBySite).map(([site, hours]) => ({
      site,
      hours,
    }));

    const barByEmployee = Object.entries(groupedByEmployee).map(([employeeName, hours]) => ({
      employeeName,
      hours,
    }));

    // Invoice status pie chart
    const statusCounts = {};
    for (let inv of invoices) {
      const status = inv.paid
        ? (inv.paidLate ? "Paguar me vonesë" : "Paguar në kohë")
        : "Pa paguar";
      if (!statusCounts[status]) statusCounts[status] = 0;
      statusCounts[status]++;
    }
    const pie = Object.entries(statusCounts).map(([status, value]) => ({
      status,
      value,
    }));

    console.log('[DEBUG] Reports: Charts data prepared:', {
      barBySite: barBySite.length,
      barByEmployee: barByEmployee.length,
      pie: pie.length
    });

    setFilteredHours(filtered);
    setSummary({ totalHours, totalPaid });
    setMonthlyExpenses(barBySite);
    setEmployeeEfficiency(barByEmployee);
    setInvoiceStatus(pie);
  }, [siteFilter, employeeFilter, excludeWeekends, allWorkHours, allInvoices]);

  const pieColors = ["#28a745", "#ffc107", "#dc3545"];

  const handleExportPDF = () => {
    const input = document.getElementById("report-content");
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      pdf.addImage(imgData, "PNG", 10, 10);
      pdf.save("raporti.pdf");
    });
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredHours);
    XLSX.utils.book_append_sheet(wb, ws, "Raporti");
    XLSX.writeFile(wb, "raporti.xlsx");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📊 Raportim & Analiza</h1>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="border p-2 rounded">
          <option value="">Të gjitha site-t</option>
          {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
        </select>
        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="border p-2 rounded">
          <option value="">Të gjithë punonjësit</option>
          {employeeOptions.map(emp => <option key={emp.id} value={emp.employeeName}>{emp.employeeName}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={excludeWeekends} onChange={() => setExcludeWeekends(!excludeWeekends)} />
          Përjashto fundjavat
        </label>
      </div>

      <div className="text-right mb-6 flex gap-3 justify-end">
        <button onClick={handleExportPDF} className="bg-green-600 text-white px-4 py-2 rounded">
          📄 Eksporto PDF
        </button>
        <button onClick={handleExportExcel} className="bg-yellow-500 text-white px-4 py-2 rounded">
          📊 Shkarko Excel
        </button>
      </div>

      <div id="report-content">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-lg font-semibold">Orë totale të punuara</h2>
            <p className="text-xl font-bold">{summary.totalHours}</p>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-lg font-semibold">Pagesa totale</h2>
            <p className="text-xl font-bold">£{summary.totalPaid.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">📊 Orë sipas punonjësve</h2>
          {employeeEfficiency && employeeEfficiency.length > 0 ? (
            <BarChart width={700} height={300} data={employeeEfficiency}>
              <XAxis dataKey="employeeName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#8884d8" />
            </BarChart>
          ) : (
            <p className="text-gray-500 italic py-8">Nuk ka të dhëna për të shfaqur</p>
          )}
        </div>

        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">🏗️ Orë pune sipas site-it</h2>
          {monthlyExpenses && monthlyExpenses.length > 0 ? (
            <BarChart
              width={800}
              height={350}
              data={monthlyExpenses}
            >
              <XAxis dataKey="site" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#3498db" />
            </BarChart>
          ) : (
            <p className="text-gray-500 italic py-8">Nuk ka të dhëna për të shfaqur</p>
          )}
        </div>

        {/* Faturat e papaguara - dizajn i ri */}
        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">📌 Faturat e Papaguara</h2>
          {allInvoices.filter(inv => !inv.paid).length === 0 ? (
            <p className="text-gray-500 italic">Të gjitha faturat janë të paguara ✅</p>
          ) : (
            <ul className="space-y-2 text-red-700 text-base">
              {allInvoices.filter(inv => !inv.paid).map((inv, idx) => (
                <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                  <span className="font-bold">🔴 Kontrata #{inv.contractNumber || ''}</span>
                  <span className="font-bold text-black">Nr. Fature: <b>{inv.invoiceNumber || ''}</b></span>
                  <span className="font-bold text-black flex items-center gap-1">🏢 Site: <b>{inv.siteName || ''}</b></span>
                  <span className="font-bold text-lg flex items-center gap-1">💷 {inv.total !== undefined ? `£${inv.total.toFixed(2)}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Shpenzimet e papaguara - dizajn i ri */}
        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">📂 Shpenzimet e Papaguara</h2>
          {allInvoices.filter(inv => !inv.paid).length === 0 ? (
            <p className="text-gray-500 italic">Të gjitha shpenzimet janë të paguara ✅</p>
          ) : (
            <ul className="space-y-2 text-red-700 text-base">
              {allInvoices.filter(inv => !inv.paid).map((inv, idx) => (
                <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                  <span className="font-bold flex items-center gap-1">📅 {inv.date ? new Date(inv.date).toLocaleDateString() : ''}</span>
                  <span className="font-bold text-lg">{inv.invoiceNumber || ''}</span>
                  <span className="font-bold text-lg flex items-center gap-1">💷 {inv.total !== undefined ? `£${inv.total.toFixed(2)}` : ''}</span>
                  <span className="font-bold text-blue-700 flex items-center gap-1">🏢 {inv.siteName || ''}</span>
                  <span className="text-gray-700">{inv.description || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">📍 Orë dhe Fitim Neto sipas site-it të punës</h2>
          {filteredHours && filteredHours.length > 0 ? (
            <BarChart
              width={800}
              height={350}
              data={Object.entries(
                filteredHours.reduce((acc, curr) => {
                  const site = curr.site || "Pa site";
                  const rate = curr.rate || 15; // Use actual rate from data or default to 15
                  const bruto = curr.hours * rate;
                  const neto = bruto * 0.2; // Company profit (20%)

                  if (!acc[site]) acc[site] = { site, hours: 0, profit: 0 };
                  acc[site].hours += curr.hours;
                  acc[site].profit += neto;
                  return acc;
                }, {})
              ).map(([_, value]) => value)}
            >
              <XAxis dataKey="site" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#3498db" name="Orë totale" />
              <Bar dataKey="profit" fill="#2ecc71" name="Fitim Neto (20%)" />
            </BarChart>
          ) : (
            <p className="text-gray-500 italic py-8">Nuk ka të dhëna për të shfaqur</p>
          )}
        </div>

        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">🧾 Statusi i faturave</h2>
          {invoiceStatus && invoiceStatus.length > 0 ? (
            <PieChart width={400} height={300}>
              <Pie
                data={invoiceStatus}
                dataKey="value"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {invoiceStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <p className="text-gray-500 italic py-8">Nuk ka të dhëna për fatura</p>
          )}
        </div>
      </div>
    </div>
  );
}