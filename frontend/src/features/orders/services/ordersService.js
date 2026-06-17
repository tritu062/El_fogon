import api from '../../../lib/api';

/**
 * Servicio para consumir la API de Pedidos / Comandas.
 */
export const ordersService = {
  /**
   * Obtiene la lista de pedidos con filtros opcionales.
   * @param {Object} filters - { status, tableId, waiterId }
   */
  async getOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.tableId) {
      params.append('tableId', filters.tableId);
    }
    if (filters.waiterId) {
      params.append('waiterId', filters.waiterId);
    }

    const response = await api.get('/orders', { params });
    return response.data.orders;
  },

  /**
   * Obtiene el detalle de un pedido específico.
   */
  async getOrderById(id) {
    const response = await api.get(`/orders/${id}`);
    return response.data.order;
  },

  /**
   * Registra un nuevo pedido / comanda (Meseros y Administradores).
   * @param {Object} orderData - { tableId, items: [{ itemId, quantity, notes, selectedModifiers }] }
   */
  async createOrder(orderData) {
    const response = await api.post('/orders', orderData);
    return response.data.order;
  },

  /**
   * Adiciona platos o bebidas a una comanda activa.
   * @param {number} id - ID del pedido
   * @param {Array} items - [{ itemId, quantity, notes, selectedModifiers }]
   */
  async appendItems(id, items) {
    const response = await api.patch(`/orders/${id}/items`, { items });
    return response.data.order;
  },

  /**
   * Actualiza el estado de un pedido (Control de roles interno en backend).
   * @param {number} id - ID del pedido
   * @param {string} status - Nuevo estado ('PENDING', 'READY', 'PAID', 'CANCELLED')
   */
  async updateOrderStatus(id, status) {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data.order;
  }
};
