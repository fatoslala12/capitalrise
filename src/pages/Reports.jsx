import { useState, useEffect } from "react";
import {
  format,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  subDays,
  subMonths,
  subQuarters
} from "date-fns";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, CartesianGrid, Legend
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
import { 
  Download, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filter states
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [siteFilter, setSiteFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Data states
  const [financialData, setFinancialData] = useState({});
  const [employeePerformance, setEmployeePerformance] = useState([]);
  const [sitePerformance, setSitePerformance] = useState([]);
  const [contractPerformance, setContractPerformance] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(['hours', 'cost', 'employees']);

  // Chart colors
  const chartColors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F97316',
    info: '#06B6D4',
    purple: '#8B5CF6'
  };

  // Fetch comprehensive data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        financialRes,
        employeeRes,
        siteRes,
        contractRes,
        timeSeriesRes,
        dashboardRes
      ] = await Promise.all([
        api.get(`/api/business-intelligence/financial-report?period=${period}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`),
        api.get(`/api/business-intelligence/employee-performance?period=${period}&site=${siteFilter}&employeeId=${employeeFilter}`),
        api.get(`/api/business-intelligence/site-performance?period=${period}`),
        api.get(`/api/business-intelligence/contract-performance?status=${statusFilter}`),
        api.get(`/api/business-intelligence/time-series?metric=hours&period=${period}&groupBy=day`),
        api.get('/api/business-intelligence/dashboard-stats')
      ]);

      setFinancialData(financialRes.data || {});
      setEmployeePerformance(employeeRes.data || []);
      setSitePerformance(siteRes.data || []);
      setContractPerformance(contractRes.data || []);
      setTimeSeriesData(timeSeriesRes.data || []);
      setDashboardStats(dashboardRes.data || {});
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Gabim gjatë ngarkimit të të dhënave. Ju lutem provoni përsëri.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, startDate, endDate, siteFilter, employeeFilter, statusFilter]);

  // Export functions
  const exportToExcel = async (type) => {
    try {
      setExporting(true);
      const response = await api.get(`/api/business-intelligence/export-data?type=${type}&format=json&period=${period}`);
      
      if (response.data.success) {
        const ws = XLSX.utils.json_to_sheet(response.data.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type);
        XLSX.writeFile(wb, `${response.data.filename}.xlsx`);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async (sectionId) => {
    try {
      setExporting(true);
      const element = document.getElementById(sectionId);
      if (!element) return;
      
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
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
      
      pdf.save(`${sectionId}_report.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <AlertCircle className="text-red-600 text-4xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Gabim gjatë ngarkimit</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchData} variant="primary">
              Provoni përsëri
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 Raportet e Administrimit</h1>
              <p className="text-blue-100">Analiza e plotë e performancës dhe eksportimi i të dhënave</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowFilters(!showFilters)} 
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 border-white/30"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Fsheh Filtra' : 'Shfaq Filtra'}
              </Button>
              <Button onClick={fetchData} variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30">
                <RefreshCw className="w-4 h-4 mr-2" />
                Rifresko
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtra dhe Periudha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Grid cols={4} gap={4}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Periudha</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="month">Muaj i fundit</option>
                    <option value="quarter">3 Muajt e fundit</option>
                    <option value="year">Viti i fundit</option>
                    <option value="custom">Periudhë e përzgjedhur</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data e Fillimit</label>
                  <DatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={period !== 'custom'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data e Përfundimit</label>
                  <DatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={period !== 'custom'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statusi</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Të gjitha</option>
                    <option value="Ne progres">Në progres</option>
                    <option value="Mbyllur">Mbyllur</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'overview', label: 'Përmbledhja', icon: BarChart3 },
            { id: 'financial', label: 'Financiare', icon: DollarSign },
            { id: 'employees', label: 'Punonjësit', icon: Users },
            { id: 'sites', label: 'Site-t', icon: Building2 },
            { id: 'contracts', label: 'Kontratat', icon: FileText },
            { id: 'analytics', label: 'Analitika', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div id="overview-section">
            {/* Key Metrics */}
            <Grid cols={4} gap={6} className="mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Orë</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {(financialData?.workHours?.total || 0).toFixed(1)}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Total Fitim</p>
                      <p className="text-2xl font-bold text-green-900">
                        £{(financialData?.profit?.total || 0).toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Kontrata Aktive</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {financialData?.revenue?.active || '0'}
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Punonjës Aktive</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {financialData?.workHours?.employees || '0'}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </Grid>

            {/* Charts */}
            <Grid cols={2} gap={6} className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>📈 Aktiviteti i Orëve në Kohë</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px' 
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={chartColors.primary} 
                        fill={chartColors.primary} 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📊 Statusi i Faturave</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Paguar', value: financialData?.invoices?.paid || 0, fill: chartColors.success },
                          { name: 'Pa paguar', value: financialData?.invoices?.unpaid || 0, fill: chartColors.warning }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Export Buttons */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>📤 Eksportimi i Raporteve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={() => exportToExcel('work-hours')} 
                    variant="primary"
                    disabled={exporting}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Eksporto Orët e Punës (Excel)
                  </Button>
                  <Button 
                    onClick={() => exportToExcel('expenses')} 
                    variant="secondary"
                    disabled={exporting}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Eksporto Shpenzimet (Excel)
                  </Button>
                  <Button 
                    onClick={() => exportToPDF('overview-section')} 
                    variant="secondary"
                    disabled={exporting}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Eksporto PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'financial' && (
          <div id="financial-section">
            {/* Financial Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>💰 Përmbledhja Financiare</CardTitle>
              </CardHeader>
              <CardContent>
                <Grid cols={3} gap={6}>
                  <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      £{(financialData?.revenue?.total || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600">Total Të Ardhura</div>
                  </div>
                  
                  <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                    <DollarSign className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">
                      £{(financialData?.expenses?.total || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-red-600">Total Shpenzime</div>
                  </div>
                  
                  <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      £{(financialData?.profit?.total || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-600">Total Fitim</div>
                  </div>
                </Grid>
                
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Marzhi i Fitimit:</span>
                    <span className="text-lg font-bold text-green-600">
                      {financialData?.profit?.percentage || '0'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Grid cols={2} gap={6} className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>📊 Shpërndarja e Shpenzimeve</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Materiale', value: financialData?.expenses?.materials || 0, fill: chartColors.primary },
                          { name: 'Punë', value: financialData?.expenses?.labor || 0, fill: chartColors.secondary }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>📈 Të Ardhurat vs Shpenzimet</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { category: 'Të Ardhura', value: financialData?.revenue?.total || 0, fill: chartColors.success },
                      { category: 'Shpenzime', value: financialData?.expenses?.total || 0, fill: chartColors.danger }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px' 
                        }} 
                      />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </div>
        )}

        {activeTab === 'employees' && (
          <div id="employees-section">
            {/* Employee Performance Table */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>👥 Performanca e Punonjësve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-700">Punonjësi</th>
                        <th className="text-left p-3 font-medium text-gray-700">Orë Totale</th>
                        <th className="text-left p-3 font-medium text-gray-700">Fitimi Total</th>
                        <th className="text-left p-3 font-medium text-gray-700">Ditët e Punës</th>
                        <th className="text-left p-3 font-medium text-gray-700">Mesatarja/Ditë</th>
                        <th className="text-left p-3 font-medium text-gray-700">Efikasiteti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeePerformance.map((emp, index) => (
                        <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                                {emp.name.charAt(0)}
                              </div>
                              <span className="font-medium">{emp.name}</span>
                            </div>
                          </td>
                          <td className="p-3">{(emp.totalHours || 0).toFixed(1)}h</td>
                          <td className="p-3 font-medium text-green-600">£{(emp.totalEarnings || 0).toFixed(2)}</td>
                          <td className="p-3">{emp.workingDays || 0}</td>
                          <td className="p-3">{(emp.avgHoursPerDay || 0).toFixed(1)}h</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${Math.min(emp.efficiency || 0, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">{(emp.efficiency || 0).toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Export Buttons */}
            <div className="flex gap-4 mb-8">
              <Button 
                onClick={() => exportToExcel('employees')} 
                variant="primary"
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Eksporto Excel
              </Button>
              <Button 
                onClick={() => exportToPDF('employees-section')} 
                variant="secondary"
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Eksporto PDF
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'sites' && (
          <div id="sites-section">
            {/* Site Performance Cards */}
            <Grid cols={3} gap={6} className="mb-8">
              {sitePerformance.map((site, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {site.site}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Orë:</span>
                        <span className="font-medium">{(site.totalHours || 0).toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Kosto e Punës:</span>
                        <span className="font-medium text-blue-600">£{(site.totalLaborCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Shpenzime:</span>
                        <span className="font-medium text-red-600">£{(site.totalExpenses || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Punonjës:</span>
                        <span className="font-medium">{site.activeEmployees || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Efikasiteti:</span>
                          <span className="font-medium text-green-600">{(site.efficiency || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div id="contracts-section">
            {/* Contract Performance Table */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>📄 Performanca e Kontratave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-700">Kontrata</th>
                        <th className="text-left p-3 font-medium text-gray-700">Site</th>
                        <th className="text-left p-3 font-medium text-gray-700">Vlera</th>
                        <th className="text-left p-3 font-medium text-gray-700">Statusi</th>
                        <th className="text-left p-3 font-medium text-gray-700">Kosto e Përgjithshme</th>
                        <th className="text-left p-3 font-medium text-gray-700">Fitimi</th>
                        <th className="text-left p-3 font-medium text-gray-700">Marzhi</th>
                        <th className="text-left p-3 font-medium text-gray-700">Përfundimi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractPerformance && contractPerformance.length > 0 ? (
                        contractPerformance.map((contract, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium">{contract.contractNumber}</td>
                          <td className="p-3">{contract.siteName}</td>
                          <td className="p-3 font-medium">£{(contract.contractValue || 0).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              contract.status === 'Mbyllur' ? 'bg-green-100 text-green-800' :
                              contract.status === 'Ne progres' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {contract.status || 'Aktive'}
                            </span>
                          </td>
                          <td className="p-3">£{(contract.totalSpent || 0).toFixed(2)}</td>
                          <td className={`p-3 font-medium ${
                            (contract.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            £{(contract.profit || 0).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              (contract.profitMargin || 0) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {(contract.profitMargin || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${contract.completion || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">{(contract.completion || 0).toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Export Buttons */}
            <div className="flex gap-4 mb-8">
              <Button 
                onClick={() => exportToExcel('contracts')} 
                variant="primary"
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Eksporto Excel
              </Button>
              <Button 
                onClick={() => exportToPDF('contracts-section')} 
                variant="secondary"
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Eksporto PDF
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div id="analytics-section">
            {/* Advanced Analytics */}
            <Grid cols={2} gap={6} className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>📊 Analiza e Trendit</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px' 
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={chartColors.primary} 
                        strokeWidth={3}
                        dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🎯 Metrikat e Performancës</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { metric: 'Orët', value: 85, fullMark: 100 },
                      { metric: 'Efikasiteti', value: 78, fullMark: 100 },
                      { metric: 'Fitimi', value: 92, fullMark: 100 },
                      { metric: 'Kontratat', value: 88, fullMark: 100 },
                      { metric: 'Punonjësit', value: 95, fullMark: 100 }
                    ]}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="metric" stroke="#6b7280" />
                      <PolarRadiusAxis stroke="#6b7280" />
                      <Radar 
                        name="Performanca" 
                        dataKey="value" 
                        stroke={chartColors.primary} 
                        fill={chartColors.primary} 
                        fillOpacity={0.3} 
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </div>
        )}
      </div>
    </Container>
  );
}