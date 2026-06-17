import React, { useState, useEffect } from 'react';
import { billsService } from '../services/billsService';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Printer, 
  DollarSign, 
  CreditCard, 
  Send,
  FileText
} from 'lucide-react';

export default function PaymentModal({ order, onClose, onSuccess }) {
  const [taxPercent, setTaxPercent] = useState(0); // Porcentaje de impuestos (ej: 8%)
  const [discountAmount, setDiscountAmount] = useState(''); // Monto de descuento en COP
  
  // Lista de pagos agregados a la cuenta
  // { method: 'EFECTIVO'|'TARJETA'|'TRANSFERENCIA', amount: number, received: number }
  const [paymentsList, setPaymentsList] = useState([]);
  
  // Input temporal de pago
  const [selectedMethod, setSelectedMethod] = useState('EFECTIVO');
  const [paymentAmount, setPaymentAmount] = useState('');

  // Estados de control de API
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para el recibo final impreso/visualizado
  const [receiptBill, setReceiptBill] = useState(null);

  const subtotal = order.total; // En centavos
  const tax = Math.round(subtotal * (parseFloat(taxPercent || 0) / 100)); // En centavos
  const discount = Math.round(parseFloat(discountAmount || 0) * 100); // En centavos
  const total = Math.max(0, subtotal + tax - discount); // En centavos

  const totalPaid = paymentsList.reduce((acc, p) => acc + p.amount, 0); // En centavos
  const remaining = total - totalPaid; // En centavos

  // Autocompletar el monto restante en el input de pago
  useEffect(() => {
    if (remaining > 0) {
      setPaymentAmount((remaining / 100).toString());
    } else {
      setPaymentAmount('0');
    }
  }, [remaining, total]);

  const handleAddPayment = () => {
    const amountVal = parseFloat(paymentAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Ingrese un monto válido mayor que 0.');
      return;
    }

    const amountCents = Math.round(amountVal * 100);
    
    // Si es efectivo, permitir ingresar un valor recibido mayor para el cambio
    let receivedCents = amountCents;
    let appliedCents = amountCents;

    if (selectedMethod === 'EFECTIVO' && amountCents > remaining) {
      // El cliente entregó de más, el pago real aplicado se topa al restante
      appliedCents = remaining;
      receivedCents = amountCents;
    } else if (amountCents > remaining) {
      // Para tarjeta o transferencia no debe pagarse de más
      alert('Para pagos electrónicos, el monto no puede exceder el saldo restante.');
      return;
    }

    if (appliedCents === 0) {
      alert('La cuenta ya está completamente cubierta.');
      return;
    }

    // Agregar a la lista
    setPaymentsList([
      ...paymentsList,
      {
        method: selectedMethod,
        amount: appliedCents,
        received: receivedCents
      }
    ]);
  };

  const handleRemovePayment = (index) => {
    setPaymentsList(paymentsList.filter((_, i) => i !== index));
  };

  const handleQuickFullPayment = (method) => {
    if (total <= 0) return;
    setPaymentsList([
      {
        method,
        amount: total,
        received: total
      }
    ]);
  };

  const handleSubmitPayment = async () => {
    if (remaining > 0) {
      alert('Aún queda un saldo restante por cubrir.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const bill = await billsService.processPayment({
        orderId: order.id,
        tax,
        discount,
        payments: paymentsList.map(p => ({
          amount: p.amount,
          method: p.method
        }))
      });

      // Guardar el recibo generado para mostrar el ticket final
      setReceiptBill(bill);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err.response?.data?.message || 'Error al procesar cobro.');
      setSubmitting(false);
    }
  };

  // Calcular vuelto en efectivo si aplica
  const totalReceivedCash = paymentsList
    .filter(p => p.method === 'EFECTIVO')
    .reduce((acc, p) => acc + p.received, 0);

  const totalAppliedCash = paymentsList
    .filter(p => p.method === 'EFECTIVO')
    .reduce((acc, p) => acc + p.amount, 0);

  const changeDue = Math.max(0, totalReceivedCash - totalAppliedCash);

  if (receiptBill) {
    // Pantalla de Recibo de Venta (Comprobante de Pago)
    return (
      <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-6 overflow-hidden">
          
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Check className="w-5 h-5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full" />
              <span>Pago Procesado Exitosamente</span>
            </h3>
            <button 
              onClick={onSuccess} 
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Ticket de venta estilo térmico */}
          <div className="my-5 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-350 space-y-3 shadow-inner max-h-[60vh] overflow-y-auto">
            <div className="text-center font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">
              *** EL FOGÓN ***
            </div>
            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-800 pb-2">
              NIT: 123.456.789-0 <br />
              Calle 10 # 5-25, Salón Principal <br />
              Tel: (601) 765-4321
            </div>

            <div className="space-y-1">
              <div>Factura: <span className="font-bold">{receiptBill.invoiceNumber}</span></div>
              <div>Fecha: {new Date(receiptBill.createdAt).toLocaleString()}</div>
              <div>Cajero: {receiptBill.cashier?.firstName} {receiptBill.cashier?.lastName}</div>
              <div>Mesa: {receiptBill.order?.table ? receiptBill.order.table.number : 'Para Llevar'}</div>
              <div>Comanda: #{receiptBill.orderId}</div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-800 py-2">
              <table className="w-full">
                <thead>
                  <tr className="font-bold text-slate-900 dark:text-white">
                    <th className="text-left w-1/2">Ítem</th>
                    <th className="text-center w-1/6">Cant</th>
                    <th className="text-right w-1/3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptBill.order?.orderItems?.map((oItem) => (
                    <tr key={oItem.id} className="border-b border-slate-100 dark:border-slate-900/40 py-1">
                      <td className="py-1">{oItem.item.name}</td>
                      <td className="text-center py-1">{oItem.quantity}</td>
                      <td className="text-right py-1">${((oItem.price * oItem.quantity) / 100).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-right font-semibold">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${(receiptBill.subtotal / 100).toLocaleString('es-CO')}</span>
              </div>
              {receiptBill.tax > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Impuesto (Consumo):</span>
                  <span>+${(receiptBill.tax / 100).toLocaleString('es-CO')}</span>
                </div>
              )}
              {receiptBill.discount > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>Descuento Aplicado:</span>
                  <span>-${(receiptBill.discount / 100).toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1.5">
                <span>Total Facturado:</span>
                <span>${(receiptBill.total / 100).toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1.5">
              <div className="font-bold text-slate-950 dark:text-slate-100">MÉTODOS DE PAGO:</div>
              {receiptBill.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-slate-500">
                  <span className="uppercase">{p.method}:</span>
                  <span>${(p.amount / 100).toLocaleString('es-CO')}</span>
                </div>
              ))}
              {changeDue > 0 && (
                <div className="flex justify-between font-bold text-brand-500">
                  <span>CAMBIO / VUELTO:</span>
                  <span>${(changeDue / 100).toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>

            <div className="text-center border-t border-dashed border-slate-300 dark:border-slate-800 pt-3 mt-4 text-[10px] text-slate-400">
              ¡Gracias por tu compra! <br />
              Disfruta tu día en El Fogón.
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </button>
            <button
              onClick={onSuccess}
              className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-brand-500/15"
            >
              <span>Finalizar</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Interfaz del Formulario de Cobro Principal
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row p-6 gap-6 overflow-hidden max-h-[95vh]">
        
        {/* LADO IZQUIERDO: DETALLE DE LA COMANDA */}
        <div className="flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pr-0 md:pr-6 pb-4 md:pb-0 min-h-0">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-slate-400" />
                <span>Detalle de Cuenta</span>
              </h3>
              <span className="text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2 py-0.5 rounded-full font-mono font-bold text-slate-500">
                Mesa: {order.table ? order.table.number : 'Llevar'}
              </span>
            </div>

            {/* Listado de items */}
            <div className="overflow-y-auto max-h-[40vh] space-y-2 pr-2">
              {order.orderItems.map((oItem) => (
                <div key={oItem.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 rounded-xl text-xs flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      {oItem.quantity}x {oItem.item.name}
                    </span>
                    {oItem.notes && (
                      <p className="text-[10px] text-slate-400 mt-0.5 italic">({oItem.notes})</p>
                    )}
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-350">
                    ${((oItem.price * oItem.quantity) / 100).toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen contable */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Subtotal:</span>
              <span>${(subtotal / 100).toLocaleString('es-CO')}</span>
            </div>
            
            {/* Impuesto input */}
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Impuesto Consumo (%):</span>
              <input
                type="number"
                min="0"
                max="50"
                placeholder="0"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 px-2 py-1 text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Descuento input */}
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Descuento ($):</span>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-24 px-2.5 py-1 text-right bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-150 dark:border-slate-850 text-slate-900 dark:text-white font-black text-lg">
              <span>Total a Cobrar:</span>
              <span>${(total / 100).toLocaleString('es-CO')}</span>
            </div>
          </div>

        </div>

        {/* LADO DERECHO: INTERFAZ DE PAGOS */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Procesar Pago</h3>
            <button 
              onClick={onClose} 
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-xl text-[11px] font-semibold">
              {error}
            </div>
          )}

          {/* Quick Pay Buttons (1-click completion) */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => handleQuickFullPayment('EFECTIVO')}
              className="py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>Full Efectivo</span>
            </button>
            <button
              onClick={() => handleQuickFullPayment('TARJETA')}
              className="py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              <span>Full Tarjeta</span>
            </button>
            <button
              onClick={() => handleQuickFullPayment('TRANSFERENCIA')}
              className="py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-orange-500" />
              <span>Full Transf.</span>
            </button>
          </div>

          {/* Split Payment Form */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Registrar Pago Manual / Mixto</span>
            
            <div className="flex gap-3">
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500/20 outline-none"
              >
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TARJETA">💳 Tarjeta Crédito/Débito</option>
                <option value="TRANSFERENCIA">📲 Transferencia Nequi/Daviplata</option>
              </select>

              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full pl-6 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddPayment}
                className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-sm shadow-brand-500/15"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Payment List (Added so far) */}
          <div className="flex-1 my-4 overflow-y-auto max-h-[20vh] border border-slate-100 dark:border-slate-850 rounded-2xl p-3 space-y-2">
            {paymentsList.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-6">No se han registrado pagos aún.</p>
            ) : (
              paymentsList.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950/65 border border-slate-150 dark:border-slate-850 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] mr-2">
                      {p.method === 'EFECTIVO' ? '💵' : p.method === 'TARJETA' ? '💳' : '📲'} {p.method}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      ${(p.amount / 100).toLocaleString('es-CO')}
                    </span>
                    {p.received > p.amount && (
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        (Recibido: ${(p.received / 100).toLocaleString('es-CO')})
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleRemovePayment(idx)}
                    className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Balance indicators */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Total a Cubrir:</span>
              <span className="text-slate-800 dark:text-white">${(total / 100).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Pagado:</span>
              <span className="text-emerald-500">${(totalPaid / 100).toLocaleString('es-CO')}</span>
            </div>

            {changeDue > 0 && (
              <div className="flex justify-between text-xs font-black text-brand-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Cambio / Vuelto:</span>
                <span>${(changeDue / 100).toLocaleString('es-CO')}</span>
              </div>
            )}

            {remaining > 0 && (
              <div className="flex justify-between text-xs font-black text-red-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Saldo Restante:</span>
                <span>${(remaining / 100).toLocaleString('es-CO')}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleSubmitPayment}
            disabled={remaining > 0 || submitting}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all mt-4 shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Registrando Transacción...</span>
              </>
            ) : (
              <>
                <Check className="w-4.5 h-4.5" />
                <span>Procesar y Emitir Factura</span>
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
}
