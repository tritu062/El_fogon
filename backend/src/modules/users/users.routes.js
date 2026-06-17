const { Router } = require('express');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('./users.controller');
const { register } = require('../auth/auth.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Todas las rutas de administración de usuarios requieren autenticación y rol ADMINISTRADOR
router.use(authenticate, authorize('ADMINISTRADOR'));

// Listar usuarios
router.get('/', getAllUsers);

// Obtener un usuario específico
router.get('/:id', getUserById);

// Crear usuario (alias de registro)
router.post('/', register);

// Actualizar usuario
router.put('/:id', updateUser);

// Eliminar usuario
router.delete('/:id', deleteUser);

module.exports = router;
