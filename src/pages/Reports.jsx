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
        const [contractsRes, employeesRes, workHoursRes, invoicesRes] = await Promise.all([
          axios.get("http://localhost:5000/api/contracts", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/employees", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/work-hours/all", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/invoices", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const contracts = contractsRes.data || [];
        const employees = employeesRes.data || [];
        const workHours = workHoursRes.data || [];
        const invoices = invoicesRes.data || [];

        // Site options
        const sites = [...new Set(contracts.map(c => c.siteName).filter(Boolean))];
        setSiteOptions(sites);

        // Employee options
        const employeeNames = employees.map(e => ({
          id: e.id,
          employeeName: `${e.firstName} ${e.lastName}`
        }));
        setEmployeeOptions(employeeNames);

        // Përgatit orët e punës për raportim
        const allHours = [];
        workHours.forEach((wh) => {
          const emp = employees.find(e => e.id.toString() === wh.employeeId.toString());
          const empName = emp ? `${emp.firstName} ${emp.lastName}` : `Punonjës ${wh.employeeId}`;
          Object.entries(wh.weeks || {}).forEach(([weekLabel, days]) => {
            Object.entries(days).forEach(([day, entry]) => {
              if (day !== "hourlyRate") {
                allHours.push({
                  employeeId: wh.employeeId,
                  employeeName: empName,
                  site: entry.site,
                  date: `${weekLabel} - ${day}`,
                  hours: parseFloat(entry.hours || 0)
                });
              }
            });
          });
        });
        setAllWorkHours(allHours);

        // Përgatit faturat për raportim
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
          allInvs.push({
            ...inv,
            total,
            paid: inv.paid,
            paidLate: !!inv.paidLate
          });
        });
        setAllInvoices(allInvs);

      } catch (err) {
        setSiteOptions([]);
        setEmployeeOptions([]);
        setAllWorkHours([]);
        setAllInvoices([]);
      }
    };
    fetchData();
  }, [token]);

  // Përpunim filtrash dhe përmbledhjesh
  useEffect(() => {
    const workHours = allWorkHours;
    const invoices = allInvoices;

    const filtered = workHours.filter(w => {
      const isWeekend = /Saturday|Sunday/i.test(w.date);
      return (!excludeWeekends || !isWeekend) &&
        (!siteFilter || w.site === siteFilter) &&
        (!employeeFilter || w.employeeName === employeeFilter);
    });

    const totalHours = filtered.reduce((sum, w) => sum + (parseFloat(w.hours) || 0), 0);
    const totalPaid = invoices
      .filter(inv => inv.paid)
      .reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

    const now = new Date();
    const months = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
    const monthly = months.map(month => {
      const key = format(month, "yyyy-MM");
      const total = invoices
        .filter(inv => inv.paid && inv.date?.startsWith(key))
        .reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
      return {
        month: format(month, "MMM"),
        expenses: total,
      };
    });

    const groupedByEmployee = {};
    const groupedBySite = {};
    for (let w of filtered) {
      if (!groupedByEmployee[w.employeeName]) groupedByEmployee[w.employeeName] = 0;
      groupedByEmployee[w.employeeName] += parseFloat(w.hours || 0);

      if (!groupedBySite[w.site]) groupedBySite[w.site] = 0;
      groupedBySite[w.site] += parseFloat(w.hours || 0);
    }

    const radar = Object.entries(groupedByEmployee).map(([employeeName, hours]) => ({
      employeeName,
      efficiency: hours,
    }));

    const barBySite = Object.entries(groupedBySite).map(([site, hours]) => ({
      site,
      hours,
    }));

    const barByEmployee = Object.entries(groupedByEmployee).map(([employeeName, hours]) => ({
      employeeName,
      hours,
    }));

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
          <BarChart width={700} height={300} data={employeeEfficiency}>
            <XAxis dataKey="employeeName" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#8884d8" />
          </BarChart>
        </div>

        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">💸 Shpenzimet sipas site-it të punës (pagesa reale)</h2>
          <BarChart
            width={800}
            height={350}
            data={monthlyExpenses}
          >
            <XAxis dataKey="site" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#d63031" />
          </BarChart>
        </div>

        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">📍 Orë dhe Fitim Neto sipas site-it të punës</h2>
          <BarChart
            width={800}
            height={350}
            data={Object.entries(
              filteredHours.reduce((acc, curr) => {
                const site = curr.site || "Pa site";
                const rate = 15; // mund të zëvendësohet me logjikë nga kontrata ose punonjësi
                const bruto = curr.hours * rate;
                const neto = bruto * 0.8;

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
            <Bar dataKey="profit" fill="#2ecc71" name="Fitim Neto" />
          </BarChart>
        </div>

        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">🧾 Statusi i faturave</h2>
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
        </div>
      </div>
    </div>
  );
}