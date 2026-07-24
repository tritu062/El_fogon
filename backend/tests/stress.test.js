import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Carga Concurrente y Rendimiento (Fase 12)', () => {
  const adminToken = jwt.sign({ userId: 1 }, envConfig.JWT_ACCESS_SECRET);

  const mockAdmin = {
    id: 1,
    email: 'admin@elfogon.com',
    firstName: 'Admin',
    lastName: 'El Fogón',
    isActive: true,
    roles: [{ role: { name: 'ADMINISTRADOR', deletedAt: null } }]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(true);

    vi.spyOn(prisma.user, 'findFirst').mockImplementation(({ where }) => {
      if (where && where.id === 1) return Promise.resolve(mockAdmin);
      return Promise.resolve(null);
    });

    vi.spyOn(prisma.table, 'findMany').mockResolvedValue([
      { id: 1, number: 1, status: 'FREE', zoneId: 1, zone: { name: 'Salón' } }
    ]);
  });

  it('debería responder con éxito a 50 peticiones simultáneas sin bloqueo de event loop', async () => {
    const concurrentRequestsCount = 50;
    const startTime = Date.now();

    const requestPromises = Array.from({ length: concurrentRequestsCount }).map(() =>
      request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${adminToken}`)
    );

    const responses = await Promise.all(requestPromises);
    const duration = Date.now() - startTime;

    // Verificar que el 100% de las respuestas hayan sido exitosas (200) y entreguen mesas
    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.tables).toBeDefined();
    });

    // La ráfaga concurrente de 50 peticiones en memoria debe ejecutarse en menos de 2000ms
    expect(duration).toBeLessThan(2000);
  });
});
