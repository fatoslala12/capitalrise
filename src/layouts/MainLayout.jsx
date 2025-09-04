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
      {/* Logo Section - Bigger and cleaner */}
      <div className="p-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2">
            <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Capital Rise</h1>
            <p className="text-xs text-blue-200 capitalize">
              {user?.role === 'admin' ? 'Administrator' : 
               user?.role === 'manager' ? 'Manager' : 
               'User'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation - Like in image */}
      <nav className="flex-1 px-4 space-y-1">
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
                  ? "bg-blue-400/30 text-white shadow-lg" 
                  : "text-white hover:bg-white/10"
              }`}
            >
              <span className="text-lg">{icon}</span>
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
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      {/* Desktop Sidebar - Proper Blue Design */}
      <aside className="hidden lg:flex w-64 relative">
        {/* Proper blue gradient background like in image */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-700 to-blue-600"></div>
        
        {/* Content */}
        <div className="relative w-full">
          <SidebarContent />
        </div>
      </aside>
      
      {/* Desktop content spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0"></div>

      {/* Mobile Sidebar - Collapsible with proper design */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="relative h-full">
          {/* Proper blue gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-700 to-blue-600"></div>
          
          {/* Content */}
          <div className="relative h-full">
            <SidebarContent />
          </div>
        </div>
      </MobileSidebar>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full relative">
        {/* White Modern Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Desktop spacer */}
            <div className="hidden lg:block flex-1"></div>
            
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-8 w-8" />
              <span className="font-bold text-lg text-gray-900">Capital Rise</span>
            </div>
            
            {/* Center welcome message - Modern distribution */}
            <div className="hidden sm:flex flex-1 justify-center">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  {t('auth.welcome')}, {getUserDisplayName()}
                </h2>
                <p className="text-sm text-gray-500 font-medium">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            {/* Mobile welcome */}
            <div className="sm:hidden flex flex-1 justify-center">
              <span className="text-sm font-medium text-gray-600">{t('auth.welcome')}</span>
            </div>
            
            {/* Right side actions - Modern spacing */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <NotificationBell />
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 text-sm"
              >
                <span>🚪</span>
                <span className="hidden sm:inline">{t('navigation.logout')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - No spacing */}
        <main className="flex-1 bg-gray-100 overflow-auto">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}