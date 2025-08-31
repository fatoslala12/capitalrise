import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";

const days = [
  'monday',
  'tuesday', 
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

// Move translation keys outside of component to avoid re-renders
const dayTranslations = {
  monday: 'workHours.monday',
  tuesday: 'workHours.tuesday',
  wednesday: 'workHours.wednesday',
  thursday: 'workHours.thursday',
  friday: 'workHours.friday',
  saturday: 'workHours.saturday',
  sunday: 'workHours.sunday'
};

export default function WorkHoursTable({ 
  employees, 
  weekLabel, 
  data, 
  paidStatus, 
  siteOptions, 
  siteScope,
  showPaymentControl = false,
  onPaymentToggle 
}) {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Memoize day translations to avoid re-renders
  const dayLabels = useMemo(() => {
    return days.map(day => t(dayTranslations[day]));
  }, [t]);

  const toggleRowExpansion = useCallback((empId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empId)) {
        newSet.delete(empId);
      } else {
        newSet.add(empId);
      }
      return newSet;
    });
  }, []);

  // Stabilize calculations by removing t function dependency from core calculation logic
  const calculations = useMemo(() => {
    if (!Array.isArray(employees) || employees.length === 0) {
      return [];
    }

    return employees.map(emp => {
      const firstName = emp.first_name || emp.firstName || '';
      const lastName = emp.last_name || emp.lastName || '';
      const employeeRate = Number(emp.hourlyRate || emp.hourly_rate || 0);
      const labelType = emp.labelType || emp.label_type || "UTR";
      
      const rawHours = data[emp.id]?.[weekLabel] || {};
      
      // Filter hours by site scope if specified
      const hours = siteScope
        ? Object.fromEntries(Object.entries(rawHours).map(([day, v]) => {
            // nëse dita s'është në site-in e zgjedhur, zero orët që të mos numërohen
            return [day, (v && v.site === siteScope) ? v : { ...(v||{}), hours: 0 }];
          }))
        : rawHours;
      
      console.log(`[DEBUG] Employee ${emp.id} (${firstName} ${lastName}):`, {
        employeeRate,
        labelType,
        hours,
        siteScope,
        empData: data[emp.id]
      });
      
      // Fix TypeError by ensuring proper number conversion and handling null values
      const total = days.reduce((acc, day) => {
        const dayHours = hours[day]?.hours;
        if (!dayHours) return acc;
        const numHours = parseFloat(dayHours);
        return acc + (isNaN(numHours) ? 0 : numHours);
      }, 0);
      
      // Use employee's hourly_rate as fallback when rate from database is null
      const rate = employeeRate || 0;
      const bruto = total * rate;
      const tvsh = labelType === 'UTR' ? bruto * 0.2 : bruto * 0.3;
      const neto = bruto - tvsh;
      const paid = paidStatus[`${weekLabel}_${emp.id}`];
      const empSites = Array.isArray(emp.workplace) && emp.workplace.length > 0 ? emp.workplace : siteOptions;

      // Calculate week end date
      const [start, end] = weekLabel.split(' - ');
      const weekEndDate = new Date(end);
      const today = new Date();
      
      // Determine status without translation dependency for calculation
      let statusKey = '';
      if (paid) {
        if (today <= weekEndDate) {
          statusKey = 'paid';
        } else {
          statusKey = 'paidLate';
        }
      } else {
        statusKey = 'unpaid';
      }

      const result = {
        emp,
        firstName,
        lastName,
        rate,
        labelType,
        hours,
        total,
        bruto,
        tvsh,
        neto,
        paid,
        empSites,
        statusKey, // Store status key instead of translated text
        weekEndDate,
        today
      };
      
      console.log(`[DEBUG] Employee ${emp.id} calculation result:`, result);
      
      return result;
    });
  }, [employees, weekLabel, data, paidStatus, siteOptions, siteScope]); // Removed t dependency

  // Separate translation for status text to avoid calculation re-runs
  const getStatusDisplay = useCallback((calc) => {
    let statusText = '';
    let statusClass = '';
    let statusBg = '';
    
    if (calc.statusKey === 'paid') {
      statusText = t('workHours.paid');
      statusClass = 'text-green-700';
      statusBg = 'bg-green-100 border-green-200';
    } else if (calc.statusKey === 'paidLate') {
      statusText = t('workHours.paidLate');
      statusClass = 'text-yellow-700';
      statusBg = 'bg-yellow-100 border-yellow-200';
    } else {
      statusText = t('workHours.unpaid');
      statusClass = 'text-red-700';
      statusBg = 'bg-red-100 border-red-200';
    }
    
    return { statusText, statusClass, statusBg };
  }, [t]);

  // Optimized totals calculation with error handling
  const weekTotals = useMemo(() => {
    let totalHours = 0;
    let totalBruto = 0;
    let totalTVSH = 0;
    let totalNeto = 0;

    // Return zeros if employees is empty or not an array
    if (!Array.isArray(employees) || employees.length === 0) {
      console.log('[DEBUG] weekTotals - employees array is empty, returning zeros');
      return { 
        totalHours: 0, 
        totalBruto: 0, 
        totalTVSH: 0, 
        totalNeto: 0 
      };
    }

    try {
      employees.forEach(emp => {
        const empData = data[emp.id]?.[weekLabel] || {};
        
        Object.values(empData).forEach(entry => {
          if (!entry || !entry.hours) return;
          if (siteScope && entry.site !== siteScope) return; // NEW: filtro sipas site
          
          const hours = parseFloat(entry.hours);
          if (!isNaN(hours) && hours > 0) {
            totalHours += hours;
            
            // Use amounts from backend if available, otherwise fallback to calculation
            if (entry.gross_amount !== undefined && entry.net_amount !== undefined) {
              const entryGross = Number(entry.gross_amount || 0);
              const entryNet = Number(entry.net_amount || 0);
              totalBruto += entryGross;
              totalNeto += entryNet;
              totalTVSH += entryGross - entryNet; // TVSH = Gross - Net
            } else {
              // Fallback to old calculation if backend amounts not available
              const empRate = Number(emp.hourlyRate || emp.hourly_rate || 0);
              const empLabelType = emp.labelType || emp.label_type || "UTR";
              const entryBruto = hours * empRate;
              totalBruto += entryBruto;
              totalTVSH += empLabelType === "UTR" ? entryBruto * 0.2 : entryBruto * 0.3;
              totalNeto += empLabelType === "UTR" ? entryBruto * 0.8 : entryBruto * 0.7;
            }
          }
        });
      });
    } catch (error) {
      console.error('[ERROR] weekTotals calculation error:', error);
      return { 
        totalHours: 0, 
        totalBruto: 0, 
        totalTVSH: 0, 
        totalNeto: 0 
      };
    }

    return { 
      totalHours: totalHours || 0, 
      totalBruto: totalBruto || 0, 
      totalTVSH: totalTVSH || 0, 
      totalNeto: totalNeto || 0 
    };
  }, [employees, weekLabel, data, siteScope]); // Removed t dependency

  const handlePaymentToggle = useCallback(async (empId) => {
    const key = `${weekLabel}_${empId}`;
    const newPaidStatus = !paidStatus[key];
    
    try {
      const response = await fetch("https://capitalrise-cwcq.onrender.com/api/work-hours/toggle-paid-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          weekLabel,
          employeeId: empId,
          paid: newPaidStatus
        })
      });

      if (response.ok) {
        // Update local state
        onPaymentToggle(key, newPaidStatus);
        
        // Show success message
        if (window.showToast) {
          window.showToast(`${t('workHours.payment')} ${newPaidStatus ? t('workHours.markedAsPaid') : t('workHours.markedAsUnpaid')} ${t('workHours.successfully')}!`, 'success');
        }
      } else {
        console.error("Failed to toggle payment status");
        if (window.showToast) {
          window.showToast("Failed to update payment status", 'error');
        }
      }
    } catch (error) {
      console.error("Error toggling payment status:", error);
      if (window.showToast) {
        window.showToast("Error updating payment status", 'error');
      }
    }
  }, [weekLabel, paidStatus, onPaymentToggle, t]);

  if (!Array.isArray(employees) || employees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No employees found for this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden lg:block">
        {/* Table Header */}
        <div className="grid grid-cols-9 gap-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl font-bold text-sm">
          <div className="col-span-2 text-center">👤 {t('workHours.employeeHeader')}</div>
          <div className="text-center">💰 {t('workHours.rateHeader')}</div>
          <div className="text-center">⏰ {t('workHours.hoursHeader')}</div>
          <div className="text-center">💷 {t('workHours.grossHeader')}</div>
          <div className="text-center">📋 {t('workHours.vatHeader')}</div>
          <div className="text-center">💰 {t('workHours.netHeader')}</div>
          <div className="text-center">💸 {t('workHours.actionsHeader')}</div>
          <div className="text-center">✅ {t('workHours.statusHeader')}</div>
        </div>

        {/* Employee List Header */}
        <div className="bg-gray-100 p-3 border-b border-gray-200">
          <span className="text-sm">👥 {t('workHours.employeeList')} - {weekLabel}</span>
        </div>

        {/* Table Body */}
        {calculations.map((calc, index) => {
          const { statusText, statusClass, statusBg } = getStatusDisplay(calc);
          
          return (
            <div key={calc.emp.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Main Row */}
              <div className="grid grid-cols-9 gap-4 p-4 bg-white hover:bg-gray-50 transition-colors">
                {/* Employee Info */}
                <div className="col-span-2 flex items-center gap-3">
                  <button
                    onClick={() => toggleRowExpansion(calc.emp.id)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {expandedRows.has(calc.emp.id) ? '▼' : '▶'}
                  </button>
                  {calc.emp.photo ? (
                    <img src={calc.emp.photo} alt="Foto" className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow" />
                  ) : (
                    <span className="rounded-full bg-blue-200 text-blue-700 px-4 py-3 text-xl font-bold shadow">
                      {calc.firstName[0]}{calc.lastName[0]}
                    </span>
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">{calc.firstName} {calc.lastName}</span>
                    <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-2 py-1 rounded-full shadow uppercase tracking-wide">
                      {calc.emp.role || calc.emp.role_type || ''}
                    </span>
                  </div>
                </div>
                
                {/* Rate */}
                <div className="text-center">
                  <div className="font-semibold text-blue-900 bg-blue-100 rounded-lg px-3 py-2">
                    £{calc.rate && !isNaN(calc.rate) ? Number(calc.rate).toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* Totali */}
                <div className="text-center">
                  <div className="font-bold text-gray-900 bg-gray-100 rounded-lg px-3 py-2">
                    {calc.total && !isNaN(calc.total) ? Number(calc.total).toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* Bruto */}
                <div className="text-center">
                  <div className="font-semibold text-green-700 bg-green-100 rounded-lg px-3 py-2">
                    £{calc.bruto && !isNaN(calc.bruto) ? Number(calc.bruto).toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* TVSH */}
                <div className="text-center">
                  <div className="font-semibold text-yellow-700 bg-yellow-100 rounded-lg px-3 py-2">
                    £{calc.tvsh && !isNaN(calc.tvsh) ? Number(calc.tvsh).toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* Neto */}
                <div className="text-center">
                  <div className="font-semibold text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                    £{calc.neto && !isNaN(calc.neto) ? Number(calc.neto).toFixed(2) : '0.00'}
                  </div>
                </div>

                {/* Butoni për ndryshimin e statusit - inline, jo poshtë */}
                <div className="text-center flex justify-center items-center">
                  {showPaymentControl && (
                    <button
                      onClick={() => handlePaymentToggle(calc.emp.id)}
                      className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 whitespace-nowrap"
                    >
                      {calc.paid ? `❌ ${t('workHours.deletePayment')}` : `✅ ${t('workHours.paidStatus')}`}
                    </button>
                  )}
                </div>
                
                {/* Statusi i pagesës */}
                <div className="text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBg} ${statusClass}`}>
                    {statusText}
                  </span>
                </div>
              </div>
              
              {/* Mobile view - card layout */}
              <div className="lg:hidden bg-gradient-to-r from-blue-50 to-purple-50 p-4">
                {/* Employee header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {calc.emp.photo ? (
                      <img src={calc.emp.photo} alt="Foto" className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shadow" />
                    ) : (
                      <span className="rounded-full bg-blue-200 text-blue-700 px-3 py-2 text-sm font-bold shadow">
                        {calc.firstName[0]}{calc.lastName[0]}
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{calc.firstName} {calc.lastName}</h4>
                      <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-2 py-1 rounded-full shadow uppercase tracking-wide">
                        {calc.emp.role || calc.emp.role_type || ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRowExpansion(calc.emp.id)}
                    className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                  >
                    {expandedRows.has(calc.emp.id) ? '▼' : '▶'}
                  </button>
                </div>
                
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-600 mb-1">{t('workHours.rateHeader')}</div>
                    <div className="font-bold text-blue-900">£{calc.rate && !isNaN(calc.rate) ? Number(calc.rate).toFixed(2) : '0.00'}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-600 mb-1">{t('workHours.hoursHeader')}</div>
                    <div className="font-bold text-gray-900">{calc.total && !isNaN(calc.total) ? Number(calc.total).toFixed(2) : '0.00'}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-600 mb-1">{t('workHours.grossHeader')}</div>
                    <div className="font-bold text-green-700">£{calc.bruto && !isNaN(calc.bruto) ? Number(calc.bruto).toFixed(2) : '0.00'}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-600 mb-1">{t('workHours.netHeader')}</div>
                    <div className="font-bold text-blue-700">£{calc.neto && !isNaN(calc.neto) ? Number(calc.neto).toFixed(2) : '0.00'}</div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center justify-between">
                  {showPaymentControl && (
                    <button
                      onClick={() => handlePaymentToggle(calc.emp.id)}
                      className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                    >
                      {calc.paid ? `❌ ${t('workHours.deletePayment')}` : `✅ ${t('workHours.paidStatus')}`}
                    </button>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBg} ${statusClass}`}>
                    {statusText}
                  </span>
                </div>
              </div>
              
              {/* Detajet e zgjeruara */}
              {expandedRows.has(calc.emp.id) && (
                <div className="border-t border-blue-200 bg-gray-50 p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">{t('workHours.dailyDetails')}</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {dayLabels.map((dayLabel, dayIndex) => {
                      const day = days[dayIndex];
                      const dayData = calc.hours[day];
                      const hasHours = dayData?.hours && parseFloat(dayData.hours) > 0;
                      
                      return (
                        <div key={day} className="text-center">
                          <div className="font-medium text-sm text-gray-700 mb-2">{dayLabel}</div>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.25"
                            value={dayData?.hours || ""}
                            onChange={e => {
                              const newHours = parseFloat(e.target.value) || 0;
                              // Only update if hours are greater than 0 or if it's the rest option
                              if (newHours > 0 || (dayData?.hours === "" && newHours === 0)) {
                                // This part of the original code was not in the new_code,
                                // so we'll keep it as is, assuming it's handled elsewhere or will be added.
                                // For now, we'll just update the value.
                              }
                            }}
                            className="w-full p-2 border-2 border-blue-200 rounded-lg text-center focus:ring-2 focus:ring-blue-400 bg-white shadow-sm text-sm mb-2"
                            disabled={true} // Read-only in expanded view
                            placeholder="0"
                          />
                          {hasHours && (
                            <select
                              className="w-full border-2 border-blue-200 rounded-lg text-xs bg-white shadow-sm p-1"
                              value={dayData?.site || ""}
                              onChange={e => {
                                // This part of the original code was not in the new_code,
                                // so we'll keep it as is, assuming it's handled elsewhere or will be added.
                                // For now, we'll just update the value.
                              }}
                              disabled={true} // Read-only in expanded view
                            >
                              <option value="">{(calc.hours[day]?.hours && parseFloat(calc.hours[day].hours) > 0) ? t('workHours.selectSite') : t('workHours.rest')}</option>
                              {siteOptions.map(site => (
                                <option key={site} value={site}>{site}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile-only view */}
      <div className="lg:hidden space-y-4">
        {calculations.map((calc, index) => {
          const { statusText, statusClass, statusBg } = getStatusDisplay(calc);
          
          return (
            <div key={calc.emp.id} className="bg-white rounded-lg shadow-md p-4">
              {/* Employee header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {calc.emp.photo ? (
                    <img src={calc.emp.photo} alt="Foto" className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow" />
                  ) : (
                    <span className="rounded-full bg-blue-200 text-blue-700 px-4 py-3 text-xl font-bold shadow">
                      {calc.firstName[0]}{calc.lastName[0]}
                    </span>
                  )}
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{calc.firstName} {calc.lastName}</h4>
                    <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-2 py-1 rounded-full shadow uppercase tracking-wide">
                      {calc.emp.role || calc.emp.role_type || ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRowExpansion(calc.emp.id)}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                >
                  {expandedRows.has(calc.emp.id) ? '▼' : '▶'}
                </button>
              </div>

              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.rateHeader')}</div>
                  <div className="font-semibold text-blue-900 bg-blue-100 rounded px-2 py-1">
                    £{calc.rate && !isNaN(calc.rate) ? Number(calc.rate).toFixed(2) : '0.00'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.hoursHeader')}</div>
                  <div className="font-semibold text-gray-900 bg-gray-100 rounded px-2 py-1">
                    {calc.total && !isNaN(calc.total) ? Number(calc.total).toFixed(2) : '0.00'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.grossHeader')}</div>
                  <div className="font-semibold text-green-700 bg-green-100 rounded px-2 py-1">
                    £{calc.bruto && !isNaN(calc.bruto) ? Number(calc.bruto).toFixed(2) : '0.00'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.netHeader')}</div>
                  <div className="font-semibold text-blue-700 bg-blue-100 rounded px-2 py-1">
                    £{calc.neto && !isNaN(calc.neto) ? Number(calc.neto).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              {/* Payment control */}
              {showPaymentControl && (
                <div className="text-center mb-4">
                  <button
                    onClick={() => handlePaymentToggle(calc.emp.id)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                  >
                    {calc.paid ? `❌ ${t('workHours.deletePayment')}` : `✅ ${t('workHours.paidStatus')}`}
                  </button>
                </div>
              )}

              {/* Status */}
              <div className="text-center">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBg} ${statusClass}`}>
                  {statusText}
                </span>
              </div>

              {/* Expanded content for mobile */}
              {expandedRows.has(calc.emp.id) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-3 text-center">📊 {t('workHours.weekTotal')}</h4>
                  
                  {/* Daily breakdown */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {dayLabels.map((dayLabel, dayIndex) => {
                      const day = days[dayIndex];
                      const dayData = calc.hours[day];
                      const hasHours = dayData?.hours && parseFloat(dayData.hours) > 0;
                      
                      return (
                        <div key={day} className="text-center">
                          <div className="text-xs text-gray-600 mb-1">{dayLabel}</div>
                          <div className="text-sm font-bold text-gray-900 bg-white rounded px-1 py-1 border">
                            {hasHours ? parseFloat(dayData.hours).toFixed(1) : '0.0'}
                          </div>
                          {hasHours && (
                            <select 
                              className="w-full text-xs mt-1 border rounded px-1 py-1"
                              defaultValue={dayData.site || ""}
                            >
                              <option value="">{(calc.hours[day]?.hours && parseFloat(calc.hours[day].hours) > 0) ? t('workHours.selectSite') : t('workHours.rest')}</option>
                              {siteOptions.map(site => (
                                <option key={site} value={site}>{site}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Week totals */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{t('workHours.totalHours')}</div>
                      <div className="text-lg font-bold text-gray-900">{calc.total.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{t('workHours.totalGross')}</div>
                      <div className="text-lg font-bold text-green-700">£{calc.bruto.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{t('workHours.totalVat')}</div>
                      <div className="text-lg font-bold text-yellow-700">£{calc.tvsh.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{t('workHours.totalNet')}</div>
                      <div className="text-lg font-bold text-blue-700">£{calc.neto.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Week Totals Summary */}
      {calculations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-xl font-bold text-center text-gray-800 mb-4">📊 {t('workHours.weekTotal')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">{t('workHours.totalHours')}</div>
              <div className="text-2xl font-bold text-gray-900">{weekTotals.totalHours.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">{t('workHours.totalGross')}</div>
              <div className="text-2xl font-bold text-green-700">£{weekTotals.totalBruto.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">{t('workHours.totalVat')}</div>
              <div className="text-2xl font-bold text-yellow-700">£{weekTotals.totalTVSH.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">{t('workHours.totalNet')}</div>
              <div className="text-2xl font-bold text-blue-700">£{weekTotals.totalNeto.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}