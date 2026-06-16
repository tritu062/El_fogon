const dotenv = require('dotenv');
const { z } = require('zod');
const path = require('path');

// Cargamos variables desde el archivo .env local, si existe (en test process.env ya está poblado por setup.js)
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

// Definimos el esquema estricto de variables de entorno
const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL de PostgreSQL válida'),
  JWT_ACCESS_SECRET: z.string().min(12, 'JWT_ACCESS_SECRET debe tener al menos 12 caracteres por seguridad'),
  JWT_REFRESH_SECRET: z.string().min(12, 'JWT_REFRESH_SECRET debe tener al menos 12 caracteres por seguridad'),
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida')
});

// Validamos las variables cargadas
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Error de validación en las variables de entorno (.env):');
  console.error(JSON.stringify(result.error.format(), null, 2));
  process.exit(1); // Detener ejecución de inmediato
}

module.exports = result.data;
