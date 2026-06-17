const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const { createBillSchema } = require('./bills.schemas');

// Helper para generar número de factura secuencial diario
async function generateInvoiceNumber(tx) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`; // e.g. "20260617"

  // Contar cuántas facturas se han creado hoy
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await tx.bill.count({
    where: {
      createdAt: {
        gte: todayStart
      }
    }
  });

  const sequence = String(count + 1).padStart(4, '0'); // e.g. "0001"
  return `FAC-${datePrefix}-${sequence}`;
}

// 1. Procesar Cobro de Comanda
async function processPayment(req, res, next) {
  try {
    const parsed = createBillSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { orderId, discount, tax, payments } = parsed.data;
    const cashierId = req.user.id;

    // Verificar si el cajero tiene una caja abierta
    const activeRegister = await prisma.cashRegister.findFirst({
      where: {
        cashierId,
        status: 'OPEN',
        deletedAt: null
      }
    });

    if (!activeRegister) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Debe abrir una sesión de caja antes de poder registrar cobros.'
      });
    }

    // Ejecutar todo en una transacción prisma segura
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener y validar el pedido
      const order = await tx.order.findFirst({
        where: { id: orderId, deletedAt: null },
        include: { bill: true }
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (order.status === 'PAID' || order.status === 'CANCELLED' || order.bill) {
        throw new Error('ORDER_ALREADY_FINALIZED');
      }

      // 2. Validar cálculos y cuadre de montos de pago
      const subtotal = order.total;
      const expectedTotal = subtotal + tax - discount;
      
      if (expectedTotal < 0) {
        throw new Error('TOTAL_NEGATIVE');
      }

      const totalPaymentsAmount = payments.reduce((acc, p) => acc + p.amount, 0);

      if (totalPaymentsAmount !== expectedTotal) {
        throw new Error('PAYMENTS_AMOUNT_MISMATCH');
      }

      // 3. Generar número de factura único
      const invoiceNumber = await generateInvoiceNumber(tx);

      // 4. Crear la Factura (Bill)
      const bill = await tx.bill.create({
        data: {
          orderId,
          cashierId,
          cashRegisterId: activeRegister.id,
          subtotal,
          tax,
          discount,
          total: expectedTotal,
          invoiceNumber,
          payments: {
            create: payments.map(p => ({
              amount: p.amount,
              method: p.method
            }))
          }
        },
        include: {
          payments: true,
          order: {
            include: {
              table: true,
              waiter: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      // 5. Actualizar estado de comanda a PAID
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' }
      });

      // 6. Si tiene mesa, verificar si hay otras comandas activas pendientes en esa mesa
      if (order.tableId) {
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: orderId },
            status: { in: ['PENDING', 'READY'] },
            deletedAt: null
          }
        });

        // Si no quedan comandas pendientes, liberar mesa
        if (activeOrdersCount === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: 'FREE' }
          });
        }
      }

      return bill;
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: cashierId,
        action: 'PROCESAR_COBRO',
        description: `Factura ${result.invoiceNumber} cobrada para pedido #${orderId}. Total: $${(result.total / 100).toFixed(2)}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`Cobro procesado con éxito. Factura: ${result.invoiceNumber}, Cajero: ${cashierId}`);

    return res.status(201).json({
      status: 'success',
      bill: result
    });

  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'El pedido solicitado no existe.'
      });
    }

    if (error.message === 'ORDER_ALREADY_FINALIZED') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Este pedido ya ha sido cobrado o cancelado anteriormente.'
      });
    }

    if (error.message === 'TOTAL_NEGATIVE') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'El total de la factura no puede ser negativo (descuento excede el total).'
      });
    }

    if (error.message === 'PAYMENTS_AMOUNT_MISMATCH') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'El monto ingresado en los pagos no coincide con el total calculado de la cuenta.'
      });
    }

    logger.error('Error al procesar cobro de comanda:', error);
    next(error);
  }
}

// 2. Consultar Historial de Facturas
async function getBills(req, res, next) {
  try {
    const { cashierId, startDate, endDate } = req.query;
    const whereClause = { deletedAt: null };

    if (cashierId) {
      const parsedId = parseInt(cashierId, 10);
      if (!isNaN(parsedId)) {
        whereClause.cashierId = parsedId;
      }
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const bills = await prisma.bill.findMany({
      where: whereClause,
      include: {
        payments: true,
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        order: {
          include: {
            table: true,
            orderItems: {
              include: {
                item: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      status: 'success',
      bills
    });
  } catch (error) {
    logger.error('Error al consultar facturas:', error);
    next(error);
  }
}

module.exports = {
  processPayment,
  getBills
};
