const logger = require('../config/logger');

/**
 * Middleware para auditar solicitudes HTTP entrantes en Winston.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Escuchamos el evento 'finish' para registrar el log una vez se ha enviado la respuesta al cliente
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    // Registramos en nivel HTTP o INFO
    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms - IP: ${ip}`);
  });

  next();
}

module.exports = requestLogger;
