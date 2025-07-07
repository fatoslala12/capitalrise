export default function EmployeeCard({ employee, onClick }) {
  const {
    first_name, last_name, photo, status, role, hourly_rate, workplace
  } = employee;
  const statusColor = status === "Aktiv"
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-red-100 text-red-700 border-red-200";

  return (
    <div
      className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-blue-100 p-6 flex flex-col items-center gap-3 cursor-pointer hover:scale-105 transition-all"
      onClick={onClick}
    >
      <img
        src={photo || 'https://via.placeholder.com/100'}
        alt="Foto"
        className="w-20 h-20 rounded-full object-cover border-2 border-blue-200 shadow"
      />
      <div className="text-xl font-bold text-blue-900">{first_name} {last_name}</div>
      <div className="flex gap-2 flex-wrap">
        <span className={`px-3 py-1 rounded-full border text-xs font-bold shadow ${statusColor}`}>{status}</span>
        <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 px-3 py-1 rounded-full shadow uppercase tracking-wide">{role}</span>
      </div>
      <div className="text-green-700 font-bold text-lg">£{hourly_rate}/orë</div>
      <div className="text-xs text-blue-700">{Array.isArray(workplace) ? workplace.join(', ') : workplace}</div>
    </div>
  );
}
