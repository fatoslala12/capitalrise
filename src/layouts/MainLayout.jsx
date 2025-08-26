import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { MobileSidebar } from "../components/ui/Layout";
import NotificationBell from "../components/NotificationBell";
import api from "../api";
// import Button from "../components/ui/Button";
import LanguageSwitcher from "../components/LanguageSwitcher";
import LanguageTest from "../components/LanguageTest";

const adminMenu = [
  { path: "/admin/dashboard", label: "🏠 Dashboard" },
  { path: "/admin/employees-list", label: "👷 Punonjësit" },
  { path: "/admin/work-hours", label: "🕒 Orët e Punës" },
  { path: "/admin/payments", label: "💰 Pagesat" },
  { path: "/admin/contracts", label: "📄 Kontratat" },
  { path: "/admin/tasks", label: "📝 Detyrat" },
  { path: "/admin/reports", label: "📈 Raportet" },
  { path: "/admin/backup", label: "💾 Backup" },
  { path: "/admin/audit-trail", label: "🔍 Audit Trail" },
  { path: "/admin/translations", label: "🌐 Përkthimet" },
  { path: "/admin/notifications", label: "🔔 Njoftimet" },
  { path: "/admin/notifications/analytics", label: "📊 Analytics" },
];

const managerMenu = [
  { path: "/manager/dashboard", label: "🏠 Dashboard" },
  { path: "/manager/my-tasks", label: "📝 Detyrat e Mia" },
  { path: "/manager/employees-list", label: "👷 Menaxho Punonjësit" },
  { path: "/manager/work-hours", label: "🕒 Orët e Punës" },
  { path: "/manager/my-profile", label: "👤 Profili Im" },
];

const userMenu = [
  { path: "/user/dashboard", label: "🏠 Dashboard" },
  { path: "/user/work-hours", label: "🕒 Orët e Punës" },
  { path: "/user/my-tasks", label: "📝 Detyrat e Mia" },
  { path: "/user/my-profile", label: "👤 Profili Im" },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Merr emrin e përdoruesit direkt nga user object me fallback
  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user?.firstName) {
      return user.firstName;
    } else {
      return user?.email || '';
    }
  };

  let menu = [];
  if (user?.role === "admin") menu = adminMenu;
  else if (user?.role === "manager") menu = managerMenu;
  else if (user?.role === "user") menu = userMenu;

  const SidebarContent = () => (
    <>
      <div className="p-2 md:p-3 lg:p-4 text-base md:text-lg lg:text-xl font-extrabold border-b border-blue-800 mb-2 rounded-b-2xl bg-white/10 backdrop-blur-md shadow-lg flex items-center gap-2">
        <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-8 w-8 md:h-10 md:w-10" />
        <span className="drop-shadow text-xs md:text-sm lg:text-base">Capital Rise</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu on navigation
              className={`flex items-center gap-1 md:gap-2 lg:gap-3 px-2 md:px-3 py-2 md:py-3 rounded-xl font-semibold text-xs md:text-sm lg:text-base transition-all duration-150
                ${isActive ? "bg-white/20 border-l-4 border-blue-200 shadow text-blue-50" : "hover:bg-blue-700/70 hover:shadow-md hover:scale-[1.02] md:hover:scale-[1.04]"}
              `}
            >
              <span className="text-lg md:text-xl">{item.label.split(" ")[0]}</span>
              <span className="ml-1 whitespace-nowrap">{item.label.replace(/^[^ ]+ /, "")}</span>
            </Link>
          );
        })}
      </nav>
      {/* Empty space for bottom alignment */}
      <div className="mt-auto p-2 md:p-3 lg:p-4 border-t border-blue-800/30">
        <div className="text-center text-xs md:text-sm text-blue-200">
          © 2025 Capital Rise
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop Sidebar - Always visible and fixed */}
      <aside className="hidden lg:flex w-56 bg-gradient-to-b from-[#1e3c72] via-[#2a5298] to-[#6dd5ed] text-white flex-col shadow-2xl fixed h-full z-10">
        <SidebarContent />
      </aside>
      
      {/* Desktop content spacer */}
      <div className="hidden lg:block w-56 flex-shrink-0"></div>

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
        <div className="flex-1 flex flex-col w-full">
        {/* Desktop Header - Always visible */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          {/* Mobile menu button - only visible on mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Desktop spacer */}
          <div className="hidden lg:block flex-1"></div>
          
          {/* Mobile center logo */}
          <div className="lg:hidden flex items-center gap-1 sm:gap-2">
            <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="font-bold text-gray-900 text-xs sm:text-sm">Capital Rise</span>
          </div>
          
          {/* Center welcome message */}
          <div className="hidden sm:flex flex-1 justify-center">
            <span className="text-gray-600 font-medium text-sm sm:text-base">
              Mirë se vini, {getUserDisplayName()}
            </span>
          </div>
          
          {/* Mobile welcome message */}
          <div className="sm:hidden flex flex-1 justify-center">
            <span className="text-gray-600 font-medium text-xs">
              Mirë se vini
            </span>
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSwitcher />
            <NotificationBell />
            <button
              onClick={logout}
              className="px-2 sm:px-4 py-1 sm:py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">🚪</span>
              <span className="sm:hidden">🚪</span>
              <span className="hidden sm:inline">Dil</span>
              <span className="sm:hidden">Dil</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-gray-50 overflow-auto w-full">
          <Outlet />
          <LanguageTest />
        </main>
      </div>
    </div>
  );
}