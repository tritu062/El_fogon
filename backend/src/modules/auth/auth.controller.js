const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/db');
const envConfig = require('../../config/env');
const logger = require('../../config/logger');

// Regex para política de contraseñas robusta:
// Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#+])[A-Za-z\d@$!%*?&._\-#+]{8,}$/;

/**
 * Endpoint POST /auth/register
 * Crea un nuevo usuario en la base de datos y le asigna roles.
 * Protegido por middleware para que solo Administradores puedan registrar personal.
 */
async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, roles } = req.body;

    // 1. Validaciones de cuerpo requeridas
    if (!email || !password || !firstName || !lastName || !roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Todos los campos son obligatorios: email, password, firstName, lastName, y roles (array).'
      });
    }

    // 2. Comprobar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'El correo electrónico ya está registrado en el sistema.'
      });
    }

    // 3. Validar política de contraseña robusta
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'La contraseña no cumple con la política de seguridad: Mínimo 8 caracteres, al menos una letra mayúscula, una letra minúscula, un número y un carácter especial.'
      });
    }

    // 4. Validar que los roles solicitados existen en la BD
    const dbRoles = await prisma.role.findMany({
      where: {
        name: { in: roles },
        deletedAt: null
      }
    });

    if (dbRoles.length !== roles.length) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Uno o más roles proporcionados no son válidos.'
      });
    }

    // 5. Cifrar la contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 6. Crear el usuario y sus asignaciones de rol en transacción
    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          isActive: true
        }
      });

      // Crear las relaciones de roles
      const userRolesData = dbRoles.map((role) => ({
        userId: createdUser.id,
        roleId: role.id
      }));

      await tx.userRole.createMany({
        data: userRolesData
      });

      // Registrar acción en log de auditoría
      await tx.auditLog.create({
        data: {
          userId: req.user ? req.user.id : null, // El admin que realiza el registro
          action: 'REGISTRO_USUARIO',
          description: `Se registró al usuario ${email} con los roles: ${roles.join(', ')}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return createdUser;
    });

    logger.info(`👤 Usuario registrado exitosamente: ${email}`);

    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado correctamente.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    });
  } catch (error) {
    logger.error('Error en el registro de usuario:', error);
    next(error);
  }
}

/**
 * Endpoint POST /auth/login
 * Autentica credenciales, maneja bloqueos temporales por fuerza bruta
 * y expide Access Token (en JSON) + Refresh Token (en cookie httpOnly).
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Email y contraseña son obligatorios.'
      });
    }

    // 1. Buscar usuario e incluir sus roles
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
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
      // 🔒 Retornamos genérico para evitar enumeración de cuentas
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Credenciales incorrectas o cuenta inactiva.'
      });
    }

    // 2. Verificar si la cuenta está bloqueada temporalmente
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockUntil - new Date()) / (60 * 1000));
      return res.status(423).json({
        status: 'error',
        statusCode: 423,
        message: `Cuenta bloqueada temporalmente debido a intentos fallidos. Intenta nuevamente en ${minutesRemaining} minutos.`
      });
    }

    // 3. Comparar contraseñas
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      // Incrementar intentos fallidos
      const newAttempts = user.loginAttempts + 1;
      let lockUntil = null;

      if (newAttempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Bloqueo de 15 minutos
        logger.warn(`🔒 Cuenta bloqueada por 15 min: ${email} (exceso de intentos fallidos)`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockUntil
        }
      });

      // Crear log de auditoría del intento fallido
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FALLIDO',
          description: `Intento de acceso fallido (${newAttempts}/5)`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      const remaining = 5 - newAttempts;
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: remaining <= 0 
          ? 'Demasiados intentos fallidos. Su cuenta ha sido bloqueada temporalmente por 15 minutos.' 
          : `Credenciales incorrectas. Te quedan ${remaining} intentos antes del bloqueo.`
      });
    }

    // 4. Credenciales correctas: Reiniciar intentos y bloqueo
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockUntil: null
      }
    });

    // 5. Generar Tokens
    const accessToken = jwt.sign(
      { userId: user.id },
      envConfig.JWT_ACCESS_SECRET,
      { expiresIn: '15m' } // Expiración corta para seguridad
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      envConfig.JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // Expiración larga para refresco
    );

    // 6. Registrar el Refresh Token activo en la base de datos
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      }
    });

    // 7. Enviar el Refresh Token en una Cookie HttpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: envConfig.NODE_ENV === 'production', // Solo https en producción
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días en milisegundos
    });

    // Auditoría
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_EXITOSO',
        description: 'Inicio de sesión exitoso',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    logger.info(`🔑 Sesión iniciada para el usuario: ${email}`);

    // Aplanar los roles del usuario para el frontend
    const userRoles = (user.roles || [])
      .filter(ur => ur.role && ur.role.deletedAt === null)
      .map(ur => ur.role.name);

    return res.status(200).json({
      status: 'success',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: userRoles
      }
    });
  } catch (error) {
    logger.error('Error en el login:', error);
    next(error);
  }
}

/**
 * Endpoint POST /auth/logout
 * Elimina la cookie del navegador y revoca el token en la BD.
 */
async function logout(req, res, next) {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      // Eliminar el token del listado activo en la base de datos
      await prisma.refreshToken.deleteMany({
        where: { token }
      });
    }

    // Limpiamos la cookie del navegador
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: envConfig.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    if (req.user) {
      logger.info(`🚪 Sesión cerrada para usuario ID: ${req.user.id}`);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Sesión cerrada correctamente.'
    });
  } catch (error) {
    logger.error('Error en el logout:', error);
    next(error);
  }
}

/**
 * Endpoint POST /auth/refresh
 * Implementa la Rotación de Tokens de un Solo Uso y detección de reutilización.
 */
async function refresh(req, res, next) {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'No se proporcionó un token de refresco.'
      });
    }

    // 1. Verificar firma y expiración del token de refresco
    let decoded;
    try {
      decoded = jwt.verify(token, envConfig.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Token de refresco inválido o expirado.'
      });
    }

    // 2. Buscar si el token está registrado en la base de datos
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token }
    });

    // ⚠️ ALERTA DE SEGURIDAD (Reutilización de Refresh Token):
    // Si el JWT es válido pero no está en la base de datos, significa que ya fue rotado
    // y alguien está intentando usar un token antiguo (robo de sesión).
    if (!dbToken) {
      logger.error(`🚨 ¡Detección de Reutilización de Refresh Token! Usuario ID: ${decoded.userId}`);
      
      // Medida de contención inmediata: Revocamos TODOS los refresh tokens activos del usuario
      await prisma.refreshToken.deleteMany({
        where: { userId: decoded.userId }
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: envConfig.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Sesión inválida por posible compromiso de seguridad. Debe iniciar sesión nuevamente.'
      });
    }

    // 3. Comprobar si el usuario sigue activo
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, isActive: true, deletedAt: null }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'El usuario ya no está activo en el sistema.'
      });
    }

    // 4. ROTACIÓN: Eliminar el token de refresco usado
    await prisma.refreshToken.delete({
      where: { token }
    });

    // 5. Generar nuevos tokens
    const newAccessToken = jwt.sign(
      { userId: user.id },
      envConfig.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      envConfig.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Guardar el nuevo token en la BD
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // 7. Enviar la cookie con el nuevo Refresh Token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: envConfig.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logger.debug(`🔄 Refresh Token rotado con éxito para usuario: ${user.email}`);

    return res.status(200).json({
      status: 'success',
      accessToken: newAccessToken
    });
  } catch (error) {
    logger.error('Error en la rotación de refresco:', error);
    next(error);
  }
}

/**
 * Endpoint GET /auth/me
 * Devuelve el perfil completo mapeado en req.user
 */
async function me(req, res, next) {
  try {
    return res.status(200).json({
      status: 'success',
      user: req.user
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  refresh,
  me
};
