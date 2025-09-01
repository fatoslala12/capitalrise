import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  requiredPermissions = [],
  fallbackPath = '/',
  showAccessDenied = true 
}) => {
  const { user, isAuthenticated, loading, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const { t, ready } = useTranslation();

  // Safe translation function with fallback
  const safeT = (key, fallback = key) => {
    if (!ready || !t) return fallback;
    try {
      const translation = t(key);
      return translation === key ? fallback : translation;
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, error);
      return fallback;
    }
  };

  // Show loading spinner while checking authentication or translations
  if (loading || !ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{safeT('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (showAccessDenied) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-red-50">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {safeT('auth.accessDenied', 'Access Denied')}
            </h1>
            <p className="text-gray-600 mb-6">
              {safeT('auth.insufficientPermissions', 'Insufficient permissions')}
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {safeT('auth.currentRole', 'Current Role')}: <span className="font-semibold">{user.role}</span>
              </p>
              <p className="text-sm text-gray-500">
                {safeT('auth.requiredRoles', 'Required Roles')}: <span className="font-semibold">{allowedRoles.join(', ')}</span>
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {safeT('common.goBack', 'Go Back')}
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      if (showAccessDenied) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-red-50">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {safeT('auth.permissionDenied', 'Permission Denied')}
              </h1>
              <p className="text-gray-600 mb-6">
                {safeT('auth.insufficientPermissions', 'Insufficient permissions')}
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  {safeT('auth.currentRole', 'Current Role')}: <span className="font-semibold">{user.role}</span>
                </p>
                <p className="text-sm text-gray-500">
                  {safeT('auth.requiredPermissions', 'Required Permissions')}: <span className="font-semibold">{requiredPermissions.join(', ')}</span>
                </p>
              </div>
              <button
                onClick={() => window.history.back()}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {safeT('common.goBack', 'Go Back')}
              </button>
            </div>
          </div>
        );
      }
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Access granted - render children
  return children;
};

// Higher-order component for role-based protection
export const withRoleProtection = (Component, allowedRoles = [], requiredPermissions = []) => {
  return (props) => (
    <ProtectedRoute allowedRoles={allowedRoles} requiredPermissions={requiredPermissions}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Higher-order component for admin-only routes
export const withAdminProtection = (Component) => {
  return withRoleProtection(Component, ['admin']);
};

// Higher-order component for manager+ routes
export const withManagerProtection = (Component) => {
  return withRoleProtection(Component, ['admin', 'manager']);
};

// Higher-order component for authenticated users only
export const withAuthProtection = (Component) => {
  return (props) => (
    <ProtectedRoute>
      <Component {...props} />
    </ProtectedRoute>
  );
};

export default ProtectedRoute;