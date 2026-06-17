import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Catálogo de Menú (Fase 7)', () => {
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
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
  });

  describe('CATEGORÍAS', () => {
    describe('GET /api/categories', () => {
      it('debería retornar 401 si no hay token', async () => {
        const res = await request(app)
          .get('/api/categories')
          .set('x-skip-rate-limit', 'true');
        expect(res.status).toBe(401);
      });

      it('debería retornar las categorías activas si el usuario está autenticado', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
        vi.spyOn(prisma.category, 'findMany').mockResolvedValue([
          { id: 1, name: 'Corrientes', description: 'Platos tradicionales', deletedAt: null }
        ]);

        const res = await request(app)
          .get('/api/categories')
          .set('Authorization', `Bearer ${waiterToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.categories).toHaveLength(1);
        expect(res.body.categories[0].name).toBe('Corrientes');
      });
    });

    describe('POST /api/categories', () => {
      it('debería denegar acceso (403) si el usuario no es ADMINISTRADOR', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

        const res = await request(app)
          .post('/api/categories')
          .send({ name: 'Bebidas' })
          .set('Authorization', `Bearer ${waiterToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(403);
      });

      it('debería crear la categoría si los datos son válidos y es ADMINISTRADOR', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
        vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(null);
        vi.spyOn(prisma.category, 'create').mockResolvedValue({
          id: 4,
          name: 'Bebidas',
          description: 'Refrescos y jugos'
        });

        const res = await request(app)
          .post('/api/categories')
          .send({ name: 'Bebidas', description: 'Refrescos y jugos' })
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.category.name).toBe('Bebidas');
      });

      it('debería retornar 409 si el nombre de categoría ya existe', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
        vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({ id: 1, name: 'Bebidas' });

        const res = await request(app)
          .post('/api/categories')
          .send({ name: 'Bebidas' })
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(409);
      });
    });

    describe('DELETE /api/categories/:id', () => {
      it('debería impedir eliminar si tiene platos asociados', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
        vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({ id: 1, name: 'Corrientes' });
        vi.spyOn(prisma.item, 'count').mockResolvedValue(2); // Tiene 2 ítems activos

        const res = await request(app)
          .delete('/api/categories/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('contiene platos o bebidas');
      });

      it('debería realizar soft-delete si no tiene platos asociados', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
        vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({ id: 1, name: 'Vacía' });
        vi.spyOn(prisma.item, 'count').mockResolvedValue(0);
        vi.spyOn(prisma.category, 'update').mockResolvedValue({ id: 1, deletedAt: new Date() });

        const res = await request(app)
          .delete('/api/categories/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
      });
    });
  });

  describe('PLATOS Y BEBIDAS (ITEMS)', () => {
    describe('GET /api/items', () => {
      it('debería retornar los ítems activos', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
        vi.spyOn(prisma.item, 'findMany').mockResolvedValue([
          { id: 1, name: 'Sopa', price: 500, categoryId: 1, isAvailable: true, deletedAt: null }
        ]);

        const res = await request(app)
          .get('/api/items')
          .set('Authorization', `Bearer ${waiterToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].name).toBe('Sopa');
      });
    });

    describe('POST /api/items', () => {
      const newItem = {
        name: 'Carne Asada',
        description: 'Deliciosa carne',
        price: 2500,
        categoryId: 1,
        isAvailable: true,
        modifiers: [{ name: 'Término', options: ['3/4', 'Medio'] }]
      };

      it('debería crear el ítem con modificadores si es ADMINISTRADOR', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
        vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({ id: 1, name: 'Corrientes' });
        vi.spyOn(prisma.item, 'findFirst').mockResolvedValue(null);
        vi.spyOn(prisma.item, 'create').mockResolvedValue({ id: 10, ...newItem });

        const res = await request(app)
          .post('/api/items')
          .send(newItem)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.item.name).toBe('Carne Asada');
        expect(res.body.item.price).toBe(2500);
      });

      it('debería validar que la categoría exista', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
        vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(null); // No existe la categoría

        const res = await request(app)
          .post('/api/items')
          .send(newItem)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('La categoría seleccionada no existe');
      });
    });

    describe('PATCH /api/items/:id/availability', () => {
      it('debería actualizar la disponibilidad del plato', async () => {
        vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
        vi.spyOn(prisma.item, 'findFirst').mockResolvedValue({ id: 1, name: 'Sopa', isAvailable: true });
        vi.spyOn(prisma.item, 'update').mockResolvedValue({ id: 1, name: 'Sopa', isAvailable: false });

        const res = await request(app)
          .patch('/api/items/1/availability')
          .send({ isAvailable: false })
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(200);
        expect(res.body.item.isAvailable).toBe(false);
      });
    });
  });
});
