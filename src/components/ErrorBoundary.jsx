import React from 'react';
import { toast } from 'react-hot-toast';
import Button from './ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Përditëso state për të shfaqur fallback UI
    return {
      hasError: true,
      errorId: this.generateErrorId()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Dërgo error report
    this.reportError(error, errorInfo);

    // Shfaq toast notification
    toast.error('Ndodhi një gabim në aplikacion. Po punojmë për ta rregulluar.', {
      duration: 5000,
      id: 'error-boundary'
    });
  }

  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  reportError(error, errorInfo) {
    try {
      // Dërgo error report në server
      fetch('/api/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId: this.state.errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-red-200">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🚨</div>
              <h1 className="text-3xl font-bold text-red-800 mb-2">
                Ndodhi një Gabim
              </h1>
              <p className="text-red-600 text-lg">
                Na falni, diçka shkoi keq në aplikacion
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-700 font-semibold">ID e Gabimit:</span>
                <code className="bg-red-100 px-2 py-1 rounded text-sm font-mono">
                  {this.state.errorId}
                </code>
              </div>
              
              {this.state.error && (
                <div className="mb-3">
                  <span className="text-red-700 font-semibold">Mesazhi:</span>
                  <p className="text-red-600 mt-1">{this.state.error.message}</p>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-red-700 font-semibold cursor-pointer">
                    Detaje të Gabimit (Development)
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 bg-red-100 p-3 rounded overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={this.handleRetry}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔄 Provoni Përsëri
              </Button>
              
              <Button
                onClick={this.handleReload}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
              >
                🔄 Rifresko Faqen
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
              >
                🏠 Kthehu në Ballina
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-8 text-center text-gray-600">
              <p className="mb-2">
                Nëse problemi vazhdon, ju lutem kontaktoni suportin teknik
              </p>
              <p className="text-sm">
                ID e gabimit: <strong>{this.state.errorId}</strong>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook për error handling në functional components
export const useErrorHandler = () => {
  const handleError = (error, context = '') => {
    console.error(`🚨 Error in ${context}:`, error);
    
    // Shfaq toast notification
    toast.error(
      error.message || 'Ndodhi një gabim. Provoni përsëri.',
      {
        duration: 5000,
        id: `error-${Date.now()}`
      }
    );

    // Dërgo error report
    reportErrorToServer(error, context);
  };

  const reportErrorToServer = async (error, context) => {
    try {
      await fetch('/api/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId: `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: error.message,
          stack: error.stack,
          context,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  return { handleError };
};

// Component për shfaqjen e errors të API
export const ApiErrorDisplay = ({ error, onRetry, onDismiss }) => {
  if (!error) return null;

  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    
    if (error.message) return error.message;
    
    return 'Ndodhi një gabim i panjohur';
  };

  const getErrorCode = (error) => {
    if (error.response?.data?.error?.code) {
      return error.response.data.error.code;
    }
    return 'UNKNOWN_ERROR';
  };

  const getErrorSeverity = (error) => {
    const code = getErrorCode(error);
    
    if (code.includes('AUTH_') || code.includes('SECURITY_')) return 'high';
    if (code.includes('VALIDATION_')) return 'medium';
    if (code.includes('RATE_LIMIT_')) return 'medium';
    return 'low';
  };

  const severity = getErrorSeverity(error);
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  const severityColors = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const severityIcons = {
    high: '🚨',
    medium: '⚠️',
    low: 'ℹ️'
  };

  return (
    <div className={`${severityColors[severity]} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-xl">{severityIcons[severity]}</span>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">
              {severity === 'high' ? 'Gabim Kritik' : 
               severity === 'medium' ? 'Paralajmërim' : 'Informacion'}
            </h3>
            <p className="text-sm mb-2">{message}</p>
            <code className="text-xs opacity-75">Code: {code}</code>
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      
      {onRetry && (
        <div className="mt-3">
          <Button
            onClick={onRetry}
            className="bg-white text-gray-700 px-4 py-2 rounded border hover:bg-gray-50 transition-colors text-sm"
          >
            🔄 Provoni Përsëri
          </Button>
        </div>
      )}
    </div>
  );
};

// Component për loading states me error handling
export const LoadingWithError = ({ loading, error, onRetry, children }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Duke ngarkuar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-4xl mb-4">😞</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Ndodhi një gabim
        </h3>
        <p className="text-gray-600 mb-4">
          Nuk mund të ngarkojmë të dhënat. Provoni përsëri.
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            🔄 Provoni Përsëri
          </Button>
        )}
      </div>
    );
  }

  return children;
};

export default ErrorBoundary; 