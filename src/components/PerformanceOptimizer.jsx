import { useEffect, useRef, useCallback } from 'react';
import { preloadCriticalLibraries } from '../utils/lazyImports';

const PerformanceOptimizer = () => {
  const preloadedRef = useRef(false);
  const observerRef = useRef(null);

  // Enhanced preloading with priority
  const preloadResources = useCallback(async () => {
    if (preloadedRef.current) return;
    
    try {
      preloadedRef.current = true;
      
      // Preload critical libraries
      await preloadCriticalLibraries();
      
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

  // Setup resource preloading
  useEffect(() => {
    preloadResources();
  }, [preloadResources]);

  // Setup intersection observer
  useEffect(() => {
    setupIntersectionObserver();
    
    return cleanup;
  }, [setupIntersectionObserver, cleanup]);

  // Setup error monitoring
  useEffect(() => {
    setupErrorMonitoring();
  }, [setupErrorMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Performance optimization tips
  useEffect(() => {
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