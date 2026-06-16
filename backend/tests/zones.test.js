import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Gestión de Zonas (Fase 6)', () => {

  const adminToken = jwt.sign({ userId: 1 }, envConfig.JWT_ACCESS_SECRET);
  const waiterToken = jwt.sign({ userId: 2 }, envConfig.JWT_ACCESS_SECRET);

  const mockAdmin = {
    id: 1,
    email: 'admin@elfogon.com',
    isActive: true,
    roles: [{ role: { name: 'ADMINISTRADOR', deletedAt: null } }]
  };

  const mockWaiter = {
    id: 2,
    email: 'mesero@elfogon.com',
    isActive: true,
    roles: [{ role: { name: 'MESERO', deletedAt: null } }]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(true);
    vi.spyOn(prisma, '$transaction').mockImplementation((cb) => cb(prisma));

    // Mock por defecto para auditorías
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
  });

  describe('GET /api/zones - Listar Zonas', () => {
    it('debería retornar 401 si no se proporciona token', async () => {
      const res = await request(app)
        .get('/api/zones')
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(401);
    });

    it('debería listar zonas activas para cualquier usuario autenticado', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
      vi.spyOn(prisma.zone, 'findMany').mockResolvedValue([
        { id: 1, name: 'Salón Principal', description: 'Test', deletedAt: null }
      ]);

      const res = await request(app)
        .get('/api/zones')
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.zones).toHaveLength(1);
      expect(res.body.zones[0].name).toBe('Salón Principal');
    });
  });

  describe('POST /api/zones - Crear Zona', () => {
    const newZoneData = { name: 'Terraza', description: 'Zona abierta' };

    it('debería denegar acceso (403) si el rol no es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .post('/api/zones')
        .send(newZoneData)
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería permitir crear la zona si es ADMINISTRADOR y el nombre es único', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.zone, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.zone, 'create').mockResolvedValue({ id: 2, ...newZoneData });

      const res = await request(app)
        .post('/api/zones')
        .send(newZoneData)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.zone.name).toBe('Terraza');
    });

    it('debería retornar 409 si la zona ya existe y está activa', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.zone, 'findFirst').mockResolvedValue({ id: 1, name: 'Terraza' });

      const res = await request(app)
        .post('/api/zones')
        .send(newZoneData)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Ya existe una zona activa');
    });
  });

  describe('DELETE /api/zones/:id - Eliminar Zona', () => {
    it('debería denegar la eliminación si la zona tiene mesas activas vinculadas', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.zone, 'findFirst').mockResolvedValue({ id: 1, name: 'Salón' });
      vi.spyOn(prisma.table, 'count').mockResolvedValue(3); // 3 mesas activas

      const res = await request(app)
        .delete('/api/zones/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('contiene mesas activas');
    });

    it('debería eliminar lógicamente (soft-delete) la zona si no tiene mesas activas', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.zone, 'findFirst').mockResolvedValue({ id: 1, name: 'Salón' });
      vi.spyOn(prisma.table, 'count').mockResolvedValue(0); // 0 mesas
      vi.spyOn(prisma.zone, 'update').mockResolvedValue({ id: 1, name: 'Salón', deletedAt: new Date() });

      const res = await request(app)
        .delete('/api/zones/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('eliminada correctamente');
    });
  });
});
