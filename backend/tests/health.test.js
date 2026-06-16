import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const app = require('../src/app');
const dbConfig = require('../src/config/db');

describe('Suite de Pruebas: Health Check & Middlewares', () => {
  
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health - Estado del Sistema', () => {
    
    it('debería responder con status 200 y estado UP si la BD está conectada', async () => {
      vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(true);

      const res = await request(app)
        .get('/api/health')
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.services.api).toBe('UP');
      expect(res.body.services.database).toBe('UP');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('debería responder con status 503 y estado DEGRADED si la BD falla', async () => {
      vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(false);

      const res = await request(app)
        .get('/api/health')
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('DEGRADED');
      expect(res.body.services.api).toBe('UP');
      expect(res.body.services.database).toBe('DOWN');
    });
  });

  describe('Manejo de Errores 404', () => {
    
    it('debería retornar un error JSON con código 404 al acceder a una ruta inexistente', async () => {
      const res = await request(app)
        .get('/api/ruta-fantasma-inexistente')
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body.message).toContain('La ruta solicitada no existe');
    });
  });

  describe('Middleware: Rate Limiting', () => {
    
    it('debería bloquear solicitudes excesivas (retornar 429) al superar el límite', async () => {
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(request(app).get('/api/health'));
      }
      
      await Promise.all(requests);

      const blockedRes = await request(app).get('/api/health');

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body).toHaveProperty('status', 429);
      expect(blockedRes.body).toHaveProperty('error', 'Too Many Requests');
      expect(blockedRes.body.message).toContain('Has superado el límite');
    });
  });
});
