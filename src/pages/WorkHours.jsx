import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import WorkHoursTable from "../components/WorkHoursTable";
import axios from "axios";

const getStartOfWeek = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
  
  // Java sipas backend: E Hëna (1) → E Diel (0)
  // Backend përdor Monday-Sunday week calculation
  // Monday = 1, Sunday = 0
  // We want Monday to be the start of the week
  let diff;
  if (day === 0) {
    // Sunday - go back 6 days to get to Monday
    diff = -6;
  } else {
    // Monday-Saturday - go back (day-1) days to get to Monday
    diff = -(day - 1);
  }
  
  // Shto offset për javët e tjera
  const adjustedDiff = diff + (offset * 7);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + adjustedDiff);
  
  // Debug logging
  console.log('[DEBUG] getStartOfWeek calculation:');
  console.log('[DEBUG] Today:', today.toISOString().slice(0, 10));
  console.log('[DEBUG] Day of week:', day);
  console.log('[DEBUG] Calculated diff:', diff);
  console.log('[DEBUG] Adjusted diff with offset:', adjustedDiff);
  console.log('[DEBUG] Start of week:', startOfWeek.toISOString().slice(0, 10));
  console.log('[DEBUG] Offset:', offset);
  
  return startOfWeek;
};

const formatDateRange = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);
  
  // Debug logging
  console.log('[DEBUG] formatDateRange calculation:');
  console.log('[DEBUG] Start date:', startDate.toISOString().slice(0, 10));
  console.log('[DEBUG] End date:', endDate.toISOString().slice(0, 10));
  console.log('[DEBUG] Formatted range:', `${startStr} - ${endStr}`);
  
  return `${startStr} - ${endStr}`;
};

