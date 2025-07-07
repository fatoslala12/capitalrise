export default function StatBox({ icon, label, value, color = "blue" }) {
  const colorClass = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-700",
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    orange: "text-orange-600",
    gray: "text-gray-700",
  }[color] || "text-blue-700";

  return (
    <div className="bg-white rounded-lg shadow p-4 text-center hover:shadow-lg transition duration-200">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
