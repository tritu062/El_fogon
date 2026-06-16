import React, { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { 
  Users, 
  Utensils, 
  ChefHat, 
  Banknote, 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  AlertTriangle 
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
// 1. DASHBOARD DEL ADMINISTRADOR
// ==========================================
export function AdminDashboard() {
  const { user } = useContext(AuthContext);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Panel de Control</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Hola {user?.firstName}, aquí está el resumen operacional del restaurante.</p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ventas del Día" value="$1,240.50" icon={TrendingUp} color="text-emerald-500" description="+12% que ayer" />
        <StatCard title="Pedidos Totales" value="48" icon={ShoppingBag} color="text-brand-500" description="12 activos ahora" />
        <StatCard title="Personal en Turno" value="6" icon={Users} color="text-blue-500" description="4 meseros, 2 cocineros" />
        <StatCard title="Alertas de Inventario" value="2" icon={AlertTriangle} color="text-red-500" description="Carne de res, Tomates" />
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">Acciones Administrativas Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-900/60 hover:bg-orange-100 dark:hover:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold transition-all text-center">
            👤 Registrar Nuevo Empleado
          </button>
          <button className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-bold transition-all text-center">
            📊 Descargar Reporte Diario
          </button>
          <button className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold transition-all text-center">
            ⚙️ Ajustes del Sistema
          </button>
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Salón y Comedor</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Selecciona una mesa para tomar un pedido o abrir una cuenta.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Mesas Asignadas" value="4 / 12" icon={Utensils} color="text-amber-500" description="Mesas 2, 4, 7 y 9" />
        <StatCard title="Pedidos Activos" value="3" icon={Clock} color="text-brand-500" description="2 listos para servir" />
        <StatCard title="Propinas Estimadas" value="$42.00" icon={Banknote} color="text-emerald-500" description="Turno de hoy" />
      </div>

      {/* MESA GRID */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">Estado de las Mesas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <button key={i} className={`p-6 rounded-2xl border font-bold text-center transition-all ${
              i % 3 === 0
                ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50'
                : 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-55'
            }`}>
              <div className="text-xs uppercase text-slate-400 dark:text-slate-500">Mesa</div>
              <div className="text-3xl mt-1">{i + 1}</div>
              <div className="text-xs mt-2 font-semibold">{i % 3 === 0 ? '🔴 Ocupada' : '🟢 Libre'}</div>
            </button>
          ))}
        </div>
      </div>
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
