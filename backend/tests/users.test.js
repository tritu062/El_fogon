import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Gestión de Usuarios y Auditoría (Fase 1 - Admin)', () => {
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
    email: 'waiter@elfogon.com',
    isActive: true,
    roles: [{ role: { name: 'MESERO', deletedAt: null } }]
  };

  const mockUserToEdit = {
    id: 3,
    email: 'user3@elfogon.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    isActive: true,
    roles: [{ role: { name: 'MESERO', deletedAt: null } }]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(true);
    vi.spyOn(prisma, '$transaction').mockImplementation((cb) => cb(prisma));
    
    // Mock general para logs de auditoría
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
  });

  describe('GET /api/users - Listar Usuarios', () => {
    it('debería retornar 401 si no se provee token', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(401);
    });

    it('debería retornar 403 si el rol no es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería retornar 200 con el listado si es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([mockAdmin, mockWaiter]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users[0].roles).toContain('ADMINISTRADOR');
    });
  });

  describe('GET /api/users/:id - Detalle de Usuario', () => {
    it('debería retornar 404 si el usuario no existe', async () => {
      vi.spyOn(prisma.user, 'findFirst')
        // Primera llamada en middleware authenticate (mock admin)
        .mockResolvedValueOnce(mockAdmin)
        // Segunda llamada en el controlador (no encuentra usuario)
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/users/99')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(404);
    });

    it('debería retornar 200 con los datos de usuario si existe', async () => {
      vi.spyOn(prisma.user, 'findFirst')
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUserToEdit);

      const res = await request(app)
        .get('/api/users/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.firstName).toBe('Juan');
      expect(res.body.user.roles).toContain('MESERO');
    });
  });

  describe('PUT /api/users/:id - Actualizar Usuario', () => {
    const updatePayload = {
      firstName: 'Juan Modificado',
      lastName: 'Pérez Modificado',
      roles: ['MESERO', 'CAJERO'],
      isActive: true
    };

    it('debería retornar 400 si la validación falla (ej. sin roles)', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);

      const res = await request(app)
        .put('/api/users/3')
        .send({ ...updatePayload, roles: [] })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('debería retornar 400 si se intenta desactivar un usuario con caja abierta', async () => {
      vi.spyOn(prisma.user, 'findFirst')
        .mockResolvedValueOnce(mockAdmin) // authenticate
        .mockResolvedValueOnce(mockUserToEdit); // controller

      // Simular que tiene una caja abierta
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 10, status: 'OPEN' });

      const res = await request(app)
        .put('/api/users/3')
        .send({ ...updatePayload, isActive: false })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('caja abierta');
    });

    it('debería actualizar con éxito si los datos son válidos', async () => {
      vi.spyOn(prisma.user, 'findFirst')
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUserToEdit);

      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.role, 'findMany').mockResolvedValue([
        { id: 2, name: 'MESERO' },
        { id: 4, name: 'CAJERO' }
      ]);
      vi.spyOn(prisma.userRole, 'deleteMany').mockResolvedValue({});
      vi.spyOn(prisma.userRole, 'createMany').mockResolvedValue({});
      
      const mockUpdatedUser = {
        ...mockUserToEdit,
        firstName: updatePayload.firstName,
        lastName: updatePayload.lastName,
        roles: [
          { role: { name: 'MESERO', deletedAt: null } },
          { role: { name: 'CAJERO', deletedAt: null } }
        ]
      };
      vi.spyOn(prisma.user, 'update').mockResolvedValue(mockUpdatedUser);

      const res = await request(app)
        .put('/api/users/3')
        .send(updatePayload)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.firstName).toBe('Juan Modificado');
      expect(res.body.user.roles).toContain('CAJERO');
    });
  });

  describe('DELETE /api/users/:id - Eliminar Usuario (Soft Delete)', () => {
    it('debería retornar 400 si un Administrador intenta autoeliminarse', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);

      const res = await request(app)
        .delete('/api/users/1') // admin ID is 1
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No puedes eliminar tu propia cuenta');
    });

    it('debería retornar 400 si se intenta eliminar un usuario con caja abierta', async () => {
      vi.spyOn(prisma.user, 'findFirst')
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUserToEdit);

      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 10, status: 'OPEN' });

      const res = await request(app)
        .delete('/api/users/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('caja abierta');
    });

    it('debería eliminar lógicamente al usuario si es válido', async () => {
      vi.spyOn(prisma.user, 'findFirst')
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUserToEdit);

      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({});
      vi.spyOn(prisma.userRole, 'updateMany').mockResolvedValue({});

      const res = await request(app)
        .delete('/api/users/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('éxito');
    });
  });

  describe('GET /api/audit-logs - Visor de Logs', () => {
    it('debería retornar 403 si el rol no es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería retornar 200 con la auditoría si es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.auditLog, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([
        {
          id: 100,
          userId: 1,
          action: 'ELIMINAR_USUARIO',
          description: 'Se eliminó al usuario ID 3',
          ipAddress: '::1',
          createdAt: new Date(),
          user: {
            id: 1,
            email: 'admin@elfogon.com',
            firstName: 'Admin',
            lastName: 'El Fogón'
          }
        }
      ]);

      const res = await request(app)
        .get('/api/audit-logs')
        .query({ action: 'ELIMINAR_USUARIO' })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.total).toBe(1);
      expect(res.body.logs[0].action).toBe('ELIMINAR_USUARIO');
    });
  });
});
