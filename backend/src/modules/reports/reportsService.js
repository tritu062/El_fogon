const { prisma } = require('../../config/db');

/**
 * Servicio de procesamiento de consultas agregadas y métricas ejecutivas.
 */
async function getDashboardSummary({ startDate, endDate } = {}) {
  // Construir filtro por rango de fechas
  const dateFilter = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    // Extender endDate al final del día
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  const billWhere = { deletedAt: null };
  const orderWhere = { deletedAt: null };

  if (startDate || endDate) {
    billWhere.createdAt = dateFilter;
    orderWhere.createdAt = dateFilter;
  }

  // 1. Total Ventas y Facturas emitidas
  const bills = await prisma.bill.findMany({
    where: billWhere,
    include: {
      payments: true
    }
  });

  const totalSales = bills.reduce((sum, b) => sum + b.total, 0);
  const totalBillsCount = bills.length;
  const averageTicket = totalBillsCount > 0 ? Math.round(totalSales / totalBillsCount) : 0;

  // 2. Total Pedidos atendidos
  const totalOrdersCount = await prisma.order.count({
    where: orderWhere
  });

  // 3. Desglose de Métodos de Pago (Efectivo, Tarjeta, Transferencia)
  const paymentBreakdown = {
    EFECTIVO: 0,
    TARJETA: 0,
    TRANSFERENCIA: 0
  };

  bills.forEach((bill) => {
    bill.payments.forEach((p) => {
      if (paymentBreakdown[p.method] !== undefined) {
        paymentBreakdown[p.method] += p.amount;
      }
    });
  });

  // 4. Platos más vendidos (Top Items)
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: orderWhere,
      deletedAt: null
    },
    include: {
      item: {
        select: { id: true, name: true, price: true, categoryId: true, category: { select: { name: true } } }
      }
    }
  });

  const itemMap = {};
  orderItems.forEach((oi) => {
    if (!oi.item) return;
    const key = oi.itemId;
    if (!itemMap[key]) {
      itemMap[key] = {
        id: oi.item.id,
        name: oi.item.name,
        category: oi.item.category?.name || 'General',
        totalQuantity: 0,
        totalRevenue: 0
      };
    }
    itemMap[key].totalQuantity += oi.quantity;
    itemMap[key].totalRevenue += (oi.price * oi.quantity);
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5);

  // 5. Horas Pico de Pedidos (0-23 horas)
  const ordersForPeak = await prisma.order.findMany({
    where: orderWhere,
    select: { createdAt: true }
  });

  const hourlyDistribution = Array(24).fill(0);
  ordersForPeak.forEach((o) => {
    const hour = new Date(o.createdAt).getHours();
    hourlyDistribution[hour]++;
  });

  // 6. Resumen diario de ventas para gráfico de línea/barras
  const salesByDayMap = {};
  bills.forEach((b) => {
    const dayStr = new Date(b.createdAt).toISOString().split('T')[0];
    if (!salesByDayMap[dayStr]) {
      salesByDayMap[dayStr] = 0;
    }
    salesByDayMap[dayStr] += b.total;
  });

  const salesByDay = Object.entries(salesByDayMap)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    kpis: {
      totalSales,
      totalBillsCount,
      averageTicket,
      totalOrdersCount
    },
    paymentBreakdown,
    topItems,
    hourlyDistribution,
    salesByDay
  };
}

module.exports = {
  getDashboardSummary
};
