import { useState, useEffect, useRef, useCallback } from 'react';
import { ordersService } from '../services/ordersService';

export function useKitchenOrders() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevPendingCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // La5 (880Hz)
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2); // Beep de 200ms
    } catch (e) {
      console.warn('AudioContext beep blocked or not supported:', e);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const data = await ordersService.getKitchenOrders();
      
      setPendingOrders(data.pending);
      setReadyOrders(data.ready);
      setError(null);

      // Reproducir sonido si aumenta el número de comandas pendientes (nuevos pedidos)
      // y no es la primera carga para evitar sonar al abrir la pantalla
      if (!isFirstLoadRef.current) {
        if (data.pending.length > prevPendingCountRef.current) {
          playBeep();
        }
      } else {
        isFirstLoadRef.current = false;
      }
      
      prevPendingCountRef.current = data.pending.length;
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
      setError('Error al cargar comandas de cocina.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 15000); // Polling cada 15 segundos

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const dispatchOrder = async (orderId) => {
    try {
      await ordersService.updateOrderStatus(orderId, 'READY');
      // Refrescar inmediatamente para ver el cambio reflejado
      await fetchOrders();
      return { success: true };
    } catch (err) {
      console.error(`Error dispatching order ${orderId}:`, err);
      return { success: false, error: err.message };
    }
  };

  return {
    pendingOrders,
    readyOrders,
    loading,
    error,
    refresh: fetchOrders,
    dispatchOrder
  };
}
