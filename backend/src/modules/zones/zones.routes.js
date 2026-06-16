const { Router } = require('express');
const { getAllZones, getZoneById, createZone, updateZone, deleteZone } = require('./zones.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Rutas Autenticadas (Lectura accesible por cualquier rol)
router.get('/', authenticate, getAllZones);
router.get('/:id', authenticate, getZoneById);

// Rutas de Escritura (Exclusivas de ADMINISTRADOR)
router.post('/', authenticate, authorize('ADMINISTRADOR'), createZone);
router.put('/:id', authenticate, authorize('ADMINISTRADOR'), updateZone);
router.delete('/:id', authenticate, authorize('ADMINISTRADOR'), deleteZone);

module.exports = router;
