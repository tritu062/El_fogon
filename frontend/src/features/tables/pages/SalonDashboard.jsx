import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { tablesService, zonesService } from '../services/tablesService';
import TableCard from '../components/TableCard';
import { Grid, RefreshCw, LayoutGrid, CheckCircle2, Ban, Calendar } from 'lucide-react';

/**
 * Panel de visualización e interacción con el plano del salón para meseros y administradores.
 */
export default function SalonDashboard() {
  const { user } = useContext(AuthContext);
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allTables, allZones] = await Promise.all([
        tablesService.getTables(),
        zonesService.getZones()
      ]);
      setTables(allTables);
      setZones(allZones);
    } catch (err) {
      console.error('Error al cargar datos del salón:', err);
      setError('No se pudo cargar la información del salón. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updatedTable = await tablesService.updateTableStatus(id, newStatus);
      setTables((prevTables) =>
        prevTables.map((t) => (t.id === id ? { ...t, status: updatedTable.status } : t))
      );
    } catch (err) {
      console.error('Error al cambiar el estado:', err);
      alert('Error al actualizar el estado de la mesa.');
    }
  };

  const canChangeStatus = user?.roles?.some((role) =>
    ['ADMINISTRADOR', 'MESERO'].includes(role)
  );

  // Calcular métricas
  const totalTables = tables.length;
  const freeTables = tables.filter((t) => t.status === 'FREE').length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const reservedTables = tables.filter((t) => t.status === 'RESERVED').length;

  // Filtrado
  const filteredTables = selectedZone === 'ALL'
    ? tables
    : tables.filter((t) => t.zoneId === parseInt(selectedZone, 10));

  // Agrupamiento
  const tablesByZone = zones.reduce((acc, zone) => {
    const zoneTables = filteredTables.filter((t) => t.zoneId === zone.id);
    if (zoneTables.length > 0 || selectedZone === 'ALL') {
      acc.push({
        ...zone,
        tablesList: zoneTables
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Vista de Salón y Mesas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitoreo y gestión en tiempo real del estado de ocupación de las mesas.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm text-sm font-semibold transition-all duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Indicadores / Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/20 text-brand-600 rounded-xl">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Total Mesas</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalTables}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Libres</p>
            <h3 className="text-2xl font-black text-green-650 dark:text-green-400 mt-0.5">{freeTables}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Ocupadas</p>
            <h3 className="text-2xl font-black text-red-650 dark:text-red-400 mt-0.5">{occupiedTables}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Reservadas</p>
            <h3 className="text-2xl font-black text-amber-650 dark:text-amber-400 mt-0.5">{reservedTables}</h3>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Filtrar por Zona:
        </label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="ALL">Todas las Zonas</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-250 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Listado de Mesas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 mt-3 font-semibold">Cargando salón...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tablesByZone.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-12 text-center rounded-2xl shadow-sm">
              <Grid className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No hay mesas registradas</h3>
              <p className="text-sm text-slate-450 dark:text-slate-500 mt-1">
                Para comenzar, el administrador debe crear zonas y mesas en el panel de configuración.
              </p>
            </div>
          ) : (
            tablesByZone.map((zoneGroup) => (
              <div key={zoneGroup.id} className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-brand-500 rounded-full"></span>
                    <span>{zoneGroup.name}</span>
                  </h2>
                  {zoneGroup.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 pl-4">{zoneGroup.description}</p>
                  )}
                </div>
                {zoneGroup.tablesList.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic pl-4">No hay mesas activas en esta zona.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {zoneGroup.tablesList.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onStatusChange={handleStatusChange}
                        canChangeStatus={canChangeStatus}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
