import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import WorkHoursTable from "../components/WorkHoursTable";
import axios from "axios";

const getStartOfWeek = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
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
  const token = localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [saved, setSaved] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [paidStatus, setPaidStatus] = useState({});
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
    axios.get("https://building-system.onrender.com/api/employees", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        const emps = res.data || [];
        if (isAdmin) {
          console.log("EMPLOYEES FOR ADMIN:", emps);
          setEmployees(emps);
          return;
        }
        // MANAGER: filtro sipas kontratave të përbashkëta
        const ewRes = await axios.get("https://building-system.onrender.com/api/employee-workplaces", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allRelations = ewRes.data || [];
        const myContractIds = allRelations
          .filter(r => String(r.employee_id) === String(user.employee_id))
          .map(r => r.contract_id);
        const filteredEmps = emps.filter(emp => {
          if (String(emp.id) === String(user.employee_id)) return true;
          const empContracts = allRelations.filter(r => String(r.employee_id) === String(emp.id)).map(r => r.contract_id);
          return empContracts.some(cid => myContractIds.includes(cid));
        });
        console.log("EMPLOYEES FOR MANAGER:", filteredEmps);
        setEmployees(filteredEmps);
      })
      .catch(() => setEmployees([]));
  }, [user, token, isAdmin]);

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
      setExpandedWeeks([currentWeekLabel]);
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

  // Nda javën aktuale nga të tjerat
  const otherWeeks = sortedWeeks.filter(weekLabel => weekLabel !== currentWeekLabel);

  return (
    <div className="overflow-x-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {isManager ? "🕒 Plotëso Orët për Javën" : "📋 Pagesat e marra  "}: {user?.firstName} {user?.lastName}
      </h2>

      {isManager && employees.length === 0 && (
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded text-center font-semibold mb-6">
          Nuk keni asnjë punonjës aktiv të caktuar në site-t tuaj.<br/>
          {(() => {
            // Kontrollo nëse menaxheri ekziston si punonjës
            const selfExists = employees.some(emp => String(emp.id) === String(user.employee_id));
            if (!selfExists) {
              return <span className="block mt-2 text-red-600">Nuk jeni të regjistruar si punonjës në sistem. Kontaktoni administratorin për t'u shtuar si punonjës.<br/>Kontrollo në DB:<br/><code>SELECT * FROM employees WHERE id = '{user.employee_id}';</code></span>;
            }
            return null;
          })()}
        </div>
      )}

      {["user", "manager"].includes(user?.role) && (
        <div className="mt-12 bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-4 text-center">🧾 Orët e Mia të Pagura – {currentWeekLabel}</h3>
          {(() => {
            const myKey = `${currentWeekLabel}_${user.id}`;
            const isPaid = paidStatus[myKey];
            const userHours = hourData[user.id] || {};
            const thisWeek = userHours[currentWeekLabel] || {};

            if (!isPaid) {
              return <p className="text-gray-500 italic text-sm text-center">Orët për këtë javë nuk janë paguar ende.</p>;
            }

            const entries = Object.entries(thisWeek).filter(([key]) => key !== "hourlyRate");
            if (entries.length === 0) {
              return <p className="text-gray-500 italic text-sm text-center">Nuk ka të dhëna për këtë javë.</p>;
            }

            const rate = Number(thisWeek.hourlyRate || user.hourlyRate || 0);
            const labelType = user?.labelType || "UTR";

            return (
              <>
                <table className="w-full text-sm border mt-4 shadow rounded overflow-hidden">
                  <thead className="bg-blue-50 text-gray-800 font-semibold">
                    <tr>
                      <th className="p-2 border">📅 Dita</th>
                      <th className="p-2 border">📍 Vendi</th>
                      <th className="p-2 border">⏱ Orë</th>
                      <th className="p-2 border">💷 Bruto</th>
                      <th className="p-2 border">💰 Neto</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {entries.map(([day, entry]) => {
                      const hours = Number(entry.hours || 0);
                      const bruto = hours * rate;
                      const neto = bruto * (labelType === "UTR" ? 0.8 : 0.7);

                      return (
                        <tr key={day} className="hover:bg-gray-50 text-center">
                          <td className="p-2 border">{day}</td>
                          <td className="p-2 border">{entry.site || "-"}</td>
                          <td className="p-2 border">{hours}</td>
                          <td className="p-2 border text-green-700">£{bruto.toFixed(2)}</td>
                          <td className="p-2 border text-blue-700">£{neto.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-800 shadow-inner text-center">
                  <p><strong>🔢 Total orë:</strong> {entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0)}</p>
                  <p><strong>💷 Total bruto:</strong> £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate).toFixed(2)}</p>
                  <p><strong>💰 Total neto:</strong> £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate * (labelType === "UTR" ? 0.8 : 0.7)).toFixed(2)}</p>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {isManager && (
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
      )}

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
      )}

      {/* Manageri sheh të gjitha javët për punonjësit e tij */}
      {isManager && otherWeeks.map((weekLabel) => (
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
      )}
    </div>
  );
}