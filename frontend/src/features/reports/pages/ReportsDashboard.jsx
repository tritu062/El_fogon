import React, { useState, useEffect } from 'react';
import { reportsService } from '../services/reportsService';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  Clock, 
  Award, 
  CreditCard, 
  Calendar, 
  Loader2, 
  RefreshCw,
  PieChart
} from 'lucide-react';

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Rango de fechas predeterminado (Este mes)
  const [dateRangePreset, setDateRangePreset] = useState('7DAYS'); // 'TODAY', '7DAYS', 'MONTH', 'CUSTOM'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const calculateDates = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      return { start: todayStr, end: todayStr };
    } else if (preset === '7DAYS') {
      const ago = new Date();
      ago.setDate(today.getDate() - 7);
      return { start: ago.toISOString().split('T')[0], end: todayStr };
    } else if (preset === 'MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    return { start: startDate, end: endDate };
  };

  const fetchReports = async (preset = dateRangePreset) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = calculateDates(preset);
      const data = await reportsService.getDashboardSummary({ startDate: start, endDate: end });
      setReportData(data);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setError('No se pudieron obtener las estadísticas reportadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRangePreset]);

  const handlePresetChange = (preset) => {
    setDateRangePreset(preset);
  };

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    setDateRangePreset('CUSTOM');
    fetchReports('CUSTOM');
  };

  // Prevenir crasheos si reportData es null
  const kpis = reportData?.kpis || { totalSales: 0, totalBillsCount: 0, averageTicket: 0, totalOrdersCount: 0 };
  const payments = reportData?.paymentBreakdown || { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0 };
  const topItems = reportData?.topItems || [];
  const hourly = reportData?.hourlyDistribution || Array(24).fill(0);
  const salesByDay = reportData?.salesByDay || [];

  const maxHourlyCount = Math.max(...hourly, 1);
  const totalPaymentSum = (payments.EFECTIVO + payments.TARJETA + payments.TRANSFERENCIA) || 1;

  return (
    <div className="space-y-6">
      {/* HEADER Y FILTRO DE FECHAS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reportes y Analíticas Ejecutivas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Inteligencia de negocio, volumen de ingresos, horas pico y platos más vendidos.
          </p>
        </div>

        {/* SELECTOR DE RANGOS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-sm flex flex-wrap items-center gap-2">
          <button
            onClick={() => handlePresetChange('TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateRangePreset === 'TODAY'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => handlePresetChange('7DAYS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateRangePreset === '7DAYS'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Últimos 7 días
          </button>
          <button
            onClick={() => handlePresetChange('MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateRangePreset === 'MONTH'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Este Mes
          </button>

          <button
            onClick={() => fetchReports()}
            title="Actualizar datos"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-700 dark:text-red-300 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* TARJETAS KPI (METRICAS CLAVE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Ventas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Ventas Totales</span>
            <h3 className="text-2xl font-black text-emerald-500">
              ${(kpis.totalSales / 100).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-slate-400 mt-1 block">Recaudación acumulada</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-200/40">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Ticket Promedio</span>
            <h3 className="text-2xl font-black text-brand-500">
              ${(kpis.averageTicket / 100).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-slate-400 mt-1 block">Por factura emitida</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-brand-500 border border-orange-200/40">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Comandas Atendidas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Comandas Atendidas</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{kpis.totalOrdersCount}</h3>
            <span className="text-[11px] text-slate-400 mt-1 block">Pedidos procesados</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 border border-blue-200/40">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Facturas Cobradas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Facturas Emitidas</span>
            <h3 className="text-2xl font-black text-purple-500">{kpis.totalBillsCount}</h3>
            <span className="text-[11px] text-slate-400 mt-1 block">Cierres de cuenta</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-500 border border-purple-200/40">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center items-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mr-3 text-brand-500" />
          <span className="font-bold">Calculando analíticas del restaurante...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA: TOP PLATOS & HORAS PICO */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* PLATOS MÁS VENDIDOS (TOP SELLERS) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Platos Estrella Más Vendidos</span>
                </h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ranking Top 5</span>
              </div>

              {topItems.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No hay registro de ventas en este rango de fechas.</p>
              ) : (
                <div className="space-y-4">
                  {topItems.map((item, idx) => {
                    const highestQty = topItems[0].totalQuantity || 1;
                    const percent = Math.round((item.totalQuantity / highestQty) * 100);

                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-extrabold ${
                              idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              #{idx + 1}
                            </span>
                            {item.name}
                            <span className="text-xs font-normal text-slate-400">({item.category})</span>
                          </span>
                          <div className="text-right">
                            <span className="text-slate-900 dark:text-white font-extrabold mr-2">{item.totalQuantity} unds</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              ${(item.totalRevenue / 100).toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progreso */}
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ANÁLISIS DE HORAS PICO DE PEDIDOS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span>Distribución por Horas Pico</span>
                </h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flujo de Pedidos (00:00 - 23:00)</span>
              </div>

              <div className="h-44 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-100 dark:border-slate-800">
                {hourly.map((count, hr) => {
                  const barHeight = Math.round((count / maxHourlyCount) * 100);
                  const isPeak = count > 0 && count === maxHourlyCount;

                  return (
                    <div key={hr} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip flotante */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded font-bold pointer-events-none transition-opacity z-10 whitespace-nowrap">
                        {hr}:00 — {count} pedidos
                      </div>

                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isPeak
                            ? 'bg-orange-500 shadow-md shadow-orange-500/30'
                            : count > 0
                            ? 'bg-slate-300 dark:bg-slate-700 group-hover:bg-brand-500'
                            : 'bg-slate-100 dark:bg-slate-850'
                        }`}
                        style={{ height: `${Math.max(barHeight, 4)}%` }}
                      ></div>
                      <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">{hr}h</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: DESGLOSE DE PAGOS Y HISTORIAL DE DÍAS */}
          <div className="space-y-6">
            
            {/* MÉTODOS DE PAGO */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  <span>Métodos de Pago</span>
                </h2>
              </div>

              <div className="space-y-4">
                {/* EFECTIVO */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      💵 Efectivo
                    </span>
                    <span className="text-slate-900 dark:text-white font-extrabold">
                      ${(payments.EFECTIVO / 100).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.round((payments.EFECTIVO / totalPaymentSum) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* TARJETA */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      💳 Tarjeta de Débito / Crédito
                    </span>
                    <span className="text-slate-900 dark:text-white font-extrabold">
                      ${(payments.TARJETA / 100).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.round((payments.TARJETA / totalPaymentSum) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* TRANSFERENCIA */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      📱 Transferencia (Nequi/Daviplata)
                    </span>
                    <span className="text-slate-900 dark:text-white font-extrabold">
                      ${(payments.TRANSFERENCIA / 100).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.round((payments.TRANSFERENCIA / totalPaymentSum) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* RESUMEN POR DÍAS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Ventas Diarias</h2>
              
              {salesByDay.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Sin actividad en este rango.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                  {salesByDay.map((s) => (
                    <div key={s.date} className="py-2.5 flex justify-between items-center text-xs">
                      <span className="font-mono text-slate-500">{s.date}</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${(s.total / 100).toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
