const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const envConfig = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const limiter = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');

// Importar rutas
const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const zoneRoutes = require('./modules/zones/zones.routes');
const tableRoutes = require('./modules/tables/tables.routes');
const catalogRoutes = require('./modules/catalog/catalog.routes');
const orderRoutes = require('./modules/orders/orders.routes');
const cashRoutes = require('./modules/cash/cash.routes');
const billRoutes = require('./modules/bills/bills.routes');
const userRoutes = require('./modules/users/users.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const inventoryRoutes = require('./modules/inventory/inventoryRoutes');

const app = express();

// Habilitar trust proxy para rate limiting e IPs de auditoría correctas en entornos con proxy inverso
app.set('trust proxy', 1);

// 1. Configuración de Seguridad y CORS
app.use(cors({
  origin: envConfig.FRONTEND_URL,
  credentials: true // Necesario para que el cliente lea cookies httpOnly
}));

// 2. Parsers de Datos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. Middlewares de Auditoría y Control de Flujo
app.use(requestLogger);
app.use(limiter);

// 4. Servicio de Archivos Estáticos (Fotos de platos, recibos, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 5. Registro de Rutas (Prefixadas con /api para consistencia)
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cash-registers', cashRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/inventory', inventoryRoutes);

// 6. Middleware para atrapar solicitudes a rutas inexistentes (404)
app.use((req, res, next) => {
  const error = new Error(`La ruta solicitada no existe: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// 7. Manejador de Errores Centralizado (Siempre al final de la pila)
app.use(errorHandler);

module.exports = app;
