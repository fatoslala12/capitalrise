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
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Container, Grid } from "../components/ui/Layout";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { ResponsiveContainer, CartesianGrid } from "recharts";

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
  const { user } = useAuth();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [managerSites, setManagerSites] = useState([]);
  const [managerEmployees, setManagerEmployees] = useState([]);
  const [managerStats, setManagerStats] = useState({
    totalHours: 0,
    totalPay: 0,
    averageHoursPerEmployee: 0,
    topPerformers: [],
    siteBreakdown: []
  });
  const token = localStorage.getItem("token");

  // Merr të dhënat e menaxherit nëse është manager
  useEffect(() => {
    if (user?.role === "manager" && user?.employee_id) {
      axios.get(`https://building-system.onrender.com/api/employees/${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const managerData = res.data;
          const sites = managerData.workplace || [];
          setManagerSites(sites);
          
          // Merr punonjësit që punojnë në site-t e menaxherit
          axios.get("https://building-system.onrender.com/api/employees", {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(empRes => {
              const allEmployees = empRes.data || [];
              const filteredEmployees = allEmployees.filter(emp => 
                emp.workplace && Array.isArray(emp.workplace) && 
                emp.workplace.some(site => sites.includes(site))
              );
              setManagerEmployees(filteredEmployees);
              setEmployeeOptions(filteredEmployees.map(emp => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name}`
              })));
            });
        });
    }
  }, [user, token]);

  // useEffect për të marrë të dhënat dhe llogaritë dashboard stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [contractsRes, employeesRes, invoicesRes, tasksRes, expensesRes, paymentsRes, workHoursRes] = await Promise.all([
          api.get("/api/contracts"),
          api.get("/api/employees"),
          api.get("/api/invoices"),
          api.get("/api/tasks"),
          api.get("/api/expenses"),
          api.get("/api/payments"),
          api.get("/api/work-hours/structured"),
        ]);
        
        const contracts = snakeToCamel(contractsRes.data || []);
        const employees = snakeToCamel(employeesRes.data || []);
        const invoices = snakeToCamel(invoicesRes.data || []);
        const allTasksData = snakeToCamel(tasksRes.data || []);
        const allExpenses = snakeToCamel(expensesRes.data || []);
        const allPayments = snakeToCamel(paymentsRes.data || []);
        const structuredWorkHours = snakeToCamel(workHoursRes.data || {});
        
        // Filtrim për menaxherin
        let filteredContracts = contracts;
        let filteredEmployees = employees;
        let filteredWorkHours = structuredWorkHours;
        
        if (user?.role === "manager" && managerSites.length > 0) {
          // Filtro kontratat sipas site-ve të menaxherit
          filteredContracts = contracts.filter(c => 
            c.siteName && managerSites.includes(c.siteName)
          );
          
          // Filtro punonjësit sipas site-ve të menaxherit
          filteredEmployees = employees.filter(emp => 
            emp.workplace && Array.isArray(emp.workplace) && 
            emp.workplace.some(site => managerSites.includes(site))
          );
          
          // Filtro orët e punës për punonjësit e menaxherit
          const managerEmployeeIds = filteredEmployees.map(emp => emp.id);
          filteredWorkHours = {};
          Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
            if (managerEmployeeIds.includes(parseInt(empId))) {
              filteredWorkHours[empId] = empData;
            }
          });
        }
        
        // Llogarit statistika për menaxherin
        if (user?.role === "manager") {
          let totalHours = 0;
          let totalPay = 0;
          const siteHours = {};
          const employeeHours = {};
          
          Object.entries(filteredWorkHours).forEach(([empId, empData]) => {
            const emp = filteredEmployees.find(e => e.id === parseInt(empId));
            if (!emp) return;
            
            let empTotalHours = 0;
            Object.values(empData).forEach(weekData => {
              Object.values(weekData).forEach(dayData => {
                if (dayData?.hours) {
                  const hours = parseFloat(dayData.hours);
                  empTotalHours += hours;
                  totalHours += hours;
                  totalPay += hours * parseFloat(emp.hourlyRate || 0);
                  
                  if (dayData.site) {
                    siteHours[dayData.site] = (siteHours[dayData.site] || 0) + hours;
                  }
                }
              });
            });
            
            if (empTotalHours > 0) {
              employeeHours[empId] = {
                name: `${emp.firstName} ${emp.lastName}`,
                hours: empTotalHours,
                pay: empTotalHours * parseFloat(emp.hourlyRate || 0)
              };
            }
          });
          
          const topPerformers = Object.values(employeeHours)
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);
          
          const siteBreakdown = Object.entries(siteHours).map(([site, hours]) => ({
            site,
            hours,
            percentage: (hours / totalHours * 100).toFixed(1)
          }));
          
          setManagerStats({
            totalHours,
            totalPay,
            averageHoursPerEmployee: filteredEmployees.length > 0 ? totalHours / filteredEmployees.length : 0,
            topPerformers,
            siteBreakdown
          });
        }
        
        // Set site options
        const uniqueSites = [...new Set(filteredContracts.map(c => c.siteName).filter(Boolean))];
        setSiteOptions(uniqueSites);
        
        // Set employee options
        setEmployeeOptions(filteredEmployees.map(emp => ({
          value: emp.id,
          label: `${emp.firstName} ${emp.lastName}`
        })));
        
        // Process work hours data
        const hoursData = [];
        Object.entries(filteredWorkHours).forEach(([empId, empData]) => {
          const emp = filteredEmployees.find(e => e.id === parseInt(empId));
          if (!emp) return;
          
          Object.entries(empData).forEach(([weekLabel, weekData]) => {
            Object.entries(weekData).forEach(([dayName, dayData]) => {
              if (dayData?.hours && dayData?.site) {
                const date = new Date(weekLabel.split(' - ')[0]);
                const dayNames = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
                const dayIdx = dayNames.indexOf(dayName);
                if (dayIdx !== -1) {
                  date.setDate(date.getDate() + dayIdx);
                  
                  if (excludeWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
                    return;
                  }
                  
                  const record = {
                    date: format(date, 'yyyy-MM-dd'),
                    employee: `${emp.firstName} ${emp.lastName}`,
                    site: dayData.site,
                    hours: parseFloat(dayData.hours),
                    pay: parseFloat(dayData.hours) * parseFloat(emp.hourlyRate || 0),
                    rate: parseFloat(emp.hourlyRate || 0)
                  };
                  
                  if ((!siteFilter || record.site === siteFilter) &&
                      (!employeeFilter || record.employee === employeeFilter)) {
                    hoursData.push(record);
                  }
                }
              }
            });
          });
        });
        
        setFilteredHours(hoursData);
        
        // Calculate summary
        const totalHours = hoursData.reduce((sum, record) => sum + record.hours, 0);
        const totalPaid = hoursData.reduce((sum, record) => sum + record.pay, 0);
        setSummary({ totalHours, totalPaid });
        
        // Calculate monthly expenses
        const monthlyData = {};
        allExpenses.forEach(expense => {
          if (expense.date) {
            const month = format(new Date(expense.date), 'yyyy-MM');
            if (!monthlyData[month]) {
              monthlyData[month] = { month, amount: 0 };
            }
            monthlyData[month].amount += parseFloat(expense.amount || 0);
          }
        });
        setMonthlyExpenses(Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)));
        
        // Calculate employee efficiency
        const efficiencyData = [];
        Object.entries(filteredWorkHours).forEach(([empId, empData]) => {
          const emp = filteredEmployees.find(e => e.id === parseInt(empId));
          if (!emp) return;
          
          let totalHours = 0;
          let totalPay = 0;
          Object.values(empData).forEach(weekData => {
            Object.values(weekData).forEach(dayData => {
              if (dayData?.hours) {
                totalHours += parseFloat(dayData.hours);
                totalPay += parseFloat(dayData.hours) * parseFloat(emp.hourlyRate || 0);
              }
            });
          });
          
          if (totalHours > 0) {
            efficiencyData.push({
              name: `${emp.firstName} ${emp.lastName}`,
              hours: totalHours,
              pay: totalPay,
              efficiency: (totalHours / 40).toFixed(2) // Assuming 40 hours is standard
            });
          }
        });
        setEmployeeEfficiency(efficiencyData.sort((a, b) => b.hours - a.hours));
        
        // Calculate invoice status
        const invoiceData = [];
        const statusCounts = { paid: 0, unpaid: 0, overdue: 0 };
        
        filteredContracts.forEach(contract => {
          const contractInvoices = invoices.filter(inv => inv.contractNumber === contract.contractNumber);
          contractInvoices.forEach(invoice => {
            const status = invoice.paid ? 'paid' : 
                          new Date(invoice.dueDate) < new Date() ? 'overdue' : 'unpaid';
            statusCounts[status]++;
            
            invoiceData.push({
              contract: contract.contractNumber,
              invoice: invoice.invoiceNumber,
              amount: parseFloat(invoice.total || 0),
              status: status
            });
          });
        });
        
        setInvoiceStatus([
          { name: 'Paguar', value: statusCounts.paid, fill: '#10B981' },
          { name: 'Pa paguar', value: statusCounts.unpaid, fill: '#F59E0B' },
          { name: 'Me vonesë', value: statusCounts.overdue, fill: '#EF4444' }
        ]);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Gabim gjatë ngarkimit të të dhënave. Ju lutem provoni përsëri.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, managerSites, siteFilter, employeeFilter, excludeWeekends]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredHours);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Work Hours");
    XLSX.writeFile(wb, "work_hours_report.xlsx");
  };

  const exportToPDF = async () => {
    const element = document.getElementById('reports-container');
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF();
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save("work_hours_report.pdf");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-red-600 text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Gabim gjatë ngarkimit</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Provoni përsëri
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div id="reports-container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {user?.role === "manager" ? "📊 Raportet e Menaxherit" : "📊 Raportet"}
          </h1>
          
          {user?.role === "manager" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">ℹ️ Informacion për Menaxherin</h3>
              <p className="text-blue-700">
                Këto raporte shfaqin vetëm të dhënat për site-t që menaxhoni: <strong>{managerSites.join(", ")}</strong>
              </p>
            </div>
          )}

          {/* Filtra */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>🔍 Filtra</CardTitle>
            </CardHeader>
            <CardContent>
              <Grid cols={3} gap={4}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
                  <select
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Të gjitha</option>
                    {siteOptions.map((site) => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Punonjësi</label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Të gjithë</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp.value} value={emp.label}>{emp.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={excludeWeekends}
                      onChange={(e) => setExcludeWeekends(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Përjashto fundjavët</span>
                  </label>
                </div>
              </Grid>
            </CardContent>
          </Card>

          {/* Statistika për Menaxherin */}
          {user?.role === "manager" && (
            <Grid cols={4} gap={6} className="mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{managerStats.totalHours.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Total Orë</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">£{managerStats.totalPay.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Total Paga</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{managerStats.averageHoursPerEmployee.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Mesatarja/Punonjës</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{managerEmployees.length}</div>
                    <div className="text-sm text-gray-600">Punonjës</div>
                  </div>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Përmbledhja */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>📈 Përmbledhja</CardTitle>
            </CardHeader>
            <CardContent>
              <Grid cols={2} gap={4}>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{summary.totalHours.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Total Orë</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">£{summary.totalPaid.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total Paga</div>
                </div>
              </Grid>
            </CardContent>
          </Card>

          {/* Top Performers për Menaxherin */}
          {user?.role === "manager" && managerStats.topPerformers.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>🏆 Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {managerStats.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{performer.name}</div>
                          <div className="text-sm text-gray-600">{performer.hours.toFixed(1)} orë</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">£{performer.pay.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown sipas Site-ve për Menaxherin */}
          {user?.role === "manager" && managerStats.siteBreakdown.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>🏗️ Breakdown sipas Site-ve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {managerStats.siteBreakdown.map((site, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold">{site.site}</div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">{site.hours.toFixed(1)} orë</div>
                        <div className="text-sm text-blue-600">{site.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grafikët */}
          <Grid cols={2} gap={6} className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>📊 Orët e Punës sipas Muajit</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyExpenses}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📈 Efikasiteti i Punonjësve</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={employeeEfficiency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Statusi i Faturave */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>📄 Statusi i Faturave</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={invoiceStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {invoiceStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Butona për Export */}
          <div className="flex gap-4 mb-8">
            <Button onClick={exportToExcel} variant="primary">
              📊 Export Excel
            </Button>
            <Button onClick={exportToPDF} variant="secondary">
              📄 Export PDF
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}