# 🛡️ Error Handling i Përmirësuar - Udhëzues i Plotë

## 📋 Përmbajtja

1. [Përmbledhje](#përmbledhje)
2. [Funksionalitete](#funksionalitete)
3. [Instalimi dhe Konfigurimi](#instalimi-dhe-konfigurimi)
4. [Përdorimi](#përdorimi)
5. [Error Codes](#error-codes)
6. [Validation](#validation)
7. [Rate Limiting](#rate-limiting)
8. [Frontend Error Handling](#frontend-error-handling)
9. [Monitoring dhe Reporting](#monitoring-dhe-reporting)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Përmbledhje

Sistemi i Error Handling i Përmirësuar ofron një zgjidhje të plotë për menaxhimin e gabimeve në sistemin e ndërtimit:

- ✅ **Error handling i centralizuar** me logging të avancuar
- ✅ **Validation i plotë** i të dhënave
- ✅ **Rate limiting** për mbrojtje nga abuzimi
- ✅ **Error reporting** nga frontend
- ✅ **Monitoring automatik** i gabimeve
- ✅ **Notifications** për adminët për gabime kritike
- ✅ **Error boundaries** në React
- ✅ **Audit trail** për të gjitha gabimet

---

## 🚀 Funksionalitete

### **1. Backend Error Handling**
- **Custom Error Classes** me error codes të standardizuara
- **Middleware i avancuar** për trajtimin e gabimeve
- **Logging me ngjyra** për debugging të lehtë
- **Error responses të formatuara** për frontend
- **Integration me audit trail** për gjurmim

### **2. Validation Service**
- **Validation rules** për të gjitha entitetet
- **Custom validation** për rregulla të biznesit
- **Sanitization** e të dhënave
- **Type checking** automatik
- **Error messages** në shqip

### **3. Rate Limiting**
- **Rate limiting** për endpoints të ndryshëm
- **Configurabël** për lloje të ndryshme kërkesash
- **Auto cleanup** e rate limits të vjetër
- **Monitoring** i rate limit violations
- **Headers** për frontend

### **4. Frontend Error Handling**
- **Error Boundaries** për React components
- **Error reporting** automatik në server
- **User-friendly** error messages
- **Retry mechanisms** për kërkesa të dështuara
- **Loading states** me error handling

### **5. Error Monitoring**
- **Real-time error tracking** nga frontend dhe backend
- **Error statistics** dhe trends
- **Automatic notifications** për adminët
- **Error retention** dhe cleanup
- **Error details** për debugging

---

## ⚙️ Instalimi dhe Konfigurimi

### **1. Backend Setup**

#### **Error Handler Middleware:**
```javascript
// Në app.js
const {
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
  databaseErrorHandler,
  rateLimitErrorHandler,
  securityErrorHandler
} = require('./middleware/errorHandler');

// Apply middleware
app.use(validationErrorHandler);
app.use(databaseErrorHandler);
app.use(rateLimitErrorHandler);
app.use(securityErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);
```

#### **Rate Limiting:**
```javascript
const RateLimitService = require('./services/rateLimitService');
const rateLimitService = new RateLimitService();

// Start auto cleanup
rateLimitService.startAutoCleanup();

// Apply rate limiting
app.use('/api/auth', rateLimitService.authRateLimitMiddleware());
app.use('/api', rateLimitService.apiRateLimitMiddleware());
app.use('/api/backup', rateLimitService.backupRateLimitMiddleware());
app.use('/api/real-time-alerts', rateLimitService.alertsRateLimitMiddleware());
```

#### **Validation Service:**
```javascript
const ValidationService = require('./services/validationService');
const validationService = new ValidationService();

// Përdorimi në controllers
const userData = validationService.validate(req.body, 'user');
const sanitizedData = validationService.sanitize(req.body, 'user');
```

### **2. Frontend Setup**

#### **Error Boundary:**
```javascript
// Në App.jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* App content */}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

#### **Error Handling Hook:**
```javascript
import { useErrorHandler } from './components/ErrorBoundary';

function MyComponent() {
  const { handleError } = useErrorHandler();
  
  const handleApiCall = async () => {
    try {
      const response = await api.get('/some-endpoint');
      // Handle success
    } catch (error) {
      handleError(error, 'API call failed');
    }
  };
}
```

---

## 🎮 Përdorimi

### **1. Backend Error Handling**

#### **Krijimi i Custom Errors:**
```javascript
const { createError, AppError } = require('../middleware/errorHandler');

// Krijimi i error nga code
const error = createError('VALIDATION_ERROR', {
  field: 'email',
  value: 'invalid-email'
});

// Krijimi i error direkt
const customError = new AppError(
  'Përdoruesi nuk u gjet',
  404,
  'USER_NOT_FOUND',
  { userId: 123 }
);
```

#### **Përdorimi në Controllers:**
```javascript
const { asyncHandler, createError } = require('../middleware/errorHandler');

// Me async handler
exports.getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    throw createError('VALIDATION_REQUIRED_FIELD', null, 'ID është i detyrueshëm');
  }
  
  const user = await User.findById(id);
  if (!user) {
    throw createError('DB_RECORD_NOT_FOUND', null, 'Përdoruesi nuk u gjet');
  }
  
  res.json({ success: true, data: user });
});
```

#### **Validation në Controllers:**
```javascript
const ValidationService = require('../services/validationService');
const validationService = new ValidationService();

exports.createUser = asyncHandler(async (req, res) => {
  // Validizo të dhënat
  validationService.validate(req.body, 'user');
  
  // Sanitize të dhënat
  const sanitizedData = validationService.sanitize(req.body, 'user');
  
  // Krijo përdoruesin
  const user = await User.create(sanitizedData);
  
  res.status(201).json({ success: true, data: user });
});
```

### **2. Frontend Error Handling**

#### **Error Boundary:**
```javascript
// Error Boundary do të kapë automatikisht errors
// dhe do të shfaqë një UI të bukur për përdoruesin
```

#### **API Error Handling:**
```javascript
import { ApiErrorDisplay, LoadingWithError } from './components/ErrorBoundary';

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/users');
      setUsers(response.data.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingWithError loading={loading} error={error} onRetry={fetchUsers}>
      <div>
        {users.map(user => (
          <div key={user.id}>{user.name}</div>
        ))}
      </div>
    </LoadingWithError>
  );
}
```

#### **Custom Error Handling:**
```javascript
import { useErrorHandler } from './components/ErrorBoundary';

function LoginForm() {
  const { handleError } = useErrorHandler();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/api/auth/login', formData);
      // Handle success
    } catch (error) {
      handleError(error, 'Login failed');
    }
  };
}
```

---

## 🔢 Error Codes

### **Authentication & Authorization**
```javascript
AUTH_INVALID_TOKEN: 'Token i pavlefshëm'
AUTH_EXPIRED_TOKEN: 'Token ka skaduar'
AUTH_INSUFFICIENT_PERMISSIONS: 'Nuk keni leje për këtë veprim'
AUTH_USER_NOT_FOUND: 'Përdoruesi nuk u gjet'
```

### **Database**
```javascript
DB_CONNECTION_ERROR: 'Gabim në lidhjen me databazën'
DB_QUERY_ERROR: 'Gabim në ekzekutimin e query'
DB_RECORD_NOT_FOUND: 'Regjistri nuk u gjet'
DB_DUPLICATE_ENTRY: 'Regjistri ekziston tashmë'
DB_FOREIGN_KEY_VIOLATION: 'Gabim në lidhjen e të dhënave'
```

### **Validation**
```javascript
VALIDATION_ERROR: 'Të dhënat nuk janë të vlefshme'
VALIDATION_REQUIRED_FIELD: 'Fusha është e detyrueshme'
VALIDATION_INVALID_FORMAT: 'Formati nuk është i vlefshëm'
VALIDATION_INVALID_EMAIL: 'Email-i nuk është i vlefshëm'
VALIDATION_INVALID_PHONE: 'Numri i telefonit nuk është i vlefshëm'
```

### **File Operations**
```javascript
FILE_UPLOAD_ERROR: 'Gabim në ngarkimin e file'
FILE_NOT_FOUND: 'File nuk u gjet'
FILE_TOO_LARGE: 'File është shumë i madh'
FILE_INVALID_TYPE: 'Tipi i file nuk është i lejuar'
```

### **Business Logic**
```javascript
BUSINESS_RULE_VIOLATION: 'Shkelohet rregulla e biznesit'
INSUFFICIENT_BALANCE: 'Bilanci i pamjaftueshëm'
CONTRACT_EXPIRED: 'Kontrata ka skaduar'
EMPLOYEE_ALREADY_ASSIGNED: 'Punonjësi është caktuar tashmë'
```

### **System**
```javascript
INTERNAL_SERVER_ERROR: 'Gabim i brendshëm i serverit'
SERVICE_UNAVAILABLE: 'Shërbimi nuk është i disponueshëm'
RATE_LIMIT_EXCEEDED: 'Keni tejkaluar limitin e kërkesave'
MAINTENANCE_MODE: 'Sistemi është në mirëmbajtje'
```

---

## ✅ Validation

### **1. Validation Rules**

#### **User Validation:**
```javascript
const userRules = {
  email: {
    required: true,
    type: 'email',
    minLength: 5,
    maxLength: 255,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/
  }
};
```

#### **Employee Validation:**
```javascript
const employeeRules = {
  firstName: { required: true, minLength: 2, maxLength: 50 },
  lastName: { required: true, minLength: 2, maxLength: 50 },
  email: { required: true, type: 'email' },
  phone: { required: false, pattern: /^[\+]?[0-9\s\-\(\)]{8,15}$/ },
  hourlyRate: { required: true, type: 'number', min: 0, max: 1000 },
  startDate: { required: true, type: 'date' }
};
```

### **2. Custom Validation**

#### **Date Range Validation:**
```javascript
const { startDate, endDate } = validationService.validateDateRange(
  req.body.startDate,
  req.body.endDate,
  'startDate',
  'endDate'
);
```

#### **Amount Validation:**
```javascript
const amount = validationService.validateAmount(req.body.amount, 'amount');
```

#### **ID Validation:**
```javascript
const userId = validationService.validateId(req.params.id, 'userId');
```

### **3. Sanitization**

```javascript
// Sanitize të dhënat para ruajtjes
const sanitizedData = validationService.sanitize(req.body, 'user');

// Rezultati:
// - Trim whitespace
// - Remove HTML tags
// - Convert types
// - Limit lengths
```

---

## 🚦 Rate Limiting

### **1. Configuration**

#### **Default Limits:**
```javascript
const defaultConfig = {
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 100, // 100 requests per window
  message: 'Keni tejkaluar limitin e kërkesave',
  statusCode: 429,
  headers: true
};
```

#### **Auth Limits:**
```javascript
const authConfig = {
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // 5 login attempts per 15 minutes
  message: 'Shumë tentativa të dështuara',
  statusCode: 429,
  skipSuccessfulRequests: true
};
```

#### **API Limits:**
```javascript
const apiConfig = {
  windowMs: 60 * 1000, // 1 minutë
  max: 60, // 60 requests per minute
  message: 'Keni tejkaluar limitin e kërkesave API'
};
```

### **2. Usage**

#### **Apply Rate Limiting:**
```javascript
// Në app.js
app.use('/api/auth', rateLimitService.authRateLimitMiddleware());
app.use('/api', rateLimitService.apiRateLimitMiddleware());
app.use('/api/backup', rateLimitService.backupRateLimitMiddleware());
```

#### **Custom Rate Limits:**
```javascript
// Shto custom rate limit
rateLimitService.addCustomRateLimit('custom', {
  windowMs: 60 * 60 * 1000, // 1 orë
  max: 10, // 10 requests per hour
  message: 'Custom rate limit exceeded'
});

// Përdor në route
app.use('/api/custom', rateLimitService.rateLimitMiddleware('custom'));
```

#### **Check Rate Limits:**
```javascript
// Kontrollo nëse përdoruesi është i bllokuar
const isBlocked = rateLimitService.isUserBlocked(userId, 'auth');

// Merr kohën e mbetur
const timeLeft = rateLimitService.getTimeUntilReset(userId, 'auth');
```

---

## 🎨 Frontend Error Handling

### **1. Error Boundary**

#### **Automatic Error Catching:**
```javascript
// Error Boundary do të kapë automatikisht errors
// dhe do të shfaqë një UI të bukur
```

#### **Error Reporting:**
```javascript
// Errors dërgohen automatikisht në server
// me detaje të plota për debugging
```

### **2. API Error Display**

#### **Usage:**
```javascript
import { ApiErrorDisplay } from './components/ErrorBoundary';

function MyComponent() {
  const [error, setError] = useState(null);

  return (
    <div>
      <ApiErrorDisplay 
        error={error} 
        onRetry={() => fetchData()}
        onDismiss={() => setError(null)}
      />
      {/* Component content */}
    </div>
  );
}
```

#### **Error Severity:**
- **High**: Authentication, Security errors (🚨)
- **Medium**: Validation, Rate limit errors (⚠️)
- **Low**: Info, general errors (ℹ️)

### **3. Loading States**

#### **Usage:**
```javascript
import { LoadingWithError } from './components/ErrorBoundary';

function DataComponent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);

  return (
    <LoadingWithError 
      loading={loading} 
      error={error} 
      onRetry={fetchData}
    >
      <div>
        {data.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </LoadingWithError>
  );
}
```

---

## 📊 Monitoring dhe Reporting

### **1. Error Statistics**

#### **API Endpoints:**
```bash
# Merr statistika të errors
GET /api/error-report/stats?days=7

# Merr errors të fundit
GET /api/error-report/recent?limit=50&hours=24

# Merr error details
GET /api/error-report/details/:errorId

# Merr error trends
GET /api/error-report/trends?days=7

# Pastro errors të vjetër
POST /api/error-report/cleanup
```

#### **Response Format:**
```json
{
  "success": true,
  "data": {
    "statsByDate": [
      {
        "date": "2024-01-15",
        "frontendErrors": 5,
        "backendErrors": 2,
        "total": 7
      }
    ],
    "totalErrors": 25,
    "period": "7 ditë"
  }
}
```

### **2. Error Notifications**

#### **Automatic Notifications:**
- **Critical errors** dërgohen automatikisht për adminët
- **Frontend errors** me stack traces
- **Rate limit violations** për monitoring
- **Security violations** për alerting

#### **Notification Content:**
```javascript
{
  title: '🚨 Gabim Kritik në Sistem',
  message: `Error ID: ${errorId}\nMesazhi: ${message}\nURL: ${url}`,
  severity: 'high',
  priority: 5
}
```

### **3. Error Logging**

#### **Console Logging:**
```javascript
// Logs me ngjyra për debugging të lehtë
console.error('\x1b[31m%s\x1b[0m', '🚨 ERROR LOG:');
console.error('\x1b[33m%s\x1b[0m', `Code: ${errorCode}`);
console.error('\x1b[33m%s\x1b[0m', `Status: ${statusCode}`);
console.error('\x1b[33m%s\x1b[0m', `Message: ${message}`);
```

#### **Audit Trail:**
```javascript
// Errors ruhen në audit_trail për gjurmim
await auditService.logSystemEvent(
  'ERROR_CRITICAL',
  `Gabim kritik: ${error.message}`,
  {
    errorCode: error.errorCode,
    statusCode: error.statusCode,
    url: req.originalUrl,
    user: req.user?.email
  },
  'error'
);
```

---

## 🔧 Troubleshooting

### **Problemat e Zakonshme**

#### **1. "Validation Error"**
```javascript
// Kontrollo validation rules
const rules = validationService.getValidationRules('user');
console.log('Validation rules:', rules);

// Kontrollo nëse field është i detyrueshëm
const isRequired = validationService.isRequired('user', 'email');
```

#### **2. "Rate Limit Exceeded"**
```javascript
// Kontrollo rate limit status
const stats = rateLimitService.getRateLimitStats();
console.log('Rate limit stats:', stats);

// Reset rate limit për përdorues
rateLimitService.resetRateLimit(userId, 'auth');
```

#### **3. "Database Connection Error"**
```javascript
// Kontrollo connection pool
const pool = require('../db');
const result = await pool.query('SELECT NOW()');
console.log('Database connection OK:', result.rows[0]);
```

#### **4. "Frontend Error Not Reporting"**
```javascript
// Kontrollo error reporting endpoint
fetch('/api/error-report/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    errorId: 'test',
    message: 'Test error',
    url: window.location.href
  })
});
```

### **Debugging**

#### **Enable Debug Mode:**
```javascript
// Në development
process.env.NODE_ENV = 'development';

// Në production
process.env.NODE_ENV = 'production';
```

#### **Error Logs:**
```bash
# Kontrollo error logs
tail -f logs/error.log

# Kontrollo rate limit violations
grep "RATE LIMIT VIOLATION" logs/app.log

# Kontrollo validation errors
grep "VALIDATION_ERROR" logs/app.log
```

#### **Performance Monitoring:**
```javascript
// Kontrollo performance të error handling
console.time('error-handling');
// Error handling code
console.timeEnd('error-handling');
```

---

## 📈 Best Practices

### **1. Error Handling**

#### **Always Use Try-Catch:**
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  // Log error
  console.error('Operation failed:', error);
  
  // Create proper error
  throw createError('OPERATION_FAILED', {
    operation: 'riskyOperation',
    originalError: error.message
  });
}
```

#### **Use Async Handler:**
```javascript
// Në vend të try-catch manual
exports.getData = asyncHandler(async (req, res) => {
  const data = await DataService.getData();
  res.json({ success: true, data });
});
```

#### **Validate Input:**
```javascript
// Gjithmonë validizo input
const validatedData = validationService.validate(req.body, 'user');
const sanitizedData = validationService.sanitize(req.body, 'user');
```

### **2. Rate Limiting**

#### **Configure Appropriately:**
```javascript
// Për endpoints të ndryshëm
const configs = {
  auth: { max: 5, windowMs: 15 * 60 * 1000 },    // 5 login per 15 min
  api: { max: 60, windowMs: 60 * 1000 },         // 60 requests per min
  upload: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 uploads per hour
  admin: { max: 30, windowMs: 60 * 1000 }        // 30 admin ops per min
};
```

#### **Monitor Rate Limits:**
```javascript
// Kontrollo rate limit violations
const stats = rateLimitService.getRateLimitStats();
if (stats.activeLimits.auth.activeKeys > 10) {
  console.warn('High number of auth rate limit violations');
}
```

### **3. Frontend**

#### **Use Error Boundaries:**
```javascript
// Wrap components me Error Boundary
<ErrorBoundary>
  <RiskyComponent />
</ErrorBoundary>
```

#### **Handle API Errors:**
```javascript
// Përdor ApiErrorDisplay për errors
<ApiErrorDisplay 
  error={error} 
  onRetry={retryFunction}
  onDismiss={() => setError(null)}
/>
```

#### **Report Errors:**
```javascript
// Përdor useErrorHandler hook
const { handleError } = useErrorHandler();

try {
  await apiCall();
} catch (error) {
  handleError(error, 'API call context');
}
```

---

## 🆘 Support

### **Kontakte**
- 📧 Email: admin@example.com
- 📱 Slack: #error-handling
- 📋 Jira: ERROR-*

### **Dokumentacion i Shtesë**
- [Real-Time Alerts Guide](./REAL_TIME_ALERTS_GUIDE.md)
- [Audit Trail Guide](./AUDIT_TRAIL_GUIDE.md)
- [API Documentation](https://example.com/api-docs)

---

## 📝 Changelog

### **v1.0.0 (2024-01-15)**
- ✅ Error handling middleware i plotë
- ✅ Validation service me rules të avancuara
- ✅ Rate limiting me konfigurim fleksibël
- ✅ Error boundaries për React
- ✅ Error reporting nga frontend
- ✅ Error monitoring dhe notifications
- ✅ Audit trail integration
- ✅ Comprehensive error codes
- ✅ Sanitization dhe type checking
- ✅ Performance optimization

---

**🎉 Sistemi i Error Handling i Përmirësuar është gati për përdorim!** 