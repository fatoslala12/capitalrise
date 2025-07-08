// src/pages/Contracts.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [newContract, setNewContract] = useState({
    company: "",
    company_no: "",
    site_name: "",
    contract_number: "",
    start_date: "",
    finish_date: "",
    address: "",
    status: "Aktive",
    closed_manually: false,
    closed_date: null,
    documents: []
  });
  const [workHours, setWorkHours] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Merr kontratat nga backend
  useEffect(() => {
    axios.get("https://building-system.onrender.com/api/contracts", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setContracts(res.data))
      .catch(() => setContracts([]));
  }, [token]);

  // Merr orët e punës nga backend
  useEffect(() => {
    axios.get("https://building-system.onrender.com/api/work-hours", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setWorkHours(res.data))
      .catch(() => setWorkHours([]));
  }, [token]);

  useEffect(() => {
    const validNumbers = contracts
      .map((c) => parseInt(c.contract_number))
      .filter((n) => !isNaN(n));
    const nextNumber =
      validNumbers.length === 0
        ? 1
        : Math.max(...validNumbers) + 1;
    setNewContract((prev) => ({
      ...prev,
      contract_number: nextNumber.toString(),
    }));
  }, [contracts.length]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "documents" && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewContract((prev) => ({
          ...prev,
          documents: [...prev.documents, {
            name: files[0].name,
            content: reader.result
          }]
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setNewContract({ ...newContract, [name]: value });
    }
  };

  // Shto kontratë në backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Krijo payload me snake_case për backend-in
    const payload = {
      contract_number: newContract.contract_number,
      company: newContract.company,
      company_no: newContract.company_no,
      site_name: newContract.site_name,
      start_date: newContract.start_date,
      finish_date: newContract.finish_date,
      status: newContract.status,
      address: newContract.address,
      closed_manually: newContract.closed_manually,
      closed_date: newContract.closed_date,
      documents: newContract.documents
    };

    try {
      const res = await axios.post("https://building-system.onrender.com/api/contracts", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContracts([...contracts, res.data]);
      setNewContract({
        company: "",
        company_no: "",
        site_name: "",
        contract_number: (parseInt(newContract.contract_number) + 1).toString(),
        start_date: "",
        finish_date: "",
        address: "",
        status: "Aktive",
        closed_manually: false,
        closed_date: null,
        documents: []
      });
    } catch (err) {
      alert("Gabim gjatë shtimit të kontratës!");
    }
  };

  // Ndrysho statusin e kontratës në backend
  const handleToggleStatus = async (contract_number) => {
    // Gjej kontratën që do ndryshohet
    const contractIndex = contracts.findIndex(c => c.contract_number === contract_number);
    if (contractIndex === -1) return;

    const updated = [...contracts];
    const contract = { ...updated[contractIndex] }; // kopjo për të mos ndryshuar direkt state

    const today = new Date();
    const finishDate = new Date(contract.finish_date);

    contract.closed_manually = !contract.closed_manually;
    contract.closed_date = today.toISOString();

    if (contract.closed_manually) {
      if (today > finishDate) {
        contract.status = "Mbyllur me vonesë";
      } else {
        contract.status = "Mbyllur";
      }
    } else {
      contract.status = "Aktive";
      contract.closed_date = null;
    }

    try {
      const res = await axios.put(
        `https://building-system.onrender.com/api/contracts/${contract.contract_number}`,
        contract,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updated[contractIndex] = res.data;
      setContracts(updated);
    } catch (err) {
      alert("Gabim gjatë ndryshimit të statusit!");
    }
  };

  // Fshi kontratë nga backend
  const handleDelete = async (contract_number) => {
    if (!window.confirm("Jeni i sigurt që doni të fshini këtë kontratë?")) return;
    try {
      await axios.delete(`https://building-system.onrender.com/api/contracts/${contract_number}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContracts(contracts.filter((c) => c.contract_number !== contract_number));
    } catch (err) {
      alert("Gabim gjatë fshirjes!");
    }
  };

  // Llogarit shpenzimet për një site duke përdorur orët e punës nga backend
  const calculateSpentForSite = (site_name) => {
    const allHours = workHours.filter(
      (wh) =>
        wh.site === site_name ||
        wh.site === site_name ||
        wh.site === site_name.toLowerCase()
    );
    return allHours.reduce(
      (sum, row) => sum + Number(row.hours || 0) * Number(row.hourlyRate || 0),
      0
    );
  };

  const calculateProgress = (start_date, finish_date) => {
    const start = new Date(start_date);
    const end = new Date(finish_date);
    const now = new Date();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.floor(((now - start) / (end - start)) * 100);
  };

  // Funksion për të formatuar datat në format të lexueshëm
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("sq-AL"); // ose "en-GB" për formatin europian
  }

  // Rendit kontratat nga data më e re tek më e vjetra
  const sortedContracts = [...contracts].sort(
    (a, b) => new Date(b.start_date) - new Date(a.start_date)
  );

  return (
    <div className="max-w-full xl:max-w-[90vw] mx-auto px-4 py-8 space-y-12 bg-gradient-to-br from-blue-100 via-white to-purple-100 min-h-screen">
      {/* HEADER MODERN */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-100 rounded-2xl shadow-lg px-8 py-4 mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Menaxhimi i Kontratave</h2>
          <div className="text-lg font-medium text-purple-700">Shto, shiko dhe menaxho kontratat</div>
        </div>
      </div>

      {/* Forma për shtim kontrate */}
      <div className="bg-gradient-to-br from-purple-100 via-white to-blue-100 px-12 py-6 rounded-2xl shadow-lg border border-purple-100 animate-fade-in w-full">
        <h3 className="font-bold mb-6 text-2xl text-blue-900 flex items-center gap-2">➕ Shto Kontratë të Re</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 w-full" onSubmit={handleSubmit}>
          <label className="col-span-1 md:col-span-2 lg:col-span-4 text-lg font-semibold text-purple-700">Nr. Kontratës: {newContract.contract_number}</label>
          <input name="company" placeholder="Emri i Kompanisë" value={newContract.company} onChange={handleChange} className="p-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-200 transition-all shadow-sm col-span-1" />
          <input name="company_no" placeholder="Vlera e Kontratës (£)" value={newContract.company_no} onChange={handleChange} className="p-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-200 transition-all shadow-sm col-span-1" />
          <input name="site_name" placeholder="Vendodhja" value={newContract.site_name} onChange={handleChange} className="p-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-200 transition-all shadow-sm col-span-1" />
          <input name="address" placeholder="Adresa" value={newContract.address} onChange={handleChange} className="p-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-200 transition-all shadow-sm col-span-1" />
          <div className="col-span-1">
            <label className="block text-base font-medium mb-1 text-blue-800">Data e Fillimit</label>
            <input type="date" name="start_date" value={newContract.start_date} onChange={handleChange} className="p-3 border border-purple-200 rounded-lg w-full text-base focus:ring-2 focus:ring-purple-200 transition-all shadow-sm" />
          </div>
          <div className="col-span-1">
            <label className="block text-base font-medium mb-1 text-blue-800">Data e Mbarimit</label>
            <input type="date" name="finish_date" value={newContract.finish_date} onChange={handleChange} className="p-3 border border-purple-200 rounded-lg w-full text-base focus:ring-2 focus:ring-purple-200 transition-all shadow-sm" />
          </div>
          <div className="col-span-2 lg:col-span-2">
            <label className="block text-base font-medium text-blue-800 mb-1">Ngarko Dokument PDF</label>
            <input type="file" name="documents" accept="application/pdf" onChange={handleChange} className="p-3 border border-blue-200 rounded-lg w-full text-base file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all duration-200" />
          </div>
          <button type="submit" className="col-span-1 md:col-span-2 lg:col-span-4 bg-gradient-to-r from-green-300 to-blue-400 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow hover:from-blue-500 hover:to-green-500 transition-all flex items-center gap-2 justify-center mt-2">
            <span className="text-xl">💾</span> Shto Kontratë
          </button>
        </form>
      </div>

      {/* Lista e kontratave */}
      <div className="bg-white/80 px-16 py-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in w-full">
        <h3 className="font-bold mb-8 text-3xl text-blue-900 flex items-center gap-3">📋 Lista e Kontratave</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-lg bg-white shadow rounded-xl">
            <thead className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900 text-xl">
              <tr>
                <th className="py-5 px-4 text-center align-middle font-bold">Nr</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Kompania</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Vendodhja</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Datat</th>
                <th className="py-5 px-4 text-center align-middle font-bold">⏳</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Vlera (£)</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Shpenzuar (£)</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Fitimi (£)</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Statusi</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Gjendja</th>
                <th className="py-5 px-4 text-center align-middle font-bold">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {sortedContracts.map((c, index) => {
                const shpenzuar = calculateSpentForSite(c.site_name);
                const vlera = Number(c.company_no || 0);
                const fitimi = vlera - shpenzuar;
                const progres = calculateProgress(c.start_date, c.finish_date);
                return (
                  <tr key={index} className="text-center hover:bg-purple-50 transition-all">
                    <td className="py-4 px-4 align-middle font-semibold">{c.contract_number}</td>
                    <td className="py-4 px-4 align-middle">{c.company}</td>
                    <td className="py-4 px-4 align-middle text-blue-700 underline cursor-pointer font-bold" onClick={() => navigate(`/admin/contracts/${c.contract_number}`)}>
                      {c.site_name}
                    </td>
                    <td className="py-4 px-4 align-middle">{formatDate(c.start_date)} - {formatDate(c.finish_date)}</td>
                    <td className="py-4 px-4 align-middle">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all" style={{ width: `${progres}%` }}></div>
                      </div>
                      <div className="text-base mt-1 font-semibold text-blue-800">{progres}%</div>
                    </td>
                    <td className="py-4 px-4 align-middle font-bold text-blue-900">£{vlera.toFixed(2)}</td>
                    <td className="py-4 px-4 align-middle font-bold text-purple-700">£{shpenzuar.toFixed(2)}</td>
                    <td className="py-4 px-4 align-middle font-bold text-green-700">£{fitimi.toFixed(2)}</td>
                    <td className={`py-4 px-4 align-middle font-bold ${c.status === "Mbyllur" ? "text-green-600" : c.status === "Mbyllur me vonesë" ? "text-red-600" : "text-blue-600"}`}>
                      <span className={`px-4 py-2 rounded-full text-base font-bold shadow-md ${c.status === "Mbyllur" ? "bg-green-100 text-green-600" : c.status === "Mbyllur me vonesë" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>{c.status}</span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <input
                        type="checkbox"
                        checked={c.closed_manually}
                        onChange={() => handleToggleStatus(c.contract_number)}
                        className="w-6 h-6 accent-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 align-middle flex justify-center gap-2">
                      <button className="px-5 py-3 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-lg text-lg font-semibold shadow hover:from-pink-600 hover:to-red-600 transition-all flex items-center gap-2" onClick={() => handleDelete(c.contract_number)}>
                        🗑 <span className="hidden md:inline">Fshi</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Animacion fade-in */}
      <style jsx>{`
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: none; }
      }
      .animate-fade-in { animation: fade-in 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}
