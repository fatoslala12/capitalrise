import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
ChartJS.register(ArcElement, Tooltip, Legend);

const employeePlaceholder = "https://via.placeholder.com/100";

export default function EmployeeDetails() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [editing, setEditing] = useState(false);
  const [workHistory, setWorkHistory] = useState([]);
  const [paidStatus, setPaidStatus] = useState({});
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");
  const [allEmployees, setAllEmployees] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [previewDocId, setPreviewDocId] = useState(null);
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterSite, setFilterSite] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchDoc, setSearchDoc] = useState('');
  const [weekNotes, setWeekNotes] = useState({});
  // Shto state për detyrat
  const [tasks, setTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");

  // Merr të gjithë punonjësit për workplace
  useEffect(() => {
    axios.get("https://building-system.onrender.com/api/employees", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAllEmployees(res.data))
      .catch(() => setAllEmployees([]));
  }, [token]);

  // Merr employee me workplace
  useEffect(() => {
    if (!id || allEmployees.length === 0) return;
    const emp = allEmployees.find(e => String(e.id) === String(id));
    if (emp) setEmployee(emp);
  }, [id, allEmployees]);

  // Merr historikun e orëve të punës nga backend
  useEffect(() => {
    if (!id) return;
    axios.get(`https://building-system.onrender.com/api/work-hours/structured/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        console.log('workHistory API result:', res.data);
        setWorkHistory(res.data || {});
      })
      .catch((err) => {
        console.log('workHistory API error:', err);
        setWorkHistory({});
      });
    axios.get(`https://building-system.onrender.com/api/payments/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const paidStatusObj = {};
        (res.data || []).forEach(p => { paidStatusObj[p.week_label || p.week] = p.is_paid ?? p.paid; });
        setPaidStatus(paidStatusObj);
      })
      .catch(() => setPaidStatus({}));
  }, [id, token]);

  // Merr të dhënat e user-it përkatës nga backend (bazuar në employee.id)
  useEffect(() => {
    if (!employee) return;
    axios.get(`https://building-system.onrender.com/api/users?employee_id=${employee.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setUser(res.data[0] || null))
      .catch(() => setUser(null));
  }, [employee, token]);

  // Merr attachments kur hapet faqja
  useEffect(() => {
    if (!id) return;
    axios.get(`https://building-system.onrender.com/api/employees/${id}/attachments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAttachments(res.data))
      .catch(() => setAttachments([]));
  }, [id, token]);

  // Merr detyrat e punonjësit
  useEffect(() => {
    if (!id) return;
    axios.get(`https://building-system.onrender.com/api/tasks?assignedTo=${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setTasks(res.data || []))
      .catch(() => setTasks([]));
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const toSnakeCase = (obj) => ({
    first_name: obj.first_name || obj.firstName,
    last_name: obj.last_name || obj.lastName,
    dob: obj.dob,
    pob: obj.pob,
    residence: obj.residence,
    nid: obj.nid,
    start_date: obj.start_date || obj.startDate,
    phone: obj.phone,
    next_of_kin: obj.next_of_kin || obj.nextOfKin,
    next_of_kin_phone: obj.next_of_kin_phone || obj.nextOfKinPhone,
    label_type: obj.label_type || obj.labelType,
    qualification: obj.qualification,
    status: obj.status,
    photo: obj.photo,
    hourly_rate: obj.hourly_rate || obj.hourlyRate,
    username: obj.username,
    documents: obj.documents
  });

  const handleSave = async () => {
    try {
      await axios.put(`https://building-system.onrender.com/api/employees/${id}`, toSnakeCase(employee), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditing(false);
      alert("Të dhënat u ruajtën me sukses.");
    } catch {
      alert("Gabim gjatë ruajtjes!");
    }
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setUploadProgress(10);
        await axios.post(
          `https://building-system.onrender.com/api/employees/${id}/attachments`,
          {
            file_name: file.name,
            file_path: reader.result,
            uploaded_by: user?.id || 1
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
        const res = await axios.get(`https://building-system.onrender.com/api/employees/${id}/attachments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttachments(res.data);
      } catch {
        setUploadProgress(0);
        alert("Gabim gjatë ngarkimit të dokumentit!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentDelete = async (attachmentId) => {
    if (!window.confirm("A jeni i sigurt që doni të fshini këtë dokument?")) return;
    try {
      await axios.delete(
        `https://building-system.onrender.com/api/employees/${id}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko attachments pas fshirjes
      const res = await axios.get(`https://building-system.onrender.com/api/employees/${id}/attachments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttachments(res.data);
    } catch {
      alert("Gabim gjatë fshirjes së dokumentit!");
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("A jeni i sigurt që doni të fshini këtë dokument?")) return;
    try {
      await axios.delete(
        `https://building-system.onrender.com/api/employees/${id}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko attachments pas fshirjes
      const res = await axios.get(`https://building-system.onrender.com/api/employees/${id}/attachments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttachments(res.data);
    } catch {
      alert("Gabim gjatë fshirjes së dokumentit!");
    }
  };

  if (!employee) {
    return <div className="p-8 text-center text-red-600 font-bold">Punonjësi nuk u gjet!</div>;
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

  // Gjej id-n e radhës nga allEmployees
  const currentIdx = allEmployees.findIndex(e => String(e.id) === String(id));
  const nextEmployee = currentIdx !== -1 && currentIdx < allEmployees.length - 1 ? allEmployees[currentIdx + 1] : null;

  // Ngjyrat për çdo site (mund të zgjerohet)
  const siteColors = {
    Harrow: 'red',
    Kukës: 'blue',
    Basingstoke: 'green',
    kot: 'orange',
    dsdsd: 'purple',
  };

  // Përgatis një strukturë për të mbledhur të gjitha ditët e punuara me site dhe orë
  const workDays = {};
  Object.entries(workHistory).forEach(([weekLabel, days]) => {
    Object.entries(days).forEach(([dayName, val]) => {
      if (val && val.hours > 0 && val.site) {
        // Gjej datën e saktë për këtë dayName dhe weekLabel
        // weekLabel është p.sh. "2025-07-06 - 2025-07-12"
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

  // Funksion për export në CSV
  function exportMonthToCSV() {
    if (!filteredWorkDays) return;
    const rows = [
      ["Data", "Site", "Orë", "Pagesë (£)"]
    ];
    Object.entries(filteredWorkDays).forEach(([date, entries]) => {
      entries.forEach(entry => {
        rows.push([
          date,
          entry.site,
          entry.hours,
          (entry.hours * entry.rate).toFixed(2)
        ]);
      });
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "work_hours_month.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Përgatit të dhënat për Pie chart (orë sipas site-ve)
  const siteHours = {};
  Object.values(workHistory).forEach(days => {
    Object.values(days).forEach(val => {
      if (val && val.hours > 0 && val.site) {
        siteHours[val.site] = (siteHours[val.site] || 0) + Number(val.hours);
      }
    });
  });
  const pieData = {
    labels: Object.keys(siteHours),
    datasets: [
      {
        data: Object.values(siteHours),
        backgroundColor: Object.keys(siteHours).map(site => getSiteColor(site)),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
        hoverBorderColor: '#3b82f6',
      },
    ],
  };

  // Funksion për të marrë inicialet dhe ngjyrë nga emri
  function getInitials(name, surname) {
    return `${(name || '').charAt(0)}${(surname || '').charAt(0)}`.toUpperCase();
  }
  function getColorFromName(name) {
    // Gjenero një ngjyrë të lehtë nga emri
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 70%, 80%)`;
  }

  // Ngjyrosje automatike për site-et
  function getSiteColor(site) {
    if (siteColors[site]) return siteColors[site];
    // Gjenero ngjyrë automatike nga emri
    let hash = 0;
    for (let i = 0; i < site.length; i++) hash = site.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 70%, 80%)`;
  }

  // Funksion për të marrë ngjyrën e prioritetit
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Funksion për të marrë ikonën e prioritetit
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  // Funksion për të marrë emrin e kategorisë
  const getCategoryName = (category) => {
    const categories = {
      'general': '📋 E Përgjithshme',
      'construction': '🏗️ Ndërtim',
      'maintenance': '🔧 Mirëmbajtje',
      'cleaning': '🧹 Pastrim',
      'safety': '🛡️ Siguri',
      'admin': '📝 Administrativ'
    };
    return categories[category] || category;
  };

  // Funksion për export PDF
  function exportProfileToPDF() {
    const doc = new jsPDF();
    doc.text(`Profili i punonjësit: ${first_name} ${last_name}`, 10, 10);
    doc.text(`Email: ${employee?.email || ''}`, 10, 20);
    doc.text(`NID: ${nid || ''}`, 10, 30);
    doc.text(`Vendbanimi: ${residence || ''}`, 10, 40);
    doc.text(`Paga/Orë: £${hourly_rate || ''}`, 10, 50);
    doc.text(`Vendet e punës: ${workplace?.join(', ') || ''}`, 10, 60);
    doc.text(`Kualifikimi: ${qualification || ''}`, 10, 70);
    doc.text('---', 10, 80);
    doc.text('Historiku i orëve të punës:', 10, 90);
    let y = 100;
    Object.entries(workHistory).forEach(([weekLabel, days]) => {
      doc.text(`${weekLabel}:`, 10, y);
      y += 7;
      Object.values(days).forEach(val => {
        if (val && val.hours > 0 && val.site) {
          doc.text(`  ${val.site}: ${val.hours} orë`, 12, y);
          y += 7;
        }
      });
      y += 2;
    });
    doc.save(`profili_${first_name}_${last_name}.pdf`);
  }

  // Funksion për shkarkim ZIP të dokumenteve
  async function downloadAllDocsZip() {
    const zip = new JSZip();
    for (const doc of attachments) {
      const response = await fetch(doc.file_path);
      const blob = await response.blob();
      zip.file(doc.file_name, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `dokumente_${first_name}_${last_name}.zip`;
    link.click();
  }

  return (
    <div className={darkMode ? "dark bg-gray-900 min-h-screen" : "bg-gray-50 min-h-screen"}>
      {/* Buton dark mode toggle */}
      <button
        onClick={() => setDarkMode(v => !v)}
        className="fixed top-6 right-8 z-50 bg-gradient-to-r from-gray-700 to-blue-700 text-white px-4 py-2 rounded-full shadow hover:scale-105 transition-all"
        title={darkMode ? "Ndiz Light Mode" : "Ndiz Dark Mode"}
      >
        {darkMode ? "☀️ Light" : "🌙 Dark"}
      </button>
      {/* Sticky header për emrin dhe statusin */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-b-3xl shadow-xl border-b border-blue-100 px-10 py-6 flex items-center gap-8 mb-10 animate-fade-in">
        {/* Avatar me iniciale ose foto */}
        {photo ? (
          <img
            src={photo}
            alt="Foto"
            className="w-20 h-20 rounded-full object-cover border-4 border-blue-200 shadow-xl"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-xl border-4 border-blue-200"
            style={{ background: getColorFromName(first_name + last_name), color: '#2d3748' }}
          >
            {getInitials(first_name, last_name)}
          </div>
        )}
        <div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-2 dark:text-white">
            {first_name} {last_name}
          </h2>
          <div className="flex gap-4 flex-wrap">
            <span className={`px-4 py-1 rounded-full border text-base font-bold shadow-md transition-all duration-200 hover:scale-105 ${statusColor}`}>{status}</span>
            <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-3 py-1 rounded-full shadow uppercase tracking-wide transition-all duration-200 hover:scale-105" title="Roli i punonjësit">{role}</span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200 transition-all duration-200 hover:scale-105" title="Lloji i kontratës">{label_type}</span>
            <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200 transition-all duration-200 hover:scale-105" title="Kualifikimi">{qualification}</span>
          </div>
        </div>
      </div>
      <div className="w-full px-8 py-10 min-h-screen">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100 p-10 mb-10 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-4">
                {editing ? (
                  <div className="flex gap-4">
                    <input
                      name="first_name"
                      value={employee.first_name}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl text-2xl font-bold focus:ring-2 focus:ring-blue-300 w-1/2"
                      placeholder="Emri"
                    />
                    <input
                      name="last_name"
                      value={employee.last_name}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl text-2xl font-bold focus:ring-2 focus:ring-blue-300 w-1/2"
                      placeholder="Mbiemri"
                    />
                  </div>
                ) : (
                  `${employee.first_name} ${employee.last_name}`
                )}
              </h2>
              <div className="flex flex-wrap gap-4 mb-8">
                <span className={`px-4 py-1 rounded-full border text-base font-bold shadow-md ${statusColor}`}>{status}</span>
                <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-3 py-1 rounded-full shadow uppercase tracking-wide">{role}</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">{label_type}</span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">{qualification}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-base mb-8">
                {editing ? (
                  <>
                    <input
                      name="email"
                      value={employee.email || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Email"
                    />
                    <input
                      name="phone"
                      value={employee.phone || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Tel"
                    />
                    <input
                      name="nid"
                      value={employee.nid || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="NID"
                    />
                    <input
                      name="dob"
                      type="date"
                      value={employee.dob ? employee.dob.slice(0, 10) : ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Data lindjes"
                    />
                    <input
                      name="residence"
                      value={employee.residence || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Vendbanimi"
                    />
                    <input
                      name="hourly_rate"
                      type="number"
                      value={employee.hourly_rate || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Paga/Orë"
                    />
                    <input
                      name="workplace"
                      value={Array.isArray(employee.workplace) ? employee.workplace.join(', ') : (employee.workplace || '')}
                      onChange={e => setEmployee(prev => ({
                        ...prev,
                        workplace: e.target.value.split(',').map(s => s.trim())
                      }))}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Vendet e punës (ndarë me ,)"
                    />
                    <input
                      name="next_of_kin"
                      value={employee.next_of_kin || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Next of Kin"
                    />
                    <input
                      name="next_of_kin_phone"
                      value={employee.next_of_kin_phone || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Next of Kin Tel"
                    />
                    <input
                      name="qualification"
                      value={employee.qualification || ""}
                      onChange={handleChange}
                      className="p-3 border-2 border-blue-200 rounded-xl w-full"
                      placeholder="Kualifikimi"
                    />
                  </>
                ) : (
                  <>
                    <p><span className="font-bold">📧 Email:</span> {employee?.email || user?.email || <span className="italic text-gray-400">N/A</span>}</p>
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
                  </>
                )}
              </div>
              <div className="flex gap-6 mt-10">
                <button
                  onClick={() => navigate('/admin/employees-list')}
                  className="bg-gradient-to-r from-gray-400 to-blue-400 text-white px-8 py-3 rounded-2xl font-bold shadow hover:from-blue-600 hover:to-gray-600 transition text-lg"
                >
                  ⬅️ Kthehu
                </button>
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-3 rounded-2xl font-bold shadow hover:from-blue-600 hover:to-green-600 transition text-lg"
                    >
                      💾 Ruaj
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="bg-gradient-to-r from-red-400 to-pink-500 text-white px-8 py-3 rounded-2xl font-bold shadow hover:from-pink-600 hover:to-red-600 transition text-lg"
                    >
                      Anulo
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-2xl font-bold text-lg shadow-xl transition-all"
                  >
                    ✏️ Edito
                  </button>
                )}
                <button
                  onClick={() => nextEmployee && navigate(`/admin/employee/${nextEmployee.id}`)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-2xl font-bold shadow hover:from-pink-600 hover:to-purple-600 transition text-lg disabled:opacity-50"
                  disabled={!nextEmployee}
                >
                  Next ➡️
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-6 mb-10">
          <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">📄 Dokumentet</h3>
          <div className="flex flex-wrap gap-4 mb-4 items-center">
            <input
              type="text"
              value={searchDoc}
              onChange={e => setSearchDoc(e.target.value)}
              placeholder="Kërko dokument..."
              className="p-2 rounded-xl border-2 border-blue-200"
            />
            <button
              onClick={exportProfileToPDF}
              className="bg-gradient-to-r from-purple-400 to-blue-400 text-white px-4 py-2 rounded-xl font-bold shadow hover:from-blue-600 hover:to-purple-600 transition"
            >
              ⬇️ Export PDF
            </button>
            <button
              onClick={downloadAllDocsZip}
              className="bg-gradient-to-r from-green-400 to-blue-400 text-white px-4 py-2 rounded-xl font-bold shadow hover:from-blue-600 hover:to-green-600 transition"
            >
              ⬇️ Shkarko të gjitha
            </button>
          </div>
          <input type="file" onChange={handleDocumentUpload} className="mb-4" />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
          <ul className="space-y-2">
            {attachments.filter(doc => doc.file_name.toLowerCase().includes(searchDoc.toLowerCase())).map(doc => {
              return (
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
                  <button
                    onClick={() => setPreviewDocId(previewDocId === doc.id ? null : doc.id)}
                    className="px-2 py-1 bg-gradient-to-r from-blue-200 to-purple-200 text-blue-900 rounded shadow border hover:from-purple-300 hover:to-blue-300 transition-all"
                  >
                    {previewDocId === doc.id ? "Mbyll Preview" : "Shfaq Preview"}
                  </button>
                  {previewDocId === doc.id && doc.file_name.match(/\.(pdf)$/i) ? (
                    <iframe src={doc.file_path} title={doc.file_name} className="w-24 h-16 rounded shadow border" />
                  ) : null}
                  {previewDocId === doc.id && doc.file_name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <img src={doc.file_path} alt={doc.file_name} className="w-16 h-16 object-cover rounded shadow border" />
                  ) : null}
                  <button
                    onClick={() => handleDeleteAttachment(doc.id)}
                    className="ml-auto px-3 py-1 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-lg shadow hover:from-pink-600 hover:to-red-600 transition-all"
                  >
                    🗑 Fshi
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="w-full bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-6 mb-10">
          <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">🕒 Historiku i Orëve të Punës</h3>
          <EmployeeWorkHistory workHistory={workHistory} paidStatus={paidStatus} employee={employee} />
        </div>

        {/* Seksioni i kalendarit të orëve të punës */}
        <div className="w-full bg-white/80 rounded-2xl shadow-2xl border-2 border-blue-200 p-8 mb-10 mt-10">
          <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-6 flex items-center gap-2">📅 Kalendar i Orëve të Punës</h3>
          <div className="flex flex-wrap gap-4 mb-4 items-center">
            <label className="font-semibold text-blue-700">Filtro sipas site-it:</label>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="p-2 rounded-xl border-2 border-blue-200">
              <option value="">Të gjitha</option>
              {Object.keys(siteColors).map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
            <button
              onClick={() => exportMonthToCSV()}
              className="ml-auto bg-gradient-to-r from-green-400 to-blue-400 text-white px-6 py-2 rounded-xl font-bold shadow hover:from-blue-600 hover:to-green-600 transition"
            >
              ⬇️ Export Muaji
            </button>
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
                        className="inline-block w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-300 hover:scale-125"
                        style={{ 
                          background: getSiteColor(entry.site), 
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
            className="border-2 border-blue-200 rounded-2xl shadow-xl w-full text-lg"
          />
          <div className="flex gap-4 mt-6 flex-wrap justify-center">
            {Object.entries(siteColors).map(([site, color]) => (
              <div key={site} className="flex items-center gap-2 bg-white/80 rounded-xl px-4 py-2 shadow-md border border-blue-100">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-white shadow-md" style={{ background: getSiteColor(site) }}></span>
                <span className="text-lg font-bold text-blue-800">{site}</span>
              </div>
            ))}
          </div>
          {/* Modal për detajet e ditës */}
          {selectedDate && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[320px] max-w-md relative animate-fade-in">
                <button onClick={() => setSelectedDate(null)} className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-red-500">&times;</button>
                <h4 className="text-xl font-bold mb-4 text-blue-700">Detajet për {selectedDate.toLocaleDateString()}</h4>
                {filteredWorkDays[selectedDate.toISOString().slice(0, 10)]?.length ? (
                  <ul className="space-y-3">
                    {filteredWorkDays[selectedDate.toISOString().slice(0, 10)].map((entry, idx) => (
                      <li key={idx} className="flex flex-col gap-1 bg-blue-50 rounded-xl p-3 shadow">
                        <span><b>Site:</b> <span className="font-semibold" style={{ color: siteColors[entry.site] }}>{entry.site}</span></span>
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

        {/* Timeline vertikal poshtë kalendarit */}
        <div className="w-full bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-6 mb-10 mt-10">
          <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">🕒 Timeline i Orëve të Punës (Javë)</h3>
          <div className="border-l-4 border-blue-200 pl-6 space-y-8">
            {Object.entries(workHistory).map(([weekLabel, days], idx) => {
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
                  <div className="absolute -left-7 top-2 w-4 h-4 rounded-full border-2" style={{ background: isPaid ? '#bbf7d0' : '#fecaca', borderColor: isPaid ? '#22c55e' : '#ef4444' }}></div>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 bg-blue-50 rounded-xl p-4 shadow border border-blue-100">
                    <div className="font-bold text-blue-700 min-w-[160px]">{weekLabel}</div>
                    <div className="text-lg font-semibold">Total orë: <span className="text-blue-900">{totalHours}</span></div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {Object.entries(siteMap).map(([site, hours]) => (
                        <span key={site} className="px-3 py-1 rounded-full text-sm font-bold shadow border" style={{ background: getSiteColor(site), color: '#222' }} title={`Site: ${site}`}>
                          {site}: {hours} orë
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md border ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {isPaid ? 'Paguar' : 'Pa paguar'}
                      </span>
                    </div>
                    {/* Koment/notes për këtë javë */}
                    <div className="flex flex-col gap-1 ml-4">
                      <input
                        type="text"
                        value={weekNotes[weekLabel] || ''}
                        onChange={e => setWeekNotes(prev => ({ ...prev, [weekLabel]: e.target.value }))}
                        placeholder="Shkruaj koment për këtë javë..."
                        className="p-2 rounded-xl border-2 border-blue-200 text-sm"
                      />
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

        {/* Pie chart për ndarjen e orëve sipas site-ve */}
        <div className="w-full bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-6 mb-10 mt-10 flex flex-col items-center">
          <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-6 flex items-center gap-2">📊 Ndarja e Orëve sipas Site-ve</h3>
          <div className="w-full max-w-md">
            <Pie data={pieData} options={{
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    font: {
                      size: 14,
                      weight: 'bold'
                    },
                    padding: 20
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Seksioni i Detyrave */}
        <div className="w-full bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-8 mb-10 mt-10">
          <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-6 flex items-center gap-2">📋 Detyrat e Mia</h3>
          
          {/* Filtra për detyrat */}
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <label className="font-semibold text-blue-700 text-lg">Filtro sipas statusit:</label>
            <select 
              value={taskStatusFilter} 
              onChange={e => setTaskStatusFilter(e.target.value)} 
              className="p-3 rounded-xl border-2 border-blue-200 text-lg"
            >
              <option value="all">Të gjitha</option>
              <option value="pending">⏳ Në pritje</option>
              <option value="in_progress">🔄 Në progres</option>
              <option value="completed">✅ Përfunduar</option>
              <option value="cancelled">❌ Anuluar</option>
            </select>
            
            <label className="font-semibold text-blue-700 text-lg ml-4">Filtro sipas prioritetit:</label>
            <select 
              value={taskPriorityFilter} 
              onChange={e => setTaskPriorityFilter(e.target.value)} 
              className="p-3 rounded-xl border-2 border-blue-200 text-lg"
            >
              <option value="all">Të gjitha</option>
              <option value="high">🔴 E lartë</option>
              <option value="medium">🟡 Mesatare</option>
              <option value="low">🟢 E ulët</option>
            </select>
          </div>

          {/* Lista e detyrave */}
          <div className="grid gap-4">
            {tasks
              .filter(task => taskStatusFilter === "all" || task.status === taskStatusFilter)
              .filter(task => taskPriorityFilter === "all" || task.priority === taskPriorityFilter)
              .map((task, index) => (
                <div key={task.id || index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Prioriteti dhe statusi */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getPriorityIcon(task.priority)}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'high' ? 'E lartë' : task.priority === 'medium' ? 'Mesatare' : 'E ulët'}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        task.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {task.status === 'completed' ? '✅ Përfunduar' :
                         task.status === 'in_progress' ? '🔄 Në progres' :
                         task.status === 'cancelled' ? '❌ Anuluar' : '⏳ Në pritje'}
                      </span>
                    </div>

                    {/* Detajet kryesore */}
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-blue-800 mb-2">{task.title}</h4>
                      <p className="text-gray-700 mb-3 text-lg">{task.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-base">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          <span className="font-semibold">Data:</span>
                          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                        </span>
                        
                        <span className="flex items-center gap-2">
                          <span className="text-lg">🏷️</span>
                          <span className="font-semibold">Kategoria:</span>
                          <span>{getCategoryName(task.category)}</span>
                        </span>
                        
                        {task.site && (
                          <span className="flex items-center gap-2">
                            <span className="text-lg">🏗️</span>
                            <span className="font-semibold">Site:</span>
                            <span className="px-2 py-1 rounded-full text-sm font-bold" style={{ background: getSiteColor(task.site), color: '#222' }}>
                              {task.site}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Butona e veprimeve */}
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <button 
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl font-bold shadow hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                      >
                        👁️ Shiko
                      </button>
                      <button 
                        onClick={() => navigate('/tasks')}
                        className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-xl font-bold shadow hover:from-green-600 hover:to-blue-600 transition-all duration-300"
                      >
                        📋 Të gjitha
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            
            {tasks.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h4 className="text-xl font-bold text-gray-600 mb-2">Nuk ka detyra të caktuara</h4>
                <p className="text-gray-500 text-lg">Ky punonjës nuk ka detyra të caktuara për momentin.</p>
                <button 
                  onClick={() => navigate('/tasks')}
                  className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                >
                  📋 Shiko të gjitha detyrat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeWorkHistory({ workHistory, paidStatus, employee }) {
  const weeks = Object.entries(workHistory); // [[weekLabel, {E hënë: {...}, ...}], ...]
  if (!weeks.length) {
    return <p className="text-sm text-gray-500 italic">Nuk ka orë të regjistruara për këtë punonjës.</p>;
  }

  return (
    <table className="w-full text-base border bg-white rounded-xl shadow">
      <thead className="bg-gradient-to-r from-blue-100 via-white to-purple-100">
        <tr>
          <th className="p-2 border">Java</th>
          <th className="p-2 border">Total Orë</th>
          <th className="p-2 border">Bruto (£)</th>
          <th className="p-2 border">Neto (£)</th>
          <th className="p-2 border">Sipas Site-ve</th>
          <th className="p-2 border">Statusi</th>
        </tr>
      </thead>
      <tbody>
        {weeks.map(([weekLabel, days], idx) => {
          let totalHours = 0;
          let siteMap = {};
          let rate = 0;
          Object.values(days).forEach(val => {
            totalHours += Number(val.hours || 0);
            rate = Number(val.rate || employee.hourly_rate || 0);
            if (val.site) {
              siteMap[val.site] = (siteMap[val.site] || 0) + Number(val.hours || 0);
            }
          });
          const gross = totalHours * rate;
          const net = gross * (employee.label_type === "NI" ? 0.7 : 0.8);
          const isPaid = paidStatus[weekLabel];
          const siteBreakdown = Object.entries(siteMap).map(([site, hours]) =>
            `${site}: ${hours} orë (£${(hours * rate).toFixed(2)})`
          ).join(", ");

          return (
            <tr key={idx} className="hover:bg-purple-50 transition-all">
              <td className="p-2 border">{weekLabel}</td>
              <td className="p-2 border">{totalHours}</td>
              <td className="p-2 border text-green-700 font-bold">£{gross.toFixed(2)}</td>
              <td className="p-2 border text-blue-700 font-bold">£{net.toFixed(2)}</td>
              <td className="p-2 border">{siteBreakdown}</td>
              <td className="p-2 border">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                  {isPaid ? "Paguar" : "Pa paguar"}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DataRow({ icon, label, value, valueClass = "" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className="font-semibold">{label}:</span>
      <span className={`ml-1 ${valueClass}`}>{value}</span>
    </div>
  );
}