/**
 * Middleware para autorizar el acceso a rutas según los roles del usuario.
 * @param {string|string[]} allowedRoles Rol o roles que tienen permiso para acceder a la ruta.
 */
function authorize(allowedRoles = []) {
  // Normalizar el parámetro a un array de strings
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'No autorizado. Se requiere autenticación.'
      });
    }

    // Comprobar si hay intersección entre los roles del usuario y los permitidos
    const hasPermission = req.user.roles.some((role) => roles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Acceso denegado. Su rol no tiene permisos para realizar esta acción.'
      });
    }

    next();
  };
}

module.exports = authorize;
