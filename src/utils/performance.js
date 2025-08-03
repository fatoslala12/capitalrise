// Performance monitoring and optimization utilities

export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
  }

  // Start measuring a metric
  startMeasure(name) {
    this.metrics[name] = {
      startTime: performance.now(),
      endTime: null,
      duration: null
    };
  }

  // End measuring a metric
  endMeasure(name) {
    if (this.metrics[name]) {
      this.metrics[name].endTime = performance.now();
      this.metrics[name].duration = this.metrics[name].endTime - this.metrics[name].startTime;
      
      // Log performance metric
      console.log(`Performance: ${name} took ${this.metrics[name].duration.toFixed(2)}ms`);
      
      // Report to analytics if needed
      this.reportMetric(name, this.metrics[name].duration);
    }
  }

  // Report metric to analytics
  reportMetric(name, duration) {
    // You can send this to your analytics service
    if (window.gtag) {
      window.gtag('event', 'performance', {
        event_category: 'timing',
        event_label: name,
        value: Math.round(duration)
      });
    }
  }

  // Measure component render time
  measureComponentRender(componentName, renderFunction) {
    this.startMeasure(`${componentName}_render`);
    const result = renderFunction();
    this.endMeasure(`${componentName}_render`);
    return result;
  }

  // Monitor API call performance
  async measureApiCall(apiName, apiCall) {
    this.startMeasure(`${apiName}_api`);
    try {
      const result = await apiCall();
      this.endMeasure(`${apiName}_api`);
      return result;
    } catch (error) {
      this.endMeasure(`${apiName}_api`);
      throw error;
    }
  }

  // Get all metrics
  getMetrics() {
    return this.metrics;
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {};
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance optimization utilities
export const optimizeImages = () => {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    // Add loading="lazy" to images below the fold
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    
    // Add decoding="async" for better performance
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
  });
};

// Debounce function for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for performance
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for lazy loading
export const createLazyLoader = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, defaultOptions);
};

// Memory management
export const cleanupMemory = () => {
  // Clear any stored data that's no longer needed
  if (window.performance && window.performance.memory) {
    const memory = window.performance.memory;
    console.log('Memory usage:', {
      used: Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100 + ' MB',
      total: Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100 + ' MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100 + ' MB'
    });
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  // Monitor page load time
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    performanceMonitor.reportMetric('page_load', loadTime);
  });

  // Monitor component render times
  if (process.env.NODE_ENV === 'development') {
    // Add performance monitoring in development
    console.log('Performance monitoring enabled');
  }
};