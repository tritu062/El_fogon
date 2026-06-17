import {
  LayoutDashboard,
  Users,
  Grid,
  Utensils,
  BarChart3,
  Settings,
  PlusCircle,
  ChefHat,
  History,
  Clock,
  CheckSquare,
  FileText,
  CreditCard,
  Archive,
  DollarSign
} from 'lucide-react';

/**
 * MENU_CONFIG centraliza la estructura del menú por rol.
 * Esto evita el uso de condicionales if/else en el renderizado y cumple con el principio de responsabilidad única.
 */
export const MENU_CONFIG = {
  ADMINISTRADOR: [
    { name: 'Dashboard general', path: '/dashboard/admin', icon: LayoutDashboard, color: 'text-orange-500' },
    { name: 'Gestión de usuarios', path: '/dashboard/admin/users', icon: Users, color: 'text-orange-500' },
    { name: 'Gestión de mesas', path: '/dashboard/admin/tables', icon: Grid, color: 'text-orange-500' },
    { name: 'Carta / menú', path: '/dashboard/admin/menu', icon: Utensils, color: 'text-orange-500' },
    { name: 'Reportes y estadísticas', path: '/dashboard/admin/reports', icon: BarChart3, color: 'text-orange-500' },
    { name: 'Configuración del sistema', path: '/dashboard/admin/settings', icon: Settings, color: 'text-orange-500' }
  ],
  MESERO: [
    { name: 'Mis mesas activas', path: '/dashboard/waiter/tables', icon: Grid, color: 'text-amber-500' },
    { name: 'Tomar pedido', path: '/dashboard/waiter/order', icon: PlusCircle, color: 'text-amber-500' },
    { name: 'Ver estado de cocina', path: '/dashboard/waiter/kitchen-view', icon: ChefHat, color: 'text-amber-500' },
    { name: 'Historial de turnos', path: '/dashboard/waiter/shifts', icon: History, color: 'text-amber-500' }
  ],
  COCINERO: [
    { name: 'Panel Cocina (KDS)', path: '/dashboard/chef/orders', icon: ChefHat, color: 'text-yellow-500' }
  ],
  CAJERO: [
    { name: 'Cuentas pendientes', path: '/dashboard/cashier/pending', icon: FileText, color: 'text-emerald-500' },
    { name: 'Cierre de caja', path: '/dashboard/cashier/closing', icon: Archive, color: 'text-emerald-500' },
    { name: 'Historial transacciones', path: '/dashboard/cashier/transactions', icon: DollarSign, color: 'text-emerald-500' }
  ]
};
