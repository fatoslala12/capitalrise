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
import PageLoader from "../components/ui/PageLoader";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Container, Grid } from "../components/ui/Layout";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    purple: '#8B5CF6',
    gradient: {
      blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      green: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      purple: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      orange: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
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

      console.log('Contract data received:', contractRes.data);
      console.log('Contract data type:', typeof contractRes.data);
      console.log('Contract data length:', contractRes.data?.length);

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
    return <PageLoader text="Duke ngarkuar raportet..." />;
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
    <div className="w-full px-4 md:px-6 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 md:p-6 text-white mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">📊 {t('reportsPage.adminReports')}</h1>
              <p className="text-blue-100 text-sm md:text-base">{t('reportsPage.fullPerformanceAnalysis')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
                              <Button 
                  onClick={() => setShowFilters(!showFilters)} 
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 border-white/30 text-sm"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{showFilters ? t('reportsPage.hideFilters') : t('reportsPage.showFilters')}</span>
                  <span className="sm:hidden">{t('reportsPage.filters')}</span>
                </Button>
                <Button onClick={fetchData} variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('reportsPage.refresh')}</span>
                  <span className="sm:hidden">🔄</span>
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
                {t('reportsPage.filtersAndPeriod')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Grid cols={4} gap={4}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('reportsPage.period')}</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="month">{t('reportsPage.lastMonth')}</option>
                    <option value="quarter">{t('reportsPage.last3Months')}</option>
                    <option value="year">{t('reportsPage.lastYear')}</option>
                    <option value="custom">{t('reportsPage.customPeriod')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('reportsPage.startDate')}</label>
                  <DatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={period !== 'custom'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('reportsPage.endDate')}</label>
                  <DatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={period !== 'custom'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('reportsPage.status')}</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('reportsPage.allStatuses')}</option>
                    <option value="Ne progres">{t('reportsPage.inProgress')}</option>
                    <option value="Mbyllur">{t('reportsPage.closed')}</option>
                    <option value="Draft">{t('reportsPage.draft')}</option>
                  </select>
                </div>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: t('reportsPage.overview'), icon: BarChart3 },
            { id: 'financial', label: t('reportsPage.financial'), icon: DollarSign },
            { id: 'employees', label: t('reportsPage.employees'), icon: Users },
            { id: 'sites', label: t('reportsPage.sites'), icon: Building2 },
            { id: 'contracts', label: t('reportsPage.contracts'), icon: FileText },
            { id: 'analytics', label: t('reportsPage.analytics'), icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap text-xs md:text-sm ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.charAt(0)}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div id="overview-section">
            {/* Key Metrics */}
            <Grid cols={1} md:cols={2} lg:cols={4} gap={4} md:gap={6} className="mb-6 md:mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-blue-600">{t('reportsPage.totalHours')}</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-900">
                        {(financialData?.workHours?.total || 0).toFixed(1)}
                      </p>
                    </div>
                    <Clock className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-green-600">{t('reportsPage.totalProfit')}</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-900">
                        £{(financialData?.profit?.total || 0).toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-purple-600">{t('reportsPage.activeContracts')}</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold text-purple-900">
                        {financialData?.revenue?.active || '0'}
                      </p>
                    </div>
                    <Target className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-orange-600">{t('reportsPage.activeEmployees')}</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-900">
                        {financialData?.workHours?.employees || '0'}
                      </p>
                    </div>
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </Grid>

            {/* Charts */}
            <Grid cols={1} lg:cols={2} gap={4} md:gap={6} className="mb-6 md:mb-8">
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">📈 {t('reportsPage.hourlyActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          fontSize: '12px'
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

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">📊 {t('reportsPage.invoiceStatus')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('reportsPage.paid'), value: financialData?.invoices?.paid || 0, fill: chartColors.success },
                          { name: t('reportsPage.unpaid'), value: financialData?.invoices?.unpaid || 0, fill: chartColors.warning }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={60}
                        dataKey="value"
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Export Buttons */}
            <Card className="mb-6 md:mb-8 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">📤 {t('reportsPage.reportExport')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
                  <Button 
                    onClick={() => exportToExcel('work-hours')} 
                    variant="primary"
                    disabled={exporting}
                    className="flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('reportsPage.exportWorkHours')}</span>
                    <span className="sm:hidden">{t('reportsPage.exportWorkHoursShort')}</span>
                  </Button>
                  <Button 
                    onClick={() => exportToExcel('expenses')} 
                    variant="secondary"
                    disabled={exporting}
                    className="flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('reportsPage.exportExpenses')}</span>
                    <span className="sm:hidden">{t('reportsPage.exportExpensesShort')}</span>
                  </Button>
                  <Button 
                    onClick={() => exportToPDF('overview-section')} 
                    variant="secondary"
                    disabled={exporting}
                    className="flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('reportsPage.exportPDF')}</span>
                    <span className="sm:hidden">{t('reportsPage.exportPDFShort')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'financial' && (
          <div id="financial-section">
            {/* Financial Summary */}
            <Card className="mb-6 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">💰 {t('reportsPage.financialSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Grid cols={1} md:cols={3} gap={4} md:gap={6}>
                  <div className="text-center p-4 md:p-6 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition-all duration-300">
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-xl md:text-2xl font-bold text-green-600">
                      £{(financialData?.revenue?.total || 0).toFixed(2)}
                    </div>
                    <div className="text-xs md:text-sm text-green-600">{t('reportsPage.totalRevenue')}</div>
                  </div>
                  
                  <div className="text-center p-4 md:p-6 bg-red-50 rounded-lg border border-red-200 hover:shadow-md transition-all duration-300">
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-red-600 mx-auto mb-2" />
                    <div className="text-xl md:text-2xl font-bold text-red-600">
                      £{(financialData?.expenses?.total || 0).toFixed(2)}
                    </div>
                    <div className="text-xs md:text-sm text-red-600">{t('reportsPage.totalExpenses')}</div>
                  </div>
                  
                  <div className="text-center p-4 md:p-6 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-300">
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-xl md:text-2xl font-bold text-blue-600">
                      £{(financialData?.profit?.total || 0).toFixed(2)}
                    </div>
                    <div className="text-xs md:text-sm text-blue-600">{t('reportsPage.totalProfit')}</div>
                  </div>
                </Grid>
                
                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm font-medium text-gray-600">{t('reportsPage.profitMargin')}:</span>
                    <span className="text-base md:text-lg font-bold text-green-600">
                      {financialData?.profit?.percentage || '0'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Grid cols={1} lg:cols={2} gap={4} md:gap={6} className="mb-6 md:mb-8">
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">📊 {t('reportsPage.expenseDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('reportsPage.materials'), value: financialData?.expenses?.materials || 0, fill: chartColors.primary },
                          { name: t('reportsPage.labor'), value: financialData?.expenses?.labor || 0, fill: chartColors.secondary }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={60}
                        dataKey="value"
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">📈 {t('reportsPage.revenueVsExpenses')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <BarChart data={[
                      { category: t('reportsPage.revenue'), value: financialData?.revenue?.total || 0, fill: chartColors.success },
                      { category: t('reportsPage.expenses'), value: financialData?.expenses?.total || 0, fill: chartColors.danger }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          fontSize: '12px'
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
            <Card className="mb-6 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">👥 {t('reportsPage.employeePerformance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm">{t('reportsPage.employee')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm hidden md:table-cell">{t('reportsPage.totalHoursCol')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm hidden md:table-cell">{t('reportsPage.totalEarnings')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm hidden sm:table-cell">{t('reportsPage.workingDays')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm hidden lg:table-cell">{t('reportsPage.avgHoursPerDay')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm">{t('reportsPage.efficiency')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeePerformance.map((emp, index) => (
                        <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs md:text-sm">
                                {emp.name.charAt(0)}
                              </div>
                              <span className="font-medium text-xs md:text-sm">{emp.name}</span>
                            </div>
                          </td>
                          <td className="p-2 md:p-3 hidden md:table-cell text-xs md:text-sm">{(emp.totalHours || 0).toFixed(1)}h</td>
                          <td className="p-2 md:p-3 font-medium text-green-600 hidden md:table-cell text-xs md:text-sm">£{(emp.totalEarnings || 0).toFixed(2)}</td>
                          <td className="p-2 md:p-3 hidden sm:table-cell text-xs md:text-sm">{emp.workingDays || 0}</td>
                          <td className="p-2 md:p-3 hidden lg:table-cell text-xs md:text-sm">{(emp.avgHoursPerDay || 0).toFixed(1)}h</td>
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 md:w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${Math.min(emp.efficiency || 0, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs md:text-sm text-gray-600">{(emp.efficiency || 0).toFixed(1)}%</span>
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
                {t('reportsPage.exportExcel')}
              </Button>
              <Button 
                onClick={() => exportToPDF('employees-section')} 
                variant="secondary"
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {t('reportsPage.exportPDF')}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'sites' && (
          <div id="sites-section">
            {/* Site Performance Cards */}
            <Grid cols={1} md:cols={2} lg:cols={3} gap={4} md:gap={6} className="mb-6 md:mb-8">
              {sitePerformance.map((site, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Building2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                      {site.site}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex justify-between">
                        <span className="text-xs md:text-sm text-gray-600">{t('reportsPage.totalHours')}:</span>
                        <span className="font-medium text-xs md:text-sm">{(site.totalHours || 0).toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs md:text-sm text-gray-600">{t('reportsPage.laborCost')}:</span>
                        <span className="font-medium text-blue-600 text-xs md:text-sm">£{(site.totalLaborCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs md:text-sm text-gray-600">{t('reportsPage.expenses')}:</span>
                        <span className="font-medium text-red-600 text-xs md:text-sm">£{(site.totalExpenses || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs md:text-sm text-gray-600">{t('reportsPage.activeEmployeesCol')}:</span>
                        <span className="font-medium text-xs md:text-sm">{site.activeEmployees || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between">
                          <span className="text-xs md:text-sm text-gray-600">{t('reportsPage.efficiency')}:</span>
                          <span className="font-medium text-green-600 text-xs md:text-sm">{(site.efficiency || 0).toFixed(1)}%</span>
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
            <Card className="mb-6 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">📄 {t('reportsPage.contractPerformance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm">{t('reportsPage.contract')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm hidden md:table-cell">{t('reportsPage.site')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm">{t('reportsPage.value')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm">{t('reportsPage.status')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm hidden lg:table-cell">{t('reportsPage.overallCost')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm">{t('reportsPage.profit')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm hidden xl:table-cell">{t('reportsPage.margin')}</th>
                        <th className="text-left p-2 md:p-3 font-medium text-gray-700 text-xs md:text-sm">{t('reportsPage.completion')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        console.log('Rendering contracts table with data:', contractPerformance);
                        console.log('Contract performance type:', typeof contractPerformance);
                        console.log('Contract performance length:', contractPerformance?.length);
                        return contractPerformance && contractPerformance.length > 0 ? (
                          contractPerformance.map((contract, index) => {
                            console.log('Rendering contract:', contract, 'at index:', index);
                            return (
                                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2 md:p-3 font-medium text-xs md:text-sm">{(() => {
                              console.log('contract.contractNumber:', contract.contractNumber);
                              return contract.contractNumber;
                            })()}</td>
                            <td className="p-2 md:p-3 hidden md:table-cell text-xs md:text-sm">{(() => {
                              console.log('contract.siteName:', contract.siteName);
                              return contract.siteName;
                            })()}</td>
                            <td className="p-2 md:p-3 font-medium text-xs md:text-sm">£{(() => {
                              console.log('contract.contractValue:', contract.contractValue, 'type:', typeof contract.contractValue);
                              return (contract.contractValue || 0).toFixed(2);
                            })()}</td>
                            <td className="p-2 md:p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                contract.status === 'Mbyllur' ? 'bg-green-100 text-green-800' :
                                contract.status === 'Ne progres' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {contract.status || 'Aktive'}
                              </span>
                            </td>
                            <td className="p-2 md:p-3 hidden lg:table-cell text-xs md:text-sm">£{(contract.totalSpent || 0).toFixed(2)}</td>
                            <td className={`p-2 md:p-3 font-medium text-xs md:text-sm ${
                              (contract.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              £{(contract.profit || 0).toFixed(2)}
                            </td>
                            <td className="p-2 md:p-3 hidden xl:table-cell">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                (contract.profitMargin || 0) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {(contract.profitMargin || 0).toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-2 md:p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-12 md:w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${contract.completion || 0}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs md:text-sm text-gray-600">{(contract.completion || 0).toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                            );
                          })
                        ) : (
                          <tr>
                                                      <td colSpan="8" className="p-6 text-center text-gray-500">
                            {t('reportsPage.noContractData')}
                          </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Export Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
              <Button 
                onClick={() => exportToExcel('contracts')} 
                variant="primary"
                disabled={exporting}
                className="flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">{t('reportsPage.exportExcel')}</span>
                <span className="sm:hidden">{t('reportsPage.exportExcel')}</span>
              </Button>
              <Button 
                onClick={() => exportToPDF('contracts-section')} 
                variant="secondary"
                disabled={exporting}
                className="flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t('reportsPage.exportPDF')}</span>
                <span className="sm:hidden">{t('reportsPage.exportPDF')}</span>
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div id="analytics-section">
            {/* Advanced Analytics */}
            <Grid cols={1} lg:cols={2} gap={4} md:gap={6} className="mb-6 md:mb-8">
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">📊 {t('reportsPage.trendAnalysis')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          fontSize: '12px'
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

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">🎯 {t('reportsPage.performanceMetrics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <RadarChart data={[
                      { metric: t('reportsPage.hours'), value: 85, fullMark: 100 },
                      { metric: t('reportsPage.efficiencyMetric'), value: 78, fullMark: 100 },
                      { metric: t('reportsPage.profitMetric'), value: 92, fullMark: 100 },
                      { metric: t('reportsPage.contractsMetric'), value: 88, fullMark: 100 },
                      { metric: t('reportsPage.employeesMetric'), value: 95, fullMark: 100 }
                    ]}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
                      <PolarRadiusAxis stroke="#6b7280" fontSize={12} />
                      <Radar 
                        name={t('reportsPage.performance')} 
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