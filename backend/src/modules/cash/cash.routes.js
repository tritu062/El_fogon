const { Router } = require('express');
const {
  openRegister,
  getCurrentRegister,
  closeRegister,
  getAllRegisters
} = require('./cash.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Rutas de arqueo de caja (Restringido a Cajero y Administrador)
router.post('/', authenticate, authorize(['CAJERO', 'ADMINISTRADOR']), openRegister);
router.get('/current', authenticate, authorize(['CAJERO', 'ADMINISTRADOR']), getCurrentRegister);
router.post('/close', authenticate, authorize(['CAJERO', 'ADMINISTRADOR']), closeRegister);
router.get('/', authenticate, authorize(['ADMINISTRADOR']), getAllRegisters);

module.exports = router;
