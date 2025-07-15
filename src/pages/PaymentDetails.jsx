import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

export default function PaymentDetails() {
  const { contract_number } = useParams();
  const [contract, setContract] = useState(null);
  const [expensesInvoices, setExpensesInvoices] = useState([]);
  const [workHours, setWorkHours] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newExpenseInvoice, setNewExpenseInvoice] = useState({
    companyName: "",
    expense_type: "",
    date: new Date().toISOString().split("T")[0],
    net: "",
    gross: "",
    tax: "",
    paid: false,
    file: null,
  });
  const token = localStorage.getItem("token");

  // Merr të dhënat nga backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [contractRes, workHoursRes, employeesRes, expensesRes] = await Promise.all([
          axios.get(`https://building-system.onrender.com/api/contracts/contract-number/${contract_number}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`https://building-system.onrender.com/api/work-hours/structured`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://building-system.onrender.com/api/employees", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`https://building-system.onrender.com/api/expenses/${contract_number}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        console.log('[DEBUG] Contract data:', contractRes.data);
        console.log('[DEBUG] Work hours data:', workHoursRes.data);
        console.log('[DEBUG] Employees data:', employeesRes.data);
        console.log('[DEBUG] Expenses response:', expensesRes.data);
        
        setContract(contractRes.data);
        setWorkHours(workHoursRes.data || {});
        setEmployees(employeesRes.data || []);
        setExpensesInvoices(expensesRes.data || []);
        setNewExpenseInvoice((prev) => ({ ...prev, companyName: contractRes.data.company || "" }));
        
      } catch (error) {
        console.error("Error fetching payment details:", error);
        setError("Gabim gjatë ngarkimit të të dhënave. Ju lutem provoni përsëri.");
        setContract(null);
        setWorkHours({});
        setEmployees([]);
        setExpensesInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [contract_number, token]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === "gross") {
      const gross = parseFloat(value) || 0;
      const net = (gross * 0.8).toFixed(2);
      const tax = (gross - net).toFixed(2);
      setNewExpenseInvoice((prev) => ({ ...prev, gross: value, net, tax }));
    } else if (type === "checkbox") {
      setNewExpenseInvoice((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setNewExpenseInvoice((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setNewExpenseInvoice((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Shto shpenzim të ri në backend
  const handleAddExpenseInvoice = async (e) => {
    e.preventDefault();

    // Validimi i formës
    if (!newExpenseInvoice.expense_type.trim()) {
      alert("Ju lutem plotësoni llojin e shpenzimit!");
      return;
    }

    if (!newExpenseInvoice.gross || parseFloat(newExpenseInvoice.gross) <= 0) {
      alert("Ju lutem plotësoni shumën bruto!");
      return;
    }

    let fileContent = "";
    if (newExpenseInvoice.file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        fileContent = reader.result;
        await saveExpense(fileContent);
      };
      reader.readAsDataURL(newExpenseInvoice.file);
    } else {
      await saveExpense("");
    }

    async function saveExpense(fileContent) {
      const expenseInvoice = {
        ...newExpenseInvoice,
        contract_number,
        fileName: newExpenseInvoice.file?.name || "",
        file: fileContent,
      };
      try {
        await axios.post(
          `https://building-system.onrender.com/api/expenses/${contract_number}`,
          expenseInvoice,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Rifresko të gjithë expenses-et pas shtimit
        const expensesRes = await axios.get(
          `https://building-system.onrender.com/api/expenses/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Expenses pas shtimit:', expensesRes.data);
        setExpensesInvoices(expensesRes.data || []);
        
        setNewExpenseInvoice((prev) => ({
          ...prev,
          expense_type: "",
          gross: "",
          net: "",
          tax: "",
          paid: false,
          file: null,
        }));
        
        alert("Shpenzimi u shtua me sukses!");
      } catch (error) {
        console.error('Error adding expense:', error);
        alert("Gabim gjatë shtimit të shpenzimit: " + (error.response?.data?.error || error.message));
      }
    }
  };

  // Fshi shpenzim nga backend
  const handleDelete = async (id) => {
    if (!confirm("Jeni i sigurt që doni të fshini këtë shpenzim?")) {
      return;
    }

    try {
      await axios.delete(
        `https://building-system.onrender.com/api/expenses/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko faturat pas fshirjes
      const res = await axios.get(
        `https://building-system.onrender.com/api/expenses/${contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Faturat pas fshirjes:', res.data);
      setExpensesInvoices(Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []));
      alert("Shpenzimi u fshi me sukses!");
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert("Gabim gjatë fshirjes: " + (error.response?.data?.error || error.message));
    }
  };

  // Ndrysho statusin e pagesës në backend
  const togglePaid = async (id) => {
    try {
      await axios.put(
        `https://building-system.onrender.com/api/expenses/${id}/toggle-paid`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Rifresko faturat pas ndryshimit të statusit
      const res = await axios.get(
        `https://building-system.onrender.com/api/expenses/${contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Faturat pas ndryshimit të statusit:', res.data);
      setExpensesInvoices(Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []));
      alert("Statusi i pagesës u ndryshua me sukses!");
    } catch (error) {
      console.error('Error toggling payment status:', error);
      alert("Gabim gjatë ndryshimit të statusit të pagesës: " + (error.response?.data?.error || error.message));
    }
  };

  // Përllogaritjet e orëve të punës - RREGULLUAR
  const rows = [];
  let totalBruto = 0;
  let totalNeto = 0;

  console.log('[DEBUG PaymentDetails] workHours data:', workHours);
  console.log('[DEBUG PaymentDetails] contract data:', contract);
  console.log('[DEBUG PaymentDetails] employees data:', employees);

  if (workHours && typeof workHours === 'object' && Object.keys(workHours).length > 0 && contract) {
    Object.entries(workHours).forEach(([employeeId, weeks]) => {
      console.log(`[DEBUG PaymentDetails] Processing employee ${employeeId}, weeks:`, weeks);
      Object.entries(weeks).forEach(([weekLabel, days]) => {
        console.log(`[DEBUG PaymentDetails] Processing week ${weekLabel}, days:`, days);
        // RREGULLIMI: Filtro vetëm për këtë kontratë me krahasim të saktë
        const filteredDays = Object.values(days).filter(
          (day) => {
            console.log(`[DEBUG PaymentDetails] Day data:`, day);
            console.log(`[DEBUG PaymentDetails] Contract ID check: day.contract_id=${day.contract_id}, contract.id=${contract?.id}`);
            // RREGULLIMI: Krahasimi i saktë duke konvertuar në string
            return day.contract_id && contract && String(day.contract_id) === String(contract.id);
          }
        );
        console.log(`[DEBUG PaymentDetails] Filtered days for contract ${contract?.id}:`, filteredDays);
        const totalHours = filteredDays.reduce((sum, d) => sum + Number(d.hours || 0), 0);
        console.log(`[DEBUG PaymentDetails] Total hours for ${employeeId} in ${weekLabel}: ${totalHours}`);
        if (totalHours === 0) return;
        
        // RREGULLIMI: Employee matching i saktë
        const emp = employees.find((e) => String(e.id) === String(employeeId));
        console.log(`[DEBUG PaymentDetails] Employee found:`, emp);
        const rate = parseFloat(emp?.hourlyRate || emp?.hourly_rate || 0);
        console.log(`[DEBUG PaymentDetails] Employee rate: ${rate}`);
        const bruto = totalHours * rate;
        const neto = bruto * (emp?.labelType === "NI" ? 0.7 : 0.8);
        totalBruto += bruto;
        totalNeto += neto;
        rows.push({
          name: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${employeeId}`,
          week: weekLabel,
          hours: totalHours,
          bruto,
          neto,
        });
        console.log(`[DEBUG PaymentDetails] Added row:`, { name: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${employeeId}`, week: weekLabel, hours: totalHours, bruto, neto });
      });
    });
  }

  console.log('[DEBUG PaymentDetails] Final rows:', rows);
  console.log('[DEBUG PaymentDetails] Total bruto:', totalBruto, 'Total neto:', totalNeto);
  console.log('[DEBUG PaymentDetails] expensesInvoices before render:', expensesInvoices);
  console.log('[DEBUG PaymentDetails] expensesInvoices length:', expensesInvoices.length);
  console.log('[DEBUG PaymentDetails] expensesInvoices array:', expensesInvoices);

  // RREGULLIMI: Validimi i expenses për të shmangur NaN
  const totalInvoicesGross = expensesInvoices.reduce((sum, inv) => {
    const gross = parseFloat(inv.gross || 0);
    return sum + (isNaN(gross) ? 0 : gross);
  }, 0);
  
  const totalInvoicesNet = expensesInvoices.reduce((sum, inv) => {
    const net = parseFloat(inv.net || 0);
    return sum + (isNaN(net) ? 0 : net);
  }, 0);
  
  const totalOverallGross = totalBruto + totalInvoicesGross;
  const totalOverallNet = totalNeto + totalInvoicesNet;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar detajet e pagesës...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Gabim</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Provoni përsëri
          </button>
        </div>
      </div>
    );
  }

  if (contract === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Kontrata nuk u gjet</h2>
          <p className="text-gray-600">Kontrata nuk ekziston ose ka ndodhur një gabim!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full xl:max-w-[90vw] mx-auto px-2 py-8 min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100">
      {/* HEADER & KONTRATA */}
      <div className="bg-gradient-to-br from-purple-100 via-white to-blue-100 rounded-3xl shadow-2xl border border-blue-100 p-8 md:p-12 mb-10 animate-fade-in">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-4 flex items-center gap-3">
          <span className="text-5xl">💼</span> Kontrata #{contract_number}
        </h2>
        {contract && (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow p-6 mb-6 text-blue-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">📌 {contract.site_name}</h3>
              <div className="text-lg">Kompania: <span className="font-semibold text-blue-700">{contract.company}</span></div>
              <div className="text-base text-gray-600">Data fillimit: <span className="font-semibold">{contract.start_date}</span></div>
            </div>
            <span className={`text-lg font-bold px-5 py-2 rounded-full shadow border
              ${contract.status === 'Ne progres' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                contract.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                contract.status === 'Anulluar' ? 'bg-red-100 text-red-700 border-red-200' :
                contract.status === 'Pezulluar' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                contract.status === 'Mbyllur' ? 'bg-green-100 text-green-700 border-green-200' :
                contract.status === 'Mbyllur me vonese' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                'bg-gray-200 text-gray-700 border-gray-300'}
            `}>
              {contract.status}
            </span>
          </div>
        )}

        {/* GRID: Orët e punës & Shpenzimet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          {/* Orët e punës */}
          <div className="bg-white/80 p-6 rounded-2xl shadow-xl border border-blue-100 space-y-4 overflow-x-auto">
            <h4 className="text-xl font-bold text-blue-800 mb-2">👷‍♂️ Orët e Punës & Pagesat</h4>
            {rows.length > 0 ? (
              <table className="w-full text-base text-blue-900">
                <thead className="bg-gradient-to-r from-blue-100 to-purple-100">
                  <tr>
                    <th className="py-3 px-3 text-left">Punonjësi</th>
                    <th className="py-3 px-3 text-center">Java</th>
                    <th className="py-3 px-3 text-center">Orë</th>
                    <th className="py-3 px-3 text-center">Bruto (£)</th>
                    <th className="py-3 px-3 text-center">Neto (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-purple-50 transition-all">
                      <td className="py-2 px-3 font-semibold">{r.name}</td>
                      <td className="py-2 px-3 text-center">{r.week}</td>
                      <td className="py-2 px-3 text-center">{r.hours}</td>
                      <td className="py-2 px-3 text-center font-bold text-blue-700">£{r.bruto.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-bold text-green-700">£{r.neto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={3} className="py-2 px-3 text-right">Totali:</td>
                    <td className="py-2 px-3 text-center text-blue-700">£{totalBruto.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center text-green-700">£{totalNeto.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500 italic">
                Nuk ka orë pune të regjistruara për këtë kontratë
              </div>
            )}
          </div>

          {/* Shpenzimet/Faturat */}
          <div className="bg-white/80 p-6 rounded-2xl shadow-xl border border-blue-100 space-y-4 overflow-x-auto">
            <h4 className="text-xl font-bold text-blue-800 mb-2">🧾 Shpenzime & Fatura ({expensesInvoices.length} gjithsej)</h4>
            {expensesInvoices.length > 0 ? (
              <table className="w-full text-base text-blue-900">
                <thead className="bg-gradient-to-r from-blue-100 to-purple-100">
                  <tr>
                    <th className="py-3 px-3 text-left">Lloji</th>
                    <th className="py-3 px-3 text-center">Data</th>
                    <th className="py-3 px-3 text-center">Bruto (£)</th>
                    <th className="py-3 px-3 text-center">Neto (£)</th>
                    <th className="py-3 px-3 text-center">TVSH (£)</th>
                    <th className="py-3 px-3 text-center">Statusi</th>
                    <th className="py-3 px-3 text-center">Fshi</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-purple-50 transition-all">
                      <td className="py-2 px-3 font-semibold">{inv.expense_type}</td>
                      <td className="py-2 px-3 text-center">{inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="py-2 px-3 text-center font-bold text-blue-700">£{Number(inv.gross || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-bold text-green-700">£{Number(inv.net || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-bold text-purple-700">£{Number(inv.tax || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => togglePaid(inv.id)}
                          className={`px-3 py-1 rounded-full font-bold shadow border text-sm transition-all duration-200
                            ${inv.paid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}
                          `}
                        >
                          {inv.paid ? 'Paguar' : 'Jo i paguar'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="px-3 py-2 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-lg text-base font-semibold shadow hover:from-pink-600 hover:to-red-600 transition-all"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={2} className="py-2 px-3 text-right">Totali:</td>
                    <td className="py-2 px-3 text-center text-blue-700">£{totalInvoicesGross.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center text-green-700">£{totalInvoicesNet.toFixed(2)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500 italic">
                Nuk ka expenses për këtë kontratë
              </div>
            )}
          </div>
        </div>

        {/* Totali i përgjithshëm */}
        <div className="bg-white/80 rounded-2xl shadow-xl border border-blue-100 p-6 mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-xl font-bold text-blue-900">Totali i Përgjithshëm:</div>
          <div className="flex flex-col md:flex-row gap-4 md:gap-10">
            <div className="text-lg font-bold text-blue-700">Bruto: £{totalOverallGross.toFixed(2)}</div>
            <div className="text-lg font-bold text-green-700">Neto: £{totalOverallNet.toFixed(2)}</div>
          </div>
        </div>

        {/* Forma për shtim shpenzimi të ri */}
        <div className="bg-gradient-to-br from-blue-100 via-white to-purple-100 rounded-2xl shadow-lg border border-blue-100 p-6 mb-4">
          <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">➕ Shto Shpenzim/Faturë</h4>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAddExpenseInvoice}>
            <input 
              name="expense_type" 
              placeholder="Lloji i shpenzimit/faturës" 
              value={newExpenseInvoice.expense_type} 
              onChange={handleChange} 
              className="p-3 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" 
              required
            />
            <input 
              type="date" 
              name="date" 
              value={newExpenseInvoice.date} 
              onChange={handleChange} 
              className="p-3 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" 
              required
            />
            <input 
              name="gross" 
              placeholder="Shuma Bruto (£)" 
              value={newExpenseInvoice.gross} 
              onChange={handleChange} 
              className="p-3 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm" 
              type="number"
              step="0.01"
              min="0"
              required
            />
            <input 
              name="net" 
              placeholder="Shuma Neto (£)" 
              value={newExpenseInvoice.net} 
              onChange={handleChange} 
              className="p-3 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm bg-gray-50" 
              readOnly 
            />
            <input 
              name="tax" 
              placeholder="TVSH (£)" 
              value={newExpenseInvoice.tax} 
              onChange={handleChange} 
              className="p-3 border-2 border-blue-200 rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all shadow-sm bg-gray-50" 
              readOnly 
            />
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                name="paid" 
                checked={newExpenseInvoice.paid} 
                onChange={handleChange} 
                className="w-5 h-5 accent-green-500" 
              />
              <label className="text-base font-medium text-blue-800">Paguar</label>
            </div>
            <input 
              type="file" 
              name="file" 
              accept="application/pdf,image/*" 
              onChange={handleChange} 
              className="p-3 border-2 border-blue-200 rounded-xl text-base file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all duration-200" 
            />
            <button 
              type="submit" 
              className="md:col-span-2 bg-gradient-to-r from-green-400 to-blue-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:from-blue-600 hover:to-green-600 transition-all flex items-center gap-2 justify-center"
            >
              <span className="text-xl">💾</span> Shto Shpenzim
            </button>
          </form>
        </div>
      </div>
      {/* Animacion fade-in */}
      <style jsx>{`
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: none; }
      }
      .animate-fade-in { animation: fade-in 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}