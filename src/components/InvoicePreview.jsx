import React, { forwardRef } from "react";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const InvoicePreview = forwardRef(({ invoice, contract }, ref) => {
  if (!invoice || !contract) return null;

  console.log("InvoicePreview rendered", invoice, contract);

  const subtotal = invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  const vat = invoice.vat !== undefined ? invoice.vat : subtotal * 0.2;
  const total = invoice.total !== undefined ? invoice.total : subtotal + vat + parseFloat(invoice.other || 0);

  return (
    <div ref={ref} className="invoice-preview p-10 bg-white text-base text-gray-800 w-[800px] mx-auto font-sans rounded-2xl shadow-xl border border-green-200">
      {/* Header */}
      <div className="border-b border-green-300 pb-4 mb-6 flex flex-col items-center">
        {/* Logo në qendër */}
        <img src="/albanconstruction.png" alt="Logo" className="h-14 mb-2" />

        {/* Titulli dhe info */}
        <h1 className="text-4xl font-extrabold text-amber-700 tracking-tight flex items-center gap-2 mb-2">
          <span role="img" aria-label="invoice">📄</span> FATURË
        </h1>

        {/* Info të kontratës dhe faturës */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-blue-900 text-lg font-semibold">
            {contract.site_name}
          </div>
          <div className="text-gray-700 text-base">
            <span className="font-semibold">Kontrata:</span> #{contract.contract_number}
          </div>
          <div className="text-gray-700 text-base">
            <span className="font-semibold">Nr. Faturës:</span> {invoice.invoice_number}
          </div>
          <div className="text-gray-700 text-base">
            <span className="font-semibold">Data:</span> {formatDate(invoice.date)}
          </div>
          <div className="text-gray-700 text-base">
            <span className="font-semibold">Kompania:</span> {contract.company}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-6 text-base rounded-xl overflow-hidden shadow">
        <thead className="bg-green-100 text-amber-800 font-semibold">
          <tr>
            <th className="border border-green-300 py-3 px-2">Përshkrimi</th>
            <th className="border border-green-300 py-3 px-2">Shifts</th>
            <th className="border border-green-300 py-3 px-2">Rate</th>
            <th className="border border-green-300 py-3 px-2">Shuma</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item, idx) => (
            <tr key={idx} className="hover:bg-green-50">
              <td className="border border-gray-300 py-3 px-2">{item.description}</td>
              <td className="border border-gray-300 py-3 px-2 text-center">{item.shifts}</td>
              <td className="border border-gray-300 py-3 px-2 text-center">£{item.rate}</td>
              <td className="border border-gray-300 py-3 px-2 text-right font-semibold">£{item.amount?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-between mt-8 text-base">
        <div className="text-left text-gray-700 space-y-1 max-w-[45%]">
          <p className="font-bold text-amber-700">Alban Construction Ltd</p>
          <p>HSBC Bank</p>
          <p>Account Number: 81845403</p>
          <p>Sort Code: 52474549</p>
          <p>Email: adi@albanconstruction.co.uk</p>
          <p>Phone: +7588893238</p>
          <p>Website: www.albanconstruction.co.uk</p>
        </div>
        <div className="text-right text-base space-y-1 min-w-[200px]">
          <div className="flex justify-between">
            <span className="font-semibold">Neto:</span>
            <span>£{invoice.total_net !== undefined ? invoice.total_net.toFixed(2) : subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">TVSH (20%):</span>
            <span>£{vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Të tjera:</span>
            <span>£{parseFloat(invoice.other || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-2 text-xl font-bold text-green-700">
            <span>Total:</span>
            <span>£{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 border-t pt-4 text-xs text-gray-500 text-center">
        <p>Faleminderit për bashkëpunimin!</p>
        <p>Kjo faturë është krijuar automatikisht dhe nuk kërkon nënshkrim.</p>
      </div>

      <style jsx>{`
        @media print {
          .invoice-preview {
            box-shadow: none;
            margin: 0 auto;
            width: 100%;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
});

export default InvoicePreview;
