import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Gestión de Mesas (Fase 6)', () => {

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

  describe('GET /api/tables - Listar Mesas', () => {
    it('debería retornar 401 si no se proporciona token', async () => {
      const res = await request(app)
        .get('/api/tables')
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(401);
    });

    it('debería listar mesas activas para cualquier usuario autenticado', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
      vi.spyOn(prisma.table, 'findMany').mockResolvedValue([
        { id: 1, number: 5, status: 'FREE', zoneId: 1, deletedAt: null }
      ]);

      const res = await request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.tables).toHaveLength(1);
      expect(res.body.tables[0].number).toBe(5);
    });
  });

  describe('POST /api/tables - Crear Mesa', () => {
    const newTableData = { number: 12, zoneId: 1 };

    it('debería denegar acceso (403) si el rol no es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .post('/api/tables')
        .send(newTableData)
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería crear la mesa si es ADMINISTRADOR, la zona existe y el número es único', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.zone, 'findFirst').mockResolvedValue({ id: 1, name: 'Salón Principal' });
      vi.spyOn(prisma.table, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.table, 'create').mockResolvedValue({ id: 1, ...newTableData, status: 'FREE' });

      const res = await request(app)
        .post('/api/tables')
        .send(newTableData)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.table.number).toBe(12);
    });

    it('debería retornar 400 si la zona asociada no existe o está inactiva', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.zone, 'findFirst').mockResolvedValue(null); // Zona no encontrada

      const res = await request(app)
        .post('/api/tables')
        .send(newTableData)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('La zona seleccionada no existe');
    });

    it('debería retornar 409 si el número de mesa ya está en uso y activo', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.zone, 'findFirst').mockResolvedValue({ id: 1, name: 'Salón Principal' });
      vi.spyOn(prisma.table, 'findFirst').mockResolvedValue({ id: 2, number: 12 });

      const res = await request(app)
        .post('/api/tables')
        .send(newTableData)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('ya está registrado y activo');
    });
  });

  describe('PATCH /api/tables/:id/status - Cambiar Estado de Mesa', () => {
    it('debería permitir cambiar el estado de mesa si el rol es MESERO', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
      vi.spyOn(prisma.table, 'findFirst').mockResolvedValue({ id: 3, number: 5, status: 'FREE' });
      vi.spyOn(prisma.table, 'update').mockResolvedValue({ id: 3, number: 5, status: 'OCCUPIED' });

      const res = await request(app)
        .patch('/api/tables/3/status')
        .send({ status: 'OCCUPIED' })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.table.status).toBe('OCCUPIED');
    });

    it('debería retornar 400 si se envía un estado de mesa inválido', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .patch('/api/tables/3/status')
        .send({ status: 'INVALID_STATUS' })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/tables/:id - Eliminar Mesa', () => {
    it('debería permitir soft-delete si el rol es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.table, 'findFirst').mockResolvedValue({ id: 3, number: 5, status: 'FREE' });
      vi.spyOn(prisma.table, 'update').mockResolvedValue({ id: 3, number: 5, deletedAt: new Date() });

      const res = await request(app)
        .delete('/api/tables/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('eliminada correctamente');
    });
  });
});
