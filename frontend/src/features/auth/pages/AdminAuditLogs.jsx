import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  Activity, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Terminal,
  Loader2
} from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Filtros
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  // Paginación
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (currentPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAuditLogs({
        ...filters,
        page: currentPage,
        limit
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error('Error al cargar logs de auditoría:', err);
      setError('No se pudieron cargar los registros de auditoría del sistema.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const allUsers = await userService.getUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error('Error al cargar usuarios de filtro:', err);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPage(1); // Volver a la primera página al filtrar
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
    // Para limpiar inmediatamente, debemos ejecutar con los filtros limpios
    setLoading(true);
    userService.getAuditLogs({ page: 1, limit })
      .then(data => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch(err => {
        console.error(err);
        setError('Error al refrescar logs.');
      })
      .finally(() => setLoading(false));
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Retorna color CSS de badge según la acción para mejorar escaneabilidad visual
  const getActionBadgeColor = (action) => {
    if (action.includes('ELIMINAR')) {
      return 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 border-red-200/35';
    }
    if (action.includes('ACTUALIZAR') || action.includes('EDITAR')) {
      return 'bg-amber-50 text-amber-650 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/35';
    }
    if (action.includes('CREAR') || action.includes('REGISTRO') || action.includes('PAGO')) {
      return 'bg-green-50 text-green-650 dark:bg-green-950/20 dark:text-green-400 border-green-200/35';
    }
    if (action.includes('LOGIN')) {
      return 'bg-blue-50 text-blue-650 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/35';
    }
    return 'bg-slate-50 text-slate-600 dark:bg-slate-850 dark:text-slate-400 border-slate-200/35';
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <History className="w-8 h-8 text-orange-500" />
            <span>Logs de Auditoría</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Historial detallado de todas las acciones operacionales y de seguridad realizadas en el sistema.
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm text-sm font-semibold transition-all duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Formulario de Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-5">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Filtro: Usuario */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Usuario
            </label>
            <select
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            >
              <option value="">Todos los usuarios</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>

          {/* Filtro: Acción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Acción (Código)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                placeholder="Ej: REGISTRO_USUARIO"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 dark:text-slate-150 font-medium"
              />
            </div>
          </div>

          {/* Filtro: Fecha Desde */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Desde
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 px-3.5 py-2.2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            />
          </div>

          {/* Filtro: Fecha Hasta */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Hasta
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 px-3.5 py-2.2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            />
          </div>

          {/* Botones de acción de filtros */}
          <div className="lg:col-span-4 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold rounded-xl text-sm transition-all"
            >
              Limpiar Filtros
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-650 text-white font-bold rounded-xl text-sm shadow-md shadow-brand-500/10 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Filtrar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-250 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Listado de Logs */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
          <p className="text-sm text-slate-450 dark:text-slate-500 mt-3 font-semibold">Cargando registros...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/85">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Fecha y Hora</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Usuario</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Acción</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Descripción</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Dispositivo/IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-xs">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-450 dark:text-slate-550 italic text-sm">
                        No se encontraron registros de auditoría que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    logs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15 transition-colors">
                        <td className="px-6 py-4 text-slate-500 font-semibold whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          {item.user ? (
                            <div>
                              <span className="font-bold text-slate-850 dark:text-slate-200 block text-sm">
                                {item.user.firstName} {item.user.lastName}
                              </span>
                              <span className="text-[10px] text-slate-450 dark:text-slate-500">{item.user.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-550 italic font-semibold">Sistema / Anónimo</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 border text-[10px] font-extrabold rounded-md uppercase tracking-wider ${getActionBadgeColor(item.action)}`}>
                            {item.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-semibold text-sm max-w-xs sm:max-w-md break-words">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium max-w-[150px] truncate">
                          <div className="flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                            <span title={item.userAgent}>IP: {item.ipAddress || 'N/A'}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-6 py-4.5 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-450">
                Mostrando {logs.length} de {total} registros (Página {page} de {totalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1 || loading}
                  className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages || loading}
                  className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
