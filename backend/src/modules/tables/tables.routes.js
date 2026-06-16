const { Router } = require('express');
const { getAllTables, getTableById, createTable, updateTable, updateTableStatus, deleteTable } = require('./tables.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Rutas Autenticadas (Lectura accesible por cualquier rol)
router.get('/', authenticate, getAllTables);
router.get('/:id', authenticate, getTableById);

// Rutas de Escritura Completa (Exclusivas de ADMINISTRADOR)
router.post('/', authenticate, authorize('ADMINISTRADOR'), createTable);
router.put('/:id', authenticate, authorize('ADMINISTRADOR'), updateTable);
router.delete('/:id', authenticate, authorize('ADMINISTRADOR'), deleteTable);

// Transición de Estado Manual (Accesible por ADMINISTRADOR y MESERO)
router.patch('/:id/status', authenticate, authorize(['ADMINISTRADOR', 'MESERO']), updateTableStatus);

module.exports = router;
