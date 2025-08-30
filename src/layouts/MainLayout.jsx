import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { MobileSidebar } from "../components/ui/Layout";
import NotificationBell from "../components/NotificationBell";
import api from "../api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const adminMenu = [
  { path: "/admin/dashboard", label: "🏠 Dashboard", icon: "🏠" },
  { path: "/admin/employees-list", label: "👷 Punonjësit", icon: "👷" },
  { path: "/admin/work-hours", label: "🕒 Orët e Punës", icon: "🕒" },
  { path: "/admin/payments", label: "💰 Pagesat", icon: "💰" },
  { path: "/admin/contracts", label: "📄 Kontratat", icon: "📄" },
  { path: "/admin/tasks", label: "📝 Detyrat", icon: "📝" },
  { path: "/admin/reports", label: "📈 Raportet", icon: "📈" },
  { path: "/admin/backup", label: "💾 Backup", icon: "💾" },
  { path: "/admin/audit-trail", label: "🔍 Audit Trail", icon: "🔍" },
  { path: "/admin/notifications", label: "🔔 Njoftimet", icon: "🔔" },
  { path: "/admin/notifications/analytics", label: "📊 Analytics", icon: "📊" },
];

const managerMenu = [
  { path: "/manager/dashboard", label: "🏠 Dashboard", icon: "🏠" },
  { path: "/manager/my-tasks", label: "📝 Detyrat e Mia", icon: "📝" },
  { path: "/manager/employees-list", label: "👷 Menaxho Punonjësit", icon: "👷" },
  { path: "/manager/work-hours", label: "🕒 Orët e Punës", icon: "🕒" },
  { path: "/manager/my-profile", label: "👤 Profili Im", icon: "👤" },
];

const userMenu = [
  { path: "/user/dashboard", label: "🏠 Dashboard", icon: "🏠" },
  { path: "/user/work-hours", label: "🕒 Orët e Punës", icon: "🕒" },
  { path: "/user/my-tasks", label: "📝 Detyrat e Mia", icon: "📝" },
  { path: "/user/my-profile", label: "👤 Profili Im", icon: "👤" },
];

export default function MainLayout() {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const { t } = useTranslation();

  // Get user display name with fallback
  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user?.firstName) {
      return user.firstName;
    } else {
      return user?.email || '';
    }
  };

  // Enhanced navigation text translation
  const translateNavText = (path, fallbackText) => {
    if (path.endsWith('/dashboard')) return t('navigation.dashboard');
    if (path.includes('/employees')) return t('navigation.employees');
    if (path.includes('/work-hours')) return t('navigation.workHours');
    if (path.includes('/payments')) return t('navigation.payments');
    if (path.includes('/contracts')) return t('navigation.contracts');
    if (path.includes('/tasks')) return t('navigation.tasks');
    if (path.includes('/reports')) return t('navigation.reports');
    if (path.includes('/notifications')) return t('navigation.notifications');
    if (path.includes('/analytics')) return t('navigation.analytics');
    return fallbackText;
  };

  // Get menu based on user role and permissions
  const getMenu = () => {
    if (hasRole('admin')) return adminMenu;
    if (hasRole('manager')) return managerMenu;
    if (hasRole('user')) return userMenu;
    return [];
  };

  const menu = getMenu();

  // Enhanced sidebar content with animations
  const SidebarContent = () => (
    <>
      {/* Enhanced Logo Section */}
      <div className="p-4 text-center border-b border-blue-800/30 mb-6 bg-gradient-to-r from-blue-900/20 to-blue-800/20 backdrop-blur-md">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img 
            src="/Capital%20Rise%20logo.png" 
            alt="Capital Rise Logo" 
            className="h-12 w-12 animate-float" 
          />
        </div>
        <h1 className="text-xl font-bold text-white drop-shadow-lg animate-fade-in">
          Capital Rise
        </h1>
        <div className="mt-2 px-3 py-1 bg-blue-600/30 rounded-full">
          <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
            {user?.role || 'User'}
          </span>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2">
        {menu.map((item, index) => {
          const isActive = location.pathname === item.path;
          const translatedText = translateNavText(item.path, item.label.replace(/^[^ ]+ /, ""));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105
                ${isActive 
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg border-l-4 border-blue-200" 
                  : "text-blue-100 hover:bg-blue-700/50 hover:text-white hover:shadow-md"
                }
                animate-slide-in-left
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${isActive ? 'animate-pulse' : ''}`}>
                {item.icon}
              </span>
              <span className="flex-1 whitespace-nowrap font-semibold">
                {translatedText}
              </span>
              {isActive && (
                <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Enhanced Footer */}
      <div className="mt-auto p-4 border-t border-blue-800/30">
        <div className="text-center">
          <div className="text-xs text-blue-200 mb-2">
            © 2025 Capital Rise
          </div>
          <div className="text-xs text-blue-300/70">
            v2.0.0 • Enhanced
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex bg-gradient-to-b from-[#1e3c72] via-[#2a5298] to-[#6dd5ed] text-white flex-col shadow-2xl fixed h-full z-10 transition-all duration-500 ${
          isSidebarHovered ? 'w-64' : 'w-56'
        }`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <SidebarContent />
      </aside>
      
      {/* Desktop content spacer */}
      <div className={`hidden lg:block transition-all duration-500 ${isSidebarHovered ? 'w-64' : 'w-56'}`}></div>

      {/* Enhanced Mobile Sidebar */}
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
        {/* Enhanced Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 px-4 py-4 flex items-center justify-between sticky top-0 z-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Desktop spacer */}
          <div className="hidden lg:block flex-1"></div>
          
          {/* Enhanced Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-8 w-8" />
            <span className="font-bold text-gray-900 text-sm">Capital Rise</span>
          </div>
          
          {/* Enhanced Welcome message */}
          <div className="hidden sm:flex flex-1 justify-center">
            <div className="text-center">
              <span className="text-gray-600 font-medium text-sm">
                {t('auth.welcome')}, 
              </span>
              <span className="text-gray-900 font-semibold text-sm ml-1">
                {getUserDisplayName()}
              </span>
            </div>
          </div>
          
          {/* Mobile welcome message */}
          <div className="sm:hidden flex flex-1 justify-center">
            <span className="text-gray-600 font-medium text-xs">
              {t('auth.welcome')}
            </span>
          </div>
          
          {/* Enhanced Right side actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell />
            
            {/* Enhanced Logout button */}
            <button
              onClick={logout}
              className="group px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="text-lg transition-transform duration-300 group-hover:rotate-12">🚪</span>
              <span className="hidden sm:inline">{t('navigation.logout')}</span>
            </button>
          </div>
        </header>

        {/* Enhanced Main Content */}
        <main className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 overflow-auto w-full p-4">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}