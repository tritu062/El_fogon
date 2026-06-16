const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const envConfig = require('../config/env');
const logger = require('../config/logger');

/**
 * Middleware para autenticar solicitudes HTTP mediante JWT Access Token.
 * Valida la firma, comprueba el estado del usuario en la BD y carga sus roles.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Acceso denegado. No se proporcionó un token de autenticación válido.'
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, envConfig.JWT_ACCESS_SECRET);
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Token de autenticación inválido o expirado.'
      });
    }

    // Buscar el usuario en la BD, confirmando que está activo e incluyendo sus roles
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
        deletedAt: null
      },
      include: {
        roles: {
          where: { deletedAt: null },
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'El usuario asociado a este token no existe o ha sido desactivado/borrado.'
      });
    }

    // Aplanamos la relación muchos a muchos de roles a un array simple de strings (ej: ['ADMINISTRADOR'])
    const userRoles = user.roles
      .filter(ur => ur.role.deletedAt === null)
      .map(ur => ur.role.name);

    // Adjuntar datos básicos al request para uso en controladores posteriores o middleware de autorización
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: userRoles
    };

    next();
  } catch (error) {
    logger.error('Error en middleware authenticate:', error);
    next(error);
  }
}

module.exports = authenticate;
