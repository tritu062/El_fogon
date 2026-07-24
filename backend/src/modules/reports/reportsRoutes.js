const express = require('express');
const router = express.Router();
const reportsController = require('./reportsController');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

// Todas las rutas de reportes requieren autenticación y rol ADMINISTRADOR
router.use(authenticate);
router.use(authorize('ADMINISTRADOR'));

// Endpoint principal de analíticas ejecutivas
router.get('/dashboard', reportsController.getDashboardSummary);

module.exports = router;
