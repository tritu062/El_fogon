import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inventoryService } from '../services/inventoryService';
import { 
  ClipboardList, 
  ArrowLeft, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Package
} from 'lucide-react';

export default function DailyConsumptionPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [consumptionDate, setConsumptionDate] = useState(new Date().toISOString().split('T')[0]);

  // Mapa de consumos por insumo ID: { [ingredientId]: quantitySpent }
  const [consumptionMap, setConsumptionMap] = useState({});
  const [notesMap, setNotesMap] = useState({});

  const navigate = useNavigate();

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getIngredients();
      setIngredients(data);
      // Inicializar mapa de consumo en 0
      const initialMap = {};
      data.forEach((item) => {
        initialMap[item.id] = '';
      });
      setConsumptionMap(initialMap);
    } catch (err) {
      console.error('Error al cargar insumos:', err);
      setError('No se pudo cargar la lista de insumos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleQuantityChange = (id, val) => {
    setConsumptionMap((prev) => ({
      ...prev,
      [id]: val
    }));
  };

  const handleNotesChange = (id, val) => {
    setNotesMap((prev) => ({
      ...prev,
      [id]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Filtrar solo insumos con consumo registrado > 0
    const itemsToSubmit = [];
    Object.entries(consumptionMap).forEach(([idStr, valStr]) => {
      const qty = parseFloat(valStr);
      if (!isNaN(qty) && qty > 0) {
        itemsToSubmit.push({
          ingredientId: Number(idStr),
          quantity: qty,
          notes: notesMap[idStr] || 'Consumo diario'
        });
      }
    });

    if (itemsToSubmit.length === 0) {
      setError('Por favor, ingresa al menos un consumo mayor a 0 para guardar.');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.submitDailyConsumption(itemsToSubmit, consumptionDate);
      setSuccessMsg(`¡Consumo diario registrado exitosamente para ${itemsToSubmit.length} insumos!`);
      setTimeout(() => {
        navigate('/dashboard/admin/inventory');
      }, 1800);
    } catch (err) {
      console.error('Error al enviar consumo diario:', err);
      setError(err.response?.data?.message || 'Error al guardar el consumo diario.');
    } finally {
      setSubmitting(false);
    }
  };

  // Agrupar insumos por categoría
  const groupedIngredients = ingredients.reduce((acc, ing) => {
    if (!acc[ing.category]) acc[ing.category] = [];
    acc[ing.category].push(ing);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* HEADER Y NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/dashboard/admin/inventory"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Volver al Tablero de Inventario</span>
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">Registro de Consumo Diario</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Actualiza el gasto real de materia prima utilizado al cierre de la jornada de trabajo.
          </p>
        </div>

        {/* FECHA DEL REGISTRO */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center gap-2.5 shadow-sm">
          <Calendar className="w-5 h-5 text-orange-500" />
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400">Fecha de Cierre</label>
            <input
              type="date"
              value={consumptionDate}
              onChange={(e) => setConsumptionDate(e.target.value)}
              className="bg-transparent font-bold text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* MENSAJES */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* FORMULARIO DE CONSUMO POR CATEGORÍA */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando insumos del restaurante...</span>
          </div>
        ) : Object.keys(groupedIngredients).length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Package className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <p className="font-bold">No hay insumos registrados para actualizar.</p>
          </div>
        ) : (
          Object.entries(groupedIngredients).map(([category, items]) => (
            <div key={category} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold uppercase tracking-wider text-orange-500 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span>🏷️</span> {category} ({items.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((ing) => {
                  const spentQty = parseFloat(consumptionMap[ing.id]) || 0;
                  const estimatedRemaining = Math.max(0, ing.currentStock - spentQty);

                  return (
                    <div
                      key={ing.id}
                      className={`p-4 rounded-xl border transition-all ${
                        spentQty > 0
                          ? 'border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10'
                          : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{ing.name}</h3>
                          <span className="text-xs text-slate-400">
                            Stock actual: <strong className="text-slate-600 dark:text-slate-300">{ing.currentStock} {ing.unit}</strong>
                          </span>
                        </div>

                        {/* Remanente estimado */}
                        {spentQty > 0 && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                            Quedará: {estimatedRemaining.toFixed(2)} {ing.unit}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Gastado Hoy ({ing.unit})</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={consumptionMap[ing.id] || ''}
                            onChange={(e) => handleQuantityChange(ing.id, e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notas (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ej: Merma en preparación"
                            value={notesMap[ing.id] || ''}
                            onChange={(e) => handleNotesChange(ing.id, e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* BOTÓN DE GUARDADO FLOTANTE/FINAL */}
        <div className="sticky bottom-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between z-20">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Resumen de Actualización</span>
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              {Object.values(consumptionMap).filter((v) => parseFloat(v) > 0).length} insumos modificados
            </span>
          </div>

          <div className="flex gap-3">
            <Link
              to="/dashboard/admin/inventory"
              className="px-5 py-3 border border-slate-200 dark:border-slate-800 font-bold rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Cierre...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Consumo del Día</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
