const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const envConfig = require('./env');

// Configuramos los niveles de logging de Prisma
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

// Si estamos en desarrollo, interceptamos las consultas y las enviamos a Winston
if (envConfig.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`[Prisma Query] ${e.query} - Params: ${e.params} - Duración: ${e.duration}ms`);
  });
}

/**
 * Realiza una consulta rápida 'SELECT 1' para comprobar el estado de conexión del pool.
 * @returns {Promise<boolean>} True si la base de datos responde correctamente.
 */
async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('❌ Error de conexión al pool de base de datos PostgreSQL:', error);
    return false;
  }
}

module.exports = {
  prisma,
  checkDatabaseConnection
};
