const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const {
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema
} = require('./catalog.schemas');

// ==========================================
// CATEGORIES CONTROLLERS
// ==========================================

// 1. Obtener todas las categorías activas
async function getAllCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      categories
    });
  } catch (error) {
    logger.error('Error al obtener categorías:', error);
    next(error);
  }
}

// 2. Obtener una categoría por ID
async function getCategoryById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de categoría inválido.'
      });
    }

    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null }
    });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Categoría no encontrada.'
      });
    }

    return res.status(200).json({
      status: 'success',
      category
    });
  } catch (error) {
    logger.error(`Error al obtener categoría ID ${req.params.id}:`, error);
    next(error);
  }
}

// 3. Crear una nueva categoría
async function createCategory(req, res, next) {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { name, description } = parsed.data;

    // Verificar si ya existe una categoría activa con el mismo nombre
    const existing = await prisma.category.findFirst({
      where: { name, deletedAt: null }
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: `La categoría '${name}' ya existe.`
      });
    }

    const category = await prisma.category.create({
      data: { name, description }
    });

    logger.info(`Categoría creada: ${name} (ID: ${category.id})`);

    return res.status(201).json({
      status: 'success',
      category
    });
  } catch (error) {
    logger.error('Error al crear categoría:', error);
    next(error);
  }
}

// 4. Actualizar una categoría existente
async function updateCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de categoría inválido.'
      });
    }

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    // Buscar si la categoría existe y está activa
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null }
    });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Categoría no encontrada.'
      });
    }

    const { name, description } = parsed.data;

    // Si cambia el nombre, verificar que no cause colisión con otra categoría activa
    if (name && name !== category.name) {
      const colision = await prisma.category.findFirst({
        where: { name, deletedAt: null }
      });
      if (colision) {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          message: `Ya existe otra categoría activa con el nombre '${name}'.`
        });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description })
      }
    });

    logger.info(`Categoría actualizada ID ${id}`);

    return res.status(200).json({
      status: 'success',
      category: updated
    });
  } catch (error) {
    logger.error(`Error al actualizar categoría ID ${req.params.id}:`, error);
    next(error);
  }
}

// 5. Soft-delete de una categoría
async function deleteCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de categoría inválido.'
      });
    }

    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null }
    });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Categoría no encontrada.'
      });
    }

    // Verificar si la categoría tiene ítems activos (no borrados) vinculados
    const activeItemsCount = await prisma.item.count({
      where: { categoryId: id, deletedAt: null }
    });

    if (activeItemsCount > 0) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se puede eliminar la categoría porque contiene platos o bebidas activos.'
      });
    }

    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info(`Categoría eliminada (soft-delete) ID ${id}`);

    return res.status(200).json({
      status: 'success',
      message: 'Categoría eliminada correctamente.'
    });
  } catch (error) {
    logger.error(`Error al eliminar categoría ID ${req.params.id}:`, error);
    next(error);
  }
}

// ==========================================
// ITEMS CONTROLLERS (PLATOS / BEBIDAS)
// ==========================================

// 1. Obtener todos los ítems activos
async function getAllItems(req, res, next) {
  try {
    const { categoryId, isAvailable } = req.query;

    const whereClause = { deletedAt: null };

    if (categoryId) {
      const catIdParsed = parseInt(categoryId, 10);
      if (!isNaN(catIdParsed)) {
        whereClause.categoryId = catIdParsed;
      }
    }

    if (isAvailable !== undefined) {
      whereClause.isAvailable = isAvailable === 'true';
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      items
    });
  } catch (error) {
    logger.error('Error al obtener ítems:', error);
    next(error);
  }
}

// 2. Obtener un ítem por ID
async function getItemById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de ítem inválido.'
      });
    }

    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true
      }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Plato o bebida no encontrado.'
      });
    }

    return res.status(200).json({
      status: 'success',
      item
    });
  } catch (error) {
    logger.error(`Error al obtener ítem ID ${req.params.id}:`, error);
    next(error);
  }
}

// 3. Crear un nuevo plato/bebida
async function createItem(req, res, next) {
  try {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { name, description, price, imageUrl, isAvailable, categoryId, modifiers } = parsed.data;

    // Verificar que la categoría exista y esté activa
    const category = await prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null }
    });

    if (!category) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'La categoría seleccionada no existe o está inactiva.'
      });
    }

    // Verificar si ya existe un plato activo con el mismo nombre en esta categoría
    const existing = await prisma.item.findFirst({
      where: { name, categoryId, deletedAt: null }
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: `El plato o bebida '${name}' ya existe en esta categoría.`
      });
    }

    const item = await prisma.item.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        isAvailable,
        categoryId,
        modifiers: modifiers || undefined
      },
      include: {
        category: true
      }
    });

    logger.info(`Plato/Bebida creado: ${name} (ID: ${item.id})`);

    return res.status(201).json({
      status: 'success',
      item
    });
  } catch (error) {
    logger.error('Error al crear ítem:', error);
    next(error);
  }
}

// 4. Actualizar un plato/bebida
async function updateItem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de ítem inválido.'
      });
    }

    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Plato o bebida no encontrado.'
      });
    }

    const { name, description, price, imageUrl, isAvailable, categoryId, modifiers } = parsed.data;

    // Verificar categoría si cambia
    if (categoryId && categoryId !== item.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, deletedAt: null }
      });
      if (!category) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'La categoría seleccionada no existe o está inactiva.'
        });
      }
    }

    // Verificar colisión de nombre en la categoría correspondiente
    const targetCategoryId = categoryId || item.categoryId;
    const targetName = name || item.name;
    if (name || categoryId) {
      const colision = await prisma.item.findFirst({
        where: {
          id: { not: id },
          name: targetName,
          categoryId: targetCategoryId,
          deletedAt: null
        }
      });
      if (colision) {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          message: `Ya existe otro plato o bebida con el nombre '${targetName}' en la categoría seleccionada.`
        });
      }
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(categoryId !== undefined && { categoryId }),
        ...(modifiers !== undefined && { modifiers })
      },
      include: {
        category: true
      }
    });

    logger.info(`Plato/Bebida actualizado ID ${id}`);

    return res.status(200).json({
      status: 'success',
      item: updated
    });
  } catch (error) {
    logger.error(`Error al actualizar ítem ID ${req.params.id}:`, error);
    next(error);
  }
}

// 5. Activar/Desactivar disponibilidad individual (PATCH)
async function updateItemAvailability(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de ítem inválido.'
      });
    }

    const { isAvailable } = req.body;
    if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'El campo isAvailable es obligatorio y debe ser booleano.'
      });
    }

    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Plato o bebida no encontrado.'
      });
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { isAvailable },
      include: { category: true }
    });

    logger.info(`Disponibilidad de plato/bebida ID ${id} cambiada a ${isAvailable}`);

    return res.status(200).json({
      status: 'success',
      item: updated
    });
  } catch (error) {
    logger.error(`Error al actualizar disponibilidad de ítem ID ${req.params.id}:`, error);
    next(error);
  }
}

// 6. Soft-delete de un plato/bebida
async function deleteItem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de ítem inválido.'
      });
    }

    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Plato o bebida no encontrado.'
      });
    }

    await prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info(`Plato/Bebida eliminado (soft-delete) ID ${id}`);

    return res.status(200).json({
      status: 'success',
      message: 'Plato o bebida eliminado correctamente.'
    });
  } catch (error) {
    logger.error(`Error al eliminar ítem ID ${req.params.id}:`, error);
    next(error);
  }
}

module.exports = {
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
};
