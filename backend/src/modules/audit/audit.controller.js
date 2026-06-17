const { prisma } = require('../../config/db');
const logger = require('../../config/logger');

// Obtener logs de auditoría con filtros y paginación
async function getAuditLogs(req, res, next) {
  try {
    const { userId, action, startDate, endDate, page, limit } = req.query;

    const whereClause = { deletedAt: null };

    if (userId) {
      const parsedUserId = parseInt(userId, 10);
      if (!isNaN(parsedUserId)) {
        whereClause.userId = parsedUserId;
      }
    }

    if (action) {
      whereClause.action = {
        contains: action,
        mode: 'insensitive'
      };
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          whereClause.createdAt.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          whereClause.createdAt.lte = end;
        }
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    return res.status(200).json({
      status: 'success',
      total,
      page: pageNum,
      limit: limitNum,
      logs
    });
  } catch (error) {
    logger.error('Error al obtener logs de auditoría:', error);
    next(error);
  }
}

module.exports = {
  getAuditLogs
};
