import { useEffect, useRef, useCallback } from 'react';
import { preloadCriticalLibraries } from '../utils/lazyImports';

const PerformanceOptimizer = () => {
  const preloadedRef = useRef(false);
  const observerRef = useRef(null);
  const performanceMetricsRef = useRef({});

  // Performance monitoring
  const measurePerformance = useCallback(() => {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        performanceMetricsRef.current = {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        };
        
        console.log('Performance Metrics:', performanceMetricsRef.current);
      }
    }
  }, []);

  // Enhanced preloading with priority
  const preloadResources = useCallback(async () => {
    if (preloadedRef.current) return;
    
    try {
      preloadedRef.current = true;
      
      // Preload critical libraries
      await preloadCriticalLibraries();
      
      // Preload critical images with different priorities
      const criticalImages = [
        { url: '/Capital%20Rise%20logo.png', priority: 'high' },
        { url: '/src/assets/logo.png', priority: 'medium' },
        { url: '/src/assets/avatar.png', priority: 'low' }
      ];
      
      criticalImages.forEach(({ url, priority }) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        link.fetchPriority = priority;
        document.head.appendChild(link);
      });
      
      // Preload fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.as = 'font';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
      fontLink.crossOrigin = 'anonymous';
      document.head.appendChild(fontLink);
      
    } catch (error) {
      console.error('Resource preloading failed:', error);
    }
  }, []);

  // Intersection Observer for lazy loading with enhanced options
  const setupIntersectionObserver = useCallback(() => {
    if (observerRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target;
            
            // Handle lazy-loaded components
            if (target.dataset.lazyLoad) {
              console.log('Preloading component:', target.dataset.lazyLoad);
              // Trigger component preloading
              target.classList.add('lazy-loaded');
            }
            
            // Handle lazy-loaded images
            if (target.dataset.lazySrc) {
              target.src = target.dataset.lazySrc;
              target.classList.remove('lazy-image');
              observerRef.current?.unobserve(target);
            }
            
            // Handle lazy-loaded content
            if (target.dataset.lazyContent) {
              target.innerHTML = target.dataset.lazyContent;
              target.classList.remove('lazy-content');
              observerRef.current?.unobserve(target);
            }
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px',
        root: null
      }
    );

    // Observe elements with lazy-load attributes
    const lazyElements = document.querySelectorAll('[data-lazy-load], [data-lazy-src], [data-lazy-content]');
    lazyElements.forEach(el => observerRef.current?.observe(el));
  }, []);

  // Memory management and cleanup
  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  // Service Worker registration for PWA capabilities
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  }, []);

  // Enhanced error boundary and monitoring
  const setupErrorMonitoring = useCallback(() => {
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      // Here you could send to error monitoring service
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Here you could send to error monitoring service
    });
  }, []);

  // Memory usage monitoring
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = performance.memory;
      console.log('Memory usage:', {
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
      });
    }
  }, []);

  // Setup performance monitoring
  useEffect(() => {
    measurePerformance();
    
    // Monitor performance after page load
    const timer = setTimeout(measurePerformance, 2000);
    
    return () => clearTimeout(timer);
  }, [measurePerformance]);

  // Setup resource preloading
  useEffect(() => {
    preloadResources();
  }, [preloadResources]);

  // Setup intersection observer
  useEffect(() => {
    setupIntersectionObserver();
    
    return cleanup;
  }, [setupIntersectionObserver, cleanup]);

  // Setup service worker
  useEffect(() => {
    registerServiceWorker();
  }, [registerServiceWorker]);

  // Setup error monitoring
  useEffect(() => {
    setupErrorMonitoring();
  }, [setupErrorMonitoring]);

  // Memory monitoring (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(monitorMemory, 30000);
    return () => clearInterval(interval);
  }, [monitorMemory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Performance optimization tips
  useEffect(() => {
    // Disable console logs in production
    if (process.env.NODE_ENV === 'production') {
      console.log = () => {};
      console.warn = () => {};
      console.info = () => {};
    }
    
    // Optimize scroll performance
    let ticking = false;
    const optimizeScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Handle scroll optimizations here
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', optimizeScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', optimizeScroll);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceOptimizer;