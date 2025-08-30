import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";
import Login from "../pages/Login";
import ProtectedRoute, { 
  withAdminProtection, 
  withManagerProtection, 
  withAuthProtection 
} from "../components/ProtectedRoute";

// Lazy load components for better performance
const Dashboard = lazy(() => import("../pages/Dashboard"));
const WorkHours = lazy(() => import("../pages/WorkHours"));
const Payments = lazy(() => import("../pages/Payments"));
const Contracts = lazy(() => import("../pages/Contracts"));
const EmployeesList = lazy(() => import("../pages/EmployeesList"));
const EmployeeDetails = lazy(() => import("../pages/EmployeeDetails"));
const ContractDetails = lazy(() => import("../pages/ContractDetails"));
const Tasks = lazy(() => import("../pages/Tasks"));
const MyTasks = lazy(() => import("../pages/MyTasks"));
const Reports = lazy(() => import("../pages/Reports"));
const PaymentDetails = lazy(() => import("../pages/PaymentDetails"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const MyProfile = lazy(() => import("../pages/MyProfile"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
const NotificationAnalytics = lazy(() => import("../pages/NotificationAnalytics"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const BackupManagement = lazy(() => import("../pages/BackupManagement"));
const AuditTrail = lazy(() => import("../pages/AuditTrail"));

// Enhanced loading component with animations
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <div className="text-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
      </div>
      <div className="animate-pulse">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading...</h2>
        <p className="text-gray-500">Please wait while we prepare your dashboard</p>
      </div>
    </div>
  </div>
);

export default function AppRouter() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Authentication routes */}
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<Login />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            {/* Redirect root to role-based dashboard */}
            <Route path="/" element={<Navigate to={`/${user.role}/dashboard`} />} />
            <Route path="/dashboard" element={<Navigate to={`/${user.role}/dashboard`} />} />
            
            {/* Admin routes with enhanced protection */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="work-hours" element={<WorkHours />} />
              <Route path="payments" element={<Payments />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="employees-list" element={<EmployeesList />} />
              <Route path="employee/:id" element={<EmployeeDetails />} />
              <Route path="contracts/:contract_number" element={<ContractDetails />} />
              <Route path="payments/details/:contract_number" element={<PaymentDetails />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="reports" element={<Reports />} />
              <Route path="backup" element={<BackupManagement />} />
              <Route path="audit-trail" element={<AuditTrail />} />
              <Route path="my-profile" element={<MyProfile />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="notifications/analytics" element={<NotificationAnalytics />} />
            </Route>

            {/* Manager routes with enhanced protection */}
            <Route path="/manager" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="work-hours" element={<WorkHours />} />
              <Route path="payments" element={<Payments />} />
              <Route path="employees-list" element={<EmployeesList />} />
              <Route path="employee/:id" element={<EmployeeDetails />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="my-profile" element={<MyProfile />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>

            {/* User routes with enhanced protection */}
            <Route path="/user" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="work-hours" element={<WorkHours />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="my-profile" element={<MyProfile />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>

            {/* Catch-all route for authenticated users */}
            <Route path="*" element={
              <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center max-w-md mx-auto p-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                  <p className="text-gray-600 mb-6">
                    The page you're looking for doesn't exist or you don't have access to it.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            } />
          </>
        )}
      </Routes>
    </Suspense>
  );
}