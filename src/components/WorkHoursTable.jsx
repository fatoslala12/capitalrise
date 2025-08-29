import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";

export default function WorkHoursTable({
  employees,
  weekLabel,
  data,
  onChange = () => {},
  readOnly,
  showPaymentControl = false,
  siteOptions = [],
  paidStatus = {},
  setPaidStatus = () => {},
  siteScope = ''  // NEW: filter calculations by site
}) {
  const { t } = useTranslation();
  
  const days = [
    t('workHours.monday'),
    t('workHours.tuesday'),
    t('workHours.wednesday'),
    t('workHours.thursday'),
    t('workHours.friday'),
    t('workHours.saturday'),
    t('workHours.sunday')
  ];
  
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Optimized calculations me useMemo
  const employeeCalculations = useMemo(() => {
    console.log('[DEBUG] employeeCalculations - employees:', employees);
    console.log('[DEBUG] employeeCalculations - data:', data);
    console.log('[DEBUG] employeeCalculations - weekLabel:', weekLabel);
    
    // Return empty array if employees is empty or not an array
    if (!Array.isArray(employees) || employees.length === 0) {
      console.log('[DEBUG] employeeCalculations - employees array is empty, returning empty array');
      return [];
    }
    
    return employees.map((emp) => {
      const firstName = emp.firstName || emp.first_name || '';
      const lastName = emp.lastName || emp.last_name || '';
      // Fix rate calculation - use employee's hourly_rate as fallback when rate is null from database
      const employeeRate = Number(emp.hourlyRate || emp.hourly_rate || 0);
      const labelType = emp.labelType || emp.label_type || 'UTR';
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
      let statusText = '';
      let statusClass = '';
      let statusBg = '';
      if (paid) {
        if (today <= weekEndDate) {
          statusText = t('workHours.paid');
          statusClass = 'text-green-700';
          statusBg = 'bg-green-100 border-green-200';
        } else {
          statusText = t('workHours.paidLate');
          statusClass = 'text-yellow-700';
          statusBg = 'bg-yellow-100 border-yellow-200';
        }
      } else {
        statusText = t('workHours.unpaid');
        statusClass = 'text-red-700';
        statusBg = 'bg-red-100 border-red-200';
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
        statusText,
        statusClass,
        statusBg
      };
      
      console.log(`[DEBUG] Employee ${emp.id} calculation result:`, result);
      
      return result;
    });
  }, [employees, weekLabel, data, paidStatus, siteOptions, siteScope, t]);

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
  }, [employees, weekLabel, data, siteScope]);

  const handlePaymentToggle = useCallback(async (empId) => {
    const key = `${weekLabel}_${empId}`;
    const newPaidStatus = !paidStatus[key];
    
    setPaidStatus(prev => ({
      ...prev,
      [key]: newPaidStatus
    }));

    try {
      await api.post("/api/work-hours/paid-status", {
        week: weekLabel,
        employeeId: empId,
        paid: newPaidStatus,
      });
      
      // Toast notification për sukses
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(`${t('workHours.payment')} ${newPaidStatus ? t('workHours.markedAsPaid') : t('workHours.markedAsUnpaid')} ${t('workHours.successfully')}!`, 'success');
      }
    } catch (err) {
      console.error("Error saving payment status", err);
      // Revert if error occurs
      setPaidStatus(prev => ({
        ...prev,
        [key]: !newPaidStatus
      }));
      
      // Toast notification për gabim
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast("Gabim gjatë ndryshimit të statusit të pagesës!", 'error');
      }
    }
  }, [weekLabel, paidStatus, setPaidStatus]);

  const toggleRowExpansion = (empId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empId)) {
        newSet.delete(empId);
      } else {
        newSet.add(empId);
      }
      return newSet;
    });
  };

  const isAdmin = showPaymentControl;

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100 p-3 sm:p-6 mb-6 sm:mb-8 overflow-hidden animate-fade-in">
      <h3 className="text-lg sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-4 sm:mb-6 text-center flex items-center gap-2 justify-center">
        <span className="text-xl sm:text-3xl">🕒</span> 
        <span className="hidden sm:inline">Java: </span>
        <span className="text-base sm:text-2xl">{weekLabel}</span>
      </h3>
      
      {/* Show message when no employees */}
      {(!Array.isArray(employees) || employees.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h4 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Nuk ka punonjës për të shfaqur</h4>
          <p className="text-yellow-700">
            Nuk u gjetën punonjës për këtë javë. Kjo mund të ndodhë nëse:
          </p>
          <ul className="text-yellow-700 list-disc list-inside mt-2 space-y-1">
            <li>Nuk ka punonjës të caktuar për site-t tuaja</li>
            <li>Punonjësit nuk kanë orë të punës për këtë javë</li>
            <li>Ka problem me të dhënat e databazës</li>
          </ul>
        </div>
      )}
      
      {/* Only render table content if there are employees */}
      {Array.isArray(employees) && employees.length > 0 && (
        <>
          {isAdmin ? (
        // Admin view - kompakt me expand/collapse  
        <div className="space-y-3 sm:space-y-4">
          {/* Headers për kolonat - vetëm për desktop */}
          <div className="hidden lg:grid grid-cols-9 gap-2 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl font-bold text-blue-900 text-sm">
            <div className="col-span-2 text-center">👤 {t('workHours.employeeHeader')}</div>
            <div className="text-center">💰 {t('workHours.rateHeader')}</div>
            <div className="text-center">⏰ {t('workHours.hoursHeader')}</div>
            <div className="text-center">💷 {t('workHours.grossHeader')}</div>
            <div className="text-center">📋 {t('workHours.vatHeader')}</div>
            <div className="text-center">💰 {t('workHours.netHeader')}</div>
            <div className="text-center">💸 {t('workHours.actionsHeader')}</div>
            <div className="text-center">✅ {t('workHours.statusHeader')}</div>
          </div>
          
          {/* Mobile header */}
          <div className="lg:hidden text-center bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-3 font-bold text-blue-900">
            <span className="text-sm">👥 {t('workHours.employeeList')} - {weekLabel}</span>
          </div>
          
          {employeeCalculations.map((calc) => (
            <div key={calc.emp.id} className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
              {/* Desktop view - grid layout */}
              <div className="hidden lg:grid grid-cols-9 gap-2 p-4 items-center bg-gradient-to-r from-blue-50 to-purple-50">
                {/* Punonjësi */}
                <div className="flex items-center gap-3 col-span-2">
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
                  {isAdmin && (
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
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${calc.statusBg} ${calc.statusClass}`}>
                    {calc.statusText}
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
                  {isAdmin && (
                    <button
                      onClick={() => handlePaymentToggle(calc.emp.id)}
                      className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                    >
                      {calc.paid ? `❌ ${t('workHours.deletePayment')}` : `✅ ${t('workHours.paidStatus')}`}
                    </button>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${calc.statusBg} ${calc.statusClass}`}>
                    {calc.statusText}
                  </span>
                </div>
              </div>
              
              {/* Detajet e zgjeruara */}
              {expandedRows.has(calc.emp.id) && (
                <div className="border-t border-blue-200 bg-gray-50 p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">{t('workHours.dailyDetails')}</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day) => (
                      <div key={day} className="text-center">
                        <div className="font-medium text-sm text-gray-700 mb-2">{day}</div>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.25"
                          value={calc.hours[day]?.hours || ""}
                          onChange={e => onChange(calc.emp.id, day, "hours", e.target.value)}
                          className="w-full p-2 border-2 border-blue-200 rounded-lg text-center focus:ring-2 focus:ring-blue-400 bg-white shadow-sm text-sm mb-2"
                          disabled={readOnly}
                          placeholder="0"
                        />
                        <select
                          className="w-full border-2 border-blue-200 rounded-lg text-xs bg-white shadow-sm p-1"
                          value={calc.hours[day]?.site || ""}
                          onChange={e => onChange(calc.emp.id, day, "site", e.target.value)}
                          disabled={readOnly}
                        >
                          <option value="">{(calc.hours[day]?.hours && parseFloat(calc.hours[day].hours) > 0) ? t('workHours.selectSite') : t('workHours.rest')}</option>
                          {calc.empSites.map(site => (
                            <option key={site} value={site}>{site}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Përmbledhja e javës */}
          <div className="bg-gradient-to-r from-gray-100 to-blue-100 rounded-xl p-4 font-bold">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg text-gray-700">📊 Total {t('workHours.hoursHeader')}</div>
                <div className="text-2xl text-gray-900">{weekTotals.totalHours ? Number(weekTotals.totalHours).toFixed(2) : '0.00'}</div>
              </div>
              <div>
                <div className="text-lg text-green-700">💷 Total {t('workHours.grossHeader')}</div>
                <div className="text-2xl text-green-700">£{weekTotals.totalBruto ? Number(weekTotals.totalBruto).toFixed(2) : '0.00'}</div>
              </div>
              <div>
                <div className="text-lg text-yellow-700">📋 Total {t('workHours.vatHeader')}</div>
                <div className="text-2xl text-yellow-700">£{weekTotals.totalTVSH ? Number(weekTotals.totalTVSH).toFixed(2) : '0.00'}</div>
              </div>
              <div>
                <div className="text-lg text-blue-700">💰 Total {t('workHours.netHeader')}</div>
                <div className="text-2xl text-blue-700">£{weekTotals.totalNeto ? Number(weekTotals.totalNeto).toFixed(2) : '0.00'}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Manager/User view
        <div>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full text-base text-blue-900 rounded-2xl overflow-hidden shadow-xl">
              <thead className="bg-gradient-to-r from-blue-100 via-white to-purple-100 text-blue-900 text-base font-bold">
                <tr>
                  <th className="py-4 px-3 text-left">{t('workHours.employeeHeader')}</th>
                  {days.map((day) => (
                    <th key={day} className="py-4 px-3 text-center">{day}</th>
                  ))}
                  <th className="py-4 px-3 text-center">{t('workHours.rateHeader')}</th>
                  <th className="py-4 px-3 text-center">{t('workHours.total')}</th>
                  <th className="py-4 px-3 text-center">{t('workHours.grossHeader')}</th>
                  <th className="py-4 px-3 text-center">{t('workHours.vatHeader')}</th>
                  <th className="py-4 px-3 text-center">{t('workHours.netHeader')}</th>
                  {showPaymentControl && <th className="py-4 px-3 text-center">💸</th>}
                  {showPaymentControl && <th className="py-4 px-3 text-center">{t('workHours.statusHeader')}</th>}
                </tr>
              </thead>
          <tbody>
            {employeeCalculations.map((calc) => (
              <tr key={calc.emp.id} className={`text-center hover:bg-purple-50 transition-all duration-200 rounded-xl shadow-sm`}> 
                <td className="py-3 px-3 font-semibold flex items-center gap-4 justify-center">
                  {calc.emp.photo ? (
                    <img src={calc.emp.photo} alt="Foto" className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow" />
                  ) : (
                    <span className="rounded-full bg-blue-200 text-blue-700 px-4 py-3 text-xl font-bold mr-2 shadow">{calc.firstName[0]}{calc.lastName[0]}</span>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">{calc.firstName} {calc.lastName}</span>
                    <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-3 py-1 rounded-full shadow mt-1 uppercase tracking-wide">{calc.emp.role || calc.emp.role_type || ''}</span>
                  </div>
                </td>
                {days.map((day) => (
                  <td key={day} className="py-2 px-2">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={calc.hours[day]?.hours || ""}
                      onChange={e => onChange(calc.emp.id, day, "hours", e.target.value)}
                      className={`w-16 p-2 border-2 border-blue-200 rounded-xl text-center focus:ring-2 focus:ring-blue-400 shadow-sm text-base ${
                        (typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-blue-50'
                      }`}
                      disabled={typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly}
                      placeholder="0"
                    />
                    <select
                      className={`mt-2 w-full border-2 border-blue-200 rounded-xl text-xs shadow-sm ${
                        (typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-blue-50'
                      }`}
                      value={calc.hours[day]?.site || ""}
                      onChange={e => onChange(calc.emp.id, day, "site", e.target.value)}
                      disabled={typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly}
                    >
                                                  <option value="">{(calc.hours[day]?.hours && parseFloat(calc.hours[day].hours) > 0) ? t('workHours.selectSite') : t('workHours.rest')}</option>
                      {calc.empSites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </td>
                ))}
                <td className="py-2 px-2 font-semibold text-blue-900 bg-blue-50 rounded-xl">£{calc.rate && !isNaN(calc.rate) ? Number(calc.rate).toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 font-bold text-gray-900 bg-gray-50 rounded-xl">{calc.total && !isNaN(calc.total) ? Number(calc.total).toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 font-semibold text-green-700 bg-green-50 rounded-xl">£{calc.bruto && !isNaN(calc.bruto) ? Number(calc.bruto).toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 font-semibold text-yellow-700 bg-yellow-50 rounded-xl">£{calc.tvsh && !isNaN(calc.tvsh) ? Number(calc.tvsh).toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 font-semibold text-blue-700 bg-blue-50 rounded-xl">£{calc.neto && !isNaN(calc.neto) ? Number(calc.neto).toFixed(2) : '0.00'}</td>
                {showPaymentControl && (
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={calc.paid || false}
                      onChange={() => handlePaymentToggle(calc.emp.id)}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </td>
                )}
                {showPaymentControl && (
                  <td className="py-2 px-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${calc.statusBg} ${calc.statusClass}`}>
                      {calc.statusText}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gradient-to-r from-gray-100 to-blue-100 font-bold">
            <tr>
              <td className="py-3 px-3 text-left font-bold text-lg">📊 TOTALI I JAVËS</td>
              {days.map(() => (
                <td key={Math.random()} className="py-2 px-2"></td>
              ))}
              <td className="py-2 px-2 font-bold text-blue-900 bg-blue-100 rounded-xl">-</td>
              <td className="py-2 px-2 font-bold text-gray-900 bg-gray-100 rounded-xl">{weekTotals.totalHours && !isNaN(weekTotals.totalHours) ? Number(weekTotals.totalHours).toFixed(2) : '0.00'}</td>
              <td className="py-2 px-2 font-bold text-green-700 bg-green-100 rounded-xl">£{weekTotals.totalBruto && !isNaN(weekTotals.totalBruto) ? Number(weekTotals.totalBruto).toFixed(2) : '0.00'}</td>
              <td className="py-2 px-2 font-bold text-yellow-700 bg-yellow-100 rounded-xl">£{weekTotals.totalTVSH && !isNaN(weekTotals.totalTVSH) ? Number(weekTotals.totalTVSH).toFixed(2) : '0.00'}</td>
              <td className="py-2 px-2 font-bold text-blue-700 bg-blue-100 rounded-xl">£{weekTotals.totalNeto && !isNaN(weekTotals.totalNeto) ? Number(weekTotals.totalNeto).toFixed(2) : '0.00'}</td>
              {showPaymentControl && <td className="py-2 px-2"></td>}
              {showPaymentControl && <td className="py-2 px-2"></td>}
            </tr>
          </tfoot>
            </table>
          </div>
          
          {/* Mobile cards */}
          <div className="lg:hidden space-y-4">
            {employeeCalculations.map((calc) => (
              <div key={calc.emp.id} className="bg-white rounded-2xl shadow-lg border border-blue-200 overflow-hidden">
                {/* Employee header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {calc.emp.photo ? (
                      <img src={calc.emp.photo} alt="Foto" className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow" />
                    ) : (
                      <span className="rounded-full bg-blue-200 text-blue-700 px-3 py-2 text-lg font-bold shadow">
                        {calc.firstName[0]}{calc.lastName[0]}
                      </span>
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900">{calc.firstName} {calc.lastName}</h4>
                      <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-3 py-1 rounded-full shadow uppercase tracking-wide">
                        {calc.emp.role || calc.emp.role_type || ''}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleRowExpansion(calc.emp.id)}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                    >
                      {expandedRows.has(calc.emp.id) ? '▼' : '▶'}
                    </button>
                  </div>
                  
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600 mb-1">Total Orë</div>
                      <div className="font-bold text-gray-900">{calc.total && !isNaN(calc.total) ? Number(calc.total).toFixed(2) : '0.00'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600 mb-1">Neto</div>
                      <div className="font-bold text-blue-700">£{calc.neto && !isNaN(calc.neto) ? Number(calc.neto).toFixed(2) : '0.00'}</div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded details */}
                {expandedRows.has(calc.emp.id) && (
                  <div className="p-4 bg-gray-50">
                    {/* Days grid */}
                    <h5 className="font-semibold text-blue-800 mb-3 text-sm">Detajet e ditëve:</h5>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {days.map((day) => (
                        <div key={day} className="bg-white rounded-lg p-3">
                          <div className="font-medium text-xs text-gray-700 mb-2">{day}</div>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.25"
                            value={calc.hours[day]?.hours || ""}
                            onChange={e => onChange(calc.emp.id, day, "hours", e.target.value)}
                            className={`w-full p-2 border-2 border-blue-200 rounded-lg text-center focus:ring-2 focus:ring-blue-400 text-sm mb-2 ${
                              (typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-blue-50'
                            }`}
                            disabled={typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly}
                            placeholder="0"
                          />
                          <select
                            className={`w-full border-2 border-blue-200 rounded-lg text-xs ${
                              (typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-blue-50'
                            }`}
                            value={calc.hours[day]?.site || ""}
                            onChange={e => onChange(calc.emp.id, day, "site", e.target.value)}
                            disabled={typeof readOnly === 'function' ? readOnly(calc.emp.id) : readOnly}
                          >
                            <option value="">{(calc.hours[day]?.hours && parseFloat(calc.hours[day].hours) > 0) ? t('workHours.selectSite') : t('workHours.rest')}</option>
                            {calc.empSites.map(site => (
                              <option key={site} value={site}>{site}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    
                    {/* Detailed stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-600 mb-1">{t('workHours.rateHeader')}</div>
                        <div className="font-bold text-blue-900">£{calc.rate && !isNaN(calc.rate) ? Number(calc.rate).toFixed(2) : '0.00'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-600 mb-1">{t('workHours.grossHeader')}</div>
                        <div className="font-bold text-green-700">£{calc.bruto && !isNaN(calc.bruto) ? Number(calc.bruto).toFixed(2) : '0.00'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-600 mb-1">{t('workHours.vatHeader')}</div>
                        <div className="font-bold text-yellow-700">£{calc.tvsh && !isNaN(calc.tvsh) ? Number(calc.tvsh).toFixed(2) : '0.00'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-600 mb-1">{t('workHours.netHeader')}</div>
                        <div className="font-bold text-blue-700">£{calc.neto && !isNaN(calc.neto) ? Number(calc.neto).toFixed(2) : '0.00'}</div>
                      </div>
                    </div>
                    
                    {/* Payment controls */}
                    {showPaymentControl && (
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handlePaymentToggle(calc.emp.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                        >
                          {calc.paid ? `❌ ${t('workHours.deletePayment')}` : `✅ ${t('workHours.paidStatus')}`}
                        </button>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${calc.statusBg} ${calc.statusClass}`}>
                          {calc.statusText}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* Mobile totals */}
            <div className="bg-gradient-to-r from-gray-100 to-blue-100 rounded-2xl p-4">
              <h4 className="font-bold text-gray-800 mb-3 text-center">📊 {t('workHours.weekTotal')}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.totalHours')}</div>
                  <div className="font-bold text-gray-900">{weekTotals.totalHours && !isNaN(weekTotals.totalHours) ? Number(weekTotals.totalHours).toFixed(2) : '0.00'}</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.totalGross')}</div>
                  <div className="font-bold text-green-700">£{weekTotals.totalBruto && !isNaN(weekTotals.totalBruto) ? Number(weekTotals.totalBruto).toFixed(2) : '0.00'}</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.totalVat')}</div>
                  <div className="font-bold text-yellow-700">£{weekTotals.totalTVSH && !isNaN(weekTotals.totalTVSH) ? Number(weekTotals.totalTVSH).toFixed(2) : '0.00'}</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">{t('workHours.totalNet')}</div>
                  <div className="font-bold text-blue-700">£{weekTotals.totalNeto && !isNaN(weekTotals.totalNeto) ? Number(weekTotals.totalNeto).toFixed(2) : '0.00'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}