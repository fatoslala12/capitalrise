import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import WorkHours from "../pages/WorkHours";
import Payments from "../pages/Payments";
import Contracts from "../pages/Contracts";
import Employees from "../pages/Employees";
import EmployeesList from "../pages/EmployeesList";
import EmployeeDetails from "../pages/EmployeeDetails";
import ContractDetails from "../pages/ContractDetails";
import Tasks from "../pages/Tasks";
import MyTasks from "../pages/MyTasks";
import Reports from "../pages/Reports";
import PaymentDetails from "../pages/PaymentDetails";
import ForgotPassword from "../pages/ForgotPassword";
import { useAuth } from "../context/AuthContext";
import Login from "../pages/Login";

export default function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center p-10">Duke u ngarkuar...</div>;
  }

  return (
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
          </Route>

          <Route path="/manager" element={<MainLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="work-hours" element={<WorkHours />} />
            <Route path="payments" element={<Payments />} />
            <Route path="employees-list" element={<EmployeesList />} />
            <Route path="my-tasks" element={<MyTasks />} />
          </Route>

          <Route path="/user" element={<MainLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="work-hours" element={<WorkHours />} />
            <Route path="my-tasks" element={<MyTasks />} />
          </Route>
        </>
      )}
    </Routes>
  );
}