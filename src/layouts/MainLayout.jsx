import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { MobileSidebar } from "../components/ui/Layout";
import Button from "../components/ui/Button";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  let menu = [];
  if (user?.role === "admin") menu = adminMenu;
  else if (user?.role === "manager") menu = managerMenu;
  else if (user?.role === "user") menu = userMenu;

  const SidebarContent = () => (
    <>
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
              onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu on navigation
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
      <div className="mt-auto p-4 border-t border-blue-800/30">
        <Button
          variant="danger"
          size="lg"
          onClick={logout}
          icon="🚪"
          className="w-full font-bold text-base"
        >
          Dil nga Sistemi
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar - Always visible */}
      <aside className="hidden lg:flex w-56 bg-gradient-to-b from-[#1e3c72] via-[#2a5298] to-[#6dd5ed] text-white flex-col shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar - Collapsible */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="bg-gradient-to-b from-[#1e3c72] via-[#2a5298] to-[#6dd5ed] text-white h-full flex flex-col">
          <SidebarContent />
        </div>
      </MobileSidebar>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header - Only visible on mobile */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-blue-700 text-xl">🏗️</span>
            <span className="font-bold text-gray-900">Alban Construction</span>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-gray-50 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}