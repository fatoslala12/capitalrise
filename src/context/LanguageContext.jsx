import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  sq: {
    // Navigation
    dashboard: "Paneli",
    contracts: "Kontrata",
    employees: "Punonjës",
    workHours: "Orët e Punës",
    payments: "Pagesat",
    tasks: "Detyrat",
    reports: "Raportet",
    myTasks: "Detyrat e Mia",
    logout: "Dil",
    
    // Dashboard
    welcomeBack: "Mirë se erdhe",
    adminPanel: "Paneli i Administrimit",
    statsTasksPayments: "Statistika, detyra, pagesa dhe më shumë",
    activeSites: "Site aktive",
    activeEmployees: "Punonjës aktivë",
    paidThisWeek: "Paguar këtë javë",
    profit: "Fitimi (20%)",
    tasks: "Detyrat",
    filter: "Filtro",
    onlyActive: "Vetëm aktive",
    onlyCompleted: "Vetëm të përfunduara",
    all: "Të gjitha",
    total: "Totali",
    completed: "Të përfunduara",
    ongoing: "Në vazhdim",
    noTasksYet: "Nuk ka ende detyra të dhëna",
    workHoursThisWeek: "Ora të punuara këtë javë sipas site-ve",
    totalWorkHours: "Total orë të punuara",
    hours: "orë",
    top5Employees: "Top 5 punonjësit më të paguar këtë javë",
    paid: "E paguar",
    unpaid: "E papaguar",
    unpaidInvoices: "Faturat e Papaguara",
    allInvoicesPaid: "Të gjitha faturat janë të paguara",
    unpaidExpenses: "Shpenzimet e Papaguara",
    allExpensesPaid: "Të gjitha shpenzimet janë të paguara",
    
    // Contracts
    contractManagement: "Menaxhimi i Kontratave",
    addViewManage: "Shto, shiko dhe menaxho kontratat",
    addNewContract: "Shto Kontratë të Re",
    contractNumber: "Nr. Kontratës",
    companyName: "Emri i Kompanisë",
    contractValue: "Vlera e Kontratës (£)",
    location: "Vendodhja",
    address: "Adresa",
    startDate: "Data e Fillimit",
    endDate: "Data e Mbarimit",
    uploadPdf: "Ngarko Dokument PDF",
    addContract: "Shto Kontratë",
    contractsList: "Lista e Kontratave",
    company: "Kompania",
    dates: "Datat",
    value: "Vlera (£)",
    spent: "Shpenzuar (£)",
    profit: "Fitimi (£)",
    status: "Statusi",
    condition: "Gjendja",
    actions: "Veprime",
    delete: "Fshi",
    active: "Aktive",
    closed: "Mbyllur",
    closedLate: "Mbyllur me vonesë",
    clickToClose: "Klik për ta mbyllur",
    clickToReactivate: "Klik për ta riaktivizuar",
    
    // Employees
    addEmployee: "Shto Punonjës",
    manageEmployees: "Menaxho Punonjësit",
    employeeList: "Lista e Punonjësve",
    firstName: "Emri",
    lastName: "Mbiemri",
    email: "Email",
    phone: "Telefoni",
    hourlyRate: "Paga / Orë (£)",
    workplace: "Vendpunimi",
    
    // Payments & Expenses
    paymentsContracts: "Pagesat & Kontratat",
    filterByStatus: "Filtro sipas statusit",
    allContracts: "Të gjitha kontratat",
    contractDetails: "Detajet e Kontratës",
    workHoursPayments: "Orët e Punës & Pagesat",
    employee: "Punonjësi",
    week: "Java",
    hours: "Orë",
    gross: "Bruto (£)",
    net: "Neto (£)",
    expensesInvoices: "Shpenzime & Fatura",
    type: "Lloji",
    date: "Data",
    vat: "TVSH (£)",
    overallTotal: "Totali i Përgjithshëm",
    addExpenseInvoice: "Shto Shpenzim/Faturë",
    expenseType: "Lloji i shpenzimit/faturës",
    grossAmount: "Shuma Bruto (£)",
    netAmount: "Shuma Neto (£)",
    addExpense: "Shto Shpenzim",
    
    // Tasks
    manageTasks: "Menaxho Detyrat",
    createNewTask: "Krijo Detyrë të Re",
    taskDescription: "Përshkrimi i detyrës",
    selectPerson: "Zgjidh personin",
    selectSite: "Ose zgjidh site",
    deadline: "Afati",
    assignTask: "Cakto Detyrën",
    tasksList: "Lista e Detyrave",
    description: "Përshkrimi",
    assignedTo: "Për",
    site: "Site",
    assignedBy: "Nga",
    finish: "Përfundo",
    
    // Work Hours
    fillWorkHours: "Plotëso Orët për Javën",
    myPayments: "Pagesat e marra",
    saveHours: "Ruaj Orët e Kësaj Jave",
    currentWeek: "Java Aktuale",
        show: "Shfaq",
    hide: "Fshih",
    
    // Loading messages
    loadingStats: "Duke ngarkuar statistikat...",
    loadingContracts: "Duke ngarkuar kontratat...",
    loadingEmployees: "Duke ngarkuar punonjësit...",
    loadingWorkHours: "Duke ngarkuar orët e punës...",
    loadingPayments: "Duke ngarkuar pagesat...",
    loadingTasks: "Duke ngarkuar detyrat...",
    loadingPaymentDetails: "Duke ngarkuar detajet e pagesës...",
    loadingContractDetails: "Duke ngarkuar detajet e kontratës...",
    loadingReports: "Duke ngarkuar raportet...",
    
    // Common
    save: "Ruaj",
    cancel: "Anulo",
    edit: "Redakto",
    add: "Shto",
    remove: "Hiq",
    confirm: "Konfirmo",
    yes: "Po",
    no: "Jo",
    close: "Mbyll",
    open: "Hap",
    loading: "Duke ngarkuar...",
    error: "Gabim",
    success: "Sukses",
    warning: "Paralajmërim",
    info: "Informacion"
  },
  
  en: {
    // Navigation
    dashboard: "Dashboard",
    contracts: "Contracts",
    employees: "Employees",
    workHours: "Work Hours",
    payments: "Payments",
    tasks: "Tasks",
    reports: "Reports",
    myTasks: "My Tasks",
    logout: "Logout",
    
    // Dashboard
    welcomeBack: "Welcome back",
    adminPanel: "Admin Panel",
    statsTasksPayments: "Statistics, tasks, payments and more",
    activeSites: "Active sites",
    activeEmployees: "Active employees",
    paidThisWeek: "Paid this week",
    profit: "Profit (20%)",
    tasks: "Tasks",
    filter: "Filter",
    onlyActive: "Only active",
    onlyCompleted: "Only completed",
    all: "All",
    total: "Total",
    completed: "Completed",
    ongoing: "Ongoing",
    noTasksYet: "No tasks assigned yet",
    workHoursThisWeek: "Work hours this week by sites",
    totalWorkHours: "Total work hours",
    hours: "hours",
    top5Employees: "Top 5 highest paid employees this week",
    paid: "Paid",
    unpaid: "Unpaid",
    unpaidInvoices: "Unpaid Invoices",
    allInvoicesPaid: "All invoices are paid",
    unpaidExpenses: "Unpaid Expenses",
    allExpensesPaid: "All expenses are paid",
    
    // Contracts
    contractManagement: "Contract Management",
    addViewManage: "Add, view and manage contracts",
    addNewContract: "Add New Contract",
    contractNumber: "Contract No.",
    companyName: "Company Name",
    contractValue: "Contract Value (£)",
    location: "Location",
    address: "Address",
    startDate: "Start Date",
    endDate: "End Date",
    uploadPdf: "Upload PDF Document",
    addContract: "Add Contract",
    contractsList: "Contracts List",
    company: "Company",
    dates: "Dates",
    value: "Value (£)",
    spent: "Spent (£)",
    profit: "Profit (£)",
    status: "Status",
    condition: "Condition",
    actions: "Actions",
    delete: "Delete",
    active: "Active",
    closed: "Closed",
    closedLate: "Closed Late",
    clickToClose: "Click to close",
    clickToReactivate: "Click to reactivate",
    
    // Employees
    addEmployee: "Add Employee",
    manageEmployees: "Manage Employees",
    employeeList: "Employee List",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    hourlyRate: "Hourly Rate (£)",
    workplace: "Workplace",
    
    // Payments & Expenses
    paymentsContracts: "Payments & Contracts",
    filterByStatus: "Filter by status",
    allContracts: "All contracts",
    contractDetails: "Contract Details",
    workHoursPayments: "Work Hours & Payments",
    employee: "Employee",
    week: "Week",
    hours: "Hours",
    gross: "Gross (£)",
    net: "Net (£)",
    expensesInvoices: "Expenses & Invoices",
    type: "Type",
    date: "Date",
    vat: "VAT (£)",
    overallTotal: "Overall Total",
    addExpenseInvoice: "Add Expense/Invoice",
    expenseType: "Expense/invoice type",
    grossAmount: "Gross Amount (£)",
    netAmount: "Net Amount (£)",
    addExpense: "Add Expense",
    
    // Tasks
    manageTasks: "Manage Tasks",
    createNewTask: "Create New Task",
    taskDescription: "Task description",
    selectPerson: "Select person",
    selectSite: "Or select site",
    deadline: "Deadline",
    assignTask: "Assign Task",
    tasksList: "Tasks List",
    description: "Description",
    assignedTo: "Assigned To",
    site: "Site",
    assignedBy: "Assigned By",
    finish: "Finish",
    
    // Work Hours
    fillWorkHours: "Fill Work Hours for Week",
    myPayments: "My Payments",
    saveHours: "Save This Week's Hours",
    currentWeek: "Current Week",
    show: "Show",
    hide: "Hide",
    
    // Loading messages
    loadingStats: "Loading statistics...",
    loadingContracts: "Loading contracts...",
    loadingEmployees: "Loading employees...",
    loadingWorkHours: "Loading work hours...",
    loadingPayments: "Loading payments...",
    loadingTasks: "Loading tasks...",
    loadingPaymentDetails: "Loading payment details...",
    loadingContractDetails: "Loading contract details...",
    loadingReports: "Loading reports...",
    
    // Common
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    add: "Add",
    remove: "Remove",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    close: "Close",
    open: "Open",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Information"
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to Albanian
    return localStorage.getItem('language') || 'sq';
  });

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    isAlbanian: language === 'sq',
    isEnglish: language === 'en'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};