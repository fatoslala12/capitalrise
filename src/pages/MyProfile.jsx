import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import dayjs from "dayjs";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
ChartJS.register(ArcElement, Tooltip, Legend);

export default function MyProfile() {
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
  const [darkMode, setDarkMode] = useState(false);
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
    axios.get(`https://building-system.onrender.com/api/employees/${user.employee_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setEmployee(res.data);
        // Merr komentet e ruajtura
        return axios.get(`https://building-system.onrender.com/api/work-hours/notes/${user.employee_id}`, {
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
    
    axios.get(`https://building-system.onrender.com/api/work-hours/structured/${user.employee_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setWorkHistory(res.data || {}))
      .catch(() => setWorkHistory({}));

    axios.get(`https://building-system.onrender.com/api/payments/${user.employee_id}`, {
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
    
    axios.get(`https://building-system.onrender.com/api/employees/${user.employee_id}/attachments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAttachments(res.data))
      .catch(() => setAttachments([]));
  }, [user, token]);

  // Merr detyrat
  useEffect(() => {
    if (!user?.employee_id) return;
    
    axios.get(`https://building-system.onrender.com/api/tasks?assignedTo=${user.employee_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setTasks(res.data || []))
      .catch(() => setTasks([]));
  }, [user, token]);

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
            Duke ngarkuar profilin tuaj...
          </h2>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Ju lutem prisni ndërsa marrim informacionet e plota të profilit tuaj
          </p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Profili juaj</h2>
          <p className="text-gray-600">Nuk u gjetën të dhëna për profilin tuaj.</p>
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
      await axios.post(`https://building-system.onrender.com/api/work-hours/notes`, {
        employee_id: user.employee_id,
        week_label: weekLabel,
        note: note
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Komenti u ruajt me sukses!", "success");
      // Rifresko komentet pas ruajtjes
      const res = await axios.get(`https://building-system.onrender.com/api/work-hours/notes/${user.employee_id}`, {
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
    <div className={darkMode ? "dark bg-gray-900 min-h-screen" : "bg-gray-50 min-h-screen"}>
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
      
      {/* Buton dark mode toggle */}
      <button
        onClick={() => setDarkMode(v => !v)}
        className="fixed top-4 right-4 z-50 bg-gradient-to-r from-gray-700 to-blue-700 text-white px-3 py-2 rounded-full shadow hover:scale-105 transition-all text-sm md:text-base md:px-4 md:py-2"
        title={darkMode ? "Ndiz Light Mode" : "Ndiz Dark Mode"}
      >
        {darkMode ? "☀️" : "🌙"}
        <span className="hidden md:inline ml-1">{darkMode ? "Light" : "Dark"}</span>
      </button>
      
      <div className="w-full px-4 md:px-8 py-6 md:py-10 min-h-screen">
        {/* Quick Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm">Total Orë</p>
                <p className="text-lg md:text-3xl font-bold">
                  {Object.values(workHistory).reduce((total, days) => {
                    return total + Object.values(days).reduce((dayTotal, val) => {
                      return dayTotal + Number(val.hours || 0);
                    }, 0);
                  }, 0)}
                </p>
              </div>
              <div className="text-2xl md:text-4xl">⏰</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm">Paga Bruto</p>
                <p className="text-lg md:text-3xl font-bold">
                  £{Object.values(workHistory).reduce((total, days) => {
                    return total + Object.values(days).reduce((dayTotal, val) => {
                      return dayTotal + (Number(val.hours || 0) * Number(val.rate || hourly_rate || 0));
                    }, 0);
                  }, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-2xl md:text-4xl">💰</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs md:text-sm">Site-t</p>
                <p className="text-lg md:text-3xl font-bold">{employeeSites.length}</p>
              </div>
              <div className="text-2xl md:text-4xl">🏗️</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs md:text-sm">Detyrat</p>
                <p className="text-lg md:text-3xl font-bold">{tasks.length}</p>
              </div>
              <div className="text-2xl md:text-4xl">📋</div>
            </div>
          </div>
        </div>

        {/* Seksioni i detajeve të punonjësit */}
        <div className="bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            {/* Avatar */}
            <div className="cursor-pointer hover:scale-105 transition-all duration-300">
              {photo ? (
                <img
                  src={photo}
                  alt="Foto"
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-blue-200 shadow-xl"
                />
              ) : (
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-2xl md:text-4xl font-extrabold shadow-xl border-4 border-blue-200"
                  style={{ background: getColorFromName(first_name + last_name), color: '#2d3748' }}
                >
                  {getInitials(first_name, last_name)}
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-3 md:mb-4">
                {first_name} {last_name}
              </h2>
              <div className="flex flex-wrap gap-2 md:gap-4 mb-4 md:mb-8 justify-center md:justify-start">
                <span className={`px-2 md:px-4 py-1 rounded-full border text-xs md:text-base font-bold shadow-md ${statusColor}`}>{status}</span>
                <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-2 md:px-3 py-1 rounded-full shadow uppercase tracking-wide">{role}</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 md:px-3 py-1 rounded-full border border-blue-200">{label_type}</span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 md:px-3 py-1 rounded-full border border-purple-200">{qualification}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-12 gap-y-3 md:gap-y-4 text-sm md:text-base mb-6 md:mb-8">
                <p><span className="font-bold">📧 Email:</span> {email || <span className="italic text-gray-400">N/A</span>}</p>
                <p><span className="font-bold">📞 Tel:</span> {phone || <span className="italic text-gray-400">N/A</span>}</p>
                <p><span className="font-bold">🆔 NID:</span> {nid || <span className="italic text-gray-400">N/A</span>}</p>
                <p><span className="font-bold">🎂 Data lindjes:</span> {formatDate(dob)}</p>
                <p><span className="font-bold">🏠 Vendbanimi:</span> {residence || <span className="italic text-gray-400">N/A</span>}</p>
                <p><span className="font-bold">💷 Paga/Orë:</span>
                  <span className="text-green-700 font-bold">
                    £{hourly_rate && !isNaN(Number(hourly_rate)) ? Number(hourly_rate).toFixed(2) : "0.00"}
                  </span>
                </p>
                <p><span className="font-bold">🏢 Vendet e punës:</span> {workplace?.join(", ") || <span className="italic text-gray-400">N/A</span>}</p>
                <p><span className="font-bold">👨‍👩‍👧 Next of Kin:</span> {next_of_kin || <span className="italic text-gray-400">N/A</span>}</p>
                <p><span className="font-bold">👨‍👩‍👧 Next of Kin Tel:</span> {next_of_kin_phone || <span className="italic text-gray-400">N/A</span>}</p>
                <p><span className="font-bold">🎓 Kualifikimi:</span> {qualification || <span className="italic text-gray-400">N/A</span>}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dokumentet */}
        <div className="bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">📄 Dokumentet e Mia</h3>
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

        {/* Detyrat e Mia */}
        <div className="bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">📝 Detyrat e Mia</h3>
          {tasks.length > 0 ? (
            <div className="grid gap-3 md:gap-4">
              {tasks.slice(0, 5).map((task, index) => (
                <div key={task.id || index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 md:p-6 shadow-lg border border-blue-200">
                  <h4 className="text-lg md:text-xl font-bold text-blue-800 mb-2">{task.title}</h4>
                  <p className="text-gray-700 mb-3 text-sm md:text-base">{task.description}</p>
                  <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-bold border ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      task.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }">
                      {task.status === 'completed' ? '✅ Përfunduar' :
                       task.status === 'in_progress' ? '🔄 Në progres' :
                       task.status === 'cancelled' ? '❌ Anuluar' : '⏳ Në pritje'}
                    </span>
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-bold border ${
                      task.priority === 'high' ? 'text-red-600 bg-red-100 border-red-200' :
                      task.priority === 'medium' ? 'text-yellow-600 bg-yellow-100 border-yellow-200' :
                      'text-green-600 bg-green-100 border-green-200'
                    }">
                      {task.priority === 'high' ? '🔴 E lartë' : task.priority === 'medium' ? '🟡 Mesatare' : '🟢 E ulët'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Nuk ka detyra të caktuara.</p>
          )}
        </div>

        {/* Timeline i orëve të punës */}
        <div className="bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">🕒 Timeline i Orëve të Punës</h3>
          <div className="border-l-4 border-blue-200 pl-4 md:pl-6 space-y-4 md:space-y-8">
            {Object.entries(workHistory).slice(0, 5).map(([weekLabel, days], idx) => {
              let totalHours = 0;
              let siteMap = {};
              Object.values(days).forEach(val => {
                totalHours += Number(val.hours || 0);
                if (val.site) {
                  siteMap[val.site] = (siteMap[val.site] || 0) + Number(val.hours || 0);
                }
              });
              const isPaid = paidStatus[weekLabel];
              return (
                <div key={weekLabel} className="relative">
                  <div className="absolute -left-5 md:-left-7 top-2 w-3 h-3 md:w-4 md:h-4 rounded-full border-2" style={{ background: isPaid ? '#bbf7d0' : '#fecaca', borderColor: isPaid ? '#22c55e' : '#ef4444' }}></div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-blue-50 rounded-xl p-3 md:p-4 shadow border border-blue-100">
                    <div className="font-bold text-blue-700 text-sm md:text-base min-w-[140px] md:min-w-[160px]">{weekLabel}</div>
                    <div className="text-base md:text-lg font-semibold">Total orë: <span className="text-blue-900">{totalHours}</span></div>
                    <div className="flex flex-wrap gap-1 md:gap-2 items-center">
                      {Object.entries(siteMap).map(([site, hours]) => (
                        <span key={site} className="px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold shadow border" style={{ background: currentSiteColors[site], color: '#222' }} title={`Site: ${site}`}>
                          {site}: {hours} orë
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold shadow-md border ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {isPaid ? 'Paguar' : 'Pa paguar'}
                      </span>
                    </div>
                    {/* Koment për këtë javë */}
                    <div className="flex flex-col gap-1 ml-2 md:ml-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={weekNotes[weekLabel] || ''}
                          onChange={e => setWeekNotes(prev => ({ ...prev, [weekLabel]: e.target.value }))}
                          placeholder="Shkruaj koment për këtë javë..."
                          className="p-2 rounded-xl border-2 border-blue-200 text-xs md:text-sm flex-1"
                        />
                        <button
                          onClick={() => saveWeekNote(weekLabel, weekNotes[weekLabel] || '')}
                          disabled={submittingNote === weekLabel}
                          className="bg-gradient-to-r from-green-400 to-blue-400 text-white px-3 md:px-4 py-2 rounded-xl font-bold shadow hover:from-blue-600 hover:to-green-600 transition text-xs md:text-sm disabled:opacity-50"
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
    </div>
  );
} 