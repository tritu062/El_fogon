import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Módulo de Inventario y Consumo Diario (Fase 10)', () => {
  const adminToken = jwt.sign({ userId: 1 }, envConfig.JWT_ACCESS_SECRET);
  const waiterToken = jwt.sign({ userId: 2 }, envConfig.JWT_ACCESS_SECRET);

  const mockAdmin = {
    id: 1,
    email: 'admin@elfogon.com',
    firstName: 'Admin',
    lastName: 'El Fogón',
    isActive: true,
    roles: [{ role: { name: 'ADMINISTRADOR', deletedAt: null } }]
  };

  const mockWaiter = {
    id: 2,
    email: 'waiter@elfogon.com',
    firstName: 'Mesero',
    lastName: 'El Fogón',
    isActive: true,
    roles: [{ role: { name: 'MESERO', deletedAt: null } }]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(true);
    vi.spyOn(prisma, '$transaction').mockImplementation((cb) => cb(prisma));

    vi.spyOn(prisma.user, 'findFirst').mockImplementation(({ where }) => {
      if (where && where.id === 1) return Promise.resolve(mockAdmin);
      if (where && where.id === 2) return Promise.resolve(mockWaiter);
      return Promise.resolve(null);
    });
  });

  describe('GET /api/inventory/ingredients - Listar Insumos', () => {
    it('debería denegar el acceso (401) si no hay token de autenticación', async () => {
      const res = await request(app).get('/api/inventory/ingredients');
      expect(res.status).toBe(401);
    });

    it('debería denegar el acceso (403) si el rol no es ADMINISTRADOR', async () => {
      const res = await request(app)
        .get('/api/inventory/ingredients')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(403);
    });

    it('debería retornar 200 con la lista de insumos y sus estados de alerta si es ADMINISTRADOR', async () => {
      const mockIngredients = [
        { id: 1, name: 'Lomo de Res', category: 'CARNES', unit: 'KG', currentStock: 20, minStock: 5, unitCost: 2800, deletedAt: null },
        { id: 2, name: 'Tomate Chonto', category: 'VERDURAS', unit: 'KG', currentStock: 2, minStock: 5, unitCost: 300, deletedAt: null }
      ];

      vi.spyOn(prisma.ingredient, 'findMany').mockResolvedValue(mockIngredients);

      const res = await request(app)
        .get('/api/inventory/ingredients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].status).toBe('OK');
      expect(res.body.data[1].status).toBe('WARNING');
    });
  });

  describe('POST /api/inventory/ingredients - Crear Insumo', () => {
    it('debería crear un nuevo insumo si los datos son válidos', async () => {
      const newIngredient = {
        name: 'Aceite de Oliva',
        category: 'ABARROTES',
        unit: 'LITROS',
        currentStock: 10,
        minStock: 2,
        unitCost: 1200
      };

      vi.spyOn(prisma.ingredient, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.ingredient, 'create').mockResolvedValue({ id: 3, ...newIngredient, createdAt: new Date() });

      const res = await request(app)
        .post('/api/inventory/ingredients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newIngredient);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Aceite de Oliva');
    });

    it('debería rebotar con 409 si el nombre del insumo ya existe', async () => {
      vi.spyOn(prisma.ingredient, 'findFirst').mockResolvedValue({ id: 1, name: 'Lomo de Res' });

      const res = await request(app)
        .post('/api/inventory/ingredients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Lomo de Res',
          category: 'CARNES',
          unit: 'KG',
          currentStock: 10,
          minStock: 2,
          unitCost: 2800
        });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/inventory/movements - Registrar Compra / Movimiento', () => {
    it('debería incrementar el stock al registrar una compra de mercancía', async () => {
      const mockIngredient = {
        id: 1,
        name: 'Lomo de Res',
        category: 'CARNES',
        unit: 'KG',
        currentStock: 10,
        minStock: 5,
        unitCost: 2800
      };

      vi.spyOn(prisma.ingredient, 'findFirst').mockResolvedValue(mockIngredient);
      vi.spyOn(prisma.ingredient, 'update').mockResolvedValue({ ...mockIngredient, currentStock: 25 });
      vi.spyOn(prisma.inventoryMovement, 'create').mockResolvedValue({
        id: 101,
        ingredientId: 1,
        registeredById: 1,
        type: 'PURCHASE',
        quantity: 15,
        unitCost: 2800,
        totalCost: 42000,
        notes: 'Compra semanal',
        ingredient: mockIngredient,
        registeredBy: { id: 1, firstName: 'Admin', lastName: 'El Fogón' }
      });

      const res = await request(app)
        .post('/api/inventory/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ingredientId: 1,
          type: 'PURCHASE',
          quantity: 15,
          notes: 'Compra semanal'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.type).toBe('PURCHASE');
    });
  });

  describe('POST /api/inventory/daily-consumption - Registro Masivo de Consumo Diario', () => {
    it('debería procesar el consumo diario de múltiples insumos al cierre del turno', async () => {
      vi.spyOn(prisma.ingredient, 'findFirst').mockImplementation(({ where }) => {
        if (where && where.id === 1) return Promise.resolve({ id: 1, name: 'Lomo de Res', currentStock: 20, unitCost: 2800 });
        if (where && where.id === 2) return Promise.resolve({ id: 2, name: 'Arroz Blanco', currentStock: 30, unitCost: 350 });
        return Promise.resolve(null);
      });
      vi.spyOn(prisma.ingredient, 'update').mockResolvedValue({});
      vi.spyOn(prisma.inventoryMovement, 'create').mockResolvedValue({ id: 200, type: 'DAILY_CONSUMPTION' });

      const res = await request(app)
        .post('/api/inventory/daily-consumption')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { ingredientId: 1, quantity: 5.5, notes: 'Consumo almuerzo' },
            { ingredientId: 2, quantity: 8.0, notes: 'Consumo almuerzo' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);
    });
  });
});
