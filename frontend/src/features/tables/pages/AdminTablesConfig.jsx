import React, { useState, useEffect } from 'react';
import { zonesService, tablesService } from '../services/tablesService';
import { Grid, Plus, Edit2, Trash2, Map, Layers, X, AlertCircle } from 'lucide-react';

/**
 * Panel de Administración para crear, editar y eliminar zonas y mesas del restaurante.
 */
export default function AdminTablesConfig() {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'zones'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados de los Modales
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  // Datos de los formularios
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({ name: '', description: '' });

  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ number: '', zoneId: '' });

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
      console.error('Error al cargar configuraciones:', err);
      setError('No se pudo cargar la configuración de salón/mesas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!zoneForm.name.trim()) return setError('El nombre de la zona es obligatorio.');

    try {
      if (editingZone) {
        await zonesService.updateZone(editingZone.id, zoneForm);
        showSuccess('Zona actualizada correctamente.');
      } else {
        await zonesService.createZone(zoneForm);
        showSuccess('Zona creada correctamente.');
      }
      setIsZoneModalOpen(false);
      setZoneForm({ name: '', description: '' });
      setEditingZone(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la zona.');
    }
  };

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const tableNum = parseInt(tableForm.number, 10);
    const zId = parseInt(tableForm.zoneId, 10);

    if (isNaN(tableNum) || tableNum <= 0) return setError('El número de mesa debe ser un número positivo.');
    if (isNaN(zId) || zId <= 0) return setError('Selecciona una zona válida para la mesa.');

    try {
      if (editingTable) {
        await tablesService.updateTable(editingTable.id, { number: tableNum, zoneId: zId });
        showSuccess('Mesa actualizada correctamente.');
      } else {
        await tablesService.createTable({ number: tableNum, zoneId: zId });
        showSuccess('Mesa creada correctamente.');
      }
      setIsTableModalOpen(false);
      setTableForm({ number: '', zoneId: '' });
      setEditingTable(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la mesa.');
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta zona?')) return;
    setError(null);
    try {
      await zonesService.deleteZone(id);
      showSuccess('Zona eliminada lógicamente.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar la zona.');
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta mesa?')) return;
    setError(null);
    try {
      await tablesService.deleteTable(id);
      showSuccess('Mesa eliminada lógicamente.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar la mesa.');
    }
  };

  const openEditZone = (zone) => {
    setEditingZone(zone);
    setZoneForm({ name: zone.name, description: zone.description || '' });
    setIsZoneModalOpen(true);
  };

  const openEditTable = (table) => {
    setEditingTable(table);
    setTableForm({ number: table.number.toString(), zoneId: table.zoneId.toString() });
    setIsTableModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Configuración de Salón y Mesas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Crea y organiza las zonas físicas del restaurante y las mesas correspondientes.
          </p>
        </div>
        <div className="flex space-x-2">
          {activeTab === 'tables' ? (
            <button
              onClick={() => {
                setEditingTable(null);
                setTableForm({ number: '', zoneId: zones[0]?.id?.toString() || '' });
                setIsTableModalOpen(true);
              }}
              disabled={zones.length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Mesa</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingZone(null);
                setZoneForm({ name: '', description: '' });
                setIsZoneModalOpen(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm text-sm font-semibold transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Zona</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-150 dark:border-slate-800/80">
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-250 ${
            activeTab === 'tables'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Mesas</span>
        </button>
        <button
          onClick={() => setActiveTab('zones')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-250 ${
            activeTab === 'zones'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Zonas</span>
        </button>
      </div>

      {/* Alertas */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400 rounded-2xl text-sm font-medium animate-in fade-in duration-200">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-2xl text-sm font-medium flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {zones.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 rounded-2xl text-sm font-medium">
          ⚠️ Antes de registrar mesas, debes crear al menos una Zona (ej: "Salón Principal").
        </div>
      )}

      {/* Contenido según la pestaña activa */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 mt-3 font-semibold">Cargando...</p>
        </div>
      ) : activeTab === 'tables' ? (
        /* Tabla de Mesas */
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
          {tables.length === 0 ? (
            <div className="p-12 text-center">
              <Grid className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No hay mesas</h3>
              <p className="text-sm text-slate-450 dark:text-slate-500 mt-1">Crea una mesa nueva arriba a la derecha.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-550 uppercase text-xs font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">Mesa</th>
                    <th className="px-6 py-4">Zona</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {tables.map((table) => (
                    <tr key={table.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-750 dark:text-slate-300 text-sm font-semibold">
                      <td className="px-6 py-4 flex items-center space-x-2.5">
                        <Layers className="w-4 h-4 text-slate-400" />
                        <span>Mesa {table.number}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{table.zone?.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                          table.status === 'FREE' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                          table.status === 'OCCUPIED' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
                          'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400'
                        }`}>
                          {table.status === 'FREE' ? 'Libre' : table.status === 'OCCUPIED' ? 'Ocupada' : 'Reservada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditTable(table)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                            title="Editar Mesa"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTable(table.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-all"
                            title="Eliminar Mesa"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Tabla de Zonas */
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
          {zones.length === 0 ? (
            <div className="p-12 text-center">
              <Map className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No hay zonas</h3>
              <p className="text-sm text-slate-450 dark:text-slate-500 mt-1">Crea una zona nueva arriba a la derecha.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-550 uppercase text-xs font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">Zona</th>
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-750 dark:text-slate-300 text-sm font-semibold">
                      <td className="px-6 py-4 font-bold">{zone.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">{zone.description || 'Sin descripción'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditZone(zone)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                            title="Editar Zona"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-all"
                            title="Eliminar Zona"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Zonas */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingZone ? 'Editar Zona' : 'Crear Nueva Zona'}
              </h3>
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-755 dark:hover:text-slate-300 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleZoneSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Nombre de la Zona
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Salón Principal, Terraza, VIP"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  placeholder="Breve descripción del área física"
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200 min-h-[80px]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm shadow-brand-500/10 transition-all"
                >
                  {editingZone ? 'Guardar Cambios' : 'Crear Zona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mesas */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingTable ? 'Editar Mesa' : 'Crear Nueva Mesa'}
              </h3>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-755 dark:hover:text-slate-300 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTableSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Número de Mesa
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ej. 1, 2, 10"
                  value={tableForm.number}
                  onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Zona Vinculada
                </label>
                <select
                  required
                  value={tableForm.zoneId}
                  onChange={(e) => setTableForm({ ...tableForm, zoneId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 dark:text-slate-300"
                >
                  <option value="" disabled>Selecciona una zona...</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm shadow-brand-500/10 transition-all"
                >
                  {editingTable ? 'Guardar Cambios' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
