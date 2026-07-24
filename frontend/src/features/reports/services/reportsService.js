import api from '../../../lib/api';

/**
 * Servicio del cliente para interactuar con los endpoints de Reportes (/api/reports).
 */
export const reportsService = {
  /**
   * Obtener métricas y analíticas ejecutivas según el rango de fechas.
   */
  async getDashboardSummary(params = {}) {
    const response = await api.get('/api/reports/dashboard', { params });
    return response.data.data;
  }
};
