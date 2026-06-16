const winston = require('winston');
const envConfig = require('./env');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Definimos el formato de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  envConfig.NODE_ENV === 'development'
    ? winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
        )
      )
    : winston.format.json() // Formato estructurado JSON en producción
);

const transports = [
  new winston.transports.Console()
];

const logger = winston.createLogger({
  level: envConfig.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format: logFormat,
  transports,
});

module.exports = logger;
