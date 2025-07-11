import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageButton from "../components/LanguageButton";

const getAdminMenu = (t) => [
  { path: "/admin/dashboard", icon: "🏠", label: t('dashboard') },
  { path: "/admin/employees", icon: "👷", label: t('employees') },
  { path: "/admin/employees-list", icon: "➕", label: t('employees') + " +" },
  { path: "/admin/work-hours", icon: "🕒", label: t('workHours') },
  { path: "/admin/payments", icon: "💰", label: t('payments') },
  { path: "/admin/contracts", icon: "📄", label: t('contracts') },
  { path: "/admin/tasks", icon: "📝", label: t('tasks') },
  { path: "/admin/reports", icon: "📈", label: t('reports') },
];

const getManagerMenu = (t) => [
  { path: "/manager/dashboard", icon: "🏠", label: t('dashboard') },
  { path: "/manager/my-tasks", icon: "📝", label: t('myTasks') },
  { path: "/manager/employees-list", icon: "➕", label: "Manage " + t('employees') },
  { path: "/manager/work-hours", icon: "🕒", label: t('workHours') },
  { path: "/manager/payments", icon: "💰", label: t('payments') },
];

const getUserMenu = (t) => [
  { path: "/user/dashboard", icon: "🏠", label: t('dashboard') },
  { path: "/user/work-hours", icon: "🕒", label: t('workHours') },
  { path: "/user/my-tasks", icon: "📝", label: t('myTasks') },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  let menu = [];
  if (user?.role === "admin") menu = getAdminMenu(t);
  else if (user?.role === "manager") menu = getManagerMenu(t);
  else if (user?.role === "user") menu = getUserMenu(t);

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
                <span className="text-xl">{item.icon}</span>
                <span className="ml-1 whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto mb-6 px-2">
          <LanguageButton />
          <button
            onClick={logout}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-pink-600 hover:to-red-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-base transition-all"
          >
            <span className="text-lg">🚪</span> {t('logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}