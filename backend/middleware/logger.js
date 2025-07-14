const logger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  
  // Override res.end to log response time
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Log response with color coding
    const statusColor = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    
    console.log(`${statusColor}[${status}]${resetColor} ${req.method} ${req.path} - ${duration}ms`);
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = logger;
