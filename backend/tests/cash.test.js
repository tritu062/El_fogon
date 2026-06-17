import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Gestión de Caja (Fase 9)', () => {
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

  describe('POST /api/cash-registers - Apertura de Caja', () => {
    it('debería denegar acceso si no está autenticado', async () => {
      const res = await request(app)
        .post('/api/cash-registers')
        .send({ openingBalance: 5000 })
        .set('x-skip-rate-limit', 'true');
      expect(res.status).toBe(401);
    });

    it('debería denegar acceso si el rol no es CAJERO o ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .post('/api/cash-registers')
        .send({ openingBalance: 5000 })
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
    });

    it('debería abrir la caja correctamente', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue(null);
      
      const mockCreated = { id: 1, cashierId: 4, openingBalance: 15000, status: 'OPEN' };
      const createSpy = vi.spyOn(prisma.cashRegister, 'create').mockResolvedValue(mockCreated);

      const res = await request(app)
        .post('/api/cash-registers')
        .send({ openingBalance: 15000, notes: 'Turno mañana' })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.register.openingBalance).toBe(15000);
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          cashierId: 4,
          openingBalance: 15000,
          notes: 'Turno mañana',
          status: 'OPEN'
        }
      });
    });

    it('debería rebotar si ya existe una caja abierta para el cajero', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 1, cashierId: 4, status: 'OPEN' });

      const res = await request(app)
        .post('/api/cash-registers')
        .send({ openingBalance: 10000 })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ya tienes una sesión de caja abierta activa');
    });
  });

  describe('GET /api/cash-registers/current - Consultar Caja Abierta', () => {
    it('debería retornar null si no hay caja abierta', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/cash-registers/current')
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.register).toBeNull();
    });

    it('debería retornar estadísticas de la caja activa', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 2, cashierId: 4, openingBalance: 10000, status: 'OPEN' });

      const mockBills = [
        {
          id: 1,
          total: 8000,
          payments: [
            { amount: 5000, method: 'EFECTIVO' },
            { amount: 3000, method: 'TARJETA' }
          ]
        }
      ];
      vi.spyOn(prisma.bill, 'findMany').mockResolvedValue(mockBills);

      const res = await request(app)
        .get('/api/cash-registers/current')
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.register.id).toBe(2);
      expect(res.body.stats.totalSales).toBe(8000);
      expect(res.body.stats.cashPayments).toBe(5000);
      expect(res.body.stats.cardPayments).toBe(3000);
      expect(res.body.stats.expectedClosingBalance).toBe(15000);
    });
  });

  describe('POST /api/cash-registers/close - Cierre de Caja', () => {
    it('debería calcular discrepancia y cerrar la caja', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockCashier);
      vi.spyOn(prisma.cashRegister, 'findFirst').mockResolvedValue({ id: 2, cashierId: 4, openingBalance: 10000, status: 'OPEN' });
      vi.spyOn(prisma.bill, 'findMany').mockResolvedValue([
        { id: 1, total: 5000, payments: [{ amount: 5000, method: 'EFECTIVO' }] }
      ]);

      const updateSpy = vi.spyOn(prisma.cashRegister, 'update').mockResolvedValue({
        id: 2,
        status: 'CLOSED',
        expectedClosingBalance: 15000,
        actualClosingBalance: 14800,
        discrepancy: -200
      });

      const res = await request(app)
        .post('/api/cash-registers/close')
        .send({ actualClosingBalance: 14800, notes: 'Faltó cambio de 2 pesos' })
        .set('Authorization', `Bearer ${cashierToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.register.status).toBe('CLOSED');
      expect(res.body.register.discrepancy).toBe(-200);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 2 },
        data: expect.objectContaining({
          status: 'CLOSED',
          expectedClosingBalance: 15000,
          actualClosingBalance: 14800,
          discrepancy: -200
        })
      });
    });
  });
});
