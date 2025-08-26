import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./components/ui/Toast";
import { LanguageProvider } from "./context/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AppRouter from "./routes/AppRouter";
import PerformanceOptimizer from "./components/PerformanceOptimizer";
import "./App.css";
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <LanguageProvider>
                <PerformanceOptimizer />
                <Toaster position="top-right" reverseOrder={false} />
                <AppRouter />
              </LanguageProvider>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;