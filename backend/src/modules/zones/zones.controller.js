const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const { createZoneSchema, updateZoneSchema } = require('./zones.schemas');

// 1. Obtener todas las zonas activas
async function getAllZones(req, res, next) {
  try {
    const zones = await prisma.zone.findMany({
      where: { deletedAt: null },
      include: {
        tables: {
          where: { deletedAt: null },
          orderBy: { number: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      zones
    });
  } catch (error) {
    logger.error('Error al obtener zonas:', error);
    next(error);
  }
}

// 2. Obtener una zona por ID
async function getZoneById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de zona inválido.'
      });
    }

    const zone = await prisma.zone.findFirst({
      where: { id, deletedAt: null },
      include: {
        tables: {
          where: { deletedAt: null },
          orderBy: { number: 'asc' }
        }
      }
    });

    if (!zone) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Zona no encontrada o inactiva.'
      });
    }

    return res.status(200).json({
      status: 'success',
      zone
    });
  } catch (error) {
    logger.error(`Error al obtener zona ID ${req.params.id}:`, error);
    next(error);
  }
}

// 3. Crear una nueva zona
async function createZone(req, res, next) {
  try {
    const parsed = createZoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { name, description } = parsed.data;

    // Verificar unicidad del nombre
    const existingZone = await prisma.zone.findFirst({
      where: { name, deletedAt: null }
    });

    if (existingZone) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'Ya existe una zona activa con este nombre.'
      });
    }

    const newZone = await prisma.zone.create({
      data: { name, description }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action: 'CREAR_ZONA',
        description: `Se creó la zona: ${name}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🏢 Zona creada: ${name} (ID: ${newZone.id})`);

    return res.status(201).json({
      status: 'success',
      zone: newZone
    });
  } catch (error) {
    logger.error('Error al crear zona:', error);
    next(error);
  }
}

// 4. Actualizar una zona
async function updateZone(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de zona inválido.'
      });
    }

    const parsed = updateZoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { name, description } = parsed.data;

    // Verificar existencia de la zona
    const zone = await prisma.zone.findFirst({
      where: { id, deletedAt: null }
    });

    if (!zone) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Zona no encontrada o inactiva.'
      });
    }

    // Si cambia el nombre, verificar que sea único entre las zonas activas
    if (name && name !== zone.name) {
      const nameConflict = await prisma.zone.findFirst({
        where: { name, deletedAt: null }
      });
      if (nameConflict) {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          message: 'Ya existe otra zona activa con este nombre.'
        });
      }
    }

    const updatedZone = await prisma.zone.update({
      where: { id },
      data: { name, description }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action: 'ACTUALIZAR_ZONA',
        description: `Se actualizó la zona ID ${id}. Cambios: ${JSON.stringify(parsed.data)}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🏢 Zona actualizada ID: ${id}`);

    return res.status(200).json({
      status: 'success',
      zone: updatedZone
    });
  } catch (error) {
    logger.error(`Error al actualizar zona ID ${req.params.id}:`, error);
    next(error);
  }
}

// 5. Eliminar una zona (Soft Delete con validación de mesas vinculadas)
async function deleteZone(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de zona inválido.'
      });
    }

    // Verificar existencia de la zona
    const zone = await prisma.zone.findFirst({
      where: { id, deletedAt: null }
    });

    if (!zone) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Zona no encontrada o ya ha sido eliminada.'
      });
    }

    // Validar si tiene mesas activas vinculadas
    const activeTablesCount = await prisma.table.count({
      where: { zoneId: id, deletedAt: null }
    });

    if (activeTablesCount > 0) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se puede eliminar la zona porque contiene mesas activas. Elimine o reubique las mesas antes de continuar.'
      });
    }

    // Marcar como eliminada
    const deletedZone = await prisma.zone.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action: 'ELIMINAR_ZONA',
        description: `Se eliminó (lógicamente) la zona: ${zone.name}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🏢 Zona eliminada lógicamente: ${zone.name} (ID: ${id})`);

    return res.status(200).json({
      status: 'success',
      message: 'Zona eliminada correctamente.',
      zone: deletedZone
    });
  } catch (error) {
    logger.error(`Error al eliminar zona ID ${req.params.id}:`, error);
    next(error);
  }
}

module.exports = {
  getAllZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone
};
