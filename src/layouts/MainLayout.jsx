import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const adminMenu = [
  { path: "/admin/dashboard", label: "🏠 Dashboard" },
  { path: "/admin/employees", label: "👷 Punonjësit" },
  { path: "/admin/employees-list", label: "➕ Shto Punonjës" },
  { path: "/admin/work-hours", label: "🕒 Orët e Punës" },
  { path: "/admin/payments", label: "💰 Pagesat" },
  { path: "/admin/contracts", label: "📄 Kontratat" },
  { path: "/admin/tasks", label: "📝 Detyrat" },
  { path: "/admin/reports", label: "📈 Raportet" },
];

const managerMenu = [
  { path: "/manager/dashboard", label: "🏠 Dashboard" },
  { path: "/manager/my-tasks", label: "📝 Detyrat e Mia" },
  { path: "/manager/employees-list", label: "➕ Menaxho Punonjësit" },
  { path: "/manager/work-hours", label: "🕒 Orët e Punës" },
  { path: "/manager/payments", label: "💰 Pagesat" },
];

const userMenu = [
  { path: "/user/dashboard", label: "🏠 Dashboard" },
  { path: "/user/work-hours", label: "🕒 Orët e Punës" },
  { path: "/user/my-tasks", label: "📝 Detyrat e Mia" },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  let menu = [];
  if (user?.role === "admin") menu = adminMenu;
  else if (user?.role === "manager") menu = managerMenu;
  else if (user?.role === "user") menu = userMenu;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gradient-to-b from-[#1e3c72] via-[#2a5298] to-[#6dd5ed] text-white flex flex-col shadow-2xl">
        <div className="p-4 text-xl font-extrabold border-b border-blue-800 mb-2 rounded-b-2xl bg-white/10 backdrop-blur-md shadow-lg flex items-center gap-2">
          <span className="bg-blue-100 rounded-xl p-1 shadow text-blue-700 text-2xl">🏗️</span>
          <span className="drop-shadow">Alban Construction</span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-base transition-all duration-150
                  ${isActive ? "bg-white/20 border-l-4 border-blue-200 shadow text-blue-50" : "hover:bg-blue-700/70 hover:shadow-md hover:scale-[1.04]"}
                `}
              >
                <span className="text-xl">{item.label.split(" ")[0]}</span>
                <span className="ml-1 whitespace-nowrap">{item.label.replace(/^[^ ]+ /, "")}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto mb-6 px-2">
          <button
            onClick={logout}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-pink-600 hover:to-red-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-base transition-all"
          >
            <span className="text-lg">🚪</span> Dil
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}