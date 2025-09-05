import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { MobileSidebar } from "../components/ui/Layout";
import NotificationBell from "../components/NotificationBell";
import api from "../api";
// import Button from "../components/ui/Button";
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

  const translateNavText = (path, fallbackText) => {
    // Determine translation key based on path suffix
    if (path.endsWith('/dashboard')) return t('navigation.dashboard');
    if (path.includes('/employees')) return t('navigation.employees');
    if (path.includes('/work-hours')) return t('navigation.workHours');
    if (path.includes('/payments')) return t('navigation.payments');
    if (path.includes('/contracts')) return t('navigation.contracts');
    if (path.includes('/tasks')) return t('navigation.tasks');
    if (path.includes('/reports')) return t('navigation.reports');
    if (path.includes('/notifications')) return t('navigation.notifications');
    // Fallback to original provided text if no key found
    return fallbackText;
  };

  let menu = [];
  if (user?.role === "admin") menu = adminMenu;
  else if (user?.role === "manager") menu = managerMenu;
  else if (user?.role === "user") menu = userMenu;

  const SidebarContent = () => (
    <>
      {/* Logo Section - No background, centered */}
      <div className="p-6 border-b border-white/10 flex flex-col items-center">
        <div className="mb-2">
          <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-16 w-16" />
        </div>
        <div className="text-center">
          <p className="text-sm text-blue-200 capitalize font-medium">
            {user?.role === 'admin' ? 'Administrator' : 
             user?.role === 'manager' ? 'Manager' : 
             'User'}
          </p>
        </div>
      </div>

      {/* Navigation - Left aligned and moved down */}
      <nav className="flex-1 px-2 py-4 space-y-1 mt-12">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;
          const icon = item.label.split(" ")[0];
          const translatedText = translateNavText(item.path, item.label.replace(/^[^ ]+ /, ""));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                isActive 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-white hover:bg-white/10"
              }`}
            >
              <span className="text-base flex-shrink-0">{icon}</span>
              <span className="whitespace-nowrap">{translatedText}</span>
            </Link>
          );
        })}
      </nav>

      {/* Simplified Footer */}
      <div className="mt-auto p-4 border-t border-white/10">
        <div className="text-center text-xs text-blue-200/70 font-medium">
          © 2025 Capital Rise
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Desktop Sidebar - Solid dark blue like image */}
      <aside className="hidden lg:flex w-72 bg-blue-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar - Collapsible with solid blue */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="h-full bg-blue-900">
          <SidebarContent />
        </div>
      </MobileSidebar>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Exactly like image */}
        <header className="bg-white flex-shrink-0 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-6 w-6" />
            </div>
            
            {/* Left side - Welcome message */}
            <div className="flex-1">
              <div className="text-left">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('auth.welcome')}, {getUserDisplayName()}
                </h2>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <NotificationBell />
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold text-sm transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - No spacing, full width */}
        <main className="flex-1 bg-gray-100 overflow-auto p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}