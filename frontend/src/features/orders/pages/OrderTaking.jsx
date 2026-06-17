import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { catalogService } from '../../catalog/services/catalogService';
import { tablesService } from '../../tables/services/tablesService';
import { ordersService } from '../services/ordersService';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Send, 
  CheckCircle, 
  Utensils, 
  Grid, 
  ChefHat, 
  Info, 
  ArrowLeft 
} from 'lucide-react';

export default function OrderTaking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Parametros e inicializaciones
  const queryTableId = searchParams.get('tableId');

  // Estado del Carrito
  const { 
    cartItems, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getCartTotal, 
    getFormattedItemsForApi 
  } = useCart();

  // Estados de datos
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(queryTableId ? parseInt(queryTableId, 10) : '');
  const [activeTabCategory, setActiveTabCategory] = useState('ALL');
  
  // Estado para la lógica de adición a comanda activa
  const [activeOrdersOnTable, setActiveOrdersOnTable] = useState([]);
  const [targetOrderId, setTargetOrderId] = useState(null); // Si es null, crea pedido. Si tiene ID, adiciona.
  
  // Estados de control de UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Modal para configurar plato a agregar
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [modalModifiers, setModalModifiers] = useState({}); // { 'Bebida': 'Limonada' }
  const [modalNotes, setModalNotes] = useState('');
  const [modalQuantity, setModalQuantity] = useState(1);

  // Cargar categorías, ítems y mesas
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cats, allItems, allTables] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getItems({ isAvailable: true }), // Solo disponibles
          tablesService.getTables()
        ]);
        setCategories(cats);
        setItems(allItems);
        setTables(allTables);
      } catch (err) {
        console.error('Error al cargar datos de toma de pedidos:', err);
        setError('No se pudo cargar la información operativa.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Buscar comandas activas si la mesa seleccionada cambia o se ocupa
  useEffect(() => {
    if (!selectedTableId) {
      setActiveOrdersOnTable([]);
      setTargetOrderId(null);
      return;
    }

    const checkActiveOrders = async () => {
      try {
        const table = tables.find(t => t.id === selectedTableId);
        if (table && table.status === 'OCCUPIED') {
          // Consultar pedidos en estado PENDING o READY de esta mesa
          const activeOrders = await ordersService.getOrders({ tableId: selectedTableId });
          const pendingOrReady = activeOrders.filter(o => o.status === 'PENDING' || o.status === 'READY');
          setActiveOrdersOnTable(pendingOrReady);
          if (pendingOrReady.length > 0) {
            // Sugerir adicionar al primer pedido activo por defecto
            setTargetOrderId(pendingOrReady[0].id);
          } else {
            setTargetOrderId(null);
          }
        } else {
          setActiveOrdersOnTable([]);
          setTargetOrderId(null);
        }
      } catch (err) {
        console.error('Error al verificar pedidos activos de mesa:', err);
      }
    };

    checkActiveOrders();
  }, [selectedTableId, tables]);

  // Manejar click en un plato
  const handleItemClick = (item) => {
    setSelectedItemForModal(item);
    setModalQuantity(1);
    setModalNotes('');
    
    // Inicializar modificadores con la primera opción disponible por defecto
    const initialMods = {};
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        initialMods[mod.name] = mod.options[0];
      });
    }
    setModalModifiers(initialMods);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedItemForModal) return;
    addToCart(selectedItemForModal, modalQuantity, modalModifiers, modalNotes);
    setSelectedItemForModal(null);
  };

  const handleClearCartConfirm = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar todos los platos de esta comanda?')) {
      clearCart();
    }
  };

  const handleBackToSalon = () => {
    if (cartItems.length > 0) {
      if (!window.confirm('Tienes platos agregados a la comanda. Si sales al salón, perderás estos cambios. ¿Deseas salir?')) {
        return;
      }
    }
    navigate('/dashboard/waiter/tables');
  };

  // Enviar comanda al backend
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    setError(null);

    const formattedItems = getFormattedItemsForApi();

    try {
      if (targetOrderId) {
        // Modo Adición
        await ordersService.appendItems(targetOrderId, formattedItems);
      } else {
        // Modo Creación
        await ordersService.createOrder({
          tableId: selectedTableId ? parseInt(selectedTableId, 10) : null,
          items: formattedItems
        });
      }

      setSuccess(true);
      clearCart();
      
      // Esperar 2 segundos y redirigir
      setTimeout(() => {
        navigate('/dashboard/waiter/tables');
      }, 2000);

    } catch (err) {
      console.error('Error al procesar la comanda:', err);
      setError(err.response?.data?.message || 'Ocurrió un error al enviar el pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado de ítems por categoría activa
  const filteredItems = activeTabCategory === 'ALL'
    ? items
    : items.filter(i => i.categoryId === parseInt(activeTabCategory, 10));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 mt-3 font-semibold">Cargando catálogo...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="text-6xl text-green-500 animate-bounce">🎉</div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">¡Comanda Enviada!</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          {targetOrderId 
            ? 'Los platos adicionales han sido agregados a la comanda activa correctamente.'
            : 'El pedido ha sido registrado con éxito y enviado a la cocina para su preparación.'}
        </p>
        <div className="w-16 h-1 border-t-2 border-green-500 border-dashed animate-pulse mx-auto"></div>
        <p className="text-xs text-slate-400">Redirigiendo a la vista del salón...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative min-h-[80vh]">
      
      {/* SECCIÓN IZQUIERDA: MENÚ Y SELECCIÓN DE MESA */}
      <div className="flex-1 space-y-6">
        
        {/* Selector de Mesa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Grid className="w-5 h-5 text-orange-500" /> Mesa del Pedido
            </h2>
            {queryTableId && (
              <button 
                onClick={handleBackToSalon}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver al Salón
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Seleccione Mesa Física
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value ? parseInt(e.target.value, 10) : '')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 px-4 py-2.5 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
              >
                <option value="">Para Llevar / Delivery</option>
                {tables.map(table => (
                  <option key={table.id} value={table.id}>
                    Mesa {table.number} ({table.zone?.name || 'Comedor'}) - {table.status === 'OCCUPIED' ? '🔴 Ocupada' : '🟢 Libre'}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de comanda activa si la mesa seleccionada está ocupada */}
            {activeOrdersOnTable.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  ⚠️ Mesa Ocupada: Adicionar a
                </label>
                <select
                  value={targetOrderId || ''}
                  onChange={(e) => setTargetOrderId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none"
                >
                  <option value="">-- Crear Nueva Comanda Independiente --</option>
                  {activeOrdersOnTable.map(order => (
                    <option key={order.id} value={order.id}>
                      Comanda #{order.id} (${(order.total / 100).toFixed(2)}) - Atendido por {order.waiter?.firstName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {targetOrderId && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-850 dark:text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>Modo Adición: Los platos que selecciones se sumarán a la comanda existente #{targetOrderId}.</span>
            </div>
          )}
        </div>

        {/* Selector de Categorías (Navbar de Menú) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          <button
            onClick={() => setActiveTabCategory('ALL')}
            className={`px-4.5 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all border ${
              activeTabCategory === 'ALL'
                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            Todo el Menú
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTabCategory(cat.id.toString())}
              className={`px-4.5 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all border ${
                activeTabCategory === cat.id.toString()
                  ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Listado de Platos */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800/80 p-12 text-center rounded-2xl shadow-sm">
            <Utensils className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">No hay platos disponibles</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
              Todos los platos en esta categoría están marcados temporalmente como agotados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-3.5 flex items-start text-left gap-3.5 hover:border-orange-200 dark:hover:border-orange-900/60 transition-all shadow-sm group hover:scale-[1.01] active:scale-95"
              >
                {/* Imagen */}
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100 dark:border-slate-800">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                  ) : (
                    <Utensils className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-bold text-slate-850 dark:text-slate-200 text-sm truncate">{item.name}</h4>
                  <p className="text-slate-450 dark:text-slate-400 text-[11px] leading-tight line-clamp-2">{item.description || 'Plato tradicional de la casa.'}</p>
                  <span className="inline-block text-xs font-black text-orange-600 dark:text-orange-400">
                    ${(item.price / 100).toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN DERECHA: SIDEBAR DE LA COMANDA / CARRITO */}
      <aside className="w-full lg:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between max-h-[85vh] overflow-hidden">
        
        {/* Cabecera Comanda */}
        <div className="p-4.5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-850 dark:text-white">
              {targetOrderId ? `Adicionar a Comanda #${targetOrderId}` : 'Nueva Comanda'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                onClick={handleClearCartConfirm}
                className="text-[10px] font-bold text-red-500 hover:text-red-650 bg-red-50 dark:bg-red-950/25 px-2 py-1 rounded border border-red-100 dark:border-red-950 transition-all uppercase tracking-wider"
              >
                Vaciar
              </button>
            )}
            <span className="bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-orange-100 dark:border-orange-900/40">
              {cartItems.length} ítems
            </span>
          </div>
        </div>

        {/* Cuerpo / Ítems en Carrito */}
        <div className="flex-1 overflow-y-auto p-4.5 space-y-3.5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 dark:text-slate-500 space-y-2">
              <ChefHat className="w-12 h-12 text-slate-250 dark:text-slate-750 animate-bounce" />
              <p className="font-bold text-sm">Comanda vacía</p>
              <p className="text-xs max-w-[200px]">Selecciona platos o bebidas del menú de la izquierda para armar el pedido.</p>
            </div>
          ) : (
            cartItems.map((cItem, index) => (
              <div 
                key={cItem.cartItemId} 
                className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/20 dark:bg-slate-950/10 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200">{cItem.item.name}</h5>
                    <span className="text-[11px] text-orange-550 dark:text-orange-450 font-black">
                      ${((cItem.item.price * cItem.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(cItem.cartItemId)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Modificadores aplicados */}
                {Object.keys(cItem.selectedModifiers).length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                    {Object.entries(cItem.selectedModifiers).map(([name, val]) => (
                      <span key={name} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-medium">
                        {name}: {val}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notas de Cocina */}
                {cItem.notes && (
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 italic pl-1 border-l-2 border-orange-400">
                    📝 {cItem.notes}
                  </p>
                )}

                {/* Controles de cantidad */}
                <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-slate-100/50 dark:border-slate-850/50">
                  <button
                    onClick={() => updateQuantity(cItem.cartItemId, cItem.quantity - 1)}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-black w-6 text-center text-slate-800 dark:text-white">
                    {cItem.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(cItem.cartItemId, cItem.quantity + 1)}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Total y Botón de Envío */}
        <div className="p-4.5 border-t border-slate-150 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/10">
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/20 border border-red-200/50 p-2 rounded-xl">
              ❌ {error}
            </p>
          )}

          <div className="flex justify-between items-center font-bold">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Valor Total:</span>
            <span className="text-2xl text-slate-850 dark:text-white font-extrabold">
              ${(getCartTotal() / 100).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleSubmitOrder}
            disabled={cartItems.length === 0 || submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-400 text-white font-bold rounded-xl shadow-md shadow-orange-500/10 transition-all text-sm"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {targetOrderId ? 'Adicionar a Comanda' : 'Enviar Comanda a Cocina'}
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ==========================================
          MODAL DE CONFIGURACIÓN DE PLATO
      ========================================== */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in-50">
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-850 dark:text-white leading-tight">
                  {selectedItemForModal.name}
                </h3>
                <span className="text-sm font-extrabold text-orange-550 dark:text-orange-400 mt-1 block">
                  ${(selectedItemForModal.price / 100).toFixed(2)}
                </span>
              </div>
              <button 
                onClick={() => setSelectedItemForModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedItemForModal.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {selectedItemForModal.description}
              </p>
            )}

            <hr className="border-slate-100 dark:border-slate-850" />

            <div className="space-y-4">
              {/* Controles de Modificadores */}
              {selectedItemForModal.modifiers && selectedItemForModal.modifiers.length > 0 && (
                <div className="space-y-3">
                  {selectedItemForModal.modifiers.map(mod => (
                    <div key={mod.name} className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block">
                        {mod.name}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.options.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setModalModifiers({ ...modalModifiers, [mod.name]: opt })}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                              modalModifiers[mod.name] === opt
                                ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notas de Cocina */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block">
                  Notas de cocina (ej: Sin cebolla, extra salsa...)
                </label>
                <input
                  type="text"
                  placeholder="Instrucciones especiales..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Cantidad */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Cantidad de unidades:</span>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-black w-6 text-center text-slate-800 dark:text-white">
                    {modalQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setSelectedItemForModal(null)}
                className="px-4 py-2 text-xs font-bold border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToCart}
                className="px-4.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/10"
              >
                Agregar a Comanda
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
