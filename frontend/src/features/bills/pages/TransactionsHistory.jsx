import React, { useState, useEffect } from 'react';
import { billsService } from '../services/billsService';
import { 
  History, 
  Search, 
  RefreshCw, 
  Calendar, 
  Printer, 
  FileText,
  X,
  CreditCard,
  DollarSign
} from 'lucide-react';

export default function TransactionsHistory() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detalles de factura seleccionada
  const [selectedBill, setSelectedBill] = useState(null);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (startDate) filters.startDate = new Date(startDate).toISOString();
      if (endDate) filters.endDate = new Date(endDate).toISOString();
      
      const list = await billsService.getBills(filters);
      setBills(list);
    } catch (err) {
      console.error('Error fetching invoice history:', err);
      setError('No se pudo cargar el historial de facturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [startDate, endDate]);

  // Filtrado local por número de factura o mesa
  const filteredBills = bills.filter(bill => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const matchesInvoice = bill.invoiceNumber.toLowerCase().includes(query);
    const matchesTable = bill.order?.table?.number?.toString() === query || 
                         (bill.order?.table ? `mesa ${bill.order.table.number}` : 'para llevar').toLowerCase().includes(query);
    
    return matchesInvoice || matchesTable;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Historial de Transacciones</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Consulta y reimprime facturas emitidas por el restaurante.
        </p>
      </div>

      {/* Controles de Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Búsqueda por Texto */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-450 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Factura o Mesa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Filtros de Fecha */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>

          <button
            onClick={fetchBills}
            disabled={loading}
            className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-all text-slate-600 dark:text-slate-400"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Tabla de Facturas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-slate-400" />
          <p className="text-sm">Buscando facturas...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-850 rounded-3xl bg-slate-50/20 dark:bg-slate-900/10">
          <History className="w-12 h-12 text-slate-350 dark:text-slate-700 mb-3" />
          <p className="text-slate-500 dark:text-slate-450 font-bold text-sm">No se encontraron facturas.</p>
          <p className="text-[11px] text-slate-450 mt-1">Prueba cambiando los filtros de fecha o búsqueda.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/60 text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Factura</th>
                  <th className="p-4">Mesa</th>
                  <th className="p-4">Fecha / Hora</th>
                  <th className="p-4">Cajero</th>
                  <th className="p-4">Pagos</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                {filteredBills.map((bill) => {
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {bill.invoiceNumber}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                        {bill.order?.table ? `Mesa ${bill.order.table.number}` : 'Para Llevar'}
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(bill.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-slate-500">
                        {bill.cashier?.firstName} {bill.cashier?.lastName}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {bill.payments.map((p) => (
                            <span key={p.id} className="text-[9px] bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded font-bold uppercase text-slate-500">
                              {p.method}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 dark:text-white">
                        ${(bill.total / 100).toLocaleString('es-CO')}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-[10px] uppercase tracking-wider text-brand-500 transition-all inline-block"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Visualizar Detalles de Factura */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-6 overflow-hidden">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-slate-400" />
                <span>Factura {selectedBill.invoiceNumber}</span>
              </h3>
              <button 
                onClick={() => setSelectedBill(null)} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formato Ticket Térmico en Historial */}
            <div className="my-5 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-350 space-y-3 shadow-inner max-h-[60vh] overflow-y-auto">
              <div className="text-center font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                *** EL FOGÓN ***
              </div>
              <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-800 pb-2">
                NIT: 123.456.789-0 <br />
                Calle 10 # 5-25, Salón Principal
              </div>

              <div className="space-y-1">
                <div>Factura: <span className="font-bold">{selectedBill.invoiceNumber}</span></div>
                <div>Fecha: {new Date(selectedBill.createdAt).toLocaleString()}</div>
                <div>Cajero: {selectedBill.cashier?.firstName} {selectedBill.cashier?.lastName}</div>
                <div>Mesa: {selectedBill.order?.table ? selectedBill.order.table.number : 'Para Llevar'}</div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-800 py-2">
                <table className="w-full">
                  <thead>
                    <tr className="font-bold text-slate-900 dark:text-white">
                      <th className="text-left">Item</th>
                      <th className="text-center">Cant</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.order?.orderItems?.map((oItem) => (
                      <tr key={oItem.id}>
                        <td>{oItem.item.name}</td>
                        <td className="text-center">{oItem.quantity}</td>
                        <td className="text-right">${((oItem.price * oItem.quantity) / 100).toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 text-right font-semibold">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${(selectedBill.subtotal / 100).toLocaleString('es-CO')}</span>
                </div>
                {selectedBill.tax > 0 && (
                  <div className="flex justify-between text-slate-505">
                    <span>Impuesto:</span>
                    <span>+${(selectedBill.tax / 100).toLocaleString('es-CO')}</span>
                  </div>
                )}
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-505">
                    <span>Descuento:</span>
                    <span>-${(selectedBill.discount / 100).toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1.5">
                  <span>Total Facturado:</span>
                  <span>${(selectedBill.total / 100).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
                <div className="font-bold text-slate-950 dark:text-slate-100">PAGOS REGISTRADOS:</div>
                {selectedBill.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-slate-500">
                    <span className="uppercase">{p.method}:</span>
                    <span>${(p.amount / 100).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => setSelectedBill(null)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                <span>Cerrar</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
