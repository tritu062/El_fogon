import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Facturación y Cobros (Fase 9)', () => {
  const adminToken = jwt.sign({ userId: 1 }, envConfig.JWT_ACCESS_SECRET);
  const waiterToken = jwt.sign({ userId: 2 }, envConfig.JWT_ACCESS_SECRET);
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

  describe('POST /api/bills - Registrar Factura / Cobro', () => {
    it('debería denegar acceso si no está autenticado', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({ orderId: 10, payments: [] })
        .set('x-skip-rate-limit', 'true');
      expect(res.status).toBe(401);
    });

    it('debería denegar acceso si el rol no es CAJERO o ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .post('/api/bills')
        .send({ orderId: 10, payments: [] })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería rebotar si el cajero no tiene una caja abierta', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue(null); // No active register

      const res = await request(app)
        .post('/api/bills')
        .send({
          orderId: 10,
          payments: [{ amount: 5000, method: 'EFECTIVO' }]
        })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Debe abrir una sesión de caja antes');
    });

    it('debería rebotar si el pedido no existe', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 1, cashierId: 4, status: 'OPEN' });
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/bills')
        .send({
          orderId: 99,
          payments: [{ amount: 5000, method: 'EFECTIVO' }]
        })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('El pedido solicitado no existe');
    });

    it('debería rebotar si el monto total de los pagos no coincide con el total calculado', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 1, cashierId: 4, status: 'OPEN' });
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue({ id: 10, total: 10000, status: 'READY', tableId: null });

      const res = await request(app)
        .post('/api/bills')
        .send({
          orderId: 10,
          discount: 1000, // Total esperado: 10000 - 1000 = 9000
          tax: 0,
          payments: [{ amount: 5000, method: 'EFECTIVO' }] // Pago enviado: 5000 (mismatch)
        })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('El monto ingresado en los pagos no coincide');
    });

    it('debería registrar el cobro, cambiar comanda a PAID, y liberar la mesa', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 1, cashierId: 4, status: 'OPEN' });
      vi.spyOn(prisma.order, 'findFirst').mockResolvedValue({ id: 10, total: 10000, status: 'READY', tableId: 5 });
      vi.spyOn(prisma.bill, 'count').mockResolvedValue(0); // Primera factura del día
      
      const billMock = {
        id: 1,
        orderId: 10,
        cashierId: 4,
        cashRegisterId: 1,
        subtotal: 10000,
        tax: 0,
        discount: 0,
        total: 10000,
        invoiceNumber: 'FAC-20260617-0001',
        payments: [{ id: 1, amount: 10000, method: 'EFECTIVO' }]
      };

      const createSpy = vi.spyOn(prisma.bill, 'create').mockResolvedValue(billMock);
      const updateOrderSpy = vi.spyOn(prisma.order, 'update').mockResolvedValue({});
      vi.spyOn(prisma.order, 'count').mockResolvedValue(0); // Ninguna otra activa en mesa 5
      const updateTableSpy = vi.spyOn(prisma.table, 'update').mockResolvedValue({});

      const res = await request(app)
        .post('/api/bills')
        .send({
          orderId: 10,
          payments: [{ amount: 10000, method: 'EFECTIVO' }]
        })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.bill.invoiceNumber).toBe('FAC-20260617-0001');
      
      expect(createSpy).toHaveBeenCalled();
      expect(updateOrderSpy).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'PAID' }
      });
      expect(updateTableSpy).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'FREE' }
      });
    });
  });
});
