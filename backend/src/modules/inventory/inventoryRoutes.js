const express = require('express');
const router = express.Router();
const inventoryController = require('./inventoryController');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

// Todas las rutas de inventario requieren autenticación
router.use(authenticate);

// Listar insumos y consultar por ID (Acceso para ADMINISTRADOR)
router.get('/ingredients', authorize('ADMINISTRADOR'), inventoryController.getIngredients);
router.get('/ingredients/:id', authorize('ADMINISTRADOR'), inventoryController.getIngredientById);

// Crear, editar y eliminar insumos (ADMINISTRADOR)
router.post('/ingredients', authorize('ADMINISTRADOR'), inventoryController.createIngredient);
router.put('/ingredients/:id', authorize('ADMINISTRADOR'), inventoryController.updateIngredient);
router.delete('/ingredients/:id', authorize('ADMINISTRADOR'), inventoryController.deleteIngredient);

// Registrar movimiento individual (compra, consumo, merma, ajuste)
router.post('/movements', authorize('ADMINISTRADOR'), inventoryController.registerMovement);

// Registrar lote de consumo diario al cierre de la jornada
router.post('/daily-consumption', authorize('ADMINISTRADOR'), inventoryController.bulkDailyConsumption);

// Consultar historial de movimientos
router.get('/movements', authorize('ADMINISTRADOR'), inventoryController.getMovements);

module.exports = router;
