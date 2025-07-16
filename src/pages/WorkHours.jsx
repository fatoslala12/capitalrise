import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import WorkHoursTable from "../components/WorkHoursTable";
import axios from "axios";

const getStartOfWeek = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
  // Java tradicionale: E Hëna (1) → E Diel (0)
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  return new Date(today.setDate(diff));
};

const formatDateRange = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);
  return `${startStr} - ${endStr}`;
};

export default function WorkHours() {
  const { user, setUser } = useAuth();
  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const isUser = user?.role === "user";
  const isReadOnly = isUser; // Read-only vetëm për user, jo për manager
  const token = localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [saved, setSaved] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const currentWeekStart = getStartOfWeek();
  const currentWeekLabel = formatDateRange(currentWeekStart);

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

  // Merr punonjësit nga backend
  useEffect(() => {
    console.log("USER NE WORKHOURS:", user);
    if (!user) return;
    
    setLoading(true);
    
    // Debug call për manager permissions
    if (isManager && user.employee_id) {
      axios.get(`https://building-system.onrender.com/api/work-hours/debug-manager?employee_id=${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log("DEBUG MANAGER ACCESS:", res.data);
        })
        .catch(err => {
          console.error("Debug manager access error:", err);
        });
    }
    
    axios.get("https://building-system.onrender.com/api/employees", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        const emps = res.data || [];
        console.log("ALL EMPLOYEES FROM BACKEND:", emps);
        
        if (isAdmin) {
          console.log("EMPLOYEES FOR ADMIN:", emps);
          setEmployees(emps);
          return;
        }
        
        // MANAGER: filtro sipas kontratave të përbashkëta
        console.log("MANAGER employee_id:", user.employee_id);
        
        if (!user.employee_id) {
          console.log("NO employee_id found for manager, trying to find by email");
          console.log("User email to search:", user.email);
          
          // Kontrollo secili employee për debugging
          emps.forEach(emp => {
            console.log(`Employee ${emp.id}: ${emp.first_name} ${emp.last_name}, email: ${emp.email || 'NO EMAIL'}`);
          });
          
          // Gjej punonjësin me email të njëjtë (matching i saktë)
          const selfEmployee = emps.find(emp => {
            console.log(`Checking employee ${emp.id} email ${emp.email} against user email ${user.email}`);
            return emp.email && emp.email.toLowerCase() === user.email.toLowerCase();
          });
          
          if (selfEmployee) {
            console.log("Found self employee by email:", selfEmployee);
            setEmployees([selfEmployee]);
          } else {
            console.log("Could not find matching employee record by email");
            // Fallback: kontrolloj nëse ka user record në database që lidh user_id me employee_id
            console.log("Searching for user-employee link in backend...");
            axios.get(`https://building-system.onrender.com/api/users/${user.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(userRes => {
              if (userRes.data && userRes.data.employee_id) {
                const linkedEmployee = emps.find(emp => String(emp.id) === String(userRes.data.employee_id));
                if (linkedEmployee) {
                  console.log("Found linked employee:", linkedEmployee);
                  setEmployees([linkedEmployee]);
                  // Përditëso user në context që të ketë employee_id
                  setUser(prev => ({ ...prev, employee_id: userRes.data.employee_id }));
                } else {
                  console.log("Employee not found for linked employee_id:", userRes.data.employee_id);
                  setEmployees([]);
                }
              } else {
                console.log("No employee_id found in user record");
                setEmployees([]);
              }
            }).catch(err => {
              console.error("Error fetching user details:", err);
              setEmployees([]);
            });
          }
          return;
        }
        
        try {
          const ewRes = await axios.get("https://building-system.onrender.com/api/employee-workplaces", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const allRelations = ewRes.data || [];
          console.log("ALL EMPLOYEE WORKPLACES:", allRelations);
          
          const myContractIds = allRelations
            .filter(r => String(r.employee_id) === String(user.employee_id))
            .map(r => r.contract_id);
          console.log("MY CONTRACT IDs:", myContractIds);
          
          if (myContractIds.length === 0) {
            console.log("Manager has no contract assignments, showing only self");
            const selfEmployee = emps.find(emp => String(emp.id) === String(user.employee_id));
            setEmployees(selfEmployee ? [selfEmployee] : []);
            return;
          }
          
          const filteredEmps = emps.filter(emp => {
            if (String(emp.id) === String(user.employee_id)) return true;
            const empContracts = allRelations.filter(r => String(r.employee_id) === String(emp.id)).map(r => r.contract_id);
            return empContracts.some(cid => myContractIds.includes(cid));
          });
          console.log("FILTERED EMPLOYEES FOR MANAGER:", filteredEmps);
          setEmployees(filteredEmps);
        } catch (ewError) {
          console.error("Error fetching employee workplaces:", ewError);
          // Fallback: show only self
          const selfEmployee = emps.find(emp => String(emp.id) === String(user.employee_id));
          setEmployees(selfEmployee ? [selfEmployee] : []);
        }
      })
      .catch(err => {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id, user?.employee_id, user?.role, token, isAdmin, isManager]); // Simplified dependencies

  // Merr orët e punës nga backend
  useEffect(() => {
    if (employees.length === 0) return;
    axios.get("https://building-system.onrender.com/api/work-hours/structured", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        console.log("WORK HOURS STRUCTURED FROM BACKEND:", res.data);
        setHourData(res.data || {});
      })
      .catch(() => setHourData({}));
  }, [employees, token]);

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
    console.log('getPaidStatus called with week:', currentWeekLabel);
    axios.get(`https://building-system.onrender.com/api/work-hours/paid-status?week=${encodeURIComponent(currentWeekLabel)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        // Transform to object for fast lookup
        const data = {};
        (res.data || []).forEach(row => {
          data[`${row.week}_${row.employeeId}`] = row.paid;
        });
        setPaidStatus(data);
      })
      .catch(() => setPaidStatus({}));
  }, [token, currentWeekLabel]);

  const handleChange = (empId, day, field, value) => {
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
  };

  // Ruaj orët e punës në backend
  const handleSubmit = async () => {
    // Kontrollo që për çdo punonjës dhe çdo ditë të jetë zgjedhur një site
    const days = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
    for (const empId of Object.keys(hourData)) {
      const weekData = hourData[empId]?.[currentWeekLabel] || {};
      for (const day of days) {
        const entry = weekData[day];
        if (entry && entry.hours && (!entry.site || entry.site === "")) {
          alert(`Zgjidh vendin për çdo ditë me orë për punonjësin ID: ${empId}, dita: ${day}`);
          return;
        }
      }
    }
    try {
      console.log('hourData që po dërgohet:', hourData);
      await axios.post(
        "https://building-system.onrender.com/api/work-hours",
        { hourData, weekLabel: currentWeekLabel },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaved(true);
      alert("Orët u ruajtën me sukses për të gjithë punonjësit.");
      // Rifresko të dhënat e orëve nga backend
      axios.get("https://building-system.onrender.com/api/work-hours/structured", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setHourData(res.data || {});
        })
        .catch(() => {});
    } catch {
      alert("Gabim gjatë ruajtjes së orëve!");
    }
  };

  // Set only the current week expanded by default for admin
  useEffect(() => {
    if (isAdmin) {
      setExpandedWeeks([]);
    }
  }, [isAdmin, currentWeekLabel]);

  const toggleWeek = (weekLabel) => {
    setExpandedWeeks((prev) => {
      // Nëse java që klikohet është e hapur, mbyll të gjitha
      if (prev.includes(weekLabel)) {
        return [];
      }
      // Nëse java që klikohet është e mbyllur, hap vetëm atë
      return [weekLabel];
    });
  };

  // Gjenero javët ekzistuese nga hourData
  const allWeekLabels = new Set();
  employees.forEach(emp => {
    const empData = hourData[emp.id] || {};
    Object.keys(empData)
      .filter(label => label.includes(" - "))
      .forEach(label => allWeekLabels.add(label));
  });

  // Shto javën aktuale nëse nuk është në të dhënat ekzistuese
  allWeekLabels.add(currentWeekLabel);

  const sortedWeeks = Array.from(allWeekLabels).sort((a, b) => {
    const [aStart] = a.split(" - ");
    const [bStart] = b.split(" - ");
    return new Date(bStart) - new Date(aStart);
  });

  // Nda javën aktuale nga të tjerat dhe filtro javët e ardhshme
  const today = new Date();
  const otherWeeks = sortedWeeks.filter(weekLabel => {
    if (weekLabel === currentWeekLabel) return false;
    
    // Kontrollo nëse java është në të kaluarën ose aktuale
    const [weekStart] = weekLabel.split(' - ');
    const weekStartDate = new Date(weekStart);
    
    // Shfaq vetëm javët që kanë filluar para ose në ditën e sotme
    return weekStartDate <= today;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar orët e punës...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {isReadOnly ? "🕒 Orët e Mia të Punës" : "📋 Menaxho Orët e Punës"}
      </h2>

      {/* Read-only view për user */}
      {isReadOnly && (
        <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-blue-100">
          <h3 className="text-xl font-semibold mb-6 text-center text-blue-800">
            📊 Orët e Mia të Punës - {currentWeekLabel}
          </h3>
          
          {(() => {
            const myKey = `${currentWeekLabel}_${user.id}`;
            const isPaid = paidStatus[myKey];
            const userHours = hourData[user.employee_id] || {};
            const thisWeek = userHours[currentWeekLabel] || {};

            if (Object.keys(thisWeek).length === 0) {
              return (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">Nuk ka të dhëna për këtë javë.</p>
                </div>
              );
            }

            const entries = Object.entries(thisWeek).filter(([key]) => key !== "hourlyRate");
            const rate = Number(thisWeek.hourlyRate || user.hourlyRate || 0);
            const labelType = user?.labelType || "UTR";

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">
                      {entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0)}
                    </div>
                    <div className="text-sm">Total Orë</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">
                      £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate).toFixed(2)}
                    </div>
                    <div className="text-sm">Bruto</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">
                      £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate * (labelType === "UTR" ? 0.8 : 0.7)).toFixed(2)}
                    </div>
                    <div className="text-sm">Neto</div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">
                      {isPaid ? "✅" : "⏳"}
                    </div>
                    <div className="text-sm">{isPaid ? "Paguar" : "Pa paguar"}</div>
                  </div>
                </div>

                <table className="w-full text-sm border mt-4 shadow rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800 font-semibold">
                    <tr>
                      <th className="p-3 border">📅 Dita</th>
                      <th className="p-3 border">📍 Site</th>
                      <th className="p-3 border">⏱ Orë</th>
                      <th className="p-3 border">💷 Bruto</th>
                      <th className="p-3 border">💰 Neto</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {entries.map(([day, entry]) => {
                      const hours = Number(entry.hours || 0);
                      const bruto = hours * rate;
                      const neto = bruto * (labelType === "UTR" ? 0.8 : 0.7);

                      return (
                        <tr key={day} className="hover:bg-gray-50 text-center border-b">
                          <td className="p-3 border-r font-medium">{day}</td>
                          <td className="p-3 border-r">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                              {entry.site || "-"}
                            </span>
                          </td>
                          <td className="p-3 border-r font-bold">{hours}</td>
                          <td className="p-3 border-r text-green-700 font-bold">£{bruto.toFixed(2)}</td>
                          <td className="p-3 text-blue-700 font-bold">£{neto.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl text-sm text-gray-800 shadow-inner">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="font-bold text-lg">🔢 Total orë</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0)}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-lg">💷 Total bruto</p>
                      <p className="text-2xl font-bold text-green-600">
                        £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-lg">💰 Total neto</p>
                      <p className="text-2xl font-bold text-purple-600">
                        £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate * (labelType === "UTR" ? 0.8 : 0.7)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Admin dhe Manager view - mund të editojnë */}
      {(isAdmin || isManager) && (
        <>
          {isManager && employees.length === 0 && (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded text-center font-semibold mb-6">
              <p>Nuk keni asnjë punonjës aktiv të caktuar në site-t tuaj.</p>
            </div>
          )}

          {isManager && employees.length > 0 && (
            <div className="bg-green-100 text-green-800 p-4 rounded text-center mb-6">
              <p>✅ U gjetën {employees.length} punonjës që mund të menaxhoni orët e tyre.</p>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <WorkHoursTable
              employees={employees}
              weekLabel={currentWeekLabel}
              data={hourData}
              onChange={handleChange}
              readOnly={false}
              showPaymentControl={isAdmin}
              siteOptions={siteOptions}
            />
            <button type="submit" className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              💾 Ruaj Orët e Kësaj Jave
            </button>
          </form>

          {(saved || isAdmin) && (
            <div className="mt-12">
              <h3 className="text-xl font-semibold mb-4 text-center">📊 Java Aktuale - {currentWeekLabel}</h3>
              <WorkHoursTable
                employees={employees}
                weekLabel={currentWeekLabel}
                data={hourData}
                onChange={handleChange}
                readOnly={true}
                showPaymentControl={isAdmin}
                siteOptions={siteOptions}
              />
            </div>
          )}

          {isAdmin && otherWeeks.map((weekLabel) => (
            <div key={weekLabel} className="mt-6">
              <button className="text-blue-600 underline mb-2" onClick={() => toggleWeek(weekLabel)}>
                {expandedWeeks.includes(weekLabel) ? "▼ Fshih" : "▶ Shfaq"} {weekLabel}
              </button>
              {expandedWeeks.includes(weekLabel) && (
                <WorkHoursTable
                  employees={employees}
                  weekLabel={weekLabel}
                  data={hourData}
                  onChange={handleChange}
                  readOnly={true}
                  showPaymentControl={isAdmin}
                  siteOptions={siteOptions}
                />
              )}
            </div>
          ))}
        </>
      )}

      {/* Debug section - vetëm për development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">🔧 Debug Info</h3>
          <div className="text-sm space-y-1">
            <p><strong>User Role:</strong> {user?.role}</p>
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Employee ID:</strong> {user?.employee_id || 'None'}</p>
            <p><strong>User Email:</strong> {user?.email}</p>
            <p><strong>Employees Found:</strong> {employees.length}</p>
            <p><strong>Current Week:</strong> {currentWeekLabel}</p>
            <p><strong>Site Options:</strong> {siteOptions.length > 0 ? siteOptions.join(', ') : 'None'}</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold">Show Employees Data</summary>
              <pre className="text-xs bg-white p-2 mt-1 overflow-auto max-h-40">
                {JSON.stringify(employees, null, 2)}
              </pre>
            </details>
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold">Show Hour Data</summary>
              <pre className="text-xs bg-white p-2 mt-1 overflow-auto max-h-40">
                {JSON.stringify(hourData, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}