const { Router } = require('express');
const { getAuditLogs } = require('./audit.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Endpoint restringido exclusivamente para administradores
router.get('/', authenticate, authorize('ADMINISTRADOR'), getAuditLogs);

module.exports = router;
