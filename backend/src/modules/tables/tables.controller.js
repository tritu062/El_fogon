const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const { createTableSchema, updateTableSchema, updateTableStatusSchema } = require('./tables.schemas');

// 1. Obtener todas las mesas activas
async function getAllTables(req, res, next) {
  try {
    const tables = await prisma.table.findMany({
      where: { deletedAt: null },
      include: {
        zone: true
      },
      orderBy: { number: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      tables
    });
  } catch (error) {
    logger.error('Error al obtener mesas:', error);
    next(error);
  }
}

// 2. Obtener una mesa por ID
async function getTableById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de mesa inválido.'
      });
    }

    const table = await prisma.table.findFirst({
      where: { id, deletedAt: null },
      include: {
        zone: true
      }
    });

    if (!table) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Mesa no encontrada o inactiva.'
      });
    }

    return res.status(200).json({
      status: 'success',
      table
    });
  } catch (error) {
    logger.error(`Error al obtener mesa ID ${req.params.id}:`, error);
    next(error);
  }
}

// 3. Crear una nueva mesa
async function createTable(req, res, next) {
  try {
    const parsed = createTableSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { number, zoneId } = parsed.data;

    // Verificar que la zona exista y esté activa
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, deletedAt: null }
    });

    if (!zone) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'La zona seleccionada no existe o está inactiva.'
      });
    }

    // Verificar que el número de mesa no esté en uso por otra mesa activa
    const existingTable = await prisma.table.findFirst({
      where: { number, deletedAt: null }
    });

    if (existingTable) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: `El número de mesa ${number} ya está registrado y activo.`
      });
    }

    const newTable = await prisma.table.create({
      data: {
        number,
        zoneId,
        status: 'FREE'
      }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action: 'CREAR_MESA',
        description: `Se creó la mesa número ${number} en la zona ${zone.name}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🪑 Mesa creada: Número ${number} (ID: ${newTable.id})`);

    return res.status(201).json({
      status: 'success',
      table: newTable
    });
  } catch (error) {
    logger.error('Error al crear mesa:', error);
    next(error);
  }
}

// 4. Actualizar una mesa
async function updateTable(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de mesa inválido.'
      });
    }

    const parsed = updateTableSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { number, zoneId, status } = parsed.data;

    // Verificar existencia de la mesa
    const table = await prisma.table.findFirst({
      where: { id, deletedAt: null }
    });

    if (!table) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Mesa no encontrada o inactiva.'
      });
    }

    // Si cambia el número, verificar unicidad activa
    if (number && number !== table.number) {
      const numberConflict = await prisma.table.findFirst({
        where: { number, deletedAt: null }
      });
      if (numberConflict) {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          message: `El número de mesa ${number} ya está en uso por otra mesa activa.`
        });
      }
    }

    // Si cambia la zona, verificar existencia activa
    if (zoneId && zoneId !== table.zoneId) {
      const zoneExists = await prisma.zone.findFirst({
        where: { id: zoneId, deletedAt: null }
      });
      if (!zoneExists) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'La zona seleccionada no existe o está inactiva.'
        });
      }
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: { number, zoneId, status }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action: 'ACTUALIZAR_MESA',
        description: `Se actualizó la mesa ID ${id}. Cambios: ${JSON.stringify(parsed.data)}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🪑 Mesa actualizada ID: ${id}`);

    return res.status(200).json({
      status: 'success',
      table: updatedTable
    });
  } catch (error) {
    logger.error(`Error al actualizar mesa ID ${req.params.id}:`, error);
    next(error);
  }
}

// 5. Cambiar únicamente el estado (status) de la mesa (Accesible por ADMINISTRADOR y MESERO)
async function updateTableStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de mesa inválido.'
      });
    }

    const parsed = updateTableStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { status } = parsed.data;

    // Verificar existencia de la mesa
    const table = await prisma.table.findFirst({
      where: { id, deletedAt: null }
    });

    if (!table) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Mesa no encontrada o inactiva.'
      });
    }

    // Actualizar estado
    const updatedTable = await prisma.table.update({
      where: { id },
      data: { status }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action: 'CAMBIAR_ESTADO_MESA',
        description: `Se cambió el estado de la mesa número ${table.number} de ${table.status} a ${status}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🪑 Estado de mesa ${table.number} cambiado a: ${status}`);

    return res.status(200).json({
      status: 'success',
      table: updatedTable
    });
  } catch (error) {
    logger.error(`Error al cambiar estado de mesa ID ${req.params.id}:`, error);
    next(error);
  }
}

// 6. Eliminar una mesa (Soft Delete)
async function deleteTable(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de mesa inválido.'
      });
    }

    // Verificar existencia de la mesa
    const table = await prisma.table.findFirst({
      where: { id, deletedAt: null }
    });

    if (!table) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Mesa no encontrada o ya ha sido eliminada.'
      });
    }

    // Verificar si tiene comandas activas (PENDING o READY)
    const activeOrdersCount = await prisma.order.count({
      where: {
        tableId: id,
        status: { in: ['PENDING', 'READY'] },
        deletedAt: null
      }
    });

    if (activeOrdersCount > 0) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se puede eliminar la mesa porque tiene comandas activas pendientes.'
      });
    }

    // Marcar como eliminada
    const deletedTable = await prisma.table.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action: 'ELIMINAR_MESA',
        description: `Se eliminó (lógicamente) la mesa número ${table.number}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🪑 Mesa eliminada lógicamente: Número ${table.number} (ID: ${id})`);

    return res.status(200).json({
      status: 'success',
      message: 'Mesa eliminada correctamente.',
      table: deletedTable
    });
  } catch (error) {
    logger.error(`Error al eliminar mesa ID ${req.params.id}:`, error);
    next(error);
  }
}

module.exports = {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable
};
