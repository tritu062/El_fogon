import api from '../../../lib/api';

/**
 * Servicio para consumir la API del Catálogo (Categorías e Ítems).
 */
export const catalogService = {
  // ==========================================
  // CATEGORÍAS
  // ==========================================

  /**
   * Obtiene la lista de todas las categorías activas.
   */
  async getCategories() {
    const response = await api.get('/categories');
    return response.data.categories;
  },

  /**
   * Obtiene el detalle de una categoría específica.
   */
  async getCategoryById(id) {
    const response = await api.get(`/categories/${id}`);
    return response.data.category;
  },

  /**
   * Crea una nueva categoría (Solo Administradores).
   */
  async createCategory(categoryData) {
    const response = await api.post('/categories', categoryData);
    return response.data.category;
  },

  /**
   * Actualiza una categoría existente (Solo Administradores).
   */
  async updateCategory(id, categoryData) {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data.category;
  },

  /**
   * Elimina lógicamente una categoría (Solo Administradores).
   */
  async deleteCategory(id) {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // ==========================================
  // ÍTEMS (PLATOS Y BEBIDAS)
  // ==========================================

  /**
   * Obtiene la lista de ítems activos con filtros opcionales.
   * @param {Object} filters - { categoryId, isAvailable }
   */
  async getItems(filters = {}) {
    const params = new URLSearchParams();
    if (filters.categoryId) {
      params.append('categoryId', filters.categoryId);
    }
    if (filters.isAvailable !== undefined) {
      params.append('isAvailable', filters.isAvailable.toString());
    }

    const response = await api.get('/items', { params });
    return response.data.items;
  },

  /**
   * Obtiene el detalle de un plato o bebida específica.
   */
  async getItemById(id) {
    const response = await api.get(`/items/${id}`);
    return response.data.item;
  },

  /**
   * Crea un nuevo plato o bebida (Solo Administradores).
   */
  async createItem(itemData) {
    const response = await api.post('/items', itemData);
    return response.data.item;
  },

  /**
   * Actualiza un plato o bebida existente (Solo Administradores).
   */
  async updateItem(id, itemData) {
    const response = await api.put(`/items/${id}`, itemData);
    return response.data.item;
  },

  /**
   * Cambia la disponibilidad de un plato o bebida (Solo Administradores).
   */
  async updateItemAvailability(id, isAvailable) {
    const response = await api.patch(`/items/${id}/availability`, { isAvailable });
    return response.data.item;
  },

  /**
   * Elimina lógicamente un plato o bebida (Solo Administradores).
   */
  async deleteItem(id) {
    const response = await api.delete(`/items/${id}`);
    return response.data;
  }
};
