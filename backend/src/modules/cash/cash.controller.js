const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const { openRegisterSchema, closeRegisterSchema } = require('./cash.schemas');

// 1. Apertura de caja
async function openRegister(req, res, next) {
  try {
    const parsed = openRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { openingBalance, notes } = parsed.data;
    const cashierId = req.user.id;

    // Verificar si ya tiene una caja abierta
    const activeRegister = await prisma.cashRegister.findFirst({
      where: {
        cashierId,
        status: 'OPEN',
        deletedAt: null
      }
    });

    if (activeRegister) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Ya tienes una sesión de caja abierta activa.'
      });
    }

    const register = await prisma.cashRegister.create({
      data: {
        cashierId,
        openingBalance,
        notes,
        status: 'OPEN'
      }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: cashierId,
        action: 'APERTURA_CAJA',
        description: `Caja abierta con saldo inicial de $${(openingBalance / 100).toFixed(2)}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`Caja ID ${register.id} abierta por cajero ID ${cashierId}`);

    return res.status(201).json({
      status: 'success',
      register
    });
  } catch (error) {
    logger.error('Error al abrir caja:', error);
    next(error);
  }
}

// 2. Obtener caja actual con estadísticas de ventas en vivo
async function getCurrentRegister(req, res, next) {
  try {
    const cashierId = req.user.id;

    const register = await prisma.cashRegister.findFirst({
      where: {
        cashierId,
        status: 'OPEN',
        deletedAt: null
      }
    });

    if (!register) {
      return res.status(200).json({
        status: 'success',
        register: null
      });
    }

    // Calcular totales de cobros en esta caja por método de pago
    const bills = await prisma.bill.findMany({
      where: {
        cashRegisterId: register.id,
        deletedAt: null
      },
      include: {
        payments: {
          where: { deletedAt: null }
        }
      }
    });

    let cashPayments = 0;
    let cardPayments = 0;
    let transferPayments = 0;
    let totalSales = 0;

    for (const bill of bills) {
      totalSales += bill.total;
      for (const payment of bill.payments) {
        if (payment.method === 'EFECTIVO') {
          cashPayments += payment.amount;
        } else if (payment.method === 'TARJETA') {
          cardPayments += payment.amount;
        } else if (payment.method === 'TRANSFERENCIA') {
          transferPayments += payment.amount;
        }
      }
    }

    const expectedClosingBalance = register.openingBalance + cashPayments;

    return res.status(200).json({
      status: 'success',
      register,
      stats: {
        totalSales,
        cashPayments,
        cardPayments,
        transferPayments,
        expectedClosingBalance
      }
    });
  } catch (error) {
    logger.error('Error al obtener caja actual:', error);
    next(error);
  }
}

// 3. Cierre de caja
async function closeRegister(req, res, next) {
  try {
    const parsed = closeRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { actualClosingBalance, notes } = parsed.data;
    const cashierId = req.user.id;

    // Obtener caja abierta
    const register = await prisma.cashRegister.findFirst({
      where: {
        cashierId,
        status: 'OPEN',
        deletedAt: null
      }
    });

    if (!register) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'No se encontró ninguna sesión de caja abierta activa.'
      });
    }

    // Calcular saldo esperado
    const bills = await prisma.bill.findMany({
      where: {
        cashRegisterId: register.id,
        deletedAt: null
      },
      include: {
        payments: {
          where: { deletedAt: null }
        }
      }
    });

    let cashPayments = 0;
    for (const bill of bills) {
      for (const payment of bill.payments) {
        if (payment.method === 'EFECTIVO') {
          cashPayments += payment.amount;
        }
      }
    }

    const expectedClosingBalance = register.openingBalance + cashPayments;
    const discrepancy = actualClosingBalance - expectedClosingBalance;

    const closedRegister = await prisma.cashRegister.update({
      where: { id: register.id },
      data: {
        status: 'CLOSED',
        closingTime: new Date(),
        expectedClosingBalance,
        actualClosingBalance,
        discrepancy,
        notes: notes || register.notes
      }
    });

    // Registrar auditoría
    await prisma.auditLog.create({
      data: {
        userId: cashierId,
        action: 'CIERRE_CAJA',
        description: `Caja cerrada. Esperado: $${(expectedClosingBalance / 100).toFixed(2)}, Real: $${(actualClosingBalance / 100).toFixed(2)}, Discrepancia: $${(discrepancy / 100).toFixed(2)}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`Caja ID ${closedRegister.id} cerrada por cajero ID ${cashierId}. Discrepancia: ${discrepancy}`);

    return res.status(200).json({
      status: 'success',
      register: closedRegister
    });
  } catch (error) {
    logger.error('Error al cerrar caja:', error);
    next(error);
  }
}

// 4. Listar todas las sesiones de caja (Solo para administradores)
async function getAllRegisters(req, res, next) {
  try {
    const { status, cashierId } = req.query;
    const whereClause = { deletedAt: null };

    if (status) {
      whereClause.status = status;
    }

    if (cashierId) {
      const parsedCashierId = parseInt(cashierId, 10);
      if (!isNaN(parsedCashierId)) {
        whereClause.cashierId = parsedCashierId;
      }
    }

    const registers = await prisma.cashRegister.findMany({
      where: whereClause,
      include: {
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { openingTime: 'desc' }
    });

    return res.status(200).json({
      status: 'success',
      registers
    });
  } catch (error) {
    logger.error('Error al obtener listado de arqueos:', error);
    next(error);
  }
}

module.exports = {
  openRegister,
  getCurrentRegister,
  closeRegister,
  getAllRegisters
};
