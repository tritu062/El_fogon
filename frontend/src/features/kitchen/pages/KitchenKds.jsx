import React, { useState, useEffect } from 'react';
import { useKitchenOrders } from '../../orders/hooks/useKitchenOrders';
import { 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  ChefHat, 
  Volume2, 
  VolumeX, 
  AlertTriangle,
  UtensilsCrossed
} from 'lucide-react';

/**
 * Componente que calcula y muestra el temporizador semáforo para cada comanda.
 * Verde: < 10m
 * Amarillo: 10m - 15m
 * Rojo: >= 15m (con alerta visual intermitente)
 */
function OrderTimer({ createdAt }) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(createdAt);
      const diffMs = new Date() - start;
      setElapsedMinutes(Math.floor(diffMs / 60000));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, [createdAt]);

  let colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  let badgeText = 'A tiempo';
  
  if (elapsedMinutes >= 15) {
    colorClass = 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse font-extrabold';
    badgeText = '¡CRÍTICO!';
  } else if (elapsedMinutes >= 10) {
    colorClass = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 font-bold';
    badgeText = 'Retrasado';
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs ${colorClass}`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{elapsedMinutes} min</span>
      <span className="text-[10px] uppercase font-bold tracking-wider ml-1">({badgeText})</span>
    </div>
  );
}

export default function KitchenKds() {
  const { 
    pendingOrders, 
    readyOrders, 
    loading, 
    error, 
    refresh, 
    dispatchOrder 
  } = useKitchenOrders();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar el reloj local
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDispatch = async (orderId) => {
    const res = await dispatchOrder(orderId);
    if (!res.success) {
      alert(`Error al despachar: ${res.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased p-6">
      
      {/* HEADER DE KDS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              El Fogón <span className="text-brand-500">KDS</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Sistema de Visualización de Cocina en Tiempo Real</p>
          </div>
        </div>

        {/* CONTROLES Y RELOJ */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Métricas rápidas */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-xl text-xs font-semibold">
            <div className="text-slate-400">
              Pendientes: <span className="text-yellow-400 font-extrabold">{pendingOrders.length}</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="text-slate-400">
              Listos Hoy: <span className="text-emerald-400 font-extrabold">{readyOrders.length}</span>
            </div>
          </div>

          {/* Reloj */}
          <div className="bg-slate-900 border border-slate-800/85 px-4.5 py-2 rounded-xl text-sm font-mono tracking-wider text-slate-300">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          {/* Silenciar/Activar Alerta Sonora */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400'
            }`}
            title={soundEnabled ? 'Silenciar Alerta Sonora' : 'Activar Alerta Sonora'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Botón Refrescar */}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-350 font-bold rounded-xl text-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </header>

      {/* DETECTOR DE ALERTA DE CARGA / ERROR */}
      {error && (
        <div className="mb-6 p-4 bg-red-950/15 border border-red-900/40 rounded-xl text-red-400 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL: DOS COLUMNAS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* COLUMNA 1: COMANDAS PENDIENTES (8/12 ANCHO) */}
        <section className="lg:col-span-8 flex flex-col min-h-0 bg-slate-900/25 border border-slate-900/60 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>📋 Comandas Pendientes</span>
              <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
                {pendingOrders.length}
              </span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Ordenadas por tiempo de espera (FIFO)</span>
          </div>

          {loading && pendingOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-slate-600" />
              <p className="text-sm font-medium">Buscando comandas de cocina...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 border border-dashed border-slate-800/80 rounded-xl bg-slate-900/5">
              <UtensilsCrossed className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-400 font-bold text-sm">¡Cocina al día!</p>
              <p className="text-xs text-slate-500 mt-1">No hay pedidos pendientes de preparación.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-250px)]">
              {pendingOrders.map((order) => {
                const elapsedMin = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
                const isCritical = elapsedMin >= 15;
                
                return (
                  <div 
                    key={order.id} 
                    className={`bg-slate-900 border rounded-xl flex flex-col justify-between shadow-lg transition-all hover:scale-[1.01] ${
                      isCritical 
                        ? 'border-red-500/80 ring-1 ring-red-500/30' 
                        : 'border-slate-800/90'
                    }`}
                  >
                    {/* Header de la tarjeta */}
                    <div className="p-4 border-b border-slate-850 flex justify-between items-start gap-2 bg-slate-950/20">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-white">
                            {order.table ? `Mesa ${order.table.number}` : 'Para Llevar'}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            #{order.id}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                          Mesero: {order.waiter?.firstName} {order.waiter?.lastName}
                        </span>
                      </div>
                      <OrderTimer createdAt={order.createdAt} />
                    </div>

                    {/* Contenido / Platos */}
                    <div className="p-4 flex-1 space-y-3">
                      <ul className="space-y-2.5">
                        {order.orderItems.map((oItem) => (
                          <li key={oItem.id} className="text-sm border-b border-slate-850/40 pb-2 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-slate-200">
                                <span className="text-brand-400 font-extrabold text-base mr-1">{oItem.quantity}x</span>{' '}
                                {oItem.item.name}
                              </span>
                            </div>
                            
                            {/* Modificadores */}
                            {oItem.selectedModifiers && Object.keys(oItem.selectedModifiers).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-slate-450">
                                {Object.entries(oItem.selectedModifiers).map(([k, v]) => (
                                  <span key={k} className="bg-slate-850/60 border border-slate-800 px-1.5 py-0.5 rounded">
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Notas del mesero */}
                            {oItem.notes && (
                              <p className="text-[11px] text-yellow-400/90 italic mt-1 font-medium bg-yellow-500/5 px-2 py-0.5 rounded border border-yellow-500/10">
                                📝 Nota: {oItem.notes}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer / Acción de despacho */}
                    <div className="p-4 border-t border-slate-850/80 bg-slate-950/10">
                      <button
                        onClick={() => handleDispatch(order.id)}
                        className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md ${
                          isCritical
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/10'
                            : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/10'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Despachar Comanda</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* COLUMNA 2: DESPACHADAS RECIENTEMENTE (4/12 ANCHO) */}
        <section className="lg:col-span-4 flex flex-col min-h-0 bg-slate-900/25 border border-slate-900/60 p-5 rounded-2xl">
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>✅ Despachadas (Hoy)</span>
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
                {readyOrders.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Pedidos completados y listos para servir en mesa</p>
          </div>

          {loading && readyOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-600" />
            </div>
          ) : readyOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs font-semibold">Ningún pedido completado hoy aún.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[calc(100vh-250px)]">
              {readyOrders.map((order) => {
                const prepTimeStr = new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={order.id} className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-xl flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-200">
                          {order.table ? `Mesa ${order.table.number}` : 'Para Llevar'}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Listo {prepTimeStr}
                        </span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {order.orderItems.map((item) => (
                          <li key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.item.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
