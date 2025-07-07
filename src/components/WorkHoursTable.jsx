import { useState, useEffect } from "react";
import axios from "../api";

const days = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];

export default function WorkHoursTable({
  employees,
  weekLabel,
  data,
  onChange,
  readOnly,
  showPaymentControl = false,
  siteOptions = [],
}) {
  const [paidStatus, setPaidStatus] = useState({});

  useEffect(() => {
    const fetchPaidStatus = async () => {
      try {
        const res = await axios.get("/work-hours/paid-status", { params: { week: weekLabel } });
        const transformed = {};
        res.data.forEach(item => {
          transformed[`${item.week}_${item.employeeId}`] = item.paid;
        });
        setPaidStatus(transformed);
      } catch (err) {
        console.error("Gabim në marrjen e statusit të pagesave", err);
      }
    };
    fetchPaidStatus();
  }, [weekLabel]);

  const handleTick = async (empId) => {
    const key = `${weekLabel}_${empId}`;
    const updated = { ...paidStatus, [key]: !paidStatus[key] };
    setPaidStatus(updated);

    try {
      await axios.post("/work-hours/paid-status", {
        week: weekLabel,
        employeeId: empId,
        paid: updated[key],
      });
    } catch (err) {
      console.error("Gabim në ruajtjen e statusit të pagesës", err);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100 p-6 mb-8 overflow-x-auto animate-fade-in">
      <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-6 text-center flex items-center gap-2 justify-center">
        <span className="text-3xl">🕒</span> Java: {weekLabel}
      </h3>
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
          {employees.map((emp) => {
            const firstName = emp.firstName || emp.first_name || '';
            const lastName = emp.lastName || emp.last_name || '';
            const rate = Number(emp.hourlyRate || emp.hourly_rate || 0);
            const labelType = emp.labelType || emp.label_type || 'UTR';
            const hours = data[emp.id]?.[weekLabel] || {};
            const total = days.reduce((acc, day) => acc + parseFloat(hours[day]?.hours || 0), 0);
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

            return (
              <tr key={emp.id} className={`text-center hover:bg-purple-50 transition-all duration-200 rounded-xl shadow-sm`}> 
                <td className="py-3 px-3 font-semibold flex items-center gap-4 justify-center">
                  {emp.photo ? (
                    <img src={emp.photo} alt="Foto" className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow" />
                  ) : (
                    <span className="rounded-full bg-blue-200 text-blue-700 px-4 py-3 text-xl font-bold mr-2 shadow">{firstName[0]}{lastName[0]}</span>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">{firstName} {lastName}</span>
                    <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-3 py-1 rounded-full shadow mt-1 uppercase tracking-wide">{emp.role || emp.role_type || ''}</span>
                  </div>
                </td>
                {days.map((day) => (
                  <td key={day} className="py-2 px-2">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={hours[day]?.hours || ""}
                      onChange={e => onChange(emp.id, day, "hours", e.target.value)}
                      className="w-16 p-2 border-2 border-blue-200 rounded-xl text-center focus:ring-2 focus:ring-blue-400 bg-blue-50 shadow-sm text-base"
                      disabled={readOnly}
                      placeholder="0"
                    />
                    <select
                      className="mt-2 w-full border-2 border-blue-200 rounded-xl text-xs bg-blue-50 shadow-sm"
                      value={hours[day]?.site || ""}
                      onChange={e => onChange(emp.id, day, "site", e.target.value)}
                      disabled={readOnly}
                    >
                      <option value="">Zgjidh vendin</option>
                      {empSites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </td>
                ))}
                <td className="py-2 px-2 font-semibold text-blue-900 bg-blue-50 rounded-xl">£{rate.toFixed(2)}</td>
                <td className="py-2 px-2 font-bold text-gray-900 bg-gray-50 rounded-xl">{total.toFixed(2)}</td>
                <td className="py-2 px-2 font-semibold text-green-700 bg-green-50 rounded-xl">£{bruto.toFixed(2)}</td>
                <td className="py-2 px-2 font-semibold text-yellow-700 bg-yellow-50 rounded-xl">£{tvsh.toFixed(2)}</td>
                <td className="py-2 px-2 font-semibold text-blue-700 bg-blue-50 rounded-xl">£{neto.toFixed(2)}</td>
                {showPaymentControl && (
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={paid || false}
                      onChange={async () => {
                        await handleTick(emp.id);
                        // Refresh paid status after change
                        const res = await axios.get("/work-hours/paid-status", { params: { week: weekLabel } });
                        const transformed = {};
                        res.data.forEach(item => {
                          transformed[`${item.week}_${item.employeeId}`] = item.paid;
                        });
                        setPaidStatus(transformed);
                      }}
                      className="w-6 h-6 accent-green-600 rounded-full border-2 border-green-300 shadow"
                    />
                  </td>
                )}
                {showPaymentControl && (
                  <td className="py-2 px-2">
                    <span className={`px-4 py-1 rounded-full border text-base font-bold shadow-md ${statusClass} ${statusBg}`}>{statusText}</span>
                  </td>
                )}
              </tr>
            );
          })}
          {/* Llogarit totalet për këtë javë */}
          {(() => {
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
                  const hours = Number(entry.hours);
                  totalHours += hours;
                  totalBruto += hours * empRate;
                  totalTVSH += empLabelType === "UTR" ? hours * empRate * 0.2 : hours * empRate * 0.3;
                  totalNeto += empLabelType === "UTR" ? hours * empRate * 0.8 : hours * empRate * 0.7;
                }
              });
            });

            return (
              <tr className="font-bold bg-gradient-to-r from-blue-100 via-white to-purple-100 text-blue-900 text-lg rounded-xl shadow mt-2">
                <td className="py-3 px-3 text-right" colSpan={days.length + 1}>Totali për javën:</td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3">{totalHours}</td>
                <td className="py-3 px-3">£{totalBruto.toFixed(2)}</td>
                <td className="py-3 px-3">£{totalTVSH.toFixed(2)}</td>
                <td className="py-3 px-3">£{totalNeto.toFixed(2)}</td>
                {showPaymentControl && <td className="py-3 px-3" colSpan={2}></td>}
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}
