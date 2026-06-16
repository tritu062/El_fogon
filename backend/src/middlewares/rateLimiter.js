const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Middleware de control de flujo para limitar el número de peticiones.
 * Protege la API de ataques de denegación de servicio (DoS) o fuerza bruta.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  limit: 100, // Límite de 100 solicitudes por IP por ventana
  standardHeaders: 'draft-6', // Devuelve cabeceras estándar de límite de tasa
  legacyHeaders: false, // Oculta cabeceras heredadas X-RateLimit-*
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Has superado el límite de peticiones permitido (100 solicitudes cada 15 min). Intenta nuevamente más tarde.'
  },
  handler: (req, res, next, options) => {
    logger.warn(`⚠️ Rate Limiter excedido para la IP: ${req.ip} al intentar acceder a ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
  // Permite evadir el limiter en entornos de prueba si pasamos un header especial
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true'
});

module.exports = limiter;
