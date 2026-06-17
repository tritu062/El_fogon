const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const { updateUserSchema } = require('./users.schemas');

// 1. Obtener todos los usuarios (no eliminados)
async function getAllUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        roles: {
          where: { deletedAt: null },
          include: {
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Aplanar roles para que la respuesta sea un arreglo de strings
    const flattenedUsers = users.map(user => {
      const roles = user.roles.map(ur => ur.role.name);
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        roles
      };
    });

    return res.status(200).json({
      status: 'success',
      users: flattenedUsers
    });
  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    next(error);
  }
}

// 2. Obtener un usuario por ID
async function getUserById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de usuario inválido.'
      });
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
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
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Usuario no encontrado.'
      });
    }

    const roles = user.roles.map(ur => ur.role.name);
    const { password, ...userWithoutPassword } = user;

    return res.status(200).json({
      status: 'success',
      user: {
        ...userWithoutPassword,
        roles
      }
    });
  } catch (error) {
    logger.error(`Error al obtener usuario ID ${req.params.id}:`, error);
    next(error);
  }
}

// 3. Actualizar un usuario y sus roles
async function updateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de usuario inválido.'
      });
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { email, firstName, lastName, isActive, roles, password } = parsed.data;

    // Buscar el usuario actual
    const currentUser = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!currentUser) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Usuario no encontrado.'
      });
    }

    // Si el email cambia, validar que no esté tomado por otro usuario
    if (email && email !== currentUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      });
      if (emailTaken) {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          message: 'El correo electrónico ya está en uso por otro usuario.'
        });
      }
    }

    // Caso de borde: Impedir desactivar a un usuario con caja abierta
    if (isActive === false && currentUser.isActive) {
      const activeRegister = await prisma.cashRegister.findFirst({
        where: {
          cashierId: id,
          status: 'OPEN',
          deletedAt: null
        }
      });

      if (activeRegister) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'No se puede desactivar a un usuario que tiene una sesión de caja abierta activa.'
        });
      }
    }

    // Procesar actualización en transacción
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Preparar datos básicos a actualizar
      const updateData = {};
      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      if (password) {
        updateData.password = bcrypt.hashSync(password, 10);
      }

      // Si se especifican roles, validarlos y reasignarlos
      if (roles) {
        const dbRoles = await tx.role.findMany({
          where: {
            name: { in: roles },
            deletedAt: null
          }
        });

        if (dbRoles.length !== roles.length) {
          throw new Error('INVALID_ROLES');
        }

        // Eliminar roles existentes
        await tx.userRole.deleteMany({
          where: { userId: id }
        });

        // Crear nuevos roles
        const userRolesData = dbRoles.map(role => ({
          userId: id,
          roleId: role.id
        }));

        await tx.userRole.createMany({
          data: userRolesData
        });
      }

      // Actualizar el usuario
      const userResult = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          roles: {
            where: { deletedAt: null },
            include: {
              role: true
            }
          }
        }
      });

      // Crear registro de auditoría
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ACTUALIZAR_USUARIO',
          description: `Se actualizó al usuario ID ${id} (${currentUser.email}). Campos modificados: ${Object.keys(updateData).join(', ')}${roles ? ', roles' : ''}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return userResult;
    });

    logger.info(`Usuario ID ${id} actualizado por administrador ID ${req.user.id}`);

    const flattenedRoles = updatedUser.roles.map(ur => ur.role.name);
    const { password: _, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      status: 'success',
      user: {
        ...userWithoutPassword,
        roles: flattenedRoles
      }
    });

  } catch (error) {
    if (error.message === 'INVALID_ROLES') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Uno o más roles proporcionados no son válidos.'
      });
    }

    logger.error(`Error al actualizar usuario ID ${req.params.id}:`, error);
    next(error);
  }
}

// 4. Soft delete de un usuario
async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de usuario inválido.'
      });
    }

    // Evitar que el administrador se autoelimine
    if (id === req.user.id) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Acceso denegado. No puedes eliminar tu propia cuenta de administrador en uso.'
      });
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Usuario no encontrado.'
      });
    }

    // Caso de borde: Impedir eliminar a un usuario con caja abierta
    const activeRegister = await prisma.cashRegister.findFirst({
      where: {
        cashierId: id,
        status: 'OPEN',
        deletedAt: null
      }
    });

    if (activeRegister) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se puede eliminar a un usuario que tiene una sesión de caja abierta activa.'
      });
    }

    // Ejecutar soft-delete en transacción
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Soft delete del usuario
      await tx.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: now
        }
      });

      // Soft delete de sus relaciones de roles
      await tx.userRole.updateMany({
        where: { userId: id },
        data: { deletedAt: now }
      });

      // Crear registro de auditoría
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ELIMINAR_USUARIO',
          description: `Se eliminó (soft delete) al usuario ID ${id} (${user.email})`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    });

    logger.info(`Usuario ID ${id} eliminado lógicamente por administrador ID ${req.user.id}`);

    return res.status(200).json({
      status: 'success',
      message: 'Usuario eliminado con éxito.'
    });

  } catch (error) {
    logger.error(`Error al eliminar usuario ID ${req.params.id}:`, error);
    next(error);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
