const { Router } = require('express');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  updateItemAvailability,
  deleteItem
} = require('./catalog.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

const router = Router();

// ==========================================
// Rutas de Categorías
// ==========================================

// Lectura (Todos los roles autenticados)
router.get('/categories', authenticate, getAllCategories);
router.get('/categories/:id', authenticate, getCategoryById);

// Escritura (Exclusivo de ADMINISTRADOR)
router.post('/categories', authenticate, authorize('ADMINISTRADOR'), createCategory);
router.put('/categories/:id', authenticate, authorize('ADMINISTRADOR'), updateCategory);
router.delete('/categories/:id', authenticate, authorize('ADMINISTRADOR'), deleteCategory);

// ==========================================
// Rutas de Platos y Bebidas (Items)
// ==========================================

// Lectura (Todos los roles autenticados)
router.get('/items', authenticate, getAllItems);
router.get('/items/:id', authenticate, getItemById);

// Escritura (Exclusivo de ADMINISTRADOR)
router.post('/items', authenticate, authorize('ADMINISTRADOR'), createItem);
router.put('/items/:id', authenticate, authorize('ADMINISTRADOR'), updateItem);
router.patch('/items/:id/availability', authenticate, authorize('ADMINISTRADOR'), updateItemAvailability);
router.delete('/items/:id', authenticate, authorize('ADMINISTRADOR'), deleteItem);

module.exports = router;
