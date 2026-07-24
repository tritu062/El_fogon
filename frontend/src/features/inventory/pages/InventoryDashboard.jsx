import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../services/inventoryService';
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart, 
  ClipboardList, 
  Search, 
  Edit3, 
  Trash2, 
  Loader2, 
  TrendingDown, 
  TrendingUp,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

const CATEGORIES = ['TODAS', 'CARNES', 'VERDURAS', 'LACTEOS', 'ABARROTES', 'BEBIDAS', 'DESECHABLES', 'OTROS'];

export default function InventoryDashboard() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  // Formulario Insumo
  const [formData, setFormData] = useState({
    name: '',
    category: 'ABARROTES',
    unit: 'KG',
    currentStock: 0,
    minStock: 5,
    unitCost: 1000
  });

  // Formulario Compra
  const [purchaseData, setPurchaseData] = useState({
    ingredientId: '',
    quantity: '',
    unitCost: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getIngredients();
      setIngredients(data);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      setError('No se pudo cargar el catálogo de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenCreateModal = (ing = null) => {
    if (ing) {
      setSelectedIngredient(ing);
      setFormData({
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        currentStock: ing.currentStock,
        minStock: ing.minStock,
        unitCost: ing.unitCost
      });
    } else {
      setSelectedIngredient(null);
      setFormData({
        name: '',
        category: 'ABARROTES',
        unit: 'KG',
        currentStock: 0,
        minStock: 5,
        unitCost: 1000
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (selectedIngredient) {
        await inventoryService.updateIngredient(selectedIngredient.id, formData);
        setSuccessMsg(`Insumo "${formData.name}" actualizado correctamente.`);
      } else {
        await inventoryService.createIngredient(formData);
        setSuccessMsg(`Insumo "${formData.name}" registrado con éxito.`);
      }
      setIsCreateModalOpen(false);
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar insumo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIngredient = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el insumo "${name}"?`)) return;
    try {
      await inventoryService.deleteIngredient(id);
      setSuccessMsg(`Insumo "${name}" eliminado.`);
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar insumo.');
    }
  };

  const handleOpenPurchaseModal = (ing) => {
    setSelectedIngredient(ing);
    setPurchaseData({
      ingredientId: ing.id,
      quantity: '',
      unitCost: (ing.unitCost / 100).toString(),
      notes: 'Compra de reabastecimiento'
    });
    setIsPurchaseModalOpen(true);
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await inventoryService.registerMovement({
        ingredientId: Number(purchaseData.ingredientId),
        type: 'PURCHASE',
        quantity: parseFloat(purchaseData.quantity),
        unitCost: Math.round(parseFloat(purchaseData.unitCost) * 100),
        notes: purchaseData.notes
      });
      setSuccessMsg(`Reabastecimiento registrado para ${selectedIngredient?.name}.`);
      setIsPurchaseModalOpen(false);
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar la compra.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cálculo de KPIs
  const totalItems = ingredients.length;
  const alertItemsCount = ingredients.filter((i) => i.status !== 'OK').length;
  const totalInventoryValue = ingredients.reduce((acc, i) => acc + i.totalValue, 0);

  // Filtrado de lista
  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'TODAS' || ing.category === selectedCategory;
    const matchesAlert = !filterAlertsOnly || ing.status !== 'OK';
    return matchesSearch && matchesCategory && matchesAlert;
  });

  return (
    <div className="space-y-6">
      {/* HEADER Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Inventario e Insumos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Control de existencias de materia prima, abastecimientos y actualización diaria.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/dashboard/admin/inventory/daily"
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Actualización Diaria</span>
          </Link>
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Insumo</span>
          </button>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex justify-between items-center animate-fade-in">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-xs">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm font-medium flex justify-between items-center animate-fade-in">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
        </div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Insumos Registrados</span>
            <h3 className="text-3xl font-extrabold">{totalItems}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Catálogo activo</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 text-brand-500 border border-slate-200/50 dark:border-slate-800">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Alertas de Stock</span>
            <h3 className="text-3xl font-extrabold text-amber-500">{alertItemsCount}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Requieren reabastecimiento</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-200/50 dark:border-amber-900/50">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Valor en Bodega</span>
            <h3 className="text-3xl font-extrabold text-emerald-500">${(totalInventoryValue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Costo estimado total</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-200/50 dark:border-emerald-900/50">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar insumo por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Categorías */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Toggle Solo Alertas */}
          <button
            type="button"
            onClick={() => setFilterAlertsOnly(!filterAlertsOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              filterAlertsOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Solo Alertas ({alertItemsCount})</span>
          </button>
        </div>
      </div>

      {/* TABLA DE INSUMOS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando existencias de inventario...</span>
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <p className="font-bold">No se encontraron insumos.</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros de búsqueda o registra un nuevo insumo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Insumo</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Stock Actual</th>
                  <th className="p-4">Stock Mínimo</th>
                  <th className="p-4">Costo Unit.</th>
                  <th className="p-4">Valor Total</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {filteredIngredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                      {ing.name}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {ing.category}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                      {ing.currentStock} <span className="text-xs font-normal text-slate-400">{ing.unit}</span>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {ing.minStock} <span className="text-xs font-normal text-slate-400">{ing.unit}</span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">
                      ${(ing.unitCost / 100).toFixed(2)}
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ${(ing.totalValue / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      {ing.status === 'OK' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> OK
                        </span>
                      ) : ing.status === 'WARNING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Agotado
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPurchaseModal(ing)}
                          title="Registrar Compra / Reabastecer"
                          className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 transition-colors"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenCreateModal(ing)}
                          title="Editar Insumo"
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                          title="Eliminar Insumo"
                          className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100 text-red-600 dark:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* MODAL CREAR / EDITAR INSUMO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsCreateModalOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10">
            <h2 className="text-xl font-bold mb-4">
              {selectedIngredient ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
            </h2>
            <form onSubmit={handleSaveIngredient} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Nombre del Insumo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carne de Res, Aceite, Papas"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'TODAS').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Unidad de Medida</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none"
                  >
                    {['KG', 'LB', 'G', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES', 'CAJAS'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={(formData.unitCost / 100).toString()}
                    onChange={(e) => setFormData({ ...formData, unitCost: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 font-bold rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Guardar</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR COMPRA / REABASTECIMIENTO */}
      {isPurchaseModalOpen && selectedIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsPurchaseModalOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10">
            <h2 className="text-xl font-bold mb-1">Registrar Compra / Entrada</h2>
            <p className="text-xs text-slate-400 mb-4">Insumo: <span className="font-bold text-slate-200">{selectedIngredient.name}</span> (Stock actual: {selectedIngredient.currentStock} {selectedIngredient.unit})</p>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Cantidad Comprada ({selectedIngredient.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ej: 10"
                  value={purchaseData.quantity}
                  onChange={(e) => setPurchaseData({ ...purchaseData, quantity: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Costo Unitario ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={purchaseData.unitCost}
                  onChange={(e) => setPurchaseData({ ...purchaseData, unitCost: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Notas u Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Proveedor Surtidor S.A."
                  value={purchaseData.notes}
                  onChange={(e) => setPurchaseData({ ...purchaseData, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 font-bold rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sumar al Inventario</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
