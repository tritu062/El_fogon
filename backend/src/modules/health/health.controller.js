const dbConfig = require('../../config/db');

/**
 * Retorna el estado de salud del servidor API y la base de datos PostgreSQL.
 */
async function getHealth(req, res, next) {
  try {
    // 💡 Consejo de Aprendizaje: Importamos el módulo completo como 'dbConfig'
    // y llamamos a 'checkDatabaseConnection' como propiedad del objeto.
    // Esto permite que Vitest intercepte la llamada mediante vi.spyOn en las pruebas.
    const isDbConnected = await dbConfig.checkDatabaseConnection();
    
    const status = isDbConnected ? 'UP' : 'DEGRADED';
    const statusCode = isDbConnected ? 200 : 503;

    return res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        api: 'UP',
        database: isDbConnected ? 'UP' : 'DOWN'
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth
};
