import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Módulo de Reportes y Analíticas Ejecutivas (Fase 11)', () => {
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

    vi.spyOn(prisma.user, 'findFirst').mockImplementation(({ where }) => {
      if (where && where.id === 1) return Promise.resolve(mockAdmin);
      if (where && where.id === 2) return Promise.resolve(mockWaiter);
      return Promise.resolve(null);
    });
  });

  describe('GET /api/reports/dashboard - Métricas Ejecutivas', () => {
    it('debería denegar acceso (401) si no está autenticado', async () => {
      const res = await request(app).get('/api/reports/dashboard');
      expect(res.status).toBe(401);
    });

    it('debería denegar acceso (403) si el usuario no es ADMINISTRADOR', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(403);
    });

    it('debería calcular correctamente KPIs, desglose de pagos y horas pico para el ADMINISTRADOR', async () => {
      const mockBills = [
        {
          id: 1,
          total: 10000, // $100.00
          createdAt: new Date('2026-07-24T12:30:00Z'),
          payments: [{ method: 'EFECTIVO', amount: 10000 }]
        },
        {
          id: 2,
          total: 20000, // $200.00
          createdAt: new Date('2026-07-24T14:15:00Z'),
          payments: [{ method: 'TARJETA', amount: 20000 }]
        }
      ];

      const mockOrderItems = [
        {
          id: 1,
          quantity: 3,
          price: 1800,
          itemId: 10,
          item: { id: 10, name: 'Bandeja Paisa', price: 1800, categoryId: 1, category: { name: 'Especiales' } }
        }
      ];

      vi.spyOn(prisma.bill, 'findMany').mockResolvedValue(mockBills);
      vi.spyOn(prisma.order, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.orderItem, 'findMany').mockResolvedValue(mockOrderItems);
      vi.spyOn(prisma.order, 'findMany').mockResolvedValue([
        { createdAt: new Date('2026-07-24T12:30:00Z') },
        { createdAt: new Date('2026-07-24T14:15:00Z') }
      ]);

      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.kpis.totalSales).toBe(30000);
      expect(res.body.data.kpis.totalBillsCount).toBe(2);
      expect(res.body.data.kpis.averageTicket).toBe(15000);
      expect(res.body.data.paymentBreakdown.EFECTIVO).toBe(10000);
      expect(res.body.data.paymentBreakdown.TARJETA).toBe(20000);
      expect(res.body.data.topItems.length).toBe(1);
      expect(res.body.data.topItems[0].name).toBe('Bandeja Paisa');
    });
  });
});
