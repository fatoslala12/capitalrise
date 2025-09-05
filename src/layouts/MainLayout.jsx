import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { MobileSidebar } from "../components/ui/Layout";
import NotificationBell from "../components/NotificationBell";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import PageLoader from "../components/ui/PageLoader";

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
  const { t } = useTranslation();

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user?.firstName) {
      return user.firstName;
    } else {
      return user?.email || '';
    }
  };

  const translateNavText = (path, fallbackText) => {
    if (path.endsWith('/dashboard')) return t('navigation.dashboard');
    if (path.includes('/employees')) return t('navigation.employees');
    if (path.includes('/work-hours')) return t('navigation.workHours');
    if (path.includes('/payments')) return t('navigation.payments');
    if (path.includes('/contracts')) return t('navigation.contracts');
    if (path.includes('/tasks')) return t('navigation.tasks');
    if (path.includes('/reports')) return t('navigation.reports');
    if (path.includes('/notifications')) return t('navigation.notifications');
    return fallbackText;
  };

  let menu = [];
  if (user?.role === "admin") menu = adminMenu;
  else if (user?.role === "manager") menu = managerMenu;
  else if (user?.role === "user") menu = userMenu;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-28 w-28 mx-auto" />
          </div>
          <div className="mb-6">
            <p className="text-base text-blue-200 capitalize font-semibold tracking-wide">
              {user?.role === 'admin' ? 'Administrator' : 
               user?.role === 'manager' ? 'Manager' : 
               'User'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;
          const icon = item.label.split(" ")[0];
          const translatedText = translateNavText(item.path, item.label.replace(/^[^ ]+ /, ""));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`group flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${
                isActive 
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-l-4 border-blue-300" 
                  : "text-blue-100 hover:bg-white/10 hover:text-white hover:shadow-md"
              }`}
            >
              <span className={`text-lg flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
              </span>
              <span className="whitespace-nowrap font-medium tracking-wide">{translatedText}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-6 border-t border-white/10">
        <div className="text-center">
          <div className="text-xs text-blue-200/60 font-medium tracking-wide">
            © 2025 Capital Rise
          </div>
          <div className="text-xs text-blue-300/40 mt-1">
            All rights reserved
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-80 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 flex-shrink-0 shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="h-full bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900">
          <SidebarContent />
        </div>
      </MobileSidebar>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white flex-shrink-0 shadow-lg border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-8 w-8" />
            </div>
            
            {/* Welcome */}
            <div className="flex-1 min-w-0">
              <div className="text-left">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  {t('auth.welcome')}, {getUserDisplayName()}
                </h2>
                <p className="text-sm text-gray-600 truncate">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher />
              <NotificationBell />
              <button
                onClick={logout}
                className="px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-md transform hover:scale-105"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 bg-gray-50 overflow-auto p-4 sm:p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}