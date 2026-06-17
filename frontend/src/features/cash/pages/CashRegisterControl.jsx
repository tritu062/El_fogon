import React, { useState } from 'react';
import { cashService } from '../services/cashService';
import { 
  Calculator, 
  ArrowUpRight, 
  DollarSign, 
  CreditCard, 
  Send, 
  TrendingUp, 
  RefreshCw,
  Archive,
  Info
} from 'lucide-react';

function StatCard({ title, value, icon: Icon, color, description }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-all">
      <div>
        <span className="text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">
          {title}
        </span>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white">
          ${(value / 100).toLocaleString('es-CO')}
        </h3>
        {description && (
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">{description}</span>
        )}
      </div>
      <div className={`p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/80 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

export default function CashRegisterControl({ activeRegister, registerStats, refreshRegister }) {
  const [actualClosingBalance, setActualClosingBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const typedCents = actualClosingBalance && !isNaN(parseFloat(actualClosingBalance)) ? Math.round(parseFloat(actualClosingBalance) * 100) : null;
  const liveDiscrepancy = typedCents !== null ? typedCents - registerStats.expectedClosingBalance : null;

  if (!activeRegister || !registerStats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-slate-400" />
        <p className="text-sm">Cargando estado operacional de caja...</p>
      </div>
    );
  }

  const handleCloseRegister = async (e) => {
    e.preventDefault();
    if (!actualClosingBalance || isNaN(actualClosingBalance) || parseFloat(actualClosingBalance) < 0) {
      alert('Por favor ingrese un saldo de cierre válido.');
      return;
    }

    const confirmClose = window.confirm('¿Estás seguro de que deseas cerrar la sesión de caja? Esta acción finalizará tu turno.');
    if (!confirmClose) return;

    setSubmitting(true);
    setError(null);

    try {
      const balanceInCents = Math.round(parseFloat(actualClosingBalance) * 100);
      await cashService.closeRegister({
        actualClosingBalance: balanceInCents,
        notes: closeNotes || null
      });
      alert('Caja cerrada con éxito.');
      // Refrescar caja (el Gate detectará que no hay caja activa y mostrará la pantalla de Apertura)
      if (refreshRegister) await refreshRegister();
    } catch (err) {
      console.error('Error closing register:', err);
      setError(err.response?.data?.message || 'Error al cerrar caja.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cierre de Caja</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Revisa tus estadísticas de recaudo y realiza el arqueo de efectivo para cerrar turno.
          </p>
        </div>
      </div>

      {/* Grid de Métricas Operacionales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Fondo de Apertura" 
          value={activeRegister.openingBalance} 
          icon={Calculator} 
          color="text-slate-500" 
          description={`Abierta: ${new Date(activeRegister.openingTime).toLocaleTimeString()}`}
        />
        <StatCard 
          title="Recaudo en Efectivo" 
          value={registerStats.cashPayments} 
          icon={DollarSign} 
          color="text-emerald-500" 
          description="Suma de pagos en efectivo"
        />
        <StatCard 
          title="Total Esperado en Caja (Efectivo)" 
          value={registerStats.expectedClosingBalance} 
          icon={TrendingUp} 
          color="text-brand-500" 
          description="Fondo Apertura + Recaudo Efectivo"
        />
        <StatCard 
          title="Recaudo con Tarjeta" 
          value={registerStats.cardPayments} 
          icon={CreditCard} 
          color="text-blue-500" 
          description="Ventas electrónicas POS"
        />
        <StatCard 
          title="Recaudo Transferencia" 
          value={registerStats.transferPayments} 
          icon={Send} 
          color="text-orange-500" 
          description="Transferencias Nequi/Daviplata"
        />
        <StatCard 
          title="Total Ventas del Turno" 
          value={registerStats.totalSales} 
          icon={ArrowUpRight} 
          color="text-indigo-500" 
          description="Efectivo + POS + Transferencias"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lado Izquierdo: Resumen de Caja */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-1.5 text-slate-800 dark:text-white">
            <Info className="w-5 h-5 text-brand-500" />
            <span>Instrucciones de Arqueo</span>
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2.5 font-medium">
            <p>
              1. Cuenta todo el **dinero en efectivo físicamente disponible** en tu gaveta de caja.
            </p>
            <p>
              2. Introduce la cantidad exacta en el campo **Efectivo Físico en Caja** en la derecha.
            </p>
            <p>
              3. El sistema calculará automáticamente si tienes un cuadre perfecto, un sobrante o un faltante (discrepancia) con base en el **Total Esperado en Caja (Efectivo)** de **${(registerStats.expectedClosingBalance / 100).toLocaleString('es-CO')}**.
            </p>
            <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-xs text-brand-600 dark:text-brand-400 italic">
              * Nota: Los pagos por tarjeta y transferencia no se suman al efectivo en gaveta ya que ingresan directamente a la cuenta bancaria del restaurante.
            </div>
          </div>
        </div>

        {/* Lado Derecho: Formulario de Cierre */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-1.5 text-slate-800 dark:text-white">
            <Archive className="w-5 h-5 text-slate-400" />
            <span>Formulario de Cierre</span>
          </h2>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleCloseRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-2">
                Efectivo Físico en Caja ($ COP)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualClosingBalance}
                  onChange={(e) => setActualClosingBalance(e.target.value)}
                  required
                  className="w-full pl-7.5 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-base font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
              </div>
              {liveDiscrepancy !== null && (
                <div className={`mt-2.5 p-3 rounded-xl border text-xs font-bold ${
                  liveDiscrepancy === 0
                    ? 'bg-green-50 dark:bg-green-950/15 border-green-200 dark:border-green-900/40 text-green-600 dark:text-green-400'
                    : liveDiscrepancy > 0
                    ? 'bg-blue-50 dark:bg-blue-950/15 border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400'
                    : 'bg-red-50 dark:bg-red-950/15 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400'
                }`}>
                  Diferencia calculada:{' '}
                  {liveDiscrepancy === 0
                    ? 'Caja Cuadrada ($0.00)'
                    : liveDiscrepancy > 0
                    ? `+$${(liveDiscrepancy / 100).toLocaleString('es-CO')} (Sobrante)`
                    : `-$${(Math.abs(liveDiscrepancy) / 100).toLocaleString('es-CO')} (Faltante)`
                  }
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-2">
                Observaciones del Cierre (Opcional)
              </label>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Indica si hubo alguna discrepancia o anomalía en tu turno."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none resize-none text-slate-800 dark:text-slate-150"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-red-500 hover:bg-red-650 text-white font-extrabold rounded-xl shadow-md shadow-red-500/10 hover:shadow-red-500/20 text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-650"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  <span>Procesando Arqueo...</span>
                </>
              ) : (
                <>
                  <Archive className="w-4.5 h-4.5" />
                  <span>Cerrar Turno de Caja</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