export default function WorkHours() {
  const { user, setUser } = useAuth();
  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const isUser = user?.role === "user";
  const token = localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [saved, setSaved] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const currentWeekStart = getStartOfWeek();
  const currentWeekLabel = formatDateRange(currentWeekStart);
  
  // Debug log when employees state changes
  useEffect(() => {
    console.log('[DEBUG] Employees state changed:', employees.length, employees);
  }, [employees]);
  
  // Debug logging
  console.log('[DEBUG] Current week start:', currentWeekStart);
  console.log('[DEBUG] Current week label:', currentWeekLabel);

  // Funksion për toast notifications
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // Shto showToast në window object për WorkHoursTable
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.showToast = showToast;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.showToast;
      }
    };
  }, []);

  // Shto këtë useEffect në fillim të komponentit
  useEffect(() => {
    if (user && user.role === "manager" && !user.workplace && user.employee_id) {
      axios.get(`https://building-system.onrender.com/api/employees/${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data && res.data.workplace) {
          setUser(prev => ({ ...prev, workplace: Array.isArray(res.data.workplace) ? res.data.workplace : [res.data.workplace] }));
        }
      });
    }
  }, [user, token]);

  // Kontrollo aksesin e manager
  useEffect(() => {
    if (user && user.role === "manager" && user.employee_id) {
      console.log("Checking manager access for employee_id:", user.employee_id);
      axios.get(`https://building-system.onrender.com/api/work-hours/check-manager-access?employee_id=${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        console.log("Manager access check result:", res.data);
      }).catch(err => {
        console.error("Error checking manager access:", err);
      });
    }
  }, [user, token]);

  // Merr punonjësit nga backend
  useEffect(() => {
    if (!user) return;
    
    console.log('[DEBUG] Starting to fetch employees for user:', user);
    setLoading(true);
    
    axios.get("https://building-system.onrender.com/api/employees", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        const emps = res.data || [];
        console.log("All employees:", emps);
        
        if (isAdmin) {
          // ADMIN: shfaq të gjithë punonjësit
          console.log('[DEBUG] Admin user - setting all employees:', emps.length);
          setEmployees(emps);
          return;
        }
        
        if (isUser) {
          // USER: shfaq vetëm veten
          const selfEmployee = emps.find(emp => {
            if (user.employee_id) {
              return String(emp.id) === String(user.employee_id);
            }
            return emp.email && emp.email.toLowerCase() === user.email.toLowerCase();
          });
          console.log('[DEBUG] User role - setting self employee:', selfEmployee ? 1 : 0);
          setEmployees(selfEmployee ? [selfEmployee] : []);
          return;
        }
        
        if (isManager) {
          // MANAGER: shfaq punonjësit e site-ve të tij
          console.log("Manager user:", user);
          console.log("Manager employee_id:", user.employee_id);
          
          // Fallback: nëse nuk ka employee_id, gjej nga email
          if (!user.employee_id) {
            console.log("Manager has no employee_id, searching by email:", user.email);
            const selfEmployee = emps.find(emp => 
              emp.email && emp.email.toLowerCase() === user.email.toLowerCase()
            );
            if (selfEmployee) {
              console.log("Found self employee by email:", selfEmployee);
              setEmployees([selfEmployee]);
              setUser(prev => ({ ...prev, employee_id: selfEmployee.id }));
            } else {
              console.log("No employee found for manager email:", user.email);
              setEmployees([]);
            }
            return;
          }
          
          // Gjej menaxherin në listën e punonjësve
          const managerEmployee = emps.find(emp => String(emp.id) === String(user.employee_id));
          if (!managerEmployee) {
            console.log("Manager employee not found in employees list");
            setEmployees([]);
            return;
          }
          
          // Përdor workplace nga managerEmployee nëse user.workplace është bosh
          const managerSites = user.workplace || managerEmployee.workplace || [];
          console.log("Manager sites:", managerSites);
          
          // Nëse manager nuk ka site-t, shfaq vetëm veten
          if (managerSites.length === 0) {
            console.log("Manager has no sites, showing only self");
            setEmployees([managerEmployee]);
            return;
          }
          
          // Filtro punonjësit që punojnë në site-t e menaxherit
          const filteredEmps = emps.filter(emp => {
            if (String(emp.id) === String(user.employee_id)) {
              console.log(`Including manager self: ${emp.first_name} ${emp.last_name}`);
              return true; // Gjithmonë përfshij veten
            }
            
            // Kontrollo nëse punonjësi ka site-t e përbashkëta me menaxherin
            if (emp.workplace && Array.isArray(emp.workplace)) {
              const hasCommonSite = emp.workplace.some(site => managerSites.includes(site));
              console.log(`Employee ${emp.first_name} ${emp.last_name} sites:`, emp.workplace, "Manager sites:", managerSites, "Has common site:", hasCommonSite);
              return hasCommonSite;
            }
            
            console.log(`Employee ${emp.first_name} ${emp.last_name} has no workplace or not array`);
            return false;
          });
          
          console.log("Filtered employees for manager:", filteredEmps);
          
          // Nëse nuk gjej asnjë punonjës, shfaq vetëm menaxherin
          if (filteredEmps.length === 0) {
            console.log("No employees found for manager sites, showing only manager");
            setEmployees([managerEmployee]);
          } else {
            console.log('[DEBUG] Manager role - setting filtered employees:', filteredEmps.length);
            setEmployees(filteredEmps);
          }
        }
      })
      .catch(err => {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id, user?.employee_id, user?.role, token, isAdmin, isManager, isUser]);

  // Merr orët e punës nga backend
  useEffect(() => {
    if (!user || !currentWeekLabel) return;
    
    setLoading(true);
    
    axios.get("https://building-system.onrender.com/api/work-hours/structured", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        console.log('[DEBUG] WorkHours API response:', res);
        console.log('[DEBUG] WorkHours API data:', res.data);
        console.log('[DEBUG] WorkHours API data type:', typeof res.data);
        console.log('[DEBUG] WorkHours API data keys:', Object.keys(res.data || {}));
        
        const data = res.data || {};
        setHourData(data);
        
        // Debug: shfaq disa shembuj të të dhënave
        Object.entries(data).forEach(([empId, empData]) => {
          console.log(`[DEBUG] Employee ${empId} data:`, empData);
          Object.entries(empData).forEach(([week, weekData]) => {
            console.log(`[DEBUG] Employee ${empId} week ${week}:`, weekData);
          });
        });
      })
      .catch(err => {
        console.error('[DEBUG] WorkHours API error:', err);
        setHourData({});
      })
      .finally(() => setLoading(false));
  }, [token, currentWeekLabel, user?.id]);

  // Merr kontratat për site options
  useEffect(() => {
    axios.get("https://building-system.onrender.com/api/contracts", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const sites = (res.data || []).map(c => c.siteName).filter(Boolean);
        setSiteOptions(sites);
      })
      .catch(() => setSiteOptions([]));
  }, [token]);

  // Merr statusin e pagesës nga backend
  useEffect(() => {
    axios.get(`https://building-system.onrender.com/api/work-hours/paid-status?week=${encodeURIComponent(currentWeekLabel)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const data = {};
        (res.data || []).forEach(row => {
          data[`${row.week}_${row.employeeId}`] = row.paid;
        });
        setPaidStatus(data);
      })
      .catch(() => setPaidStatus({}));
  }, [token, currentWeekLabel]);

  const handleChange = (empId, day, field, value) => {
    if (isAdmin) {
      // ADMIN: read-only, vetëm mund të ndryshojë statusin e pagesës
      if (field === 'paid') {
        setPaidStatus(prev => ({
          ...prev,
          [`${currentWeekLabel}_${empId}`]: value
        }));
      }
      return;
    }
    
    if (isManager) {
      // MANAGER: mund të ndryshojë të gjitha fushat
      setHourData((prev) => ({
        ...prev,
        [empId]: {
          ...prev[empId],
          [currentWeekLabel]: {
            ...prev[empId]?.[currentWeekLabel],
            [day]: {
              ...prev[empId]?.[currentWeekLabel]?.[day],
              [field]: value
            }
          }
        }
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setSaved(true);
      
      if (isAdmin) {
        // ADMIN: ruaj vetëm statusin e pagesës
        const paymentUpdates = [];
        Object.entries(paidStatus).forEach(([key, paid]) => {
          const [week, employeeId] = key.split('_');
          if (week === currentWeekLabel) {
            paymentUpdates.push({
              employeeId: parseInt(employeeId),
              week: week,
              paid: paid
            });
          }
        });
        
        if (paymentUpdates.length > 0) {
          await axios.post("https://building-system.onrender.com/api/work-hours/update-payment-status", {
            updates: paymentUpdates
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } else if (isManager) {
        // MANAGER: ruaj orët e punës
        const updates = [];
        Object.entries(hourData).forEach(([empId, empData]) => {
          const weekData = empData[currentWeekLabel];
          if (weekData) {
            Object.entries(weekData).forEach(([day, dayData]) => {
              if (dayData && (dayData.hours || dayData.site)) {
                updates.push({
                  employeeId: parseInt(empId),
                  week: currentWeekLabel,
                  day: day,
                  hours: dayData.hours || 0,
                  site: dayData.site || '',
                  rate: dayData.rate || 0
                });
              }
            });
          }
        });
        
        if (updates.length > 0) {
          await axios.post("https://building-system.onrender.com/api/work-hours/bulk-update", {
            updates: updates
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      
      showToast("Të dhënat u ruajtën me sukses!", "success");
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving data:", error);
      showToast("Gabim gjatë ruajtjes së të dhënave!", "error");
      setSaved(false);
    }
  };

  const toggleWeek = (weekLabel) => {
    setExpandedWeeks(prev => 
      prev.includes(weekLabel) 
        ? prev.filter(w => w !== weekLabel)
        : [...prev, weekLabel]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Duke ngarkuar orët e punës...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 py-6 md:py-10 max-w-none">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-semibold transform transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500' : 
          toast.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700">
        {isManager ? "🕒 Menaxhimi i Orëve të Punës" : 
         isAdmin ? "🕒 Paneli i Administrimit të Orëve" : 
         "🕒 Orët e Mia të Punës"}
      </h1>

      {/* Përmbledhje për Menaxherin */}
      {isManager && employees.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">📊 Përmbledhje e Orëve të Punës</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                {employees.length}
              </div>
              <div className="text-sm opacity-90">Punonjës</div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                {(() => {
                  try {
                    const total = Object.values(hourData || {}).reduce((total, empData) => {
                      return total + Object.values(empData || {}).reduce((weekTotal, weekData) => {
                        return weekTotal + Object.values(weekData || {}).reduce((dayTotal, dayData) => {
                          return dayTotal + (parseFloat(dayData?.hours) || 0);
                        }, 0);
                      }, 0);
                    }, 0);
                    return (total || 0).toFixed(1);
                  } catch (error) {
                    console.error('Error calculating total hours:', error);
                    return '0.0';
                  }
                })()}
              </div>
              <div className="text-sm opacity-90">Total Orë</div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                £{(() => {
                  try {
                    const total = Object.values(hourData || {}).reduce((total, empData) => {
                      return total + Object.values(empData || {}).reduce((weekTotal, weekData) => {
                        return weekTotal + Object.values(weekData || {}).reduce((dayTotal, dayData) => {
                          const emp = employees.find(e => e.id === parseInt(Object.keys(hourData || {}).find(key => hourData[key] === empData)));
                          return dayTotal + ((parseFloat(dayData?.hours) || 0) * (parseFloat(emp?.hourly_rate) || 0));
                        }, 0);
                      }, 0);
                    }, 0);
                    return (total || 0).toFixed(2);
                  } catch (error) {
                    console.error('Error calculating total pay:', error);
                    return '0.00';
                  }
                })()}
              </div>
              <div className="text-sm opacity-90">Total Paga</div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                {Object.keys(hourData).length}
              </div>
              <div className="text-sm opacity-90">Javë Aktive</div>
            </div>
          </div>
        </div>
      )}

      {/* Kontrolli i pagesës - HEQUR për admin */}
      {isManager && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            💰 Ruaj Orët e Punës
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={handleSubmit}
              disabled={saved}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50"
            >
              {saved ? "✅ U ruajt!" : "💾 Ruaj Orët e Punës"}
            </button>
          </div>
        </div>
      )}

      {/* Read-only view për user */}
      {isUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">ℹ️ Informacion</h2>
          <p className="text-blue-700">
            Kjo faqe shfaq vetëm orët tuaja të punës. Për ndryshime, kontaktoni menaxherin tuaj.
          </p>
        </div>
      )}

      {/* Mesazh për manager kur nuk ka punonjës */}
      {isManager && employees.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Informacion për Menaxherin</h2>
          <p className="text-yellow-700 mb-4">
            Nuk u gjetën punonjës për site-t tuaja. Kjo mund të ndodhë për arsyet e mëposhtme:
          </p>
          <ul className="text-yellow-700 list-disc list-inside space-y-2">
            <li>Nuk jeni caktuar në asnjë site</li>
            <li>Punonjësit nuk janë caktuar në site-t tuaja</li>
            <li>Ka problem me të dhënat e databazës</li>
          </ul>
          <p className="text-yellow-700 mt-4">
            Kontaktoni administratorin për të rregulluar këtë problem.
          </p>
        </div>
      )}

      {/* Tabela e orëve të punës */}
      <div className="space-y-6">
        {/* Java aktuale */}
        {loading ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <h4 className="text-lg font-semibold text-blue-800 mb-2">Duke ngarkuar të dhënat...</h4>
            <p className="text-blue-700">Ju lutem prisni ndërsa po ngarkojmë orët e punës.</p>
          </div>
        ) : Array.isArray(employees) && employees.length > 0 ? (
          <WorkHoursTable
            employees={employees}
            weekLabel={currentWeekLabel}
            data={hourData}
            onChange={handleChange}
            readOnly={isUser}
            showPaymentControl={isAdmin}
            paidStatus={paidStatus}
            setPaidStatus={setPaidStatus}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h4 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Nuk ka punonjës për të shfaqur</h4>
            <p className="text-yellow-700 mb-4">
              Nuk u gjetën punonjës për këtë javë. Kjo mund të ndodhë nëse:
            </p>
            <ul className="text-yellow-700 list-disc list-inside space-y-2">
              <li>Nuk ka punonjës të caktuar për rolin tuaj</li>
              <li>Punonjësit nuk kanë orë të punës për këtë javë</li>
              <li>Ka problem me të dhënat e databazës</li>
            </ul>
          </div>
        )}

        {/* Javët e kaluara - për admin dhe manager */}
        {(isAdmin || isManager) && Object.keys(hourData).length > 0 && Array.isArray(employees) && employees.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">📅 Javët e Kaluara</h3>
            {(() => {
              const allWeeks = Object.keys(hourData);
              console.log("All weeks from hourData:", allWeeks);
              console.log("Current week label:", currentWeekLabel);
              
              // Filtrimi i javëve të kaluara: vetëm week labels në format date range
              const pastWeeks = allWeeks.filter(weekLabel => {
                const isValidDateRange = /^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/.test(weekLabel);
                // Check if this week is not the current week by comparing dates
                const isNotCurrentWeek = weekLabel !== currentWeekLabel;
                
                // Additional check: if the week ends before today, it's definitely a past week
                const weekEndDate = weekLabel.split(' - ')[1];
                const today = new Date().toISOString().slice(0, 10);
                const isPastWeek = weekEndDate < today;
                
                console.log(`Week ${weekLabel}: isValidDateRange=${isValidDateRange}, isNotCurrentWeek=${isNotCurrentWeek}, isPastWeek=${isPastWeek}, weekEndDate=${weekEndDate}, today=${today}`);
                
                return isValidDateRange && isNotCurrentWeek;
              });
              
              console.log("Filtered past weeks:", pastWeeks);
              
              return pastWeeks.slice(0, 5).map((weekLabel) => {
                return (
                  <div key={weekLabel} className="bg-white rounded-lg shadow-md">
                    <button
                      onClick={() => toggleWeek(weekLabel)}
                      className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800">{weekLabel}</span>
                        <span className="text-gray-500">
                          {expandedWeeks.includes(weekLabel) ? "▼" : "▶"}
                        </span>
                      </div>
                    </button>
                    
                    {expandedWeeks.includes(weekLabel) && (
                      <div className="p-4">
                        <WorkHoursTable
                          employees={employees}
                          weekLabel={weekLabel}
                          data={hourData}
                          onChange={handleChange}
                          readOnly={isUser}
                          showPaymentControl={isAdmin}
                          paidStatus={paidStatus}
                          setPaidStatus={setPaidStatus}
                        />
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}