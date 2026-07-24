import React, { useState, useEffect } from 'react';
import { ordersService } from '../../orders/services/ordersService';
import PaymentModal from '../components/PaymentModal';
import { 
  FileText, 
  RefreshCw, 
  Clock, 
  User, 
  HelpCircle,
  CreditCard
} from 'lucide-react';

export default function PendingBillsList({ refreshRegister }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para el modal de cobro
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // EXPLICACIÓN DIDÁCTICA:
  // El cajero necesita visualizar todas las comanda activas que no han sido saldadas o anuladas.
  // 1. Obtenemos la lista general mediante ordersService.
  // 2. Filtramos descartando los estados finales: 'PAID' (pagado) y 'CANCELLED' (cancelado).
  //    De esta forma capturamos pedidos en 'PENDING', 'PREPARING', 'READY' y 'SERVED'.
  // 3. ORDENAMIENTO DE PRIORIDAD:
  //    - Los pedidos que tienen 'isBillRequested: true' (el mesero solicitó pre-cuenta)
  //      deben aparecer de primeros (prioritarios) en la lista para agilizar el cobro.
  //    - Las comandas restantes se ordenan de forma ascendente por su fecha de creación (FIFO).
  const fetchPendingOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener todos los pedidos
      const allOrders = await ordersService.getOrders();
      // Filtrar por estados que no sean finalizados (PAID, CANCELLED)
      const activeOrders = allOrders.filter(o => o.status !== 'PAID' && o.status !== 'CANCELLED');
      
      // Ordenar: primero los que tienen pre-cuenta solicitada (isBillRequested === true)
      // Luego por fecha de creación (de más antiguo a más nuevo - FIFO)
      const sorted = activeOrders.sort((a, b) => {
        if (a.isBillRequested && !b.isBillRequested) return -1;
        if (!a.isBillRequested && b.isBillRequested) return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      setOrders(sorted);
    } catch (err) {
      console.error('Error fetching orders for cashier:', err);
      setError('No se pudieron cargar las cuentas activas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const handleOpenPayment = (order) => {
    setSelectedOrder(order);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    setSelectedOrder(null);
    // Refrescar lista de pedidos y estado de la caja
    fetchPendingOrders();
    if (refreshRegister) refreshRegister();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cuentas por Cobrar</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Procesa el pago de las comandas activas del salón y órdenes de llevar.
          </p>
        </div>

        <button
          onClick={fetchPendingOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold rounded-xl text-sm transition-all text-slate-700 dark:text-slate-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-2xl text-sm font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-slate-400" />
          <p className="text-sm font-medium">Buscando comandas activas...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/20 dark:bg-slate-900/10">
          <FileText className="w-12 h-12 text-slate-350 dark:text-slate-700 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-base">¡Cuentas al día!</p>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">No hay comandas activas pendientes de pago.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => {
            const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div 
                key={order.id} 
                className={`bg-white dark:bg-slate-900 border ${
                  order.isBillRequested 
                    ? 'border-red-500 dark:border-red-500/60 shadow-md shadow-red-500/5 ring-1 ring-red-500/20' 
                    : 'border-slate-200 dark:border-slate-800/80 shadow-sm'
                } rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between`}
              >
                {/* Header de la Tarjeta */}
                <div>
                  <div className="flex justify-between items-start mb-3.5">
                    <div>
                      <span className="text-lg font-extrabold text-slate-800 dark:text-white block">
                        {order.table ? `Mesa ${order.table.number}` : 'Para Llevar'}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
                        Comanda #{order.id}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {order.isBillRequested && (
                        <span className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full border text-red-500 bg-red-500/10 border-red-500/20 animate-pulse flex items-center gap-1">
                          🔔 Pre-cuenta
                        </span>
                      )}
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        order.status === 'READY'
                          ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                          : order.status === 'SERVED'
                          ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                          : order.status === 'PREPARING'
                          ? 'text-orange-500 bg-orange-500/10 border-orange-500/20'
                          : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        {order.status === 'READY' 
                          ? 'Listo' 
                          : order.status === 'SERVED' 
                          ? 'Servido' 
                          : order.status === 'PREPARING' 
                          ? 'Preparando' 
                          : 'Pendiente'}
                      </span>
                    </div>
                  </div>

                  {/* Resumen de items del pedido */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/50 rounded-xl p-3 mb-4 max-h-40 overflow-y-auto">
                    <ul className="space-y-1.5">
                      {order.orderItems.map((item) => (
                        <li key={item.id} className="text-xs flex justify-between font-medium text-slate-600 dark:text-slate-400">
                          <span>
                            <span className="text-brand-500 font-bold mr-1">{item.quantity}x</span> 
                            {item.item.name}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            ${((item.price * item.quantity) / 100).toLocaleString('es-CO')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Datos del mesero y hora */}
                  <div className="flex items-center justify-between text-[11px] text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-850/60 pb-3 mb-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Mesero: {order.waiter?.firstName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Pedida {timeStr}
                    </span>
                  </div>
                </div>

                {/* Footer de Tarjeta con total y acción */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total a Cobrar</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-white">
                      ${(order.total / 100).toLocaleString('es-CO')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenPayment(order)}
                    className="flex items-center gap-1.5 px-4.5 py-3 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cobrar</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de cobro */}
      {isPaymentModalOpen && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

    </div>
  );
}
