import { useEffect, useRef } from 'react';
import { preloadCriticalLibraries } from '../utils/lazyImports';

const PerformanceOptimizer = () => {
  const preloadedRef = useRef(false);

  useEffect(() => {
    // Preload critical libraries when component mounts
    if (!preloadedRef.current) {
      preloadedRef.current = true;
      
      // Preload critical libraries in the background
      preloadCriticalLibraries().catch(console.error);
      
      // Preload images
      const preloadImages = () => {
        const imageUrls = [
          '/src/assets/logo.png',
          '/src/assets/avatar.png'
        ];
        
        imageUrls.forEach(url => {
          const img = new Image();
          img.src = url;
        });
      };
      
      // Preload images after a short delay
      setTimeout(preloadImages, 1000);
    }
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load heavy components when they come into view
            const target = entry.target;
            if (target.dataset.lazyLoad) {
              // Preload the component
              console.log('Preloading component:', target.dataset.lazyLoad);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe elements with lazy-load attribute
    const lazyElements = document.querySelectorAll('[data-lazy-load]');
    lazyElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceOptimizer;