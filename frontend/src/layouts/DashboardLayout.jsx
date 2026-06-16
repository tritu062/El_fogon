import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { MENU_CONFIG } from '../config/menuConfig';
import { 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  User 
} from 'lucide-react';

/**
 * Maquetación responsiva principal del Dashboard.
 * Consume MENU_CONFIG de forma dinámica basándose en el rol del usuario autenticado.
 */
export default function DashboardLayout() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Generamos el menú de navegación acumulativo según los roles asignados del usuario
  const filteredMenu = user.roles.reduce((acc, role) => {
    const items = MENU_CONFIG[role] || [];
    items.forEach((item) => {
      // Evitamos meter duplicados si el usuario tiene asignados varios roles (ej. Administrador y Cajero)
      if (!acc.some((existing) => existing.path === item.path)) {
        acc.push(item);
      }
    });
    return acc;
  }, []);

  const toggleMobile = () => setMobileOpen(!mobileOpen);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex transition-colors duration-200">
      
      {/* 1. SIDEBAR ESTÁTICO (ESCRITORIO) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Encabezado Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <span className="text-2xl animate-pulse">🔥</span>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            El Fogón
          </span>
        </div>

        {/* Links Operativos Dinámicos */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 shadow-inner'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-orange-500 scale-110' : item.color}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Botón de Cierre de Sesión */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-3.5 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl font-semibold transition-all duration-150"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Drawer Sidebar Deslizable (Móvil) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Fondo semi-transparente */}
          <div onClick={closeMobile} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"></div>
          
          {/* Contenedor del menú */}
          <aside className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 animate-slide-in">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔥</span>
                <span className="font-extrabold text-xl bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">El Fogón</span>
              </div>
              <button onClick={closeMobile} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {filteredMenu.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-650 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-orange-500" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => { closeMobile(); logout(); }}
                className="flex items-center gap-3.5 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl font-semibold"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 2. ÁREA CONTENEDORA DE VISTAS */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra superior (Navbar) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10">
          
          {/* Botón toggle móvil */}
          <button onClick={toggleMobile} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400">
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:block text-slate-400 dark:text-slate-500 text-sm font-medium">
            Gestión interna de restaurante
          </div>

          {/* Menú derecho */}
          <div className="flex items-center gap-4.5">
            {/* Toggler de Tema */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-500" />}
            </button>

            {/* Separador vertical */}
            <span className="w-px h-6 bg-slate-200 dark:bg-slate-800"></span>

            {/* Avatar & Perfil */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="font-semibold text-sm">{user?.firstName} {user?.lastName}</div>
                <div className="text-[10px] uppercase tracking-wider text-orange-500 dark:text-orange-400 font-bold">
                  {user?.roles?.join(' / ')}
                </div>
              </div>
              
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 font-semibold shadow-sm">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Sección de Contenido Inyectado */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
