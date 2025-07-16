import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";
import Login from "../pages/Login";

// Lazy load components for better performance
const Dashboard = lazy(() => import("../pages/Dashboard"));
const WorkHours = lazy(() => import("../pages/WorkHours"));
const Payments = lazy(() => import("../pages/Payments"));
const Contracts = lazy(() => import("../pages/Contracts"));
const Employees = lazy(() => import("../pages/Employees"));
const EmployeesList = lazy(() => import("../pages/EmployeesList"));
const EmployeeDetails = lazy(() => import("../pages/EmployeeDetails"));
const ContractDetails = lazy(() => import("../pages/ContractDetails"));
const Tasks = lazy(() => import("../pages/Tasks"));
const MyTasks = lazy(() => import("../pages/MyTasks"));
const Reports = lazy(() => import("../pages/Reports"));
const PaymentDetails = lazy(() => import("../pages/PaymentDetails"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const MyProfile = lazy(() => import("../pages/MyProfile"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

export default function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Rruga për Forgot Password e hapur për të gjithë */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {!user ? (
          <>
            <Route path="/" element={<Login />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to={`/${user.role}/dashboard`} />} />

            <Route path="/admin" element={<MainLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="work-hours" element={<WorkHours />} />
              <Route path="payments" element={<Payments />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees-list" element={<EmployeesList />} />
              <Route path="employee/:id" element={<EmployeeDetails />} />
              <Route path="contracts/:contract_number" element={<ContractDetails />} />
              <Route path="payments/details/:contract_number" element={<PaymentDetails />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="reports" element={<Reports />} />
              <Route path="my-profile" element={<MyProfile />} />
            </Route>

            <Route path="/manager" element={<MainLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="work-hours" element={<WorkHours />} />
              <Route path="payments" element={<Payments />} />
              <Route path="employees-list" element={<EmployeesList />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="my-profile" element={<MyProfile />} />
            </Route>

            <Route path="/user" element={<MainLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="work-hours" element={<WorkHours />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="my-profile" element={<MyProfile />} />
            </Route>
          </>
        )}
      </Routes>
    </Suspense>
  );
}