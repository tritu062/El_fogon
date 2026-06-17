import api from '../../../lib/api';

/**
 * Servicio para la gestión de usuarios y logs de auditoría (Exclusivo de Administrador).
 */
export const userService = {
  /**
   * Obtiene todos los usuarios del sistema.
   */
  async getUsers() {
    const response = await api.get('/users');
    return response.data.users;
  },

  /**
   * Obtiene los detalles de un usuario.
   */
  async getUserById(id) {
    const response = await api.get(`/users/${id}`);
    return response.data.user;
  },

  /**
   * Registra un nuevo usuario en el sistema.
   */
  async createUser(userData) {
    const response = await api.post('/users', userData);
    return response.data.user;
  },

  /**
   * Actualiza el perfil o roles de un usuario.
   */
  async updateUser(id, userData) {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.user;
  },

  /**
   * Elimina lógicamente (soft delete) a un usuario.
   */
  async deleteUser(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  /**
   * Obtiene los logs de auditoría del sistema con filtros opcionales.
   * @param {Object} params - { userId, action, startDate, endDate, page, limit }
   */
  async getAuditLogs(params = {}) {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });

    const response = await api.get('/audit-logs', { params: searchParams });
    return response.data;
  }
};
