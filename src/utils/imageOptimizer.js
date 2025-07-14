import { useState, useEffect } from 'react';

// Image optimization utilities
export const optimizeImage = (src, width = 400, quality = 80) => {
  // For now, return the original src
  // In production, you could use a CDN or image optimization service
  return src;
};

// Lazy loading hook for images
export const useLazyImage = (src, placeholder = '/placeholder.png') => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
    
    img.onerror = () => {
      setImageSrc(placeholder);
      setLoading(false);
    };
  }, [src, placeholder]);

  return { imageSrc, loading };
};

// Preload critical images
export const preloadImages = (imageUrls) => {
  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}; 