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
import html2canvas from 'html2canvas';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchDoc, setSearchDoc] = useState('');
  const [weekNotes, setWeekNotes] = useState({});
  const [submittingNote, setSubmittingNote] = useState(null);
  // Shto state për detyrat
  const [tasks, setTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [availableSites, setAvailableSites] = useState([]);
  const [selectedWorkplaces, setSelectedWorkplaces] = useState([]);

  // Funksion për toast notifications
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  // Funksion për reset password
  const handleResetPassword = async () => {
    if (!user) {
      showToast("Punonjësi nuk ka llogari të krijuar!", "error");
      return;
    }

    try {
      await axios.post(`https://capitalrise-cwcq.onrender.com/api/users/reset-password`, {
        email: user.email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Fjalëkalimi u reset me sukses! Fjalëkalimi i ri është: 123456789", "success");
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast("Gabim gjatë resetimit të fjalëkalimit!", "error");
    }
  };

  // Merr të gjithë punonjësit për workplace
  useEffect(() => {
    setLoading(true);
    axios.get("https://capitalrise-cwcq.onrender.com/api/employees", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setAllEmployees(res.data);
        setLoading(false);
      })
      .catch(() => {
        setAllEmployees([]);
        setLoading(false);
      });
  }, [token]);

  // Merr employee me workplace
  useEffect(() => {
    if (!id || allEmployees.length === 0) return;
    setLoading(true);
    const emp = allEmployees.find(e => String(e.id) === String(id));
    if (emp) {
      setEmployee(emp);
      // Merr komentet e ruajtura për këtë punonjës
      axios.get(`https://capitalrise-cwcq.onrender.com/api/work-hours/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setWeekNotes(res.data || {}))
        .catch(() => setWeekNotes({}))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, allEmployees, token]);

  // Merr historikun e orëve të punës nga backend
  useEffect(() => {
    if (!id) return;
    axios.get(`https://capitalrise-cwcq.onrender.com/api/work-hours/structured/${id}`, {
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
    axios.get(`https://capitalrise-cwcq.onrender.com/api/payments/${id}`, {
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
    axios.get(`https://capitalrise-cwcq.onrender.com/api/users?employee_id=${employee.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setUser(res.data[0] || null))
      .catch(() => setUser(null));
  }, [employee, token]);

  // Merr attachments kur hapet faqja
  useEffect(() => {
    if (!id) return;
    axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/${id}/attachments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAttachments(res.data))
      .catch(() => setAttachments([]));
  }, [id, token]);

  // Merr detyrat e punonjësit
  useEffect(() => {
    if (!id) return;
    axios.get(`https://capitalrise-cwcq.onrender.com/api/tasks?assignedTo=${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setTasks(res.data || []))
      .catch(() => setTasks([]));
  }, [id, token]);

  // Merr available sites nga contracts (vetëm aktivë - "Ne progres")
  useEffect(() => {
    axios.get("https://capitalrise-cwcq.onrender.com/api/contracts", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        // Filtro vetëm kontratat me status "Ne progres"
        const activeContracts = res.data.filter(c => c.status === 'Ne progres');
        const sites = [...new Set(activeContracts.map(c => c.site_name).filter(Boolean))];
        setAvailableSites(sites);
        console.log(`[DEBUG] Available sites for workplace: ${sites.length} active sites from ${res.data.length} total contracts`);
      })
      .catch(() => setAvailableSites([]));
  }, [token]);

  // Initialize selectedWorkplaces when employee data loads
  useEffect(() => {
    if (employee?.workplace) {
      setSelectedWorkplaces(Array.isArray(employee.workplace) ? employee.workplace : []);
    }
  }, [employee]);

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
      const updatedEmployee = {
        ...toSnakeCase(employee),
        email: employee.email, // Include email for users table update
        workplace: selectedWorkplaces,
        updated_by: user?.id || 1
      };
      
      console.log('[DEBUG] Saving employee data:', updatedEmployee);
      
      const response = await axios.put(`https://capitalrise-cwcq.onrender.com/api/employees/${id}`, updatedEmployee, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[DEBUG] Save response:', response.data);
      
      // Update local state
      setEmployee(prev => ({ ...prev, workplace: selectedWorkplaces }));
      setEditing(false);
      showToast("Të dhënat u ruajtën me sukses!", "success");
    } catch (error) {
      console.error('[ERROR] Failed to save employee:', error);
      console.error('[ERROR] Error response:', error.response?.data);
      showToast(`Gabim gjatë ruajtjes: ${error.response?.data?.message || error.message}`, "error");
    }
  };

  // Handle workplace toggle
  const toggleWorkplace = (site) => {
    setSelectedWorkplaces(prev => {
      if (prev.includes(site)) {
        return prev.filter(s => s !== site);
      } else {
        return [...prev, site];
      }
    });
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setUploadProgress(10);
        await axios.post(
          `https://capitalrise-cwcq.onrender.com/api/employees/${id}/attachments`,
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
        const res = await axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/${id}/attachments`, {
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

  const handleDocumentDelete = async (attachmentId) => {
    if (!window.confirm("A jeni i sigurt që doni të fshini këtë dokument?")) return;
    try {
      await axios.delete(
        `https://capitalrise-cwcq.onrender.com/api/employees/${id}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko attachments pas fshirjes
      const res = await axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/${id}/attachments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttachments(res.data);
      showToast("Dokumenti u fshi me sukses!", "success");
    } catch {
      showToast("Gabim gjatë fshirjes së dokumentit!", "error");
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("A jeni i sigurt që doni të fshini këtë dokument?")) return;
    try {
      await axios.delete(
        `https://capitalrise-cwcq.onrender.com/api/employees/${id}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko attachments pas fshirjes
      const res = await axios.get(`https://capitalrise-cwcq.onrender.com/api/employees/${id}/attachments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttachments(res.data);
      showToast("Dokumenti u fshi me sukses!", "success");
    } catch {
      showToast("Gabim gjatë fshirjes së dokumentit!", "error");
    }
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
            Duke ngarkuar detajet e punonjësit...
          </h2>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Ju lutem prisni ndërsa marrim informacionet e plota të punonjësit nga databaza
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
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
            Duke ngarkuar detajet e punonjësit...
          </h2>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Ju lutem prisni ndërsa marrim informacionet e plota të punonjësit nga databaza
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    first_name, last_name, photo, email, phone, status, role, workplace,
    hourly_rate, label_type, qualification, dob, residence, nid, next_of_kin, next_of_kin_phone
  } = employee;

  const statusColor = status === "Aktiv"
    ? "bg-green-50 text-green-600 border-green-100"
    : "bg-red-50 text-red-600 border-red-100";

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
        backgroundColor: Object.keys(siteHours).map(site => {
          // Përdor ngjyra të buta për pie chart
          const softColors = ['#ffb3ba', '#baffc9', '#bae1ff', '#ffffba', '#ffb3d9', '#d4b3ff', '#b3ffd4', '#ffd4b3'];
          let hash = 0;
          for (let i = 0; i < site.length; i++) hash = site.charCodeAt(i) + ((hash << 5) - hash);
          return softColors[Math.abs(hash) % softColors.length];
        }),
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
      case 'high': return 'text-red-500 bg-red-50 border-red-100';
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-100';
      case 'low': return 'text-green-500 bg-green-50 border-green-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
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

  // Funksion për ruajtjen e komenteve të javës
  const saveWeekNote = async (weekLabel, note) => {
    try {
      setSubmittingNote(weekLabel);
      await axios.post(`https://capitalrise-cwcq.onrender.com/api/work-hours/notes`, {
        employee_id: id,
        week_label: weekLabel,
        note: note
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Komenti u ruajt me sukses!", "success");
      // Rifresko komentet pas ruajtjes
      const res = await axios.get(`https://capitalrise-cwcq.onrender.com/api/work-hours/notes/${id}`, {
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

  // Funksion për export PDF të gjithë faqes
  async function exportFullPageToPDF() {
    try {
      showToast("Duke krijuar raportin...", "info");
      
      // Krijo një div të përkohshëm për export
      const exportDiv = document.createElement('div');
      exportDiv.style.position = 'absolute';
      exportDiv.style.left = '-9999px';
      exportDiv.style.top = '0';
      exportDiv.style.width = '1200px';
      exportDiv.style.backgroundColor = 'white';
      exportDiv.style.padding = '20px';
      exportDiv.style.fontFamily = 'Arial, sans-serif';
      exportDiv.style.color = '#000';
      
      // Kopjo të gjithë përmbajtjen e faqes
      const mainContent = document.querySelector('.w-full.px-4.md\\:px-8.py-6.md\\:py-10');
      if (mainContent) {
        // Krijo një kopje të përmbajtjes me stilizim të plotë
        const contentClone = mainContent.cloneNode(true);
        
        // Pastro elementet që nuk duan të shfaqen në export
        const elementsToRemove = contentClone.querySelectorAll('button, input, select, .fixed');
        elementsToRemove.forEach(el => el.remove());
        
        // Shto header për raportin
        const header = document.createElement('div');
        header.innerHTML = `
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px;">
            <h1 style="color: #1e40af; font-size: 32px; margin-bottom: 10px; font-weight: bold;">Alban Construction</h1>
            <h2 style="color: #7c3aed; font-size: 24px; margin-bottom: 10px;">Raport i Detajuar i Punonjësit</h2>
            <p style="color: #666; font-size: 16px;">Gjeneruar më: ${new Date().toLocaleDateString('sq-AL')}</p>
          </div>
        `;
        
        exportDiv.appendChild(header);
        exportDiv.appendChild(contentClone);
      }
      
      document.body.appendChild(exportDiv);
      
      // Përdor html2canvas për të kapur imazhin
      const canvas = await html2canvas(exportDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1200,
        height: exportDiv.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });
      
      // Krijo PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`raport_i_plote_${first_name}_${last_name}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      // Pastro
      document.body.removeChild(exportDiv);
      showToast("Raporti u eksportua me sukses!", "success");
      
    } catch (error) {
      console.error('Export error:', error);
      showToast("Gabim gjatë eksportit!", "error");
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
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
      
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-10 min-h-screen">
        {/* Quick Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-6 mb-4 sm:mb-6 lg:mb-10">
          <div className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-6 shadow-md lg:shadow-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-blue-700 text-xs sm:text-sm lg:text-base font-medium truncate">Total Orë</p>
                <p className="text-base sm:text-lg lg:text-3xl font-bold truncate">
                  {Object.values(workHistory).reduce((total, days) => {
                    return total + Object.values(days).reduce((dayTotal, val) => {
                      return dayTotal + Number(val.hours || 0);
                    }, 0);
                  }, 0)}
                </p>
              </div>
              <div className="text-lg sm:text-2xl lg:text-4xl ml-2 flex-shrink-0">⏰</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-6 shadow-md lg:shadow-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-green-700 text-xs sm:text-sm lg:text-base font-medium truncate">Paga Bruto</p>
                <p className="text-base sm:text-lg lg:text-3xl font-bold truncate">
                  £{Object.values(workHistory).reduce((total, days) => {
                    return total + Object.values(days).reduce((dayTotal, val) => {
                      return dayTotal + (Number(val.hours || 0) * Number(val.rate || hourly_rate || 0));
                    }, 0);
                  }, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-lg sm:text-2xl lg:text-4xl ml-2 flex-shrink-0">💰</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-6 shadow-md lg:shadow-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-purple-700 text-xs sm:text-sm lg:text-base font-medium truncate">Site-t</p>
                <p className="text-base sm:text-lg lg:text-3xl font-bold truncate">{employeeSites.length}</p>
              </div>
              <div className="text-lg sm:text-2xl lg:text-4xl ml-2 flex-shrink-0">🏗️</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-6 shadow-md lg:shadow-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-orange-700 text-xs sm:text-sm lg:text-base font-medium truncate">Detyrat</p>
                <p className="text-base sm:text-lg lg:text-3xl font-bold truncate">
                  {tasks.filter(task => task.assignedTo === parseInt(id) || task.assigned_to === parseInt(id)).length}
                </p>
              </div>
              <div className="text-lg sm:text-2xl lg:text-4xl ml-2 flex-shrink-0">📋</div>
            </div>
          </div>
        </div>
        {/* Seksioni i detajeve të punonjësit me imazh klikueshëm */}
        <div className="bg-white/80 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg lg:shadow-xl border border-blue-100 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-10">
          <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 lg:gap-8">
            {/* Avatar me iniciale ose foto - clickable për ndryshim */}
            <div 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      try {
                        await axios.put(`https://capitalrise-cwcq.onrender.com/api/employees/${id}`, {
                          ...toSnakeCase(employee),
                          photo: reader.result
                        }, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        setEmployee(prev => ({ ...prev, photo: reader.result }));
                        showToast("Fotoja u ndryshua me sukses!", "success");
                      } catch {
                        showToast("Gabim gjatë ndryshimit të fotos!", "error");
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="cursor-pointer hover:scale-105 transition-all duration-300"
              title="Kliko për të ndryshuar foton"
            >
              {photo ? (
                <img
                  src={photo}
                  alt="Foto"
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full object-cover border-2 sm:border-4 border-blue-200 shadow-md lg:shadow-xl"
                />
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full flex items-center justify-center text-lg sm:text-xl md:text-2xl lg:text-4xl font-extrabold shadow-md lg:shadow-xl border-2 sm:border-4 border-blue-200"
                  style={{ background: getColorFromName(first_name + last_name), color: '#2d3748' }}
                >
                  {getInitials(first_name, last_name)}
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2 sm:mb-3 md:mb-4">
                {editing ? (
                  <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                    <input
                      name="first_name"
                      value={employee.first_name}
                      onChange={handleChange}
                      className="p-2 md:p-3 border-2 border-blue-200 rounded-xl text-lg md:text-2xl font-bold focus:ring-2 focus:ring-blue-300 w-full md:w-1/2 text-gray-800"
                      placeholder="Emri"
                    />
                    <input
                      name="last_name"
                      value={employee.last_name}
                      onChange={handleChange}
                      className="p-2 md:p-3 border-2 border-blue-200 rounded-xl text-lg md:text-2xl font-bold focus:ring-2 focus:ring-blue-300 w-full md:w-1/2 text-gray-800"
                      placeholder="Mbiemri"
                    />
                  </div>
                ) : (
                  `${employee.first_name} ${employee.last_name}`
                )}
              </h2>
              <div className="flex flex-wrap gap-1 sm:gap-2 md:gap-3 lg:gap-4 mb-3 sm:mb-4 md:mb-6 lg:mb-8 justify-center md:justify-start">
                <span className={`px-2 sm:px-3 md:px-4 py-1 rounded-full border text-xs sm:text-sm md:text-base font-bold shadow-md ${statusColor}`}>{status}</span>
                <span className="text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-300 to-purple-300 px-2 sm:px-3 md:px-4 py-1 rounded-full shadow uppercase tracking-wide">{role}</span>
                <span className="text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 px-2 sm:px-3 md:px-4 py-1 rounded-full border border-blue-100">{label_type}</span>
                <span className="text-xs sm:text-sm font-semibold text-purple-600 bg-purple-50 px-2 sm:px-3 md:px-4 py-1 rounded-full border border-purple-100">{qualification}</span>
              </div>
              {editing ? (
                /* Modern Edit Form */
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-blue-200 shadow-lg lg:shadow-xl mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800 mb-4 sm:mb-6 flex items-center gap-2">
                    ✏️ Edito të dhënat e punonjësit
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Left Column - Personal Info */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-700 border-b border-gray-200 pb-2">📋 Informacione Personale</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">📧 Email</label>
                          <input
                            name="email"
                            value={employee.email || ""}
                            onChange={handleChange}
                            className="w-full p-2 sm:p-3 border-2 border-blue-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-sm sm:text-base"
                            placeholder="Email adresa"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">📞 Telefoni</label>
                          <input
                            name="phone"
                            value={employee.phone || ""}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                            placeholder="Numri i telefonit"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">🆔 NID</label>
                          <input
                            name="nid"
                            value={employee.nid || ""}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                            placeholder="Numri i identitetit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">🎂 Data e lindjes</label>
                          <input
                            name="dob"
                            type="date"
                            value={employee.dob ? employee.dob.slice(0, 10) : ""}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">🏠 Vendbanimi</label>
                        <input
                          name="residence"
                          value={employee.residence || ""}
                          onChange={handleChange}
                          className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                          placeholder="Adresa e banimit"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">👨‍👩‍👧 Next of Kin</label>
                          <input
                            name="next_of_kin"
                            value={employee.next_of_kin || ""}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                            placeholder="Personi më i afërt"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">📞 Next of Kin Tel</label>
                          <input
                            name="next_of_kin_phone"
                            value={employee.next_of_kin_phone || ""}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                            placeholder="Telefoni i personit më të afërt"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Work Info */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-700 border-b border-gray-200 pb-2">💼 Informacione Pune</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">💷 Paga/Orë (£)</label>
                          <input
                            name="hourly_rate"
                            type="number"
                            step="0.01"
                            value={employee.hourly_rate || ""}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">🎓 Kualifikimi</label>
                          <input
                            name="qualification"
                            value={employee.qualification || ""}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                            placeholder="Kualifikimi profesional"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">📊 Statusi</label>
                          <select
                            name="status"
                            value={employee.status || "Aktiv"}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all bg-white"
                          >
                            <option value="Aktiv">✅ Aktiv</option>
                            <option value="Pasiv">❌ Pasiv</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">🏷️ Tipi</label>
                          <select
                            name="label_type"
                            value={employee.label_type || "UTR"}
                            onChange={handleChange}
                            className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all bg-white"
                          >
                            <option value="UTR">🏢 UTR (80% net)</option>
                            <option value="NI">👷 NI (70% net)</option>
                          </select>
                        </div>
                      </div>

                      {/* Site Management */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">🏗️ Vendet e Punës</label>
                        <div className="bg-white rounded-xl border-2 border-blue-200 p-4 max-h-40 overflow-y-auto">
                          <div className="space-y-2">
                            {availableSites.map(site => (
                              <label key={site} className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-all">
                                <input
                                  type="checkbox"
                                  checked={selectedWorkplaces.includes(site)}
                                  onChange={() => toggleWorkplace(site)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">{site}</span>
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{ backgroundColor: currentSiteColors[site] || '#6B7280' }}
                                ></div>
                              </label>
                            ))}
                          </div>
                          {selectedWorkplaces.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-2">Të zgjedhur ({selectedWorkplaces.length}):</p>
                              <div className="flex flex-wrap gap-1">
                                {selectedWorkplaces.map(site => (
                                  <span
                                    key={site}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200"
                                  >
                                    {site}
                                    <button
                                      onClick={() => toggleWorkplace(site)}
                                      className="text-blue-600 hover:text-blue-800 font-bold"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-base mb-8">
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
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-6 mt-4 sm:mt-6 lg:mt-10">
                <button
                  onClick={() => navigate('/admin/employees-list')}
                  className="bg-gradient-to-r from-gray-400 to-blue-400 text-white px-3 sm:px-4 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-bold shadow hover:from-blue-600 hover:to-gray-600 transition text-sm sm:text-base lg:text-lg"
                >
                  ⬅️ Kthehu
                </button>
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 px-3 sm:px-4 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-bold shadow hover:from-green-200 hover:to-blue-200 transition text-sm sm:text-base lg:text-lg border border-green-200"
                    >
                      💾 Ruaj
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 px-3 sm:px-4 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-bold shadow hover:from-red-200 hover:to-pink-200 transition text-sm sm:text-base lg:text-lg border border-red-200"
                    >
                      Anulo
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-gradient-to-r from-purple-400 to-blue-400 text-white px-3 sm:px-4 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-bold text-sm sm:text-base lg:text-lg shadow hover:from-blue-600 hover:to-purple-600 transition"
                  >
                    ✏️ Edito
                  </button>
                )}
                <button
                  onClick={handleResetPassword}
                  disabled={!user}
                  className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 px-3 sm:px-4 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-bold text-sm sm:text-base lg:text-lg shadow hover:from-red-200 hover:to-pink-200 transition disabled:opacity-50 disabled:cursor-not-allowed border border-red-200"
                  title={!user ? "Punonjësi nuk ka llogari të krijuar" : "Reset fjalëkalimin e punonjësit"}
                >
                  🔒 Reset Password
                </button>
                <button
                  onClick={() => nextEmployee && navigate(`/admin/employee/${nextEmployee.id}`)}
                  className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 px-3 sm:px-4 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-bold shadow hover:from-green-200 hover:to-blue-200 transition text-sm sm:text-base lg:text-lg disabled:opacity-50 border border-green-200"
                  disabled={!nextEmployee}
                >
                  Next ➡️
                </button>
                <button
                  onClick={() => {
                    exportFullPageToPDF();
                  }}
                  className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 px-3 sm:px-4 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-bold shadow hover:from-yellow-200 hover:to-orange-200 transition text-sm sm:text-base lg:text-lg border border-yellow-200"
                >
                  📊 Export Raport i Plotë
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg lg:shadow-xl border border-blue-100 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-10">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-blue-800 mb-3 sm:mb-4 flex items-center gap-2">📄 Dokumentet</h3>
          <div className="flex flex-col md:flex-row flex-wrap gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 items-center">
            <input
              type="text"
              value={searchDoc}
              onChange={e => setSearchDoc(e.target.value)}
              placeholder="Kërko dokument..."
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border-2 border-blue-200 w-full md:w-auto text-sm sm:text-base"
            />
            <button
              onClick={exportProfileToPDF}
              className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold shadow hover:from-purple-200 hover:to-blue-200 transition text-xs sm:text-sm lg:text-base border border-purple-200"
            >
              ⬇️ Export PDF
            </button>
            <button
              onClick={downloadAllDocsZip}
              className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold shadow hover:from-green-200 hover:to-blue-200 transition text-xs sm:text-sm lg:text-base border border-green-200"
            >
              ⬇️ Shkarko të gjitha
            </button>
          </div>
          <input type="file" onChange={handleDocumentUpload} className="mb-4 w-full" />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
          <ul className="space-y-2">
            {attachments.filter(doc => doc.file_name.toLowerCase().includes(searchDoc.toLowerCase())).map(doc => {
              return (
                <li key={doc.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 bg-blue-50 rounded-xl p-3 shadow">
                  <a
                    href={doc.file_path}
                    download={doc.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline font-semibold flex items-center gap-2 text-sm md:text-base"
                  >
                    <span>⬇️</span>{doc.file_name}
                  </a>
                  <button
                    onClick={() => setPreviewDocId(previewDocId === doc.id ? null : doc.id)}
                    className="px-2 py-1 bg-gradient-to-r from-blue-200 to-purple-200 text-blue-900 rounded shadow border hover:from-purple-300 hover:to-blue-300 transition-all text-xs md:text-sm"
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
                    className="ml-auto px-3 py-1 bg-gradient-to-r from-red-100 to-pink-100 text-red-800 rounded-lg shadow hover:from-red-200 hover:to-pink-200 transition-all text-xs md:text-sm border border-red-200"
                  >
                    🗑 Fshi
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="w-full bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">🕒 Historiku i Orëve të Punës</h3>
          <div className="overflow-x-auto">
            <EmployeeWorkHistory workHistory={workHistory} paidStatus={paidStatus} employee={employee} />
          </div>
        </div>

        {/* Seksioni i kalendarit të orëve të punës */}
        <div className="w-full bg-white/80 rounded-xl md:rounded-2xl shadow-2xl border-2 border-blue-200 p-4 md:p-8 mb-6 md:mb-10 mt-6 md:mt-10">
          <h3 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-4 md:mb-6 flex items-center gap-2">📅 Kalendar i Orëve të Punës</h3>
          <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 mb-4 items-center">
            <label className="font-semibold text-blue-700 text-sm md:text-base">Filtro sipas site-it:</label>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="p-2 rounded-xl border-2 border-blue-200 text-sm md:text-base">
              <option value="">Të gjitha</option>
              {employeeSites.map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
            <button
              onClick={() => exportMonthToCSV()}
              className="ml-auto bg-gradient-to-r from-green-400 to-blue-400 text-white px-4 md:px-6 py-2 rounded-xl font-bold shadow hover:from-blue-600 hover:to-green-600 transition text-sm md:text-base"
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
                        className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white shadow-lg transition-all duration-300 hover:scale-125"
                        style={{ 
                          background: currentSiteColors[entry.site] || getSiteColor(entry.site), 
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
        <div className="w-full bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10 mt-6 md:mt-10">
          <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">🕒 Timeline i Orëve të Punës (Javë)</h3>
          <div className="border-l-4 border-blue-200 pl-4 md:pl-6 space-y-4 md:space-y-8">
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
                  <div className="absolute -left-5 md:-left-7 top-2 w-3 h-3 md:w-4 md:h-4 rounded-full border-2" style={{ background: isPaid ? '#bbf7d0' : '#fecaca', borderColor: isPaid ? '#22c55e' : '#ef4444' }}></div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-blue-50 rounded-xl p-3 md:p-4 shadow border border-blue-100">
                    <div className="font-bold text-blue-700 text-sm md:text-base min-w-[140px] md:min-w-[160px]">{weekLabel}</div>
                    <div className="text-base md:text-lg font-semibold">Total orë: <span className="text-blue-900">{totalHours}</span></div>
                    <div className="flex flex-wrap gap-1 md:gap-2 items-center">
                      {Object.entries(siteMap).map(([site, hours]) => (
                        <span key={site} className="px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold shadow border" style={{ background: currentSiteColors[site] || getSiteColor(site), color: '#222' }} title={`Site: ${site}`}>
                          {site}: {hours} orë
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold shadow-md border ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {isPaid ? 'Paguar' : 'Pa paguar'}
                      </span>
                    </div>
                    {/* Koment/notes për këtë javë */}
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

        {/* Pie chart për ndarjen e orëve sipas site-ve */}
        <div className="w-full bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 mb-6 md:mb-10 mt-6 md:mt-10 flex flex-col items-center">
          <h3 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-4 md:mb-6 flex items-center gap-2">📊 Ndarja e Orëve sipas Site-ve</h3>
          <div className="w-full max-w-sm md:max-w-md">
            <Pie data={pieData} options={{
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    font: {
                      size: 12,
                      weight: 'bold'
                    },
                    padding: 15
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Seksioni i Detyrave */}
        <div className="w-full bg-white/80 rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-8 mb-6 md:mb-10 mt-6 md:mt-10">
          <h3 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 mb-4 md:mb-6 flex items-center gap-2">📋 Detyrat e Mia</h3>
          
          {/* Filtra për detyrat */}
          <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 mb-4 md:mb-6 items-center">
            <label className="font-semibold text-blue-700 text-sm md:text-lg">Filtro sipas statusit:</label>
            <select 
              value={taskStatusFilter} 
              onChange={e => setTaskStatusFilter(e.target.value)} 
              className="p-2 md:p-3 rounded-xl border-2 border-blue-200 text-sm md:text-lg"
            >
              <option value="all">Të gjitha</option>
              <option value="pending">⏳ Në pritje</option>
              <option value="in_progress">🔄 Në progres</option>
              <option value="completed">✅ Përfunduar</option>
              <option value="cancelled">❌ Anuluar</option>
            </select>
            
            <label className="font-semibold text-blue-700 text-sm md:text-lg md:ml-4">Filtro sipas prioritetit:</label>
            <select 
              value={taskPriorityFilter} 
              onChange={e => setTaskPriorityFilter(e.target.value)} 
              className="p-2 md:p-3 rounded-xl border-2 border-blue-200 text-sm md:text-lg"
            >
              <option value="all">Të gjitha</option>
              <option value="high">🔴 E lartë</option>
              <option value="medium">🟡 Mesatare</option>
              <option value="low">🟢 E ulët</option>
            </select>
          </div>

          {/* Lista e detyrave */}
          <div className="grid gap-3 md:gap-4">
            {tasks
              .filter(task => task.assignedTo === parseInt(id) || task.assigned_to === parseInt(id))
              .filter(task => taskStatusFilter === "all" || task.status === taskStatusFilter)
              .filter(task => taskPriorityFilter === "all" || task.priority === taskPriorityFilter)
              .map((task, index) => (
                <div key={task.id || index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 md:p-6 shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                    {/* Prioriteti dhe statusi */}
                    <div className="flex flex-col gap-2 min-w-[180px] md:min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-xl md:text-2xl">{getPriorityIcon(task.priority)}</span>
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold border ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'high' ? 'E lartë' : task.priority === 'medium' ? 'Mesatare' : 'E ulët'}
                        </span>
                      </div>
                      <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold border ${
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
                      <h4 className="text-lg md:text-xl font-bold text-blue-800 mb-2">{task.title}</h4>
                      <p className="text-gray-700 mb-3 text-sm md:text-lg">{task.description}</p>
                      
                      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-4 text-sm md:text-base">
                        <span className="flex items-center gap-2">
                          <span className="text-base md:text-lg">📅</span>
                          <span className="font-semibold">Data:</span>
                          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                        </span>
                        
                        <span className="flex items-center gap-2">
                          <span className="text-base md:text-lg">🏷️</span>
                          <span className="font-semibold">Kategoria:</span>
                          <span>{getCategoryName(task.category)}</span>
                        </span>
                        
                        {task.site && (
                          <span className="flex items-center gap-2">
                            <span className="text-base md:text-lg">🏗️</span>
                            <span className="font-semibold">Site:</span>
                            <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: getSiteColor(task.site), color: '#222' }}>
                              {task.site}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Butona e veprimeve */}
                    <div className="flex flex-col gap-2 min-w-[100px] md:min-w-[120px]">
                      <button 
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 md:px-4 py-2 rounded-xl font-bold shadow hover:from-blue-200 hover:to-purple-200 transition-all duration-300 text-xs md:text-sm border border-blue-200"
                      >
                        👁️ Shiko
                      </button>
                      <button 
                        onClick={() => navigate('/tasks')}
                        className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 px-3 md:px-4 py-2 rounded-xl font-bold shadow hover:from-green-200 hover:to-blue-200 transition-all duration-300 text-xs md:text-sm border border-green-200"
                      >
                        📋 Të gjitha
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            
            {tasks.length === 0 && (
              <div className="text-center py-8 md:py-12">
                <div className="text-4xl md:text-6xl mb-4">📋</div>
                <h4 className="text-lg md:text-xl font-bold text-gray-600 mb-2">Nuk ka detyra të caktuara</h4>
                <p className="text-gray-500 text-sm md:text-lg">Ky punonjës nuk ka detyra të caktuara për momentin.</p>
                <button 
                  onClick={() => navigate('/tasks')}
                  className="mt-4 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold shadow hover:from-blue-200 hover:to-purple-200 transition-all duration-300 text-sm md:text-base border border-blue-200"
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
    <table className="w-full text-sm md:text-base border bg-white rounded-xl shadow min-w-[600px]">
      <thead className="bg-gradient-to-r from-blue-100 via-white to-purple-100">
        <tr>
          <th className="p-2 border text-xs md:text-sm">Java</th>
          <th className="p-2 border text-xs md:text-sm">Total Orë</th>
          <th className="p-2 border text-xs md:text-sm">Bruto (£)</th>
          <th className="p-2 border text-xs md:text-sm">Neto (£)</th>
          <th className="p-2 border text-xs md:text-sm">Sipas Site-ve</th>
          <th className="p-2 border text-xs md:text-sm">Statusi</th>
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
              <td className="p-2 border text-xs md:text-sm">{weekLabel}</td>
              <td className="p-2 border text-xs md:text-sm">{totalHours}</td>
              <td className="p-2 border text-green-700 font-bold text-xs md:text-sm">£{gross.toFixed(2)}</td>
              <td className="p-2 border text-blue-700 font-bold text-xs md:text-sm">£{net.toFixed(2)}</td>
              <td className="p-2 border text-xs md:text-sm">{siteBreakdown}</td>
              <td className="p-2 border">
                <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold shadow-md ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
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