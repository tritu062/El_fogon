import api from '../../../lib/api';

/**
 * Servicio para consumir la API de Zonas del restaurante.
 */
export const zonesService = {
  /**
   * Obtiene la lista de todas las zonas activas con sus mesas.
   */
  async getZones() {
    const response = await api.get('/zones');
    return response.data.zones;
  },

  /**
   * Obtiene el detalle de una zona específica.
   */
  async getZoneById(id) {
    const response = await api.get(`/zones/${id}`);
    return response.data.zone;
  },

  /**
   * Crea una nueva zona (Solo Administradores).
   */
  async createZone(zoneData) {
    const response = await api.post('/zones', zoneData);
    return response.data.zone;
  },

  /**
   * Actualiza una zona existente (Solo Administradores).
   */
  async updateZone(id, zoneData) {
    const response = await api.put(`/zones/${id}`, zoneData);
    return response.data.zone;
  },

  /**
   * Elimina lógicamente una zona (Solo Administradores).
   */
  async deleteZone(id) {
    const response = await api.delete(`/zones/${id}`);
    return response.data;
  }
};

/**
 * Servicio para consumir la API de Mesas.
 */
export const tablesService = {
  /**
   * Obtiene la lista de todas las mesas activas con sus zonas asociadas.
   */
  async getTables() {
    const response = await api.get('/tables');
    return response.data.tables;
  },

  /**
   * Obtiene el detalle de una mesa específica.
   */
  async getTableById(id) {
    const response = await api.get(`/tables/${id}`);
    return response.data.table;
  },

  /**
   * Crea una nueva mesa (Solo Administradores).
   */
  async createTable(tableData) {
    const response = await api.post('/tables', tableData);
    return response.data.table;
  },

  /**
   * Actualiza una mesa existente (Solo Administradores).
   */
  async updateTable(id, tableData) {
    const response = await api.put(`/tables/${id}`, tableData);
    return response.data.table;
  },

  /**
   * Cambia el estado de ocupación de una mesa (Administradores y Meseros).
   * @param {number} id - ID de la mesa
   * @param {string} status - Nuevo estado ('FREE', 'OCCUPIED', 'RESERVED')
   */
  async updateTableStatus(id, status) {
    const response = await api.patch(`/tables/${id}/status`, { status });
    return response.data.table;
  },

  /**
   * Elimina lógicamente una mesa (Solo Administradores).
   */
  async deleteTable(id) {
    const response = await api.delete(`/tables/${id}`);
    return response.data;
  }
};
