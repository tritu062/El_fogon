// Configuración de entorno para entorno de pruebas (Vitest)
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/restaurante_el_fogon_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'secreto_de_prueba_access_token_123456';
process.env.JWT_REFRESH_SECRET = 'secreto_de_prueba_refresh_token_654321';
process.env.FRONTEND_URL = 'http://localhost:3000';
