import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid, AlertCircle, ShoppingCart } from 'lucide-react';

/**
 * Tarjeta visual premium para representar el estado de una mesa.
 */
export default function TableCard({ table, onStatusChange, canChangeStatus }) {
  const { id, number, status, zone } = table;
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === status) return;
    setLoading(true);
    try {
      await onStatusChange(id, newStatus);
    } catch (err) {
      console.error('Error al cambiar el estado de la mesa:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'FREE':
        return {
          bg: 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-800',
          text: 'text-green-600 dark:text-green-400',
          badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50',
          label: 'Libre'
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-800',
          text: 'text-red-600 dark:text-red-400',
          badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50',
          label: 'Ocupada'
        };
      case 'RESERVED':
        return {
          bg: 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-800',
          text: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
          label: 'Reservada'
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
          text: 'text-slate-500 dark:text-slate-400',
          badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
          label: 'Desconocido'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 ${styles.bg} ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-sm ${styles.text}`}>
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Mesa {number}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{zone?.name || 'Sin Zona'}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${styles.badge}`}>
          {styles.label}
        </span>
      </div>

      {canChangeStatus ? (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <label className="block text-xs font-medium text-slate-450 dark:text-slate-500 mb-1.5">
            Cambiar estado manual
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleStatusChange('FREE')}
              disabled={loading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                status === 'FREE'
                  ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-500/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Libre
            </button>
            <button
              onClick={() => handleStatusChange('OCCUPIED')}
              disabled={loading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                status === 'OCCUPIED'
                  ? 'bg-red-600 border-red-600 text-white shadow-sm shadow-red-500/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Ocupar
            </button>
            <button
              onClick={() => handleStatusChange('RESERVED')}
              disabled={loading}
              className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                status === 'RESERVED'
                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-500/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              Reservar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-slate-105 dark:border-slate-800/60 flex items-center space-x-1.5 text-xs text-slate-400 dark:text-slate-500">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Solo lectura</span>
        </div>
      )}

      {canChangeStatus && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <Link
            to={`/dashboard/waiter/order?tableId=${id}`}
            className={`w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
              status === 'OCCUPIED'
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/10'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {status === 'OCCUPIED' ? 'Adicionar a Comanda' : 'Tomar Pedido'}
          </Link>
        </div>
      )}
    </div>
  );
}
