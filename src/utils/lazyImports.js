// Lazy imports for heavy libraries to improve performance
export const lazyImport = (importFn) => {
  return new Promise((resolve) => {
    importFn().then((module) => {
      resolve(module);
    });
  });
};

// Lazy load PDF libraries
export const loadPdfLibraries = () => 
  Promise.all([
    import('jspdf'),
    import('html2canvas'),
    import('html2pdf.js')
  ]);

// Lazy load Excel libraries
export const loadExcelLibraries = () => 
  Promise.all([
    import('xlsx'),
    import('file-saver')
  ]);

// Lazy load Chart libraries
export const loadChartLibraries = () => 
  Promise.all([
    import('recharts'),
    import('react-chartjs-2')
  ]);

// Lazy load heavy UI components
export const loadHeavyComponents = () => 
  Promise.all([
    import('react-calendar'),
    import('react-datepicker')
  ]);

// Preload critical libraries
export const preloadCriticalLibraries = () => {
  // Preload commonly used libraries
  const criticalLibs = [
    () => import('axios'),
    () => import('dayjs'),
    () => import('date-fns')
  ];
  
  return Promise.all(criticalLibs.map(lib => lib()));
};