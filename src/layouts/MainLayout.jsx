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
      {/* Modern Logo Section */}
      <div className="relative p-6 mb-6">
        <div className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
              <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-8 w-8 md:h-10 md:w-10" />
            </div>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">Capital Rise</h1>
            <p className="text-xs text-blue-200/80 font-medium">Business Management</p>
          </div>
        </div>
      </div>

      {/* Modern Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {menu.map((item, index) => {
          const isActive = location.pathname === item.path;
          const icon = item.label.split(" ")[0];
          const translatedText = translateNavText(item.path, item.label.replace(/^[^ ]+ /, ""));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all duration-300 transform hover:scale-[1.02] ${
                isActive 
                  ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white shadow-lg border border-white/20 backdrop-blur-md" 
                  : "text-blue-100 hover:bg-white/10 hover:text-white hover:shadow-md"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"></div>
              )}
              
              {/* Icon with glow effect */}
              <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
                <span className="text-xl filter drop-shadow-lg">{icon}</span>
                {isActive && (
                  <div className="absolute inset-0 text-xl blur-sm opacity-50">{icon}</div>
                )}
              </div>
              
              {/* Text with smooth transition */}
              <span className="whitespace-nowrap transition-all duration-300 group-hover:translate-x-1">
                {translatedText}
              </span>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            </Link>
          );
        })}
      </nav>

      {/* Modern Footer */}
      <div className="mt-auto p-6 border-t border-white/10">
        <div className="text-center">
          <div className="text-xs text-blue-200/70 font-medium mb-2">© 2025 Capital Rise</div>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Desktop Sidebar - Modern Glassmorphism Design */}
      <aside className="hidden lg:flex w-72 relative">
        {/* Background with modern gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10"></div>
        
        {/* Glassmorphism overlay */}
        <div className="relative w-full bg-white/5 backdrop-blur-xl border-r border-white/10 shadow-2xl">
          <SidebarContent />
        </div>
      </aside>
      
      {/* Desktop content spacer */}
      <div className="hidden lg:block w-72 flex-shrink-0"></div>

      {/* Mobile Sidebar - Collapsible with modern design */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="relative h-full">
          {/* Background with modern gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10"></div>
          
          {/* Glassmorphism overlay */}
          <div className="relative h-full bg-white/5 backdrop-blur-xl border-r border-white/10">
            <SidebarContent />
          </div>
        </div>
      </MobileSidebar>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full relative">
        {/* Modern Header with Glassmorphism */}
        <header className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-white/80 to-purple-50/50"></div>
          
          <div className="relative px-4 sm:px-6 py-4 flex items-center justify-between">
            {/* Mobile menu button - Modern design */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden group relative p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-300 border border-blue-200/50"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6 text-gray-700 group-hover:text-blue-600 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Desktop spacer */}
            <div className="hidden lg:block flex-1"></div>
            
            {/* Mobile center logo - Enhanced */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg blur opacity-30"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-white/50">
                  <img src="/Capital%20Rise%20logo.png" alt="Capital Rise Logo" className="h-6 w-6" />
                </div>
              </div>
              <span className="font-bold text-gray-900 text-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Capital Rise
              </span>
            </div>
            
            {/* Center welcome message - Modern typography */}
            <div className="hidden sm:flex flex-1 justify-center">
              <div className="text-center">
                <h2 className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
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
            
            {/* Mobile welcome message */}
            <div className="sm:hidden flex flex-1 justify-center">
              <span className="text-gray-600 font-medium text-sm">
                {t('auth.welcome')}
              </span>
            </div>
            
            {/* Right side actions - Modern buttons */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <div className="relative">
                <NotificationBell />
              </div>
              <button
                onClick={logout}
                className="group relative px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="text-lg group-hover:rotate-12 transition-transform duration-300">🚪</span>
                <span className="hidden sm:inline">{t('navigation.logout')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - Modern Design */}
        <main className="flex-1 relative overflow-auto w-full">
          {/* Background with subtle pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10"></div>
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), 
                             radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)`
          }}></div>
          
          {/* Content with modern styling */}
          <div className="relative z-10 h-full">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}