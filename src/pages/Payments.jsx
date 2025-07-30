import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCalendarAlt, FaMapMarkerAlt, FaHashtag, FaBuilding } from "react-icons/fa";
import axios from "axios";

export default function Payments() {
  const [contracts, setContracts] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    setLoading(true);
    axios
      .get("https://building-system.onrender.com/api/contracts", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setContracts(res.data || []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredContracts = contracts.filter((c) => {
    return filterStatus === "All" || c.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar pagesat...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full xl:max-w-[90vw] mx-auto px-2 py-4 md:py-8 min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100">
      <div className="bg-gradient-to-br from-purple-100 via-white to-blue-100 rounded-xl md:rounded-3xl shadow-2xl border border-blue-100 p-4 md:p-8 lg:p-12 mb-8 md:mb-12 animate-fade-in">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-6 md:mb-8 text-center drop-shadow-lg flex items-center justify-center gap-2 md:gap-3">
          <span className="text-3xl md:text-4xl lg:text-5xl">💳</span> Pagesat & Kontratat
        </h2>
        {/* Filtri i statusit */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 mb-6 md:mb-10">
          <label className="text-sm md:text-lg font-semibold text-blue-800">Filtro sipas statusit:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border-2 border-blue-200 p-2 md:p-3 rounded-xl shadow focus:ring-2 focus:ring-blue-300 text-sm md:text-lg text-blue-800 bg-white/80"
          >
            <option value="All">Të gjitha kontratat</option>
            <option value="Draft">Draft</option>
            <option value="Anulluar">Anulluar</option>
            <option value="Ne progres">Ne progres</option>
            <option value="Pezulluar">Pezulluar</option>
            <option value="Mbyllur">Mbyllur</option>
            <option value="Mbyllur me vonese">Mbyllur me vonese</option>
          </select>
        </div>
        {/* Lista e pagesave/kontratave */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {filteredContracts.map((c) => (
            <Link
              key={c.contract_number}
              to={`/admin/payments/details/${c.contract_number}`}
              className="bg-white/70 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl border border-blue-100 p-4 md:p-6 lg:p-7 flex flex-col gap-3 md:gap-4 hover:scale-[1.02] md:hover:scale-[1.04] hover:shadow-2xl hover:border-blue-300 transition-all duration-300 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-extrabold text-blue-700 flex items-center gap-2 group-hover:text-purple-700 transition-all">
                    <FaHashtag /> {c.contract_number}
                  </h3>
                  <p className="text-sm md:text-base text-gray-500 flex items-center gap-2 mt-1">
                    <FaBuilding className="text-gray-400" /> {c.company}
                  </p>
                </div>
                <span className={`text-xs md:text-sm lg:text-base font-bold px-2 md:px-4 py-1 md:py-2 rounded-full shadow-md border
                  ${c.status === 'Ne progres' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    c.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                    c.status === 'Anulluar' ? 'bg-red-100 text-red-700 border-red-200' :
                    c.status === 'Pezulluar' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    c.status === 'Mbyllur' ? 'bg-green-100 text-green-700 border-green-200' :
                    c.status === 'Mbyllur me vonese' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                    'bg-gray-200 text-gray-700 border-gray-300'}
                `}>
                  {c.status}
                </span>
              </div>
              <div className="space-y-2 text-blue-900 text-sm md:text-base lg:text-lg">
                <p className="flex items-center gap-2 font-bold"><FaMapMarkerAlt className="text-blue-400" /> {c.site_name}</p>
                <p className="flex items-center gap-2"><FaCalendarAlt className="text-blue-400" /> Fillimi: {c.start_date ? new Date(c.start_date).toLocaleDateString() : '-'}</p>
                <p className="flex items-center gap-2"><FaCalendarAlt className="text-blue-400" /> Fundi: {c.finish_date ? new Date(c.finish_date).toLocaleDateString() : '-'}</p>
              </div>
            </Link>
          ))}
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