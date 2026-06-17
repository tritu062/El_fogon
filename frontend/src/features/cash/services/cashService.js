import api from '../../../lib/api';

/**
 * Servicio para arqueos y control de la sesión de caja.
 */
export const cashService = {
  /**
   * Obtiene la sesión de caja activa del cajero logueado.
   * @returns {Promise<{ register: Object|null, stats: Object|null }>}
   */
  async getCurrentRegister() {
    const response = await api.get('/cash-registers/current');
    return {
      register: response.data.register,
      stats: response.data.stats || null
    };
  },

  /**
   * Abre la sesión de caja.
   * @param {Object} data - { openingBalance: number, notes: string }
   */
  async openRegister(data) {
    const response = await api.post('/cash-registers', data);
    return response.data.register;
  },

  /**
   * Cierra la sesión de caja.
   * @param {Object} data - { actualClosingBalance: number, notes: string }
   */
  async closeRegister(data) {
    const response = await api.post('/cash-registers/close', data);
    return response.data.register;
  },

  /**
   * Listar todas las sesiones de caja (Solo administradores).
   */
  async getAllRegisters() {
    const response = await api.get('/cash-registers');
    return response.data.registers;
  }
};
