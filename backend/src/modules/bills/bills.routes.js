const { Router } = require('express');
const {
  processPayment,
  getBills
} = require('./bills.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Rutas de facturación y cobros
router.post('/', authenticate, authorize(['CAJERO', 'ADMINISTRADOR']), processPayment);
router.get('/', authenticate, authorize(['CAJERO', 'ADMINISTRADOR']), getBills);

module.exports = router;
