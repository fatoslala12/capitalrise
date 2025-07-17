import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../api";

const days = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];

export default function WorkHoursTable({
  employees,
  weekLabel,
  data,
  onChange,
  readOnly,
  showPaymentControl = false,
  siteOptions = [],
  paidStatus = {},
  setPaidStatus = () => {}
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Optimized calculations me useMemo
  const employeeCalculations = useMemo(() => {
    return employees.map((emp) => {
      const firstName = emp.firstName || emp.first_name || '';
      const lastName = emp.lastName || emp.last_name || '';
      const rate = Number(emp.hourlyRate || emp.hourly_rate || 0);
      const labelType = emp.labelType || emp.label_type || 'UTR';
      const hours = data[emp.id]?.[weekLabel] || {};
      
      // Fix TypeError by ensuring proper number conversion
      const total = days.reduce((acc, day) => {
        const dayHours = hours[day]?.hours;
        const numHours = dayHours ? parseFloat(dayHours) : 0;
        return acc + (isNaN(numHours) ? 0 : numHours);
      }, 0);
      
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
          statusText = 'Paguar';
          statusClass = 'text-green-700';
          statusBg = 'bg-green-100 border-green-200';
        } else {
          statusText = 'Paguar me vonesë';
          statusClass = 'text-yellow-700';
          statusBg = 'bg-yellow-100 border-yellow-200';
        }
      } else {
        statusText = 'Pa paguar';
        statusClass = 'text-red-700';
        statusBg = 'bg-red-100 border-red-200';
      }

      return {
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
    });
  }, [employees, weekLabel, data, paidStatus, siteOptions]);

  // Optimized totals calculation with error handling
  const weekTotals = useMemo(() => {
    let totalHours = 0;
    let totalBruto = 0;
    let totalTVSH = 0;
    let totalNeto = 0;

    employees.forEach(emp => {
      const empData = data[emp.id]?.[weekLabel] || {};
      const empRate = Number(emp.hourlyRate || emp.hourly_rate || 0);
      const empLabelType = emp.labelType || emp.label_type || "UTR";
      
      Object.values(empData).forEach(entry => {
        if (entry && entry.hours) {
          const hours = parseFloat(entry.hours);
          if (!isNaN(hours) && hours > 0) {
            totalHours += hours;
            totalBruto += hours * empRate;
            totalTVSH += empLabelType === "UTR" ? hours * empRate * 0.2 : hours * empRate * 0.3;
            totalNeto += empLabelType === "UTR" ? hours * empRate * 0.8 : hours * empRate * 0.7;
          }
        }
      });
    });

    return { totalHours, totalBruto, totalTVSH, totalNeto };
  }, [employees, weekLabel, data]);

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
        window.showToast(`Pagesa u ${newPaidStatus ? 'shënua si të paguar' : 'shënua si pa paguar'} me sukses!`, 'success');
      }
    } catch (err) {
      console.error("Gabim në ruajtjen e statusit të pagesës", err);
      // Revert nëse ka gabim
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
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100 p-6 mb-8 overflow-x-auto animate-fade-in">
      <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-6 text-center flex items-center gap-2 justify-center">
        <span className="text-3xl">🕒</span> Java: {weekLabel}
      </h3>
      
      {isAdmin ? (
        // Admin view - kompakt me expand/collapse
        <div className="space-y-4">
          {/* Headers për kolonat */}
          <div className="grid grid-cols-8 gap-4 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl font-bold text-blue-900">
            <div className="col-span-2 text-center">👤 Punonjësi</div>
            <div className="text-center">💰 Rate</div>
            <div className="text-center">⏰ Orë</div>
            <div className="text-center">💷 Bruto</div>
            <div className="text-center">📋 TVSH</div>
            <div className="text-center">💰 Neto</div>
            <div className="text-center">✅ Statusi</div>
            <div className="text-center">💸 Veprime</div>
          </div>
          
          {employeeCalculations.map((calc) => (
            <div key={calc.emp.id} className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
              {/* Rreshti kryesor - kompakt */}
              <div className="grid grid-cols-8 gap-4 p-4 items-center bg-gradient-to-r from-blue-50 to-purple-50">
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
                    £{calc.rate.toFixed(2)}
                  </div>
                </div>
                
                {/* Totali */}
                <div className="text-center">
                  <div className="font-bold text-gray-900 bg-gray-100 rounded-lg px-3 py-2">
                    {calc.total ? calc.total.toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* Bruto */}
                <div className="text-center">
                  <div className="font-semibold text-green-700 bg-green-100 rounded-lg px-3 py-2">
                    £{calc.bruto ? calc.bruto.toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* TVSH */}
                <div className="text-center">
                  <div className="font-semibold text-yellow-700 bg-yellow-100 rounded-lg px-3 py-2">
                    £{calc.tvsh ? calc.tvsh.toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* Neto */}
                <div className="text-center">
                  <div className="font-semibold text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                    £{calc.neto ? calc.neto.toFixed(2) : '0.00'}
                  </div>
                </div>
                
                {/* Statusi i pagesës */}
                <div className="text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${calc.statusBg} ${calc.statusClass}`}>
                    {calc.statusText}
                  </span>
                </div>

                {/* Butoni për ndryshimin e statusit */}
                <div className="text-center">
                  {isAdmin && (
                    <button
                      onClick={() => handlePaymentToggle(calc.emp.id)}
                      className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                    >
                      {calc.paid ? '❌ Shëno si pa paguar' : '✅ Shëno si të paguar'}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Detajet e zgjeruara */}
              {expandedRows.has(calc.emp.id) && (
                <div className="border-t border-blue-200 bg-gray-50 p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">Detajet e ditëve:</h4>
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
                          <option value="">Zgjidh vendin</option>
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
                <div className="text-lg text-gray-700">📊 Total Orë</div>
                <div className="text-2xl text-gray-900">{weekTotals.totalHours ? weekTotals.totalHours.toFixed(2) : '0.00'}</div>
              </div>
              <div>
                <div className="text-lg text-green-700">💷 Total Bruto</div>
                <div className="text-2xl text-green-700">£{weekTotals.totalBruto ? weekTotals.totalBruto.toFixed(2) : '0.00'}</div>
              </div>
              <div>
                <div className="text-lg text-yellow-700">📋 Total TVSH</div>
                <div className="text-2xl text-yellow-700">£{weekTotals.totalTVSH ? weekTotals.totalTVSH.toFixed(2) : '0.00'}</div>
              </div>
              <div>
                <div className="text-lg text-blue-700">💰 Total Neto</div>
                <div className="text-2xl text-blue-700">£{weekTotals.totalNeto ? weekTotals.totalNeto.toFixed(2) : '0.00'}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Manager/User view - tabela e plotë
        <table className="min-w-full text-base text-blue-900 rounded-2xl overflow-hidden shadow-xl">
          <thead className="bg-gradient-to-r from-blue-100 via-white to-purple-100 text-blue-900 text-base font-bold">
            <tr>
              <th className="py-4 px-3 text-left">Punonjësi</th>
              {days.map((day) => (
                <th key={day} className="py-4 px-3 text-center">{day}</th>
              ))}
              <th className="py-4 px-3 text-center">Rate</th>
              <th className="py-4 px-3 text-center">Totali</th>
              <th className="py-4 px-3 text-center">Bruto</th>
              <th className="py-4 px-3 text-center">TVSH</th>
              <th className="py-4 px-3 text-center">Neto</th>
              {showPaymentControl && <th className="py-4 px-3 text-center">💸</th>}
              {showPaymentControl && <th className="py-4 px-3 text-center">Statusi i Pagesës</th>}
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
                        readOnly ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-blue-50'
                      }`}
                      disabled={readOnly}
                      placeholder="0"
                    />
                    <select
                      className={`mt-2 w-full border-2 border-blue-200 rounded-xl text-xs shadow-sm ${
                        readOnly ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-blue-50'
                      }`}
                      value={calc.hours[day]?.site || ""}
                      onChange={e => onChange(calc.emp.id, day, "site", e.target.value)}
                      disabled={readOnly}
                    >
                      <option value="">{calc.hours[day]?.hours > 0 ? "Zgjidh vendin" : "Pushim"}</option>
                      {calc.empSites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </td>
                ))}
                <td className="py-2 px-2 font-semibold text-blue-900 bg-blue-50 rounded-xl">£{calc.rate.toFixed(2)}</td>
                <td className="py-2 px-2 font-bold text-gray-900 bg-gray-50 rounded-xl">{calc.total ? calc.total.toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 font-semibold text-green-700 bg-green-50 rounded-xl">£{calc.bruto ? calc.bruto.toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 font-semibold text-yellow-700 bg-yellow-50 rounded-xl">£{calc.tvsh ? calc.tvsh.toFixed(2) : '0.00'}</td>
                <td className="py-2 px-2 font-semibold text-blue-700 bg-blue-50 rounded-xl">£{calc.neto ? calc.neto.toFixed(2) : '0.00'}</td>
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
              <td className="py-2 px-2 font-bold text-gray-900 bg-gray-100 rounded-xl">{weekTotals.totalHours ? weekTotals.totalHours.toFixed(2) : '0.00'}</td>
              <td className="py-2 px-2 font-bold text-green-700 bg-green-100 rounded-xl">£{weekTotals.totalBruto ? weekTotals.totalBruto.toFixed(2) : '0.00'}</td>
              <td className="py-2 px-2 font-bold text-yellow-700 bg-yellow-100 rounded-xl">£{weekTotals.totalTVSH ? weekTotals.totalTVSH.toFixed(2) : '0.00'}</td>
              <td className="py-2 px-2 font-bold text-blue-700 bg-blue-100 rounded-xl">£{weekTotals.totalNeto ? weekTotals.totalNeto.toFixed(2) : '0.00'}</td>
              {showPaymentControl && <td className="py-2 px-2"></td>}
              {showPaymentControl && <td className="py-2 px-2"></td>}
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
