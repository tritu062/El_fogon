const { Router } = require('express');
const {
  getAllOrders,
  getOrderById,
  createOrder,
  appendItemsToOrder,
  updateOrderStatus
} = require('./orders.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// Lectura de pedidos (Todos los roles autenticados)
router.get('/', authenticate, getAllOrders);
router.get('/:id', authenticate, getOrderById);

// Creación de pedidos (Meseros y Administradores)
router.post('/', authenticate, authorize(['MESERO', 'ADMINISTRADOR']), createOrder);

// Adicionar ítems a comanda activa (Meseros y Administradores)
router.patch('/:id/items', authenticate, authorize(['MESERO', 'ADMINISTRADOR']), appendItemsToOrder);

// Cambio de estado de comanda (Control de acceso interno por estado en el controlador)
router.patch('/:id/status', authenticate, updateOrderStatus);

module.exports = router;
