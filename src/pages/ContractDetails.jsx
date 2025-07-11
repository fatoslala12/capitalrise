import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import html2pdf from "html2pdf.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ContractDetails() {
  const { contract_number } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: "", shifts: "", rate: "", amount: 0 }],
    other: 0,
    paid: false,
    date: new Date().toISOString().split("T")[0],
    description: "",
    invoice_number: "",
    shifts: "",
    rate: "",
    total: 0,
    total_net: 0,
    vat: 0,
    created_by: "",
    status: "Draft",
    notes: "",
    actions: []
  });
  const token = localStorage.getItem("token");

  // Merr kontratën, faturat dhe orët e punës nga backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const contractRes = await axios.get(
          `https://building-system.onrender.com/api/contracts/contract-number/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setContract(contractRes.data);

        const invoicesRes = await axios.get(
          `https://building-system.onrender.com/api/invoices/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setInvoices(invoicesRes.data || []);

        // Merr orët e punës për këtë kontratë
        const workHoursRes = await axios.get(
          `https://building-system.onrender.com/api/work-hours/contract/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWorkHours(workHoursRes.data || []);
        
      } catch (error) {
        console.error("Error fetching contract data:", error);
        setContract(null);
        setInvoices([]);
        setWorkHours([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contract_number, token]);

  // Ngarko dokument PDF
  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newDoc = { name: file.name, content: reader.result };
      try {
        const res = await axios.put(
          `https://building-system.onrender.com/api/contracts/${contract.id}/documents`,
          { document: newDoc },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setContract(res.data);
      } catch {
        alert("Gabim gjatë ngarkimit të dokumentit!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Fshi dokument
  const handleDocumentDelete = async (index) => {
    try {
      const res = await axios.delete(
        `https://building-system.onrender.com/api/contracts/${contract.id}/documents/${index}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContract(res.data);
    } catch {
      alert("Gabim gjatë fshirjes së dokumentit!");
    }
  };

  // Shto koment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(
        `https://building-system.onrender.com/api/contracts/${contract.id}/comments`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContract(res.data);
      setNewComment("");
    } catch {
      alert("Gabim gjatë shtimit të komentit!");
    }
  };

  // Chart data
  const getProgressChartData = () => {
    const start = new Date(contract?.start_date);
    const end = new Date(contract?.finish_date);
    const today = new Date();
    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, Math.min((today - start) / (1000 * 60 * 60 * 24), totalDays));

    return [
      { name: "Fillimi", progress: 0 },
      { name: "Tani", progress: Math.floor((elapsedDays / totalDays) * 100) },
      { name: "Përfundimi", progress: 100 }
    ];
  };

  // Faturat
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index][field] = value;
    if (field === "shifts" || field === "rate") {
      const shifts = parseFloat(updatedItems[index].shifts || 0);
      const rate = parseFloat(updatedItems[index].rate || 0);
      updatedItems[index].amount = shifts * rate;
    }
    setNewInvoice((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleAddItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: "", shifts: "", rate: "", amount: 0 }],
    });
  };

  // Ruaj faturë në backend
  const handleSaveInvoice = async () => {
    // Gjej numrin e radhës për faturën e re
    const invoiceCount = invoices.length + 1;
    const invoice_number = `${contract.site_name} - #${invoiceCount}`;

    const firstItem = newInvoice.items && newInvoice.items.length > 0 ? newInvoice.items[0] : {};
    const itemsTotal = (newInvoice.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total = Number(itemsTotal) + Number(newInvoice.other || 0);
    const vat = 0.2 * total;
    const total_net = total - vat;

    const newInvoiceWithContract = {
      contract_number: contract.contract_number,
      invoice_number, // përdor automatikisht të gjeneruarin
      date: newInvoice.date || "",
      description: newInvoice.description || "",
      shifts: firstItem.shifts || 0,
      rate: firstItem.rate || 0,
      total,
      total_net,
      vat,
      other: newInvoice.other || 0,
      created_by: "admin@demo.com",
      paid: newInvoice.paid || false,
      actions: newInvoice.actions || [],
      items: newInvoice.items || [],
      status: newInvoice.status || "Draft",
      notes: newInvoice.notes || ""
    };
    try {
      await axios.post(
        `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
        newInvoiceWithContract,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh invoices after saving
      const invoicesRes = await axios.get(
        `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvoices(invoicesRes.data || []);
      setNewInvoice({
        invoice_number: '',
        date: new Date().toISOString().split("T")[0],
        description: '',
        shifts: '',
        rate: '',
        total: 0,
        total_net: 0,
        vat: 0,
        other: 0,
        created_by: '',
        paid: false,
        status: 'Draft',
        notes: '',
        items: [{ description: '', shifts: '', rate: '', amount: 0 }],
        actions: []
      });
    } catch {
      alert("Gabim gjatë ruajtjes së faturës!");
    }
  };

  // Fshi faturë nga backend
  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("A jeni i sigurt që dëshironi të fshini këtë faturë?")) return;
    try {
      await axios.delete(
        `https://building-system.onrender.com/api/invoices/${invoiceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko faturat pas fshirjes
      const invoicesRes = await axios.get(
        `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvoices(invoicesRes.data || []);
      setInvoiceToPrint(null);
    } catch {
      alert("Gabim gjatë fshirjes së faturës!");
    }
  };

  // Ndrysho statusin e pagesës së faturës
  const handleTogglePaid = async (invoiceId, currentPaid) => {
    try {
      await axios.put(
        `https://building-system.onrender.com/api/invoices/${invoiceId}/toggle-paid`,
        { paid: !currentPaid },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh invoices after change
      const invoicesRes = await axios.get(
        `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvoices(invoicesRes.data || []);
    } catch {
      alert("Gabim gjatë ndryshimit të statusit të pagesës!");
    }
  };

  const exportToPDF = () => {
    const element = document.getElementById("invoice-area");
    const opt = {
      margin: 0,
      filename: `Fature_${contract.contract_number}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar detajet e kontratës...</h2>
        </div>
      </div>
    );
  }

  if (!contract || Object.keys(contract).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Kontrata nuk u gjet</h2>
          <button 
            onClick={() => navigate('/admin/contracts')} 
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            🔙 Kthehu tek Kontratat
          </button>
        </div>
      </div>
    );
  }

  const netTotal = newInvoice.items.reduce((acc, i) => acc + (i.amount || 0), 0);
  const vat = netTotal * 0.2;
  const grandTotal = netTotal + parseFloat(newInvoice.other || 0) + vat;

  // Funksion për të formatuar datat në format të lexueshëm
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 bg-gradient-to-br from-blue-100 via-white to-purple-100 min-h-screen">
      {/* HEADER MODERN GLASSMORPHISM */}
      <div className="flex items-center gap-6 bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-10 border-b-4 border-blue-400 animate-fade-in">
        <div className="flex-shrink-0 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full p-4 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-14 h-14">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-2 drop-shadow-lg">Detajet e Kontratës</h2>
          <div className="text-2xl font-bold text-purple-600 drop-shadow">{contract?.site_name ? contract.site_name : "-"}</div>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in">
        <div className="space-y-3 text-lg">
          <p><span className="font-bold text-blue-800">🏢 Emri i Kompanisë:</span> {contract.company}</p>
          <p><span className="font-bold text-blue-800">#️⃣ Nr Kompanisë:</span> {contract.company_no}</p>
          <p><span className="font-bold text-blue-800">📍 Vendodhja:</span> {contract.site_name}</p>
          <p><span className="font-bold text-blue-800">📬 Adresa:</span> {contract.address}</p>
        </div>
        <div className="space-y-3 text-lg">
          <p><span className="font-bold text-blue-800">🗓 Data e Fillimit:</span> {formatDate(contract.start_date)}</p>
          <p><span className="font-bold text-blue-800">🗓 Data e Mbarimit:</span> {formatDate(contract.finish_date)}</p>
          <p><span className="font-bold text-blue-800">📊 Statusi:</span> <span className={contract.status.includes("Mbyllur") ? "text-red-600" : "text-green-600"}>{contract.status}</span></p>
          {contract.closed_date && <p><span className="font-bold text-blue-800">🔒 Mbyllur më:</span> {formatDate(contract.closed_date)}</p>}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/70 p-10 shadow-2xl rounded-3xl border-2 border-purple-200 animate-fade-in">
        <h3 className="text-2xl font-bold mb-6 text-purple-800 flex items-center gap-2"><span>📈</span> Progresi i Kontratës</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={getProgressChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Line type="monotone" dataKey="progress" stroke="#a21caf" strokeWidth={4} dot={{ r: 8, fill: '#c7d2fe' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dokumente */}
      <div className="bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in">
        <h3 className="text-2xl font-bold mb-4 text-blue-800 flex items-center gap-2">📎 Dokumentet</h3>
        <input type="file" accept="application/pdf" onChange={handleDocumentUpload} className="mb-6 text-base file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-base file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all duration-200" />
        <ul className="list-none pl-0 text-base text-blue-700 space-y-2">
          {(contract.documents || []).map((doc, idx) => (
            <li key={idx} className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-2 shadow hover:bg-purple-50 transition-all">
              <span className="bg-gradient-to-br from-blue-200 to-purple-200 rounded-full p-2"><svg xmlns='http://www.w3.org/2000/svg' className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='#6366f1'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 10-2.828-2.828z' /></svg></span>
              <a href={doc.content} download={doc.name} className="underline hover:text-purple-700 transition-colors duration-200 font-semibold">{doc.name}</a>
              <button onClick={() => handleDocumentDelete(idx)} className="ml-auto text-red-600 text-lg hover:scale-125 transition-transform">🗑</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Komente */}
      <div className="bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-purple-200 animate-fade-in">
        <h3 className="text-2xl font-bold mb-4 text-purple-800 flex items-center gap-2">💬 Komente</h3>
        <div className="flex gap-3 mb-6">
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} className="w-full border-2 border-purple-200 rounded-xl p-3 text-base bg-purple-50 focus:ring-4 focus:ring-purple-300 transition-all shadow-sm" placeholder="Shkruaj një koment..." />
          <button onClick={handleAddComment} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-xl shadow-lg font-bold text-lg hover:from-blue-600 hover:to-purple-600 transition-all">➕ Shto</button>
        </div>
        <ul className="mt-4 space-y-4 text-base">
          {(contract.comments || []).map((c, i) => (
            <li key={i} className="flex items-start gap-3 bg-purple-50 rounded-xl px-4 py-3 shadow border-l-4 border-blue-400 animate-fade-in">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center text-xl font-bold text-white shadow-md">{(c.text[0] || '').toUpperCase()}</div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium">{c.text}</p>
                <span className="text-xs text-gray-500">{new Date(c.date).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Orët e Punës për këtë kontratë */}
      <div className="bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-green-200 animate-fade-in">
        <h3 className="text-2xl font-bold mb-4 text-green-800 flex items-center gap-2">⏰ Orët e Punës</h3>
        {workHours.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white shadow rounded-xl">
              <thead className="bg-gradient-to-r from-green-100 to-blue-100 text-green-900">
                <tr>
                  <th className="py-3 px-2 text-center font-semibold">Data</th>
                  <th className="py-3 px-2 text-center font-semibold">Punonjësi</th>
                  <th className="py-3 px-2 text-center font-semibold">Orë</th>
                  <th className="py-3 px-2 text-center font-semibold">Tarifa/orë</th>
                  <th className="py-3 px-2 text-center font-semibold">Total Paguar</th>
                </tr>
              </thead>
              <tbody>
                {workHours.map((wh, idx) => (
                  <tr key={idx} className="hover:bg-green-50 transition-all">
                    <td className="py-2 px-2 text-center">{new Date(wh.date).toLocaleDateString('sq-AL')}</td>
                    <td className="py-2 px-2 text-center font-medium">
                      {wh.employee_name || `Employee #${wh.employee_id}`}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-blue-600">{wh.hours}</td>
                    <td className="py-2 px-2 text-center font-bold text-purple-600">£{parseFloat(wh.rate || 0).toFixed(2)}</td>
                    <td className="py-2 px-2 text-center font-bold text-green-600">
                      £{(parseFloat(wh.hours || 0) * parseFloat(wh.rate || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-100">
                <tr>
                  <td colSpan="2" className="py-3 px-2 text-center font-bold text-green-800">TOTALET:</td>
                  <td className="py-3 px-2 text-center font-bold text-blue-700">
                    {workHours.reduce((sum, wh) => sum + parseFloat(wh.hours || 0), 0).toFixed(1)} orë
                  </td>
                  <td className="py-3 px-2 text-center">-</td>
                  <td className="py-3 px-2 text-center font-bold text-green-700 text-lg">
                    £{workHours.reduce((sum, wh) => sum + (parseFloat(wh.hours || 0) * parseFloat(wh.rate || 0)), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka orë pune të regjistruara për këtë kontratë akoma</p>
        )}
      </div>

      {/* Forma Fature */}
      <div className="bg-gradient-to-br from-purple-100 via-white to-blue-100 p-10 rounded-3xl shadow-2xl mb-10 border-2 border-purple-200 animate-fade-in">
        <h3 className="font-bold mb-6 text-2xl text-blue-900 flex items-center gap-3">
          <span className="text-purple-700 text-3xl">🧾</span> Shto Faturë
        </h3>
        <input
          placeholder="Përshkrimi i faturës"
          className="p-4 border-2 border-blue-200 rounded-xl mb-4 w-full text-lg focus:ring-2 focus:ring-blue-300 transition-all shadow-sm"
          value={newInvoice.description}
          onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
        />
        {newInvoice.items.map((item, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 mb-3">
            <input placeholder="Përshkrimi" className="p-3 border-2 border-purple-200 rounded-xl text-base focus:ring-2 focus:ring-purple-300 transition-all" value={item.description} onChange={(e) => handleItemChange(index, "description", e.target.value)} />
            <input type="number" placeholder="Shifts" className="p-3 border-2 border-purple-200 rounded-xl text-base focus:ring-2 focus:ring-purple-300 transition-all" value={item.shifts} onChange={(e) => handleItemChange(index, "shifts", e.target.value)} />
            <input type="number" placeholder="Rate" className="p-3 border-2 border-purple-200 rounded-xl text-base focus:ring-2 focus:ring-purple-300 transition-all" value={item.rate} onChange={(e) => handleItemChange(index, "rate", e.target.value)} />
            <input disabled className="p-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-base" value={`£${item.amount.toFixed(2)}`} />
          </div>
        ))}
        <button onClick={handleAddItem} className="text-base text-blue-700 mb-4 font-semibold hover:underline transition-all">➕ Rresht i Ri</button>
        <div className="flex items-center gap-6 mt-4">
          <input type="number" placeholder="Të tjera" className="border-2 border-blue-200 py-3 px-4 text-center align-middle rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all" value={newInvoice.other} onChange={(e) => setNewInvoice({ ...newInvoice, other: e.target.value })} />
          <span className="font-bold text-xl">Total: <span className="text-purple-700">£{grandTotal.toFixed(2)}</span></span>
        </div>
        <button onClick={handleSaveInvoice} className="mt-8 bg-gradient-to-r from-green-400 to-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 text-lg shadow-lg hover:from-blue-600 hover:to-green-600 transition-all">
          <span className="text-2xl">💾</span> Ruaj Faturën
        </button>
      </div>

      {/* Lista Faturave + Print */}
      <div className="bg-white/80 p-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in">
        <h3 className="font-bold mb-6 text-2xl text-blue-900 flex items-center gap-3">📋 Lista e Faturave</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-base bg-white shadow rounded-xl">
            <thead className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900">
              <tr>
                <th className="py-4 px-2 text-center align-middle font-semibold">Nr</th>
                <th className="py-4 px-2 text-center align-middle font-semibold">Data</th>
                <th className="py-4 px-2 text-center align-middle font-semibold">Total</th>
                <th className="py-4 px-2 text-center align-middle font-semibold">Status</th>
                <th className="py-4 px-2 text-center align-middle font-semibold">Paguar</th>
                <th className="py-4 px-2 text-center align-middle font-semibold">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {invoices
                .slice()
                .sort((a, b) => a.id - b.id)
                .map((inv, index) => {
                  const total = inv.items.reduce((a, i) => a + (i.amount || 0), 0) + parseFloat(inv.other || 0) + (inv.items.reduce((a, i) => a + (i.amount || 0), 0) * 0.2);
                  const invoiceDate = new Date(inv.date);
                  const paidDate = inv.paid ? new Date() : null;
                  const oneMonth = 30 * 24 * 60 * 60 * 1000;
                  const status = inv.paid
                    ? paidDate - invoiceDate <= oneMonth
                      ? "Paguar në kohë"
                      : "Paguar me vonesë"
                    : "Pa paguar";
                  return (
                    <tr key={inv.id} className="text-center hover:bg-purple-50 transition-all">
                      <td className="py-3 px-2 align-middle font-semibold">{inv.invoice_number}</td>
                      <td className="py-3 px-2 align-middle">{formatDate(inv.date)}</td>
                      <td className="py-3 px-2 align-middle font-bold text-purple-700">£{total.toFixed(2)}</td>
                      <td className="py-3 px-2 align-middle">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${status === "Pa paguar" ? "bg-red-100 text-red-600" : status === "Paguar në kohë" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{status}</span>
                      </td>
                      <td className="py-3 px-2 align-middle">
                        <input
                          type="checkbox"
                          checked={inv.paid}
                          onChange={() => handleTogglePaid(inv.id, inv.paid)}
                          className="w-5 h-5 accent-green-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2 align-middle flex justify-center gap-2">
                        <button onClick={() => setInvoiceToPrint(inv)} className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-base font-semibold shadow hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-1">
                          🖨 <span className="hidden md:inline">Shiko / Printo</span>
                        </button>
                        <button onClick={() => handleDeleteInvoice(inv.id)} className="text-base text-red-600 ml-2 bg-red-100 px-3 py-2 rounded-lg font-semibold shadow hover:bg-red-200 transition-all flex items-center gap-1">🗑 <span className="hidden md:inline">Fshi</span></button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {invoiceToPrint && (
        <div className="bg-white p-6 rounded-2xl shadow-xl mt-6 border border-green-300">
          <div
            id="invoice-area"
            className="bg-white print:bg-white text-gray-800 text-sm max-w-[794px] mx-auto p-10 leading-loose"
          >
            <div className="flex justify-between items-center border-b border-green-300 pb-4 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-amber-600">🧾 FATURË</h1>
                <p className="text-xs text-gray-500">Kont #{contract.contract_number} – {contract.site_name}</p>
              </div>
              <img src="/albanconstruction.png" alt="Alban Construction Logo" className="h-20 w-auto object-contain" />
              <div className="text-right text-xs">
                <p><strong>Data:</strong> {invoiceToPrint.date}</p>
                <p><strong>Kompania:</strong> {contract.company}</p>
                <p className="text-gray-500 italic">{contract.address}</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-gray-300 mb-6 text-xs">
              <thead className="bg-green-100 text-amber-800 font-semibold">
                <tr>
                  <th className="border border-green-300 py-3 px-2">Përshkrimi</th>
                  <th className="border border-green-300 py-3 px-2">Shifts</th>
                  <th className="border border-green-300 py-3 px-2">Rate</th>
                  <th className="border border-green-300 py-3 px-2">Shuma</th>
                </tr>
              </thead>
              <tbody>
                {invoiceToPrint.items.map((item, i) => (
                  <tr key={i} className="hover:bg-green-50">
                    <td className="border border-gray-300 py-3 px-2">{item.description}</td>
                    <td className="border border-gray-300 py-3 px-2 text-center">{item.shifts}</td>
                    <td className="border border-gray-300 py-3 px-2 text-center">£{item.rate}</td>
                    <td className="border border-gray-300 py-3 px-2 text-right">£{item.amount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between mt-8 text-sm">
              <div className="text-left text-gray-700 space-y-1 max-w-[45%]">
                <p className="font-bold text-amber-700">Alban Construction Ltd</p>
                <p>HSBC Bank</p>
                <p>Account Number: 81845403</p>
                <p>Sort Code: 52474549</p>
                <p>Email: adi@albancosntruction.co.uk</p>
                <p>Phone: +7588893238</p>
                <p>Website: www.albanconstruction.co.uk</p>
              </div>

              <div className="text-right text-sm space-y-4 max-w-[45%] leading-loose">
                <p><strong>Neto:</strong> £{invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0).toFixed(2)}</p>
                <p><strong>TVSH (20%):</strong> £{(invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0) * 0.2).toFixed(2)}</p>
                <p><strong>Të tjera:</strong> £{parseFloat(invoiceToPrint.other || 0).toFixed(2)}</p>
                <p className="text-lg font-extrabold text-amber-700 mt-2">Total: £{(
                  invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0) +
                  (invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0) * 0.2) +
                  parseFloat(invoiceToPrint.other || 0)
                ).toFixed(2)}</p>
              </div>
            </div>
            <p className="text-center text-green-700 font-semibold mt-12">
              THANK YOU FOR YOUR BUSINESS!
            </p>
          </div>

          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={exportToPDF}
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 shadow-md"
            >
              📄 Shkarko PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Animacion fade-in */
<style jsx>{`
@keyframes fade-in {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: none; }
}
.animate-fade-in { animation: fade-in 0.7s cubic-bezier(.4,0,.2,1) both; }
`}</style>