import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import dayjs from "dayjs";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTranslation } from "react-i18next";
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function MyProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [workHistory, setWorkHistory] = useState([]);
  const [paidStatus, setPaidStatus] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [weekNotes, setWeekNotes] = useState({});
  const [submittingNote, setSubmittingNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterSite, setFilterSite] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const token = localStorage.getItem("token");

  // Funksion për toast notifications
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // Merr të dhënat e punonjësit
  useEffect(() => {
    if (!user?.employee_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/${user.employee_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setEmployee(res.data);
        // Merr komentet e ruajtura
        return axios.get(`https://capitalrise-cwcq.onrender.com/api/work-hours/notes/${user.employee_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(res => setWeekNotes(res.data || {}))
      .catch(() => setWeekNotes({}))
      .finally(() => setLoading(false));
  }, [user, token]);

  // Merr historikun e orëve të punës
  useEffect(() => {
    if (!user?.employee_id) return;
    
    axios.get(`https://capitalrise-cwcq.onrender.com/api/work-hours/structured/${user.employee_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setWorkHistory(res.data || {}))
      .catch(() => setWorkHistory({}));

    axios.get(`https://capitalrise-cwcq.onrender.com/api/payments/${user.employee_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const paidStatusObj = {};
        (res.data || []).forEach(p => { paidStatusObj[p.week_label || p.week] = p.is_paid ?? p.paid; });
        setPaidStatus(paidStatusObj);
      })
      .catch(() => setPaidStatus({}));
  }, [user, token]);

  // Merr attachments
  useEffect(() => {
    if (!user?.employee_id) return;
    
    axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/${user.employee_id}/attachments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAttachments(res.data))
      .catch(() => setAttachments([]));
  }, [user, token]);

  // Merr detyrat e përfunduara
  useEffect(() => {
    if (!user?.employee_id) return;
    
    // Përdor endpoint të ndryshëm për manager vs user
    const endpoint = user?.role === "manager" 
      ? `https://capitalrise-cwcq.onrender.com/api/tasks/manager/${user.employee_id}`
      : `https://capitalrise-cwcq.onrender.com/api/tasks?assignedTo=${user.employee_id}&status=completed`;
    
    axios.get(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        // Për manager, filtriro vetëm detyrat e përfunduara
        const tasksData = user?.role === "manager" 
          ? (res.data || []).filter(task => task.status === 'completed')
          : (res.data || []);
        setTasks(tasksData);
      })
      .catch(() => setTasks([]));
  }, [user, token]);

  // Funksion për ndryshimin e password-it
  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      showToast("Fjalëkalimet e reja nuk përputhen!", "error");
      return;
    }
    
    try {
      await axios.put(`https://capitalrise-cwcq.onrender.com/api/users/${user.id}/password`, {
        current_password: passwordData.current,
        new_password: passwordData.new
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast("Fjalëkalimi u ndryshua me sukses!", "success");
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      showToast("Gabim gjatë ndryshimit të fjalëkalimit!", "error");
    }
  };

  // Funksion për ngarkimin e dokumenteve
  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setUploadProgress(10);
        await axios.post(
          `https://capitalrise-cwcq.onrender.com/api/employees/${user.employee_id}/attachments`,
          {
            file_name: file.name,
            file_path: reader.result,
            uploaded_by: user.id
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
              }
            }
          }
        );
        setUploadProgress(0);
        
        // Rifresko attachments
        const res = await axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/${user.employee_id}/attachments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttachments(res.data);
        showToast("Dokumenti u ngarkua me sukses!", "success");
      } catch {
        setUploadProgress(0);
        showToast("Gabim gjatë ngarkimit të dokumentit!", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-500 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-blue-800 mb-4">
            Duke ngarkuar profilin tuaj...
          </h2>
          <p className="text-blue-600 text-lg max-w-md mx-auto">
            Ju lutem prisni ndërsa marrim informacionet e plota të profilit tuaj
          </p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Profili juaj</h2>
          <p className="text-blue-600">Nuk u gjetën të dhëna për profilin tuaj.</p>
        </div>
      </div>
    );
  }

  const {
    first_name, last_name, photo, email, phone, status, role, workplace,
    hourly_rate, label_type, qualification, dob, residence, nid, next_of_kin, next_of_kin_phone
  } = employee;

  const statusColor = status === "Aktiv"
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-red-100 text-red-700 border-red-200";

  function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("sq-AL", { year: "numeric", month: "long", day: "numeric" });
  }

  // Merr site-et aktuale të punonjësit nga workplace
  const employeeSites = workplace || [];
  const currentSiteColors = {};
  employeeSites.forEach((site, index) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
    currentSiteColors[site] = colors[index % colors.length];
  });

  // Përgatis një strukturë për të mbledhur të gjitha ditët e punuara me site dhe orë
  const workDays = {};
  Object.entries(workHistory).forEach(([weekLabel, days]) => {
    Object.entries(days).forEach(([dayName, val]) => {
      if (val && val.hours > 0 && val.site) {
        const [startStr] = weekLabel.split(' - ');
        const startDate = new Date(startStr);
        const dayNames = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
        const dayIdx = dayNames.indexOf(dayName);
        if (dayIdx !== -1) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + dayIdx);
          const key = date.toISOString().slice(0, 10);
          workDays[key] = workDays[key] || [];
          workDays[key].push({
            site: val.site,
            hours: val.hours,
            rate: val.rate || employee.hourly_rate,
          });
        }
      }
    });
  });

  // Për filtrim sipas site-it
  const filteredWorkDays = {};
  Object.entries(workDays).forEach(([date, entries]) => {
    filteredWorkDays[date] = filterSite
      ? entries.filter(e => e.site === filterSite)
      : entries;
  });

  // Përgatit të dhënat për grafikun e pagave
  const weeklyPayData = Object.entries(workHistory).map(([weekLabel, days]) => {
    let totalHours = 0;
    let rate = 0;
    Object.values(days).forEach(val => {
      totalHours += Number(val.hours || 0);
      rate = Number(val.rate || employee.hourly_rate || 0);
    });
    const gross = totalHours * rate;
    const net = gross * (employee.label_type === "NI" ? 0.7 : 0.8);
    
    return {
      week: weekLabel,
      gross: gross,
      net: net,
      hours: totalHours
    };
  });

  const barData = {
    labels: weeklyPayData.map(d => d.week),
    datasets: [
      {
        label: 'Paga Bruto (£)',
        data: weeklyPayData.map(d => d.gross),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      },
      {
        label: 'Paga Neto (£)',
        data: weeklyPayData.map(d => d.net),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2
      }
    ]
  };

  // Funksion për të marrë inicialet dhe ngjyrë nga emri
  function getInitials(name, surname) {
    return `${(name || '').charAt(0)}${(surname || '').charAt(0)}`.toUpperCase();
  }
  
  function getColorFromName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 70%, 80%)`;
  }

  // Funksion për ruajtjen e komenteve të javës
  const saveWeekNote = async (weekLabel, note) => {
    try {
      setSubmittingNote(weekLabel);
      await axios.post(`https://capitalrise-cwcq.onrender.com/api/work-hours/notes`, {
        employee_id: user.employee_id,
        week_label: weekLabel,
        note: note
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Komenti u ruajt me sukses!", "success");
      // Rifresko komentet pas ruajtjes
      const res = await axios.get(`https://capitalrise-cwcq.onrender.com/api/work-hours/notes/${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWeekNotes(res.data || {});
    } catch (error) {
      console.error('Error saving note:', error);
      showToast("Gabim gjatë ruajtjes së komentit!", "error");
    } finally {
      setSubmittingNote(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
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
      
      <div className="w-full px-4 md:px-8 py-6 md:py-10 min-h-screen">
        {/* Quick Stats Cards - Mobile Optimized - Light Colors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 text-blue-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-xs md:text-sm font-medium">Total Orë</p>
                <p className="text-lg md:text-3xl font-bold">
                  {Object.values(workHistory).reduce((total, days) => {
                    return total + Object.values(days).reduce((dayTotal, val) => {
                      return dayTotal + Number(val.hours || 0);
                    }, 0);
                  }, 0)}
                </p>
              </div>
              <div className="text-2xl md:text-4xl text-blue-500">⏰</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 text-cyan-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-600 text-xs md:text-sm font-medium">Paga Bruto</p>
                <p className="text-lg md:text-3xl font-bold">
                  £{Object.values(workHistory).reduce((total, days) => {
                    return total + Object.values(days).reduce((dayTotal, val) => {
                      return dayTotal + (Number(val.hours || 0) * Number(val.rate || hourly_rate || 0));
                    }, 0);
                  }, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-2xl md:text-4xl text-cyan-500">💰</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-600 text-xs md:text-sm font-medium">Site-t</p>
                <p className="text-lg md:text-3xl font-bold">{employeeSites.length}</p>
              </div>
              <div className="text-2xl md:text-4xl text-indigo-500">🏗️</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 text-sky-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sky-600 text-xs md:text-sm font-medium">Detyrat e Përfunduara</p>
                <p className="text-lg md:text-3xl font-bold">{tasks.length}</p>
              </div>
              <div className="text-2xl md:text-4xl text-sky-500">✅</div>
            </div>
          </div>
        </div>

        {/* Seksioni i detajeve të punonjësit - Light Blue Theme */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl md:rounded-2xl shadow-sm border border-blue-200 p-4 md:p-6 mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            {/* Avatar */}
            <div className="cursor-pointer hover:scale-105 transition-all duration-300">
              {photo ? (
                <img
                  src={photo}
                  alt="Foto"
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                />
              ) : (
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-2xl md:text-4xl font-extrabold shadow-lg border-4 border-blue-200"
                  style={{ background: getColorFromName(first_name + last_name), color: '#2d3748' }}
                >
                  {getInitials(first_name, last_name)}
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-4xl font-extrabold text-blue-800 mb-3 md:mb-4">
                {first_name} {last_name}
              </h2>
              <div className="flex flex-wrap gap-2 md:gap-4 mb-4 md:mb-8 justify-center md:justify-start">
                <span className={`px-2 md:px-4 py-1 rounded-full border text-xs md:text-base font-bold shadow-sm ${statusColor}`}>{status}</span>
                <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-indigo-400 px-2 md:px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">{role}</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 md:px-3 py-1 rounded-full border border-blue-200">{label_type}</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 md:px-3 py-1 rounded-full border border-indigo-200">{qualification}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-12 gap-y-3 md:gap-y-4 text-sm md:text-base mb-6 md:mb-8">
                <p><span className="font-bold text-blue-700">📧 Email:</span> {email || user?.email || <span className="italic text-blue-400">N/A</span>}</p>
                <p><span className="font-bold text-blue-700">📞 Tel:</span> {phone || <span className="italic text-blue-400">N/A</span>}</p>
                <p><span className="font-bold text-blue-700">🆔 NID:</span> {nid || <span className="italic text-blue-400">N/A</span>}</p>
                <p><span className="font-bold text-blue-700">🎂 Data lindjes:</span> {formatDate(dob)}</p>
                <p><span className="font-bold text-blue-700">🏠 Vendbanimi:</span> {residence || <span className="italic text-blue-400">N/A</span>}</p>
                <p><span className="font-bold text-blue-700">💷 Paga/Orë:</span>
                  <span className="text-blue-700 font-bold">
                    £{hourly_rate && !isNaN(Number(hourly_rate)) ? Number(hourly_rate).toFixed(2) : "0.00"}
                  </span>
                </p>
                <p><span className="font-bold text-blue-700">🏢 Vendet e punës:</span> {workplace?.join(", ") || <span className="italic text-blue-400">N/A</span>}</p>
                {user?.role === "manager" && (
                  <p><span className="font-bold text-blue-700">👥 Site-t që menaxhoni:</span> {workplace?.join(", ") || <span className="italic text-blue-400">N/A</span>}</p>
                )}
                <p><span className="font-bold text-blue-700">👨‍👩‍👧 Next of Kin:</span> {next_of_kin || <span className="italic text-blue-400">N/A</span>}</p>
                <p><span className="font-bold text-blue-700">👨‍👩‍👧 Next of Kin Tel:</span> {next_of_kin_phone || <span className="italic text-blue-400">N/A</span>}</p>
                <p><span className="font-bold text-blue-700">🎓 Kualifikimi:</span> {qualification || <span className="italic text-blue-400">N/A</span>}</p>
              </div>

              {/* Butona për ndryshimin e password-it - Light Blue Theme */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-6 mt-6 md:mt-10">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold shadow-sm hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 text-sm md:text-lg"
                >
                  🔐 Ndrysho Fjalëkalimin
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Kalendar i orëve të punës - Light Blue Theme */}
        <div className="w-full bg-gradient-to-br from-blue-50 to-white rounded-xl md:rounded-2xl shadow-sm border border-blue-200 p-4 md:p-8 mb-6 md:mb-10">
          <h3 className="text-xl md:text-2xl font-extrabold text-blue-800 mb-4 md:mb-6 flex items-center gap-2">📅 Kalendar i Orëve të Punës</h3>
          <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 mb-4 items-center">
            <label className="font-semibold text-blue-700 text-sm md:text-base">Filtro sipas site-it:</label>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="p-2 rounded-xl border-2 border-blue-200 text-sm md:text-base bg-white">
              <option value="">Të gjitha</option>
              {employeeSites.map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>
          <Calendar
            onClickDay={date => setSelectedDate(date)}
            tileContent={({ date }) => {
              const key = date.toISOString().slice(0, 10);
              if (filteredWorkDays[key] && filteredWorkDays[key].length > 0) {
                return (
                  <div className="flex gap-1 justify-center mt-1 animate-fade-in">
                    {filteredWorkDays[key].map((entry, idx) => (
                      <span
                        key={idx}
                        title={`Site: ${entry.site}\nOrë: ${entry.hours}\nPagesë: £${(entry.hours * entry.rate).toFixed(2)}`}
                        className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white shadow-lg transition-all duration-300 hover:scale-125"
                        style={{ 
                          background: currentSiteColors[entry.site] || '#4ecdc4', 
                          opacity: 0.9,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      />
                    ))}
                  </div>
                );
              }
              return null;
            }}
            className="border-2 border-blue-200 rounded-xl md:rounded-2xl shadow-xl w-full text-sm md:text-lg"
          />
          <div className="flex gap-2 md:gap-4 mt-4 md:mt-6 flex-wrap justify-center">
            {employeeSites.map((site) => (
              <div key={site} className="flex items-center gap-2 bg-white/80 rounded-xl px-3 md:px-4 py-2 shadow-md border border-blue-100">
                <span className="inline-block w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white shadow-md" style={{ background: currentSiteColors[site] }}></span>
                <span className="text-sm md:text-lg font-bold text-blue-800">{site}</span>
              </div>
            ))}
          </div>
          {/* Modal për detajet e ditës */}
          {selectedDate && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-8 min-w-[280px] md:min-w-[320px] max-w-md relative animate-fade-in">
                <button onClick={() => setSelectedDate(null)} className="absolute top-2 right-2 text-xl md:text-2xl text-gray-400 hover:text-red-500">&times;</button>
                <h4 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-blue-700">Detajet për {selectedDate.toLocaleDateString()}</h4>
                {filteredWorkDays[selectedDate.toISOString().slice(0, 10)]?.length ? (
                  <ul className="space-y-2 md:space-y-3">
                    {filteredWorkDays[selectedDate.toISOString().slice(0, 10)].map((entry, idx) => (
                      <li key={idx} className="flex flex-col gap-1 bg-blue-50 rounded-xl p-3 shadow">
                        <span><b>Site:</b> <span className="font-semibold" style={{ color: currentSiteColors[entry.site] }}>{entry.site}</span></span>
                        <span><b>Orë:</b> {entry.hours}</span>
                        <span><b>Pagesë:</b> £{(entry.hours * entry.rate).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">Nuk ka orë të regjistruara për këtë ditë.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grafik i pagave - Light Blue Theme */}
        <div className="w-full bg-gradient-to-br from-blue-50 to-white rounded-xl md:rounded-2xl shadow-sm border border-blue-200 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-xl md:text-2xl font-extrabold text-blue-800 mb-4 md:mb-6 flex items-center gap-2">📊 Grafik i Pagave për Javë</h3>
          <div className="w-full max-w-4xl mx-auto">
            <Bar data={barData} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Paga (£)'
                  }
                },
                x: {
                  title: {
                    display: true,
                    text: 'Java'
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Dokumentet e Mia - Light Blue Theme */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl md:rounded-2xl shadow-sm border border-blue-200 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">📄 Dokumentet e Mia</h3>
          
          {/* Upload dokumenti */}
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200">
            <input 
              type="file" 
              onChange={handleDocumentUpload} 
              className="w-full p-2 border-2 border-blue-200 rounded-xl bg-white"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                <div className="bg-gradient-to-r from-blue-400 to-indigo-400 h-3 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
            <p className="text-sm text-blue-600 mt-2">Mund të ngarkoni dokumente në formate: PDF, DOC, DOCX, JPG, PNG</p>
          </div>

          {attachments.length > 0 ? (
            <ul className="space-y-2">
              {attachments.map(doc => (
                <li key={doc.id} className="flex items-center gap-4 bg-blue-50 rounded-xl p-3 shadow">
                  <a
                    href={doc.file_path}
                    download={doc.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline font-semibold flex items-center gap-2"
                  >
                    <span>⬇️</span>{doc.file_name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">Nuk ka dokumente të ngarkuara.</p>
          )}
        </div>

        {/* Detyrat e Përfunduara */}
        <div className="bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">✅ Detyrat e Përfunduara</h3>
          {tasks.length > 0 ? (
            <div className="grid gap-3 md:gap-4">
              {tasks.slice(0, 10).map((task, index) => (
                <div key={task.id || index} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 md:p-6 shadow-lg border border-green-200">
                  <h4 className="text-lg md:text-xl font-bold text-blue-800 mb-2">{task.title}</h4>
                  <p className="text-gray-700 mb-3 text-sm md:text-base">{task.description}</p>
                  <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-bold border bg-green-100 text-green-700 border-green-200">
                      ✅ Përfunduar
                    </span>
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-bold border ${
                      task.priority === 'high' ? 'text-red-600 bg-red-100 border-red-200' :
                      task.priority === 'medium' ? 'text-yellow-600 bg-yellow-100 border-yellow-200' :
                      'text-green-600 bg-green-100 border-green-200'
                    }">
                      {task.priority === 'high' ? '🔴 E lartë' : task.priority === 'medium' ? '🟡 Mesatare' : '🟢 E ulët'}
                    </span>
                    {task.due_date && (
                      <span className="px-2 md:px-3 py-1 rounded-full text-xs font-bold border bg-blue-100 text-blue-700 border-blue-200">
                        📅 {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Nuk ka detyra të përfunduara.</p>
          )}
        </div>

        {/* Historiku i orëve të punës - Light Blue Theme */}
        <div className="w-full bg-gradient-to-br from-blue-50 to-white rounded-xl md:rounded-2xl shadow-sm border border-blue-200 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">📊 Historiku i Orëve të Punës</h3>
          <div className="space-y-3 md:space-y-4">
            {Object.entries(workHistory).map(([weekLabel, days]) => {
              const totalHours = Object.values(days).reduce((total, val) => total + Number(val.hours || 0), 0);
              const totalPay = totalHours * (hourly_rate || 0);
              const isPaid = paidStatus[weekLabel];
              
              return (
                <div key={weekLabel} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 md:p-4 border border-blue-200 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-blue-800 text-sm md:text-base">{weekLabel}</h4>
                      <div className="flex flex-wrap gap-2 md:gap-4 mt-1 text-xs md:text-sm">
                        <span className="text-blue-700">
                          <strong>Orët:</strong> {totalHours}
                        </span>
                        <span className="text-blue-700">
                          <strong>Paga:</strong> £{totalPay.toFixed(2)}
                        </span>
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                          {isPaid ? 'Paguar' : 'Pa paguar'}
                        </span>
                      </div>
                    </div>
                    {/* Koment për këtë javë */}
                    <div className="flex flex-col gap-1 ml-2 md:ml-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={weekNotes[weekLabel] || ''}
                          onChange={e => setWeekNotes(prev => ({ ...prev, [weekLabel]: e.target.value }))}
                          placeholder="Shkruaj koment për këtë javë..."
                          className="p-2 rounded-xl border-2 border-blue-200 text-xs md:text-sm flex-1 bg-white"
                        />
                        <button
                          onClick={() => saveWeekNote(weekLabel, weekNotes[weekLabel] || '')}
                          disabled={submittingNote === weekLabel}
                          className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white px-3 md:px-4 py-2 rounded-xl font-bold shadow-sm hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 text-xs md:text-sm disabled:opacity-50"
                        >
                          {submittingNote === weekLabel ? '⏳' : '💾'}
                        </button>
                      </div>
                      {weekNotes[weekLabel] && (
                        <span className="text-xs text-blue-700 italic">{weekNotes[weekLabel]}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal për ndryshimin e password-it - Light Blue Theme */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl md:rounded-2xl shadow-sm border border-blue-200 p-6 md:p-8 min-w-[320px] md:min-w-[400px] max-w-md relative animate-fade-in">
            <button 
              onClick={() => setShowPasswordModal(false)} 
              className="absolute top-4 right-4 text-xl md:text-2xl text-blue-400 hover:text-blue-600"
            >
              &times;
            </button>
            <h3 className="text-xl md:text-2xl font-bold text-blue-800 mb-6">🔐 Ndrysho Fjalëkalimin</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2">Fjalëkalimi Aktual</label>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={e => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                  className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 bg-white"
                  placeholder="Shkruaj fjalëkalimin aktual"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2">Fjalëkalimi i Ri</label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={e => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                  className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 bg-white"
                  placeholder="Shkruaj fjalëkalimin e ri"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2">Konfirmo Fjalëkalimin e Ri</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={e => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                  className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-300 bg-white"
                  placeholder="Konfirmo fjalëkalimin e ri"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={changePassword}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3 rounded-xl font-bold shadow-sm hover:from-indigo-600 hover:to-blue-600 transition-all duration-300"
                >
                  💾 Ruaj
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ current: '', new: '', confirm: '' });
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-400 to-indigo-400 text-white px-4 py-3 rounded-xl font-bold shadow-sm hover:from-indigo-600 hover:to-blue-600 transition-all duration-300"
                >
                  Anulo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 