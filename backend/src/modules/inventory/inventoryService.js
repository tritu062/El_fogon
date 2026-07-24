const { prisma } = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Obtiene el listado de insumos con opción de filtrado y cálculo de alertas de stock.
 */
async function listIngredients({ category, alertOnly } = {}) {
  const where = {
    deletedAt: null
  };

  if (category) {
    where.category = category;
  }

  const ingredients = await prisma.ingredient.findMany({
    where,
    orderBy: { name: 'asc' }
  });

  // Mapeamos para incluir el estado de salud del stock y valor acumulado
  const enriched = ingredients.map((ing) => {
    let status = 'OK';
    if (ing.currentStock === 0) {
      status = 'CRITICAL';
    } else if (ing.currentStock <= ing.minStock) {
      status = 'WARNING';
    }

    const totalValue = Math.round(ing.currentStock * ing.unitCost);

    return {
      ...ing,
      status,
      totalValue
    };
  });

  if (alertOnly === 'true' || alertOnly === true) {
    return enriched.filter((i) => i.status !== 'OK');
  }

  return enriched;
}

/**
 * Obtiene el detalle de un insumo por ID.
 */
async function getIngredientById(id) {
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: Number(id), deletedAt: null }
  });

  if (!ingredient) {
    const error = new Error('Insumo no encontrado o fue eliminado.');
    error.statusCode = 404;
    throw error;
  }

  let status = 'OK';
  if (ingredient.currentStock === 0) {
    status = 'CRITICAL';
  } else if (ingredient.currentStock <= ingredient.minStock) {
    status = 'WARNING';
  }

  return {
    ...ingredient,
    status,
    totalValue: Math.round(ingredient.currentStock * ingredient.unitCost)
  };
}

/**
 * Crea un nuevo insumo en el catálogo.
 */
async function createIngredient(data) {
  // Verificar duplicados por nombre
  const existing = await prisma.ingredient.findFirst({
    where: { name: data.name, deletedAt: null }
  });

  if (existing) {
    const error = new Error(`Ya existe un insumo con el nombre "${data.name}".`);
    error.statusCode = 409;
    throw error;
  }

  const newIngredient = await prisma.ingredient.create({
    data
  });

  logger.info(`📦 Insumo creado: ${newIngredient.name} (ID: ${newIngredient.id})`);
  return newIngredient;
}

/**
 * Actualiza la información básica de un insumo.
 */
async function updateIngredient(id, data) {
  await getIngredientById(id);

  if (data.name) {
    const duplicate = await prisma.ingredient.findFirst({
      where: {
        name: data.name,
        deletedAt: null,
        NOT: { id: Number(id) }
      }
    });

    if (duplicate) {
      const error = new Error(`El nombre "${data.name}" ya está en uso por otro insumo.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const updated = await prisma.ingredient.update({
    where: { id: Number(id) },
    data
  });

  logger.info(`📦 Insumo actualizado: ${updated.name} (ID: ${updated.id})`);
  return updated;
}

/**
 * Elimina un insumo (soft delete).
 */
async function deleteIngredient(id) {
  await getIngredientById(id);

  const deleted = await prisma.ingredient.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() }
  });

  logger.info(`📦 Insumo eliminado (soft-delete): ${deleted.name} (ID: ${deleted.id})`);
  return deleted;
}

/**
 * Registra un movimiento individual de inventario (Compra, Consumo Diario, Merma o Ajuste).
 */
async function registerMovement(data, userId) {
  const { ingredientId, type, quantity, unitCost, notes, date } = data;

  return await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findFirst({
      where: { id: Number(ingredientId), deletedAt: null }
    });

    if (!ingredient) {
      const error = new Error('El insumo especificado no existe o fue eliminado.');
      error.statusCode = 404;
      throw error;
    }

    let newStock = ingredient.currentStock;
    const effectiveCost = unitCost !== undefined ? unitCost : ingredient.unitCost;
    const totalCost = Math.round(quantity * effectiveCost);

    if (type === 'PURCHASE') {
      newStock = ingredient.currentStock + quantity;
    } else if (type === 'DAILY_CONSUMPTION' || type === 'WASTAGE') {
      if (ingredient.currentStock < quantity) {
        logger.warn(`⚠️ Stock insuficiente para ${ingredient.name}: Stock actual ${ingredient.currentStock}, requerido ${quantity}`);
      }
      newStock = Math.max(0, ingredient.currentStock - quantity);
    } else if (type === 'ADJUSTMENT') {
      newStock = quantity;
    }

    // Actualizar stock del insumo y opcionalmente su costo unitario si fue una compra
    const updateData = { currentStock: newStock };
    if (type === 'PURCHASE' && unitCost !== undefined) {
      updateData.unitCost = unitCost;
    }

    await tx.ingredient.update({
      where: { id: Number(ingredientId) },
      data: updateData
    });

    // Registrar la entrada en el historial
    const movement = await tx.inventoryMovement.create({
      data: {
        ingredientId: Number(ingredientId),
        registeredById: Number(userId),
        type,
        quantity,
        unitCost: effectiveCost,
        totalCost,
        notes: notes || null,
        date: date ? new Date(date) : new Date()
      },
      include: {
        ingredient: true,
        registeredBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    logger.info(`🔄 Movimiento de inventario registrado [${type}]: ${quantity} ${ingredient.unit} de ${ingredient.name}. Nuevo stock: ${newStock}`);
    return movement;
  });
}

/**
 * Registra un lote de consumos diarios al final de la jornada de trabajo.
 */
async function bulkDailyConsumption(items, userId, customDate) {
  const dateObj = customDate ? new Date(customDate) : new Date();

  return await prisma.$transaction(async (tx) => {
    const results = [];

    for (const item of items) {
      const ingredient = await tx.ingredient.findFirst({
        where: { id: Number(item.ingredientId), deletedAt: null }
      });

      if (!ingredient) {
        continue;
      }

      const newStock = Math.max(0, ingredient.currentStock - item.quantity);
      const totalCost = Math.round(item.quantity * ingredient.unitCost);

      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: { currentStock: newStock }
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          ingredientId: ingredient.id,
          registeredById: Number(userId),
          type: 'DAILY_CONSUMPTION',
          quantity: item.quantity,
          unitCost: ingredient.unitCost,
          totalCost,
          notes: item.notes || 'Consumo diario al cierre de jornada',
          date: dateObj
        }
      });

      results.push(movement);
    }

    logger.info(`📊 Registro masivo de consumo diario procesado: ${results.length} insumos actualizados por usuario ID ${userId}`);
    return results;
  });
}

/**
 * Consulta el historial de movimientos de inventario.
 */
async function listMovements({ ingredientId, type, limit = 50 }) {
  const where = {};

  if (ingredientId) {
    where.ingredientId = Number(ingredientId);
  }

  if (type) {
    where.type = type;
  }

  return await prisma.inventoryMovement.findMany({
    where,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      ingredient: true,
      registeredBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });
}

module.exports = {
  listIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  registerMovement,
  bulkDailyConsumption,
  listMovements
};
