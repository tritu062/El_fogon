import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Gestión de Pedidos (Fase 7)', () => {
  const adminToken = jwt.sign({ userId: 1 }, envConfig.JWT_ACCESS_SECRET);
  const waiterToken = jwt.sign({ userId: 2 }, envConfig.JWT_ACCESS_SECRET);
  const cookToken = jwt.sign({ userId: 3 }, envConfig.JWT_ACCESS_SECRET);
  const cashierToken = jwt.sign({ userId: 4 }, envConfig.JWT_ACCESS_SECRET);

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

  const mockCook = {
    id: 3,
    email: 'cocinero@elfogon.com',
    isActive: true,
    roles: [{ role: { name: 'COCINERO', deletedAt: null } }]
  };

  const mockCashier = {
    id: 4,
    email: 'cajero@elfogon.com',
    isActive: true,
    roles: [{ role: { name: 'CAJERO', deletedAt: null } }]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(true);
    vi.spyOn(prisma, '$transaction').mockImplementation((cb) => cb(prisma));
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
  });

  describe('POST /api/orders - Crear Pedido', () => {
    it('debería denegar acceso si no está autenticado', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [] })
        .set('x-skip-rate-limit', 'true');
      expect(res.status).toBe(401);
    });

    it('debería denegar acceso si el rol no es MESERO o ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCook);

      const res = await request(app)
        .post('/api/orders')
        .send({ items: [{ itemId: 1, quantity: 1 }] })
        .set('Authorization', `Bearer ${cookToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería crear el pedido con mesa asignada y cambiar el estado de la mesa a OCCUPIED', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
      vi.spyOn(prisma.table, 'findFirst').mockResolvedValue({ id: 5, number: 5, status: 'FREE' });
      vi.spyOn(prisma.item, 'findFirst').mockResolvedValue({ id: 1, name: 'Sopa', price: 650, isAvailable: true });
      
      const mockOrder = {
        id: 12,
        status: 'PENDING',
        tableId: 5,
        waiterId: 2,
        total: 1300
      };

      vi.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder);
      const updateTableSpy = vi.spyOn(prisma.table, 'update').mockResolvedValue({});

      const res = await request(app)
        .post('/api/orders')
        .send({
          tableId: 5,
          items: [{ itemId: 1, quantity: 2, notes: 'Sin sal' }]
        })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.order.total).toBe(1300);
      expect(updateTableSpy).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'OCCUPIED' }
      });
    });

    it('debería rebotar si un plato solicitado no está disponible (isAvailable: false)', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
      vi.spyOn(prisma.table, 'findFirst').mockResolvedValue({ id: 5, number: 5 });
      vi.spyOn(prisma.item, 'findFirst').mockResolvedValue({ id: 1, name: 'Sopa', price: 650, isAvailable: false });

      const res = await request(app)
        .post('/api/orders')
        .send({
          tableId: 5,
          items: [{ itemId: 1, quantity: 1 }]
        })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('no está disponible actualmente');
    });
  });

  describe('PATCH /api/orders/:id/items - Adicionar ítems a comanda', () => {
    it('debería agregar nuevos ítems y actualizar el total acumulado', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
      
      const existingOrder = { id: 12, status: 'PENDING', total: 1300, tableId: 5 };
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(existingOrder);
      vi.spyOn(prisma.item, 'findFirst').mockResolvedValue({ id: 2, name: 'Jugo', price: 350, isAvailable: true });
      
      const createManySpy = vi.spyOn(prisma.orderItem, 'createMany').mockResolvedValue({});
      const updateOrderSpy = vi.spyOn(prisma.order, 'update').mockResolvedValue({
        id: 12,
        total: 2000 // 1300 + (350 * 2)
      });

      const res = await request(app)
        .patch('/api/orders/12/items')
        .send({
          items: [{ itemId: 2, quantity: 2 }]
        })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.order.total).toBe(2000);
      expect(createManySpy).toHaveBeenCalled();
      expect(updateOrderSpy).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 12 },
        data: { total: 2000 }
      }));
    });

    it('debería denegar si el pedido ya está pagado', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);
      
      const existingOrder = { id: 12, status: 'PAID', total: 1300, tableId: 5 };
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(existingOrder);

      const res = await request(app)
        .patch('/api/orders/12/items')
        .send({
          items: [{ itemId: 2, quantity: 2 }]
        })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No se pueden adicionar ítems a un pedido pagado');
    });
  });

  describe('PATCH /api/orders/:id/status - Cambiar Estado (RBAC)', () => {
    it('debería permitir marcar READY a un COCINERO, MESERO o ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCook);
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue({ id: 12, status: 'PENDING', tableId: 5 });
      vi.spyOn(prisma.order, 'update').mockResolvedValue({ id: 12, status: 'READY' });

      const res = await request(app)
        .patch('/api/orders/12/status')
        .send({ status: 'READY' })
        .set('Authorization', `Bearer ${cookToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('READY');
    });

    it('debería denegar marcar READY si el usuario es un CAJERO', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);

      const res = await request(app)
        .patch('/api/orders/12/status')
        .send({ status: 'READY' })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería permitir marcar PAID a un CAJERO y liberar la mesa si no hay más pedidos activos', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue({ id: 12, status: 'READY', tableId: 5 });
      vi.spyOn(prisma.order, 'update').mockResolvedValue({ id: 12, status: 'PAID' });
      vi.spyOn(prisma.order, 'count').mockResolvedValue(0); // 0 otros activos
      
      const updateTableSpy = vi.spyOn(prisma.table, 'update').mockResolvedValue({});

      const res = await request(app)
        .patch('/api/orders/12/status')
        .send({ status: 'PAID' })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('PAID');
      expect(updateTableSpy).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'FREE' }
      });
    });

    it('debería denegar la cancelación (CANCELLED) si el usuario es un MESERO', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .patch('/api/orders/12/status')
        .send({ status: 'CANCELLED' })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería permitir la cancelación (CANCELLED) a un ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue({ id: 12, status: 'PENDING', tableId: 5 });
      vi.spyOn(prisma.order, 'update').mockResolvedValue({ id: 12, status: 'CANCELLED' });
      vi.spyOn(prisma.order, 'count').mockResolvedValue(0); // 0 otros activos
      
      const updateTableSpy = vi.spyOn(prisma.table, 'update').mockResolvedValue({});

      const res = await request(app)
        .patch('/api/orders/12/status')
        .send({ status: 'CANCELLED' })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('CANCELLED');
      expect(updateTableSpy).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'FREE' }
      });
    });
  });

  describe('GET /api/orders/kitchen - KDS de Cocina', () => {
    it('debería denegar acceso si no está autenticado', async () => {
      const res = await request(app)
        .get('/api/orders/kitchen')
        .set('x-skip-rate-limit', 'true');
      expect(res.status).toBe(401);
    });

    it('debería denegar acceso si el rol no es COCINERO o ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .get('/api/orders/kitchen')
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería retornar las comandas pendientes y listas del día', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCook);

      const mockPendingOrders = [
        { id: 10, status: 'PENDING', total: 1500, createdAt: new Date() }
      ];
      const mockReadyOrders = [
        { id: 9, status: 'READY', total: 2000, updatedAt: new Date() }
      ];

      // findMany se llama dos veces en Promise.all
      const findManySpy = vi.spyOn(prisma.order, 'findMany')
        .mockResolvedValueOnce(mockPendingOrders)
        .mockResolvedValueOnce(mockReadyOrders);

      const res = await request(app)
        .get('/api/orders/kitchen')
        .set('Authorization', `Bearer ${cookToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.pending).toHaveLength(1);
      expect(res.body.ready).toHaveLength(1);
      expect(res.body.pending[0].id).toBe(10);
      expect(res.body.ready[0].id).toBe(9);
      expect(findManySpy).toHaveBeenCalledTimes(2);
    });
  });
});
