import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { ordersService } from '../../orders/services/ordersService';
import { reportsService } from '../../reports/services/reportsService';
import { inventoryService } from '../../inventory/services/inventoryService';
import { tablesService } from '../../tables/services/tablesService';
import { 
  Users, 
  Utensils, 
  ChefHat, 
  Banknote, 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Receipt,
  Plus,
  Loader2,
  RefreshCw,
  Package,
  ArrowRight,
  ShieldAlert,
  Award,
  Grid
} from 'lucide-react';

/**
 * Componente genérico reutilizable para mostrar métricas clave (Kpi Cards).
 */
function StatCard({ title, value, icon: Icon, color, description }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-all hover:scale-[1.01]">
      <div>
        <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">
          {title}
        </span>
        <h3 className="text-3xl font-extrabold">{value}</h3>
        {description && (
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block font-medium">
            {description}
          </span>
        )}
      </div>
      <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/80 ${color}`}>
        <Icon className="w-6 h-6 animate-pulse" />
      </div>
    </div>
  );
}

// ==========================================
// 1. DASHBOARD DEL ADMINISTRADOR (TIEMPO REAL)
// ==========================================
export function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Estados en Vivo
  const [kpis, setKpis] = useState({
    totalSales: 0,
    totalBillsCount: 0,
    averageTicket: 0,
    totalOrdersCount: 0,
    activeOrdersCount: 0
  });

  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [tablesStats, setTablesStats] = useState({ total: 0, occupied: 0, free: 0 });
  const [topItems, setTopItems] = useState([]);

  const fetchRealtimeData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Consultas paralelas en tiempo real
      const [reportsData, ingredientsData, tablesData, ordersData] = await Promise.all([
        reportsService.getDashboardSummary({ startDate: todayStr, endDate: todayStr }).catch(() => null),
        inventoryService.getIngredients().catch(() => []),
        tablesService.getTables().catch(() => []),
        ordersService.getOrders().catch(() => [])
      ]);

      // 1. KPIs del día
      if (reportsData) {
        setKpis({
          totalSales: reportsData.kpis?.totalSales || 0,
          totalBillsCount: reportsData.kpis?.totalBillsCount || 0,
          averageTicket: reportsData.kpis?.averageTicket || 0,
          totalOrdersCount: reportsData.kpis?.totalOrdersCount || 0,
          activeOrdersCount: Array.isArray(ordersData)
            ? ordersData.filter((o) => ['PENDING', 'PREPARING', 'READY', 'SERVED'].includes(o.status)).length
            : 0
        });
        setTopItems(reportsData.topItems || []);
      }

      // 2. Insumos en alerta o críticos (status !== 'OK')
      if (Array.isArray(ingredientsData)) {
        const alerts = ingredientsData.filter((ing) => ing.status !== 'OK');
        setInventoryAlerts(alerts);
      }

      // 3. Mesas
      if (Array.isArray(tablesData)) {
        const total = tablesData.length;
        const occupied = tablesData.filter((t) => t.status === 'OCCUPIED').length;
        setTablesStats({
          total,
          occupied,
          free: total - occupied
        });
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error al sincronizar dashboard en tiempo real:', err);
      setError('No se pudo actualizar la información en tiempo real.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData(true);

    // Polling en tiempo real cada 10 segundos
    const interval = setInterval(() => {
      fetchRealtimeData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const criticalCount = inventoryAlerts.filter((i) => i.status === 'CRITICAL').length;
  const warningCount = inventoryAlerts.filter((i) => i.status === 'WARNING').length;

  return (
    <div className="space-y-6">
      {/* HEADER Y MONITOR EN VIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Panel de Control General</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Hola <span className="font-bold text-slate-800 dark:text-slate-200">{user?.firstName}</span>, visualiza las métricas operacionales del restaurante en tiempo real.
          </p>
        </div>

        {/* INDICADOR DE TIEMPO REAL */}
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl shadow-sm flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">En Vivo</span>
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                ({lastUpdated.toLocaleTimeString('es-CO')})
              </span>
            )}
          </div>

          <button
            onClick={() => fetchRealtimeData(false)}
            title="Actualizar datos ahora"
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
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

      {/* KPI GRID (DATOS EN VIVO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventas del Día"
          value={`$${(kpis.totalSales / 100).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="text-emerald-500"
          description={`${kpis.totalBillsCount} facturas cobradas hoy`}
        />
        <StatCard
          title="Comandas del Día"
          value={kpis.totalOrdersCount}
          icon={ShoppingBag}
          color="text-brand-500"
          description={`${kpis.activeOrdersCount} comandas en curso`}
        />
        <StatCard
          title="Ocupación de Mesas"
          value={`${tablesStats.occupied} / ${tablesStats.total}`}
          icon={Grid}
          color="text-blue-500"
          description={`${tablesStats.free} mesas disponibles`}
        />
        <StatCard
          title="Alertas Inventario"
          value={inventoryAlerts.length}
          icon={AlertTriangle}
          color={inventoryAlerts.length > 0 ? "text-amber-500" : "text-emerald-500"}
          description={
            criticalCount > 0
              ? `🚨 ${criticalCount} insumo(s) AGOTADO(S)`
              : warningCount > 0
              ? `⚠️ ${warningCount} insumo(s) stock bajo`
              : 'Todo el stock normal'
          }
        />
      </div>

      {/* SECCIÓN DESTACADA: ALERTAS DE INSUMOS CERCA DE ACABARSE / AGOTADOS */}
      {inventoryAlerts.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30 border border-amber-300/80 dark:border-amber-900/60 p-6 rounded-3xl shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/60 dark:border-amber-900/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Insumos Críticos / Muy Cerca de Acabarse</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white">
                    {inventoryAlerts.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Estos insumos requieren compra o reabastecimiento urgente para no afectar el menú.
                </p>
              </div>
            </div>

            <Link
              to="/dashboard/admin/inventory"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 transition-all shrink-0"
            >
              <span>Gestionar Inventario</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* TARJETAS DE INSUMOS EN PELIGRO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {inventoryAlerts.map((ing) => {
              const isCritical = ing.status === 'CRITICAL';
              const stockPercent = Math.min(Math.round((ing.currentStock / (ing.minStock || 1)) * 100), 100);

              return (
                <div
                  key={ing.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCritical
                      ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
                      : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{ing.name}</h3>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{ing.category}</span>
                    </div>

                    {isCritical ? (
                      <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                        🔴 AGOTADO
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                        🟡 BAJO STOCK
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500 dark:text-slate-400">Existencia Actual:</span>
                      <span className={isCritical ? 'text-red-600 font-black' : 'text-amber-600 font-extrabold'}>
                        {ing.currentStock} {ing.unit} <span className="text-slate-400 font-normal">(Mín: {ing.minStock})</span>
                      </span>
                    </div>

                    {/* BARRA DE PROGRESO DE STOCK */}
                    <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.max(stockPercent, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Inventario en perfecto estado. Todos los insumos superan el límite de stock mínimo de seguridad.</span>
          </span>
          <Link to="/dashboard/admin/inventory" className="underline hover:text-emerald-900 dark:hover:text-emerald-100">
            Ver Bodega
          </Link>
        </div>
      )}

      {/* PLATOS MÁS VENDIDOS Y ACCIONES RÁPIDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PLATOS MÁS VENDIDOS HOY */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Platos Más Vendidos de Hoy</span>
            </h2>
            <Link to="/dashboard/admin/reports" className="text-xs font-bold text-brand-500 hover:underline">
              Ver Analíticas Completa →
            </Link>
          </div>

          {topItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Aún no se registran comandas pagadas en el día de hoy.</p>
          ) : (
            <div className="space-y-3">
              {topItems.slice(0, 4).map((item, idx) => (
                <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-xs font-bold">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-extrabold ${
                      idx === 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{item.category}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-900 dark:text-white font-extrabold block">{item.totalQuantity} porciones</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      ${(item.totalRevenue / 100).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACCIONES ADMINISTRATIVAS RÁPIDAS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Acciones Rápidas
          </h2>

          <div className="space-y-2.5">
            <Link
              to="/dashboard/admin/inventory/daily"
              className="w-full p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/60 hover:bg-orange-100 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-bold transition-all text-xs flex items-center gap-2.5"
            >
              <Package className="w-4 h-4" />
              <span>Cierre y Consumo Diario de Insumos</span>
            </Link>

            <Link
              to="/dashboard/admin/users"
              className="w-full p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold transition-all text-xs flex items-center gap-2.5"
            >
              <Users className="w-4 h-4" />
              <span>Gestionar Personal del Restaurante</span>
            </Link>

            <Link
              to="/dashboard/admin/menu"
              className="w-full p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold transition-all text-xs flex items-center gap-2.5"
            >
              <Utensils className="w-4 h-4" />
              <span>Editar Carta y Precios de Platos</span>
            </Link>

            <Link
              to="/dashboard/admin/reports"
              className="w-full p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold transition-all text-xs flex items-center gap-2.5"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Ver Analíticas y Reportes de Ventas</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. DASHBOARD DEL MESERO (TOMA DE PEDIDOS)
// ==========================================
export function WaiterDashboard() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Estados para Modal de Cancelación de Ítem
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelData, setCancelData] = useState({ orderId: null, itemId: null, itemName: '', reason: '' });
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await ordersService.getOrders({ waiterId: user.id });
      // Filtrar órdenes activas (no pagadas ni canceladas)
      const active = data.filter(o => ['PENDING', 'PREPARING', 'READY', 'SERVED'].includes(o.status));
      setOrders(active);
    } catch (err) {
      console.error('Error al cargar pedidos del mesero:', err);
      setError('No se pudieron actualizar tus pedidos activos.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);

    // Configurar Short Polling (cada 10 segundos)
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Limpiar alertas
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleMarkAsServed = async (orderId) => {
    try {
      await ordersService.updateOrderStatus(orderId, 'SERVED');
      setSuccessMsg('El pedido ha sido entregado en mesa.');
      fetchOrders(false);
    } catch (err) {
      console.error('Error al marcar como servido:', err);
      alert(err.response?.data?.message || 'Error al actualizar el estado.');
    }
  };

  const handleRequestPreBill = async (orderId) => {
    try {
      await ordersService.requestPreBill(orderId);
      setSuccessMsg('Pre-cuenta solicitada al cajero con éxito.');
      fetchOrders(false);
    } catch (err) {
      console.error('Error al solicitar pre-cuenta:', err);
      alert(err.response?.data?.message || 'Error al solicitar pre-cuenta.');
    }
  };

  const handleOpenCancelModal = (orderId, itemId, itemName) => {
    setCancelData({ orderId, itemId, itemName, reason: '' });
    setCancelModalOpen(true);
  };

  const handleConfirmCancelItem = async (e) => {
    e.preventDefault();
    if (cancelData.reason.trim().length < 3) {
      alert('Debes escribir un motivo de al menos 3 caracteres.');
      return;
    }

    setCancelLoading(true);
    try {
      await ordersService.cancelOrderItem(cancelData.orderId, cancelData.itemId, cancelData.reason);
      setSuccessMsg(`Se eliminó el plato "${cancelData.itemName}" del pedido.`);
      setCancelModalOpen(false);
      fetchOrders(false);
    } catch (err) {
      console.error('Error al cancelar ítem:', err);
      alert(err.response?.data?.message || 'No se pudo cancelar el plato.');
    } finally {
      setCancelLoading(false);
    }
  };

  const getElapsedTime = (createdAt) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    if (minutes < 1) return 'Hace un momento';
    return `Hace ${minutes} min`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200/50 rounded-lg">
            En Cola ⏳
          </span>
        );
      case 'PREPARING':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold text-orange-500 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 rounded-lg">
            Cocinándose 🍳
          </span>
        );
      case 'READY':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold text-green-600 bg-green-50 dark:bg-green-950/25 border border-green-200/50 rounded-lg animate-pulse">
            ¡LISTO PARA SERVIR! 🔔
          </span>
        );
      case 'SERVED':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 rounded-lg">
            Entregado 🍽️
          </span>
        );
      default:
        return null;
    }
  };

  const activeOrdersCount = orders.length;
  const readyOrdersCount = orders.filter(o => o.status === 'READY').length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Mis Pedidos Activos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Hola {user?.firstName}, aquí puedes monitorear tus comandas en tiempo real y gestionarlas.
          </p>
        </div>
        <Link
          to="/dashboard/waiter/tables"
          className="inline-flex items-center justify-center space-x-2 px-4.5 py-2.5 bg-brand-500 hover:bg-brand-650 text-white rounded-xl shadow-md shadow-brand-500/10 font-bold text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Pedido (Salón)</span>
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Comandas Activas" value={activeOrdersCount} icon={Clock} color="text-amber-500" description="Esperando o preparándose" />
        <StatCard title="Listos para Servir" value={readyOrdersCount} icon={ChefHat} color="text-green-500" description="Por favor, retíralos de cocina" />
        <StatCard title="Acceso al Salón" value="Mesas" icon={Utensils} color="text-blue-500" description="Estado de ocupación general" />
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-2xl text-sm font-medium">
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-250 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-2xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Grid de Pedidos Activos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
          <p className="text-sm text-slate-450 mt-3 font-semibold">Cargando tus pedidos...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-16 text-center rounded-2xl shadow-sm">
          <ChefHat className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-850 dark:text-slate-200">No tienes pedidos activos</h3>
          <p className="text-sm text-slate-450 dark:text-slate-500 mt-1.5">
            Abre mesas o toma pedidos para llevar para ver su preparación aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map(order => (
            <div 
              key={order.id} 
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all hover:scale-[1.01] ${
                order.status === 'READY' 
                  ? 'border-green-300 dark:border-green-900 ring-2 ring-green-500/15' 
                  : 'border-slate-200 dark:border-slate-800/80'
              }`}
            >
              {/* Tarjeta Cabecera */}
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🍔 Comanda #{order.id}</span>
                    <span className="text-xs text-slate-400 font-semibold">• {order.orderType}</span>
                  </h3>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>{order.tableId ? `Mesa Física ${order.table?.number}` : 'Para Llevar / Domicilio'}</span>
                  <span>{getElapsedTime(order.createdAt)}</span>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-850" />

              {/* Lista de platos en la comanda */}
              <div className="flex-1 space-y-2.5">
                <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Detalle del Consumo</h4>
                <ul className="space-y-2">
                  {order.orderItems?.map(item => (
                    <li key={item.id} className="text-xs font-semibold flex items-start gap-2 justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-850 dark:text-slate-200">
                          {item.quantity}x {item.item?.name}
                        </span>
                        {item.selectedModifiers && Object.keys(item.selectedModifiers).length > 0 && (
                          <div className="text-[10px] text-slate-450 dark:text-slate-550 flex flex-wrap gap-1 mt-0.5">
                            {Object.entries(item.selectedModifiers).map(([n, v]) => (
                              <span key={n} className="bg-slate-100 dark:bg-slate-850 px-1 py-0.2 rounded">{n}: {v}</span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-orange-500 italic mt-0.5 pl-1.5 border-l border-orange-400/50">
                            Nota: {item.notes}
                          </div>
                        )}
                      </div>
                      
                      {/* Botón de Cancelación de Ítem (Solo si no está READY/SERVED) */}
                      {['PENDING', 'PREPARING'].includes(order.status) && (
                        <button
                          onClick={() => handleOpenCancelModal(order.id, item.id, item.item?.name)}
                          className="text-slate-400 hover:text-red-500 p-1 hover:bg-slate-50 dark:hover:bg-slate-850 rounded transition-all shrink-0"
                          title="Cancelar plato de la comanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <hr className="border-slate-100 dark:border-slate-850" />

              {/* Footer / Total y Botones Operacionales */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-500">Total acumulado:</span>
                  <span className="text-base font-extrabold text-slate-850 dark:text-white">
                    ${(order.total / 100).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-2">
                  {/* Botón para servir */}
                  {order.status === 'READY' && (
                    <button
                      onClick={() => handleMarkAsServed(order.id)}
                      className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl shadow-md shadow-green-500/10 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Servido en Mesa</span>
                    </button>
                  )}

                  {/* Botón para solicitar pre-cuenta */}
                  {order.status === 'SERVED' && (
                    <button
                      onClick={() => handleRequestPreBill(order.id)}
                      disabled={order.isBillRequested}
                      className={`flex-1 py-2.5 px-3 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        order.isBillRequested
                          ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-550 border border-slate-200 dark:border-slate-800/80 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/10'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{order.isBillRequested ? 'Cuenta Solicitada' : 'Solicitar Cuenta'}</span>
                    </button>
                  )}

                  {/* Botón Adicionar plato (Para PENDING y PREPARING) */}
                  {['PENDING', 'PREPARING'].includes(order.status) && (
                    <Link
                      to={`/dashboard/waiter/order?tableId=${order.tableId}`}
                      className="flex-1 py-2.5 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </Link>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE CANCELACIÓN DE ÍTEM */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setCancelModalOpen(false)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"></div>

          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl w-full max-w-md p-6 z-10 animate-scale-in">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              Cancelar Plato de Comanda
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-normal">
              ¿Estás seguro de que deseas eliminar el plato <strong className="text-red-500">"{cancelData.itemName}"</strong> de la comanda #{cancelData.orderId}?
              Esta acción requiere registrar un motivo para el log de auditoría.
            </p>

            <form onSubmit={handleConfirmCancelItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-550 block">
                  Motivo de cancelación (mínimo 3 caracteres)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cliente cambió de opinión / Error al digitar plato"
                  value={cancelData.reason}
                  onChange={(e) => setCancelData({ ...cancelData, reason: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-850 dark:text-slate-150 font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-850 mt-5">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold rounded-xl text-xs"
                >
                  Conservar Plato
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading || cancelData.reason.trim().length < 3}
                  className="flex-1 py-2.5 bg-red-550 hover:bg-red-650 text-white font-bold rounded-xl text-xs shadow-md shadow-red-500/15 flex items-center justify-center gap-1.5"
                >
                  {cancelLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Confirmar Cancelación</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. DASHBOARD DE COCINA (CHEF)
// ==========================================
export function ChefDashboard() {
  const { user } = useContext(AuthContext);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Comandas de Cocina</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Despacha los platos pendientes por orden de llegada.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Comandas Pendientes" value="5" icon={Clock} color="text-yellow-500" description="3 urgentes" />
        <StatCard title="En Preparación" value="3" icon={ChefHat} color="text-brand-500" description="Mesas 4 y 7" />
        <StatCard title="Despachados Hoy" value="28" icon={TrendingUp} color="text-emerald-500" description="Turno matutino" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COMANDA ACTUAL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold mb-4">Órden Siguiente (Prioritaria)</h2>
          <div className="p-5 rounded-2xl bg-yellow-50/40 dark:bg-yellow-950/10 border border-yellow-250 dark:border-yellow-900/40 space-y-4">
            <div className="flex justify-between font-bold">
              <span>🍔 Mesa 4 - Comanda #1042</span>
              <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Hace 8 min
              </span>
            </div>
            <hr className="border-yellow-200 dark:border-yellow-900/30" />
            <ul className="space-y-2 text-sm font-medium">
              <li>• 2x Hamburguesa Fogón (Término 3/4, sin cebolla)</li>
              <li>• 1x Papas Rústicas con Extra Queso</li>
              <li>• 1x Costillar de Cerdo BBQ Ahumado</li>
            </ul>
            <button className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-md shadow-yellow-500/25 transition-all">
              Marcar En Preparación
            </button>
          </div>
        </div>

        {/* ÓRDENES ACTIVAS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold mb-4">En Preparación</h2>
          <div className="space-y-3.5">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <span className="font-bold block text-sm">🥩 Mesa 2</span>
                <span className="text-xs text-slate-500">1x Bife de Lomo (Término medio), 1x Ensalada César</span>
              </div>
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-sm shadow-sm transition-all">
                Terminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. DASHBOARD DEL CAJERO
// ==========================================
export function CashierDashboard() {
  const { user } = useContext(AuthContext);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Caja y Facturación</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cierre de cuentas y registro de transacciones financieras.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Efectivo en Caja" value="$420.00" icon={Banknote} color="text-emerald-500" description="Caja Chica: $150.00" />
        <StatCard title="Cuentas por Cobrar" value="3" icon={Clock} color="text-amber-500" description="Mesas 2, 4 y 9" />
        <StatCard title="Cobrado Hoy" value="$1,090.50" icon={TrendingUp} color="text-brand-500" description="22 transacciones" />
      </div>

      {/* TABLA DE CUENTAS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">Cuentas por Cobrar Activas</h2>
        <div className="space-y-3.5">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/20">
            <div>
              <span className="font-bold block text-sm">🧾 Mesa 4 - Total a pagar: $84.50</span>
              <span className="text-xs text-slate-400">Atendido por: Mesero Carlos</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-sm shadow-md shadow-emerald-500/10">
                Registrar Pago
              </button>
              <button className="flex-1 sm:flex-none px-4.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 font-bold rounded-lg text-sm">
                Pre-cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
