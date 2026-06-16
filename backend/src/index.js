const app = require('./app');
const envConfig = require('./config/env');
const logger = require('./config/logger');

const PORT = envConfig.PORT;

// Iniciar la escucha del servidor HTTP
const server = app.listen(PORT, () => {
  logger.info(`🚀 [Servidor] Iniciado correctamente en modo: [${envConfig.NODE_ENV}]`);
  logger.info(`🚀 [Servidor] Escuchando peticiones en: http://localhost:${PORT}`);
});

// Manejo de cierres limpios del sistema (Graceful Shutdown)
process.on('SIGTERM', () => {
  logger.info('⚠️ Señal SIGTERM recibida. Cerrando servidor de forma limpia...');
  server.close(() => {
    logger.info('✅ Servidor HTTP cerrado.');
    process.exit(0);
  });
});
