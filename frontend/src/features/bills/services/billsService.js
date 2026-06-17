import api from '../../../lib/api';

/**
 * Servicio para facturas, cobros y pagos.
 */
export const billsService = {
  /**
   * Registra el cobro / factura para una comanda.
   * @param {Object} paymentData - { orderId: number, discount: number, tax: number, payments: Array<{amount, method}> }
   */
  async processPayment(paymentData) {
    const response = await api.post('/bills', paymentData);
    return response.data.bill;
  },

  /**
   * Obtiene el listado histórico de facturas.
   * @param {Object} filters - { cashierId, startDate, endDate }
   */
  async getBills(filters = {}) {
    const params = new URLSearchParams();
    if (filters.cashierId) {
      params.append('cashierId', filters.cashierId);
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }

    const response = await api.get('/bills', { params });
    return response.data.bills;
  }
};
