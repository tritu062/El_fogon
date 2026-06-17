import React, { useState, useEffect } from 'react';
import { catalogService } from '../services/catalogService';
import { 
  Utensils, 
  FolderPlus, 
  Plus, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Save, 
  Info,
  DollarSign
} from 'lucide-react';

export default function AdminMenuConfig() {
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'categories'
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modales y formularios de edición
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', description: '' });
  
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({
    id: null,
    name: '',
    description: '',
    price: '', // Representado como string de decimales para el input (ej: "12.50")
    imageUrl: '',
    categoryId: '',
    isAvailable: true,
    modifiers: [] // [{ name: '', options: [] }]
  });

  // Modificadores temporales para el formulario
  const [tempModName, setTempModName] = useState('');
  const [tempModOptions, setTempModOptions] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allCats, allItems] = await Promise.all([
        catalogService.getCategories(),
        catalogService.getItems()
      ]);
      setCategories(allCats);
      setItems(allItems);
    } catch (err) {
      console.error('Error al cargar datos del catálogo:', err);
      setError('Error al cargar la información del menú. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ==========================================
  // MANEJADORES DE CATEGORÍAS
  // ==========================================
  const handleOpenCategoryCreate = () => {
    setCategoryForm({ id: null, name: '', description: '' });
    setError(null);
    setShowCategoryModal(true);
  };

  const handleOpenCategoryEdit = (cat) => {
    setCategoryForm({ id: cat.id, name: cat.name, description: cat.description || '' });
    setError(null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setError(null);
    if (!categoryForm.name.trim()) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }

    try {
      if (categoryForm.id) {
        await catalogService.updateCategory(categoryForm.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null
        });
        triggerSuccess('Categoría actualizada con éxito.');
      } else {
        await catalogService.createCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null
        });
        triggerSuccess('Categoría creada con éxito.');
      }
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      console.error('Error al guardar categoría:', err);
      setError(err.response?.data?.message || 'Error al guardar la categoría.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta categoría?')) return;
    setError(null);
    try {
      await catalogService.deleteCategory(id);
      triggerSuccess('Categoría eliminada con éxito.');
      loadData();
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      setError(err.response?.data?.message || 'No se pudo eliminar la categoría.');
    }
  };

  // ==========================================
  // MANEJADORES DE PLATOS / BEBIDAS (ITEMS)
  // ==========================================
  const handleOpenItemCreate = () => {
    setItemForm({
      id: null,
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      categoryId: categories[0]?.id || '',
      isAvailable: true,
      modifiers: []
    });
    setTempModName('');
    setTempModOptions('');
    setError(null);
    setShowItemModal(true);
  };

  const handleOpenItemEdit = (item) => {
    setItemForm({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: (item.price / 100).toFixed(2), // Convertir centavos a decimal
      imageUrl: item.imageUrl || '',
      categoryId: item.categoryId,
      isAvailable: item.isAvailable,
      modifiers: item.modifiers || []
    });
    setTempModName('');
    setTempModOptions('');
    setError(null);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setError(null);

    const numericPrice = parseFloat(itemForm.price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError('El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    const priceInCentavos = Math.round(numericPrice * 100);

    const payload = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      price: priceInCentavos,
      imageUrl: itemForm.imageUrl.trim() || null,
      categoryId: parseInt(itemForm.categoryId, 10),
      isAvailable: itemForm.isAvailable,
      modifiers: itemForm.modifiers.length > 0 ? itemForm.modifiers : null
    };

    try {
      if (itemForm.id) {
        await catalogService.updateItem(itemForm.id, payload);
        triggerSuccess('Plato/bebida actualizado con éxito.');
      } else {
        await catalogService.createItem(payload);
        triggerSuccess('Plato/bebida registrado con éxito.');
      }
      setShowItemModal(false);
      loadData();
    } catch (err) {
      console.error('Error al guardar plato/bebida:', err);
      setError(err.response?.data?.message || 'Error al registrar plato/bebida.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este plato o bebida del menú?')) return;
    setError(null);
    try {
      await catalogService.deleteItem(id);
      triggerSuccess('Plato/bebida eliminado con éxito.');
      loadData();
    } catch (err) {
      console.error('Error al eliminar plato/bebida:', err);
      setError('Error al eliminar el plato del menú.');
    }
  };

  const handleToggleAvailability = async (id, currentVal) => {
    try {
      const newVal = !currentVal;
      await catalogService.updateItemAvailability(id, newVal);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isAvailable: newVal } : i))
      );
      triggerSuccess('Disponibilidad actualizada.');
    } catch (err) {
      console.error('Error al cambiar disponibilidad:', err);
      alert('No se pudo cambiar la disponibilidad.');
    }
  };

  // Gestión de modificadores en formulario
  const handleAddModifier = () => {
    if (!tempModName.trim()) return;
    if (!tempModOptions.trim()) return;

    const optionsArray = tempModOptions
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (optionsArray.length === 0) return;

    setItemForm((prev) => ({
      ...prev,
      modifiers: [...prev.modifiers, { name: tempModName.trim(), options: optionsArray }]
    }));

    setTempModName('');
    setTempModOptions('');
  };

  const handleRemoveModifier = (index) => {
    setItemForm((prev) => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, idx) => idx !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="text-orange-500 animate-pulse">🍽️</span> Carta y Menú del Restaurante
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Configuración dinámica de categorías, platos, bebidas y modificadores de cocina.
          </p>
        </div>

        {/* Botones de creación rápida */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCategoryCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            <FolderPlus className="w-4.5 h-4.5 text-slate-500" />
            Nueva Categoría
          </button>
          <button
            onClick={handleOpenItemCreate}
            disabled={categories.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/15 transition-all disabled:opacity-50"
          >
            <Plus className="w-4.5 h-4.5" />
            Agregar Plato
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'items'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Platos y Bebidas ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'categories'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Categorías ({categories.length})
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-2xl text-sm font-medium flex items-center gap-2">
          <Info className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400 rounded-2xl text-sm font-semibold animate-pulse">
          ✨ {successMsg}
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 mt-3 font-semibold">Cargando catálogo...</p>
        </div>
      ) : activeTab === 'categories' ? (
        // ==========================================
        // VISTA DE TABLA CATEGORÍAS
        // ==========================================
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4.5">ID</th>
                  <th className="p-4.5">Nombre</th>
                  <th className="p-4.5">Descripción</th>
                  <th className="p-4.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 dark:text-slate-500 italic">
                      No hay categorías registradas en el sistema.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="p-4.5 text-sm font-bold text-slate-400">#{cat.id}</td>
                      <td className="p-4.5 font-bold text-slate-850 dark:text-slate-200">{cat.name}</td>
                      <td className="p-4.5 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{cat.description || 'Sin descripción'}</td>
                      <td className="p-4.5 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenCategoryEdit(cat)}
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                          title="Editar categoría"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/20 rounded-lg transition-all"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ==========================================
        // VISTA DE PLATOS / BEBIDAS GROUPED BY CAT
        // ==========================================
        <div className="space-y-8">
          {categories.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center rounded-2xl shadow-sm">
              <p className="text-slate-450 dark:text-slate-500">Cree al menos una categoría primero para poder registrar platos.</p>
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = items.filter((i) => i.categoryId === cat.id);
              return (
                <div key={cat.id} className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <h2 className="text-xl font-bold text-slate-850 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                      {cat.name}
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                        {catItems.length}
                      </span>
                    </h2>
                  </div>

                  {catItems.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic pl-4">No hay platos registrados en esta categoría.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {catItems.map((item) => (
                        <div 
                          key={item.id} 
                          className={`bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
                            !item.isAvailable ? 'opacity-75' : ''
                          }`}
                        >
                          {/* Imagen */}
                          <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-850">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="object-cover h-full w-full hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <Utensils className="w-12 h-12 text-slate-350 dark:text-slate-700" />
                            )}
                            <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-xl text-xs font-black border border-slate-100 dark:border-slate-800 shadow-sm text-slate-800 dark:text-white">
                              ${(item.price / 100).toFixed(2)}
                            </div>
                            {!item.isAvailable && (
                              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-sm tracking-wider uppercase">
                                No Disponible
                              </div>
                            )}
                          </div>

                          {/* Cuerpo */}
                          <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <h4 className="font-bold text-slate-850 dark:text-slate-100 leading-snug">{item.name}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 line-clamp-2">{item.description || 'Sin descripción'}</p>
                              
                              {/* Modificadores */}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1">
                                  {item.modifiers.map((m, idx) => (
                                    <span key={idx} className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-orange-100 dark:border-orange-900/40">
                                      ⚙️ {m.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Acciones */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                              <button
                                onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                                className={`inline-flex items-center gap-1 text-xs font-bold transition-colors ${
                                  item.isAvailable 
                                    ? 'text-green-600 dark:text-green-400 hover:text-green-700' 
                                    : 'text-slate-400 hover:text-slate-500'
                                }`}
                                title="Cambiar disponibilidad"
                              >
                                {item.isAvailable ? (
                                  <>
                                    <ToggleRight className="w-5 h-5 text-green-500" /> Disponible
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-5 h-5" /> Agotado
                                  </>
                                )}
                              </button>

                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleOpenItemEdit(item)}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                  title="Editar plato"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 bg-red-50 dark:bg-red-950/15 text-red-650 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/25 rounded-lg transition-all"
                                  title="Eliminar plato"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==========================================
          MODAL DE CATEGORÍAS
      ========================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in-50">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {categoryForm.id ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                  Nombre de Categoría *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Ej: Postres, Bebidas..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Breve descripción del menú..."
                  rows="3"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/10"
                >
                  <Save className="w-4.5 h-4.5" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE PLATOS (ITEMS)
      ========================================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 my-8 animate-in fade-in-50">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {itemForm.id ? 'Editar Plato/Bebida' : 'Nuevo Plato/Bebida'}
              </h3>
              <button 
                onClick={() => setShowItemModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                    Nombre del Plato *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="Ej: Hamburguesa de la casa"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                    Precio (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm"><DollarSign className="w-4 h-4" /></span>
                    <input
                      type="text"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                      placeholder="12.50"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                    Categoría *
                  </label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                    URL de la Imagen (Opcional)
                  </label>
                  <input
                    type="text"
                    value={itemForm.imageUrl}
                    onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Detalles sobre ingredientes, tamaño o preparación..."
                  rows="2"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Editor de Modificadores */}
              <div className="space-y-2 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                <label className="text-xs font-extrabold text-slate-650 dark:text-slate-400 uppercase tracking-wider block">
                  ⚙️ Modificadores del Plato (Acompañantes, Término, etc.)
                </label>
                
                {/* Modificadores agregados */}
                {itemForm.modifiers.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {itemForm.modifiers.map((mod, index) => (
                      <div key={index} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{mod.name}: </span>
                          <span className="text-slate-500 dark:text-slate-450">{mod.options.join(', ')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveModifier(index)}
                          className="text-red-500 hover:text-red-650 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario rápido de adición de modificador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nombre mod (ej: Término)"
                    value={tempModName}
                    onChange={(e) => setTempModName(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Opciones (ej: 3/4, Medio, Bien cocido)"
                      value={tempModOptions}
                      onChange={(e) => setTempModOptions(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-850 dark:text-white flex-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddModifier}
                      className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs px-3.5 py-1.5 rounded-lg font-bold"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/10"
                >
                  <Save className="w-4.5 h-4.5" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
