const inventoryService = require('./inventoryService');
const { ingredientSchema, movementSchema, bulkDailyConsumptionSchema } = require('./inventoryValidation');

/**
 * Controller para listar insumos de inventario.
 */
async function getIngredients(req, res, next) {
  try {
    const { category, alertOnly } = req.query;
    const ingredients = await inventoryService.listIngredients({ category, alertOnly });

    return res.status(200).json({
      status: 'success',
      data: ingredients
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para obtener un insumo por ID.
 */
async function getIngredientById(req, res, next) {
  try {
    const { id } = req.params;
    const ingredient = await inventoryService.getIngredientById(id);

    return res.status(200).json({
      status: 'success',
      data: ingredient
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para crear un nuevo insumo en el inventario.
 */
async function createIngredient(req, res, next) {
  try {
    const validatedData = ingredientSchema.parse(req.body);
    const newIngredient = await inventoryService.createIngredient(validatedData);

    return res.status(201).json({
      status: 'success',
      message: 'Insumo creado correctamente.',
      data: newIngredient
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para actualizar un insumo existente.
 */
async function updateIngredient(req, res, next) {
  try {
    const { id } = req.params;
    const validatedData = ingredientSchema.partial().parse(req.body);
    const updatedIngredient = await inventoryService.updateIngredient(id, validatedData);

    return res.status(200).json({
      status: 'success',
      message: 'Insumo actualizado correctamente.',
      data: updatedIngredient
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para eliminar un insumo (soft delete).
 */
async function deleteIngredient(req, res, next) {
  try {
    const { id } = req.params;
    const deletedIngredient = await inventoryService.deleteIngredient(id);

    return res.status(200).json({
      status: 'success',
      message: 'Insumo eliminado correctamente de la lista activa.',
      data: deletedIngredient
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para registrar un movimiento individual (compra, consumo, merma, ajuste).
 */
async function registerMovement(req, res, next) {
  try {
    const validatedData = movementSchema.parse(req.body);
    const userId = req.user.id;
    const movement = await inventoryService.registerMovement(validatedData, userId);

    return res.status(201).json({
      status: 'success',
      message: 'Movimiento de inventario registrado con éxito.',
      data: movement
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para registro masivo de consumo diario al cierre del turno/día.
 */
async function bulkDailyConsumption(req, res, next) {
  try {
    const validatedData = bulkDailyConsumptionSchema.parse(req.body);
    const userId = req.user.id;
    const results = await inventoryService.bulkDailyConsumption(validatedData.items, userId, validatedData.date);

    return res.status(200).json({
      status: 'success',
      message: `Consumo diario registrado para ${results.length} insumos.`,
      data: results
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para consultar el historial de movimientos de inventario.
 */
async function getMovements(req, res, next) {
  try {
    const { ingredientId, type, limit } = req.query;
    const movements = await inventoryService.listMovements({ ingredientId, type, limit });

    return res.status(200).json({
      status: 'success',
      data: movements
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  registerMovement,
  bulkDailyConsumption,
  getMovements
};
