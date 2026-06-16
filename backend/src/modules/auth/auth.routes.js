const { Router } = require('express');
const { register, login, logout, refresh, me } = require('./auth.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Rutas Públicas
router.post('/login', login);
router.post('/refresh', refresh);

// Rutas Autenticadas (Cualquier rol)
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

// Rutas Protegidas (Solo accesible por Administradores)
router.post('/register', authenticate, authorize('ADMINISTRADOR'), register);

module.exports = router;
