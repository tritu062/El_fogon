const { Router } = require('express');
const { getHealth } = require('./health.controller');

const router = Router();

// Endpoint GET /health
router.get('/', getHealth);

module.exports = router;
