// src/utils/dataHelpers.js
import axios from "axios";

const API = "https://building-system.onrender.com/api";
const token = localStorage.getItem("token");
const headers = { Authorization: `Bearer ${token}` };

export const getAllWorkHours = async () => {
  const res = await axios.get(`${API}/work-hours/all`, { headers });
  const workHours = res.data || [];
  const employees = await getAllEmployees();

  const all = [];
  workHours.forEach((wh) => {
    const emp = employees.find((e) => e.id.toString() === wh.employeeId.toString());
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : `Punonjës ${wh.employeeId}`;
    Object.entries(wh.weeks || {}).forEach(([week, days]) => {
      Object.entries(days).forEach(([day, entry]) => {
        if (day !== "hourlyRate") {
          all.push({
            employeeId: wh.employeeId,
            date: day,
            hours: entry.hours,
            site: entry.site,
            employeeName: empName,
          });
        }
      });
    });
  });

  return all;
};

export const getAllEmployees = async () => {
  const res = await axios.get(`${API}/employees`, { headers });
  return res.data || [];
};

export const getAllInvoices = async () => {
  const res = await axios.get(`${API}/invoices`, { headers });
  const all = res.data || [];
  const result = [];

  all.forEach((inv) => {
    result.push({
      ...inv,
      paid: inv.paid,
      paidLate: checkIfPaidLate(inv),
      total: calculateInvoiceTotal(inv),
    });
  });

  return result;
};

// Helper functions

function checkIfPaidLate(inv) {
  if (!inv.paid || !inv.date) return false;
  const invoiceDate = new Date(inv.date);
  const today = new Date();
  const daysDiff = (today - invoiceDate) / (1000 * 60 * 60 * 24);
  return daysDiff > 30;
}

function calculateInvoiceTotal(inv) {
  const items = inv.items || [];
  const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const vat = subtotal * 0.2;
  const other = parseFloat(inv.other || 0);
  return subtotal + vat + other;
}
