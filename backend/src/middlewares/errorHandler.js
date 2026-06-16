const logger = require('../config/logger');
const envConfig = require('../config/env');

/**
 * Middleware centralizado de gestión de errores.
 * Captura cualquier excepción no controlada en la pila HTTP y responde de manera uniforme.
 */
function errorHandler(err, req, res, next) {
  // Registrar el error detalladamente con Winston
  logger.error(`💥 [ErrorHandler] ${req.method} ${req.originalUrl} - Error: ${err.message}`, {
    stack: err.stack,
    ip: req.ip
  });

  const statusCode = err.statusCode || 500;
  const isProduction = envConfig.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: isProduction && statusCode === 500 
      ? 'Ocurrió un error interno en el servidor. Por favor, contacte al administrador.' 
      : err.message,
    // El stack de errores solo se expone en desarrollo o pruebas para facilitar el debug
    stack: !isProduction ? err.stack : undefined
  });
}

module.exports = errorHandler;
