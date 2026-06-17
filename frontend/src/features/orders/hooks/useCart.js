import { useState } from 'react';

/**
 * Custom hook para gestionar el carrito/comanda temporal de un pedido.
 */
export function useCart() {
  const [cartItems, setCartItems] = useState([]);

  /**
   * Agrega un ítem al carrito. Genera una clave única combinando el id del ítem,
   * modificadores y notas para permitir líneas independientes del mismo plato.
   */
  const addToCart = (item, quantity = 1, selectedModifiers = {}, notes = '') => {
    // Generar una clave única para identificar este registro específico
    const modString = JSON.stringify(selectedModifiers);
    const cartItemId = `${item.id}-${modString}-${notes.trim()}`;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.cartItemId === cartItemId);

      if (existingIndex > -1) {
        // Incrementar la cantidad del ítem existente
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        // Agregar nueva línea de comanda al carrito
        return [
          ...prevItems,
          {
            cartItemId,
            item,
            quantity,
            selectedModifiers,
            notes: notes.trim()
          }
        ];
      }
    });
  };

  /**
   * Elimina un ítem específico del carrito mediante su cartItemId.
   */
  const removeFromCart = (cartItemId) => {
    setCartItems((prevItems) => prevItems.filter((i) => i.cartItemId !== cartItemId));
  };

  /**
   * Actualiza la cantidad de un ítem en el carrito.
   */
  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: newQuantity } : i))
    );
  };

  /**
   * Limpia el carrito por completo.
   */
  const clearCart = () => {
    setCartItems([]);
  };

  /**
   * Calcula el total de centavos acumulado en el carrito.
   */
  const getCartTotal = () => {
    return cartItems.reduce((acc, current) => {
      return acc + current.item.price * current.quantity;
    }, 0);
  };

  /**
   * Retorna los ítems formateados listos para ser enviados al backend.
   */
  const getFormattedItemsForApi = () => {
    return cartItems.map((i) => ({
      itemId: i.item.id,
      quantity: i.quantity,
      notes: i.notes || null,
      selectedModifiers: Object.keys(i.selectedModifiers).length > 0 ? i.selectedModifiers : null
    }));
  };

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getFormattedItemsForApi
  };
}
