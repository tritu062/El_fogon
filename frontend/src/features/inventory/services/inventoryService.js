import api from '../../../lib/api';

/**
 * Servicio del cliente para interactuar con los endpoints de Inventario (/api/inventory).
 */
export const inventoryService = {
  /**
   * Obtener todos los insumos activos con sus estados de alerta y valor total.
   */
  async getIngredients(params = {}) {
    const response = await api.get('/api/inventory/ingredients', { params });
    return response.data.data;
  },

  /**
   * Obtener detalle de un insumo.
   */
  async getIngredientById(id) {
    const response = await api.get(`/api/inventory/ingredients/${id}`);
    return response.data.data;
  },

  /**
   * Crear un nuevo insumo en el catálogo de inventario.
   */
  async createIngredient(data) {
    const response = await api.post('/api/inventory/ingredients', data);
    return response.data.data;
  },

  /**
   * Actualizar los datos de un insumo existente.
   */
  async updateIngredient(id, data) {
    const response = await api.put(`/api/inventory/ingredients/${id}`, data);
    return response.data.data;
  },

  /**
   * Eliminar un insumo de la lista (soft delete).
   */
  async deleteIngredient(id) {
    const response = await api.delete(`/api/inventory/ingredients/${id}`);
    return response.data.data;
  },

  /**
   * Registrar un movimiento individual (compra, consumo, merma, ajuste).
   */
  async registerMovement(data) {
    const response = await api.post('/api/inventory/movements', data);
    return response.data.data;
  },

  /**
   * Registrar lote de consumo diario al final de la jornada.
   */
  async submitDailyConsumption(items, date) {
    const response = await api.post('/api/inventory/daily-consumption', { items, date });
    return response.data.data;
  },

  /**
   * Consultar historial de movimientos.
   */
  async getMovements(params = {}) {
    const response = await api.get('/api/inventory/movements', { params });
    return response.data.data;
  }
};
