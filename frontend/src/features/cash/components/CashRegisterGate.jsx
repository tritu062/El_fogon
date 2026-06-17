import React, { useState, useEffect } from 'react';
import { cashService } from '../services/cashService';
import { RefreshCw, Calculator, KeyRound } from 'lucide-react';

export default function CashRegisterGate({ children }) {
  const [activeRegister, setActiveRegister] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de formulario
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkRegister = async () => {
    setLoading(true);
    try {
      const data = await cashService.getCurrentRegister();
      setActiveRegister(data.register);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      console.error('Error checking cash register status:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRegister();
  }, []);

  const handleOpenRegister = async (e) => {
    e.preventDefault();
    if (!openingBalance || isNaN(openingBalance) || parseFloat(openingBalance) < 0) {
      alert('Por favor ingrese un monto inicial válido.');
      return;
    }

    setSubmitting(true);
    try {
      const balanceInCents = Math.round(parseFloat(openingBalance) * 100);
      const reg = await cashService.openRegister({
        openingBalance: balanceInCents,
        notes: notes || null
      });
      setActiveRegister(reg);
      setStats({
        totalSales: 0,
        cashPayments: 0,
        cardPayments: 0,
        transferPayments: 0,
        expectedClosingBalance: balanceInCents
      });
      setError(null);
    } catch (err) {
      console.error('Error opening cash register:', err);
      setError(err.response?.data?.message || 'Error al abrir caja.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-slate-400" />
        <p className="text-sm font-medium">Verificando estado de caja...</p>
      </div>
    );
  }

  // Si hay caja abierta, inyectar el estado de la sesión actual y la función de refrescar a los componentes hijos
  if (activeRegister) {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { 
          activeRegister, 
          registerStats: stats, 
          refreshRegister: checkRegister 
        });
      }
      return child;
    });
  }

  // Si no hay caja abierta, mostrar la pantalla de apertura obligatoria
  return (
    <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-500 rounded-xl">
          <Calculator className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">Apertura de Caja</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Inicia tu turno registrando el saldo inicial en caja.</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleOpenRegister} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-2">
            Monto Inicial ($ COP)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              required
              className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-base font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-850 dark:text-slate-100"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">Suele ser el efectivo base para dar cambio/vuelto.</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-2">
            Notas de Apertura (Opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Base de caja recibida del turno anterior."
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-850 dark:text-slate-100 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-xl shadow-md shadow-brand-500/20 hover:shadow-brand-500/25 transition-all text-sm uppercase tracking-wider disabled:bg-slate-600 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Abriendo Caja...</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Confirmar Apertura</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
