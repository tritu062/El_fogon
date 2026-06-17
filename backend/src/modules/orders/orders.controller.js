const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const {
  createOrderSchema,
  appendItemsSchema,
  updateOrderStatusSchema
} = require('./orders.schemas');

// ==========================================
// ORDERS CONTROLLERS
// ==========================================

// 1. Obtener todos los pedidos con filtros
async function getAllOrders(req, res, next) {
  try {
    const { status, tableId, waiterId } = req.query;

    const whereClause = { deletedAt: null };

    if (status) {
      whereClause.status = status;
    }

    if (tableId) {
      const tableIdParsed = parseInt(tableId, 10);
      if (!isNaN(tableIdParsed)) {
        whereClause.tableId = tableIdParsed;
      }
    }

    if (waiterId) {
      const waiterIdParsed = parseInt(waiterId, 10);
      if (!isNaN(waiterIdParsed)) {
        whereClause.waiterId = waiterIdParsed;
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        table: true,
        waiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        orderItems: {
          where: { deletedAt: null },
          include: {
            item: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      status: 'success',
      orders
    });
  } catch (error) {
    logger.error('Error al obtener pedidos:', error);
    next(error);
  }
}

// 2. Obtener un pedido por ID
async function getOrderById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de pedido inválido.'
      });
    }

    const order = await prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        table: true,
        waiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        orderItems: {
          where: { deletedAt: null },
          include: {
            item: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Pedido no encontrado.'
      });
    }

    return res.status(200).json({
      status: 'success',
      order
    });
  } catch (error) {
    logger.error(`Error al obtener pedido ID ${req.params.id}:`, error);
    next(error);
  }
}

// 3. Crear una comanda / pedido
async function createOrder(req, res, next) {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { tableId, items } = parsed.data;
    const waiterId = req.user.id;

    // Ejecutar creación del pedido dentro de una transacción de Prisma
    const result = await prisma.$transaction(async (tx) => {
      // Si se proporcionó mesa, verificar su validez y disponibilidad
      if (tableId) {
        const table = await tx.table.findFirst({
          where: { id: tableId, deletedAt: null }
        });

        if (!table) {
          throw new Error('TABLE_NOT_FOUND');
        }
      }

      // Validar platos/bebidas e historial de precios
      let calculatedTotal = 0;
      const orderItemsToCreate = [];

      for (const itemInput of items) {
        const item = await tx.item.findFirst({
          where: { id: itemInput.itemId, deletedAt: null }
        });

        if (!item) {
          throw new Error(`ITEM_NOT_FOUND:${itemInput.itemId}`);
        }

        if (!item.isAvailable) {
          throw new Error(`ITEM_NOT_AVAILABLE:${item.name}`);
        }

        calculatedTotal += item.price * itemInput.quantity;

        orderItemsToCreate.push({
          itemId: item.id,
          quantity: itemInput.quantity,
          price: item.price, // Precio de venta histórico en centavos
          notes: itemInput.notes || null,
          selectedModifiers: itemInput.selectedModifiers || null
        });
      }

      // Crear pedido en la base de datos
      const order = await tx.order.create({
        data: {
          tableId: tableId || null,
          waiterId,
          total: calculatedTotal,
          status: 'PENDING',
          orderItems: {
            create: orderItemsToCreate
          }
        },
        include: {
          table: true,
          waiter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          orderItems: {
            include: {
              item: true
            }
          }
        }
      });

      // Si tiene mesa asignada, cambiar estado a OCCUPIED
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' }
        });
      }

      return order;
    });

    logger.info(`Pedido creado con éxito ID ${result.id} por mesero ID ${waiterId}`);

    return res.status(201).json({
      status: 'success',
      order: result
    });

  } catch (error) {
    if (error.message === 'TABLE_NOT_FOUND') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'La mesa seleccionada no existe o está inactiva.'
      });
    }

    if (error.message.startsWith('ITEM_NOT_FOUND:')) {
      const itemId = error.message.split(':')[1];
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: `El plato o bebida con ID ${itemId} no existe o está inactivo.`
      });
    }

    if (error.message.startsWith('ITEM_NOT_AVAILABLE:')) {
      const itemName = error.message.split(':')[1];
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: `El plato o bebida '${itemName}' no está disponible actualmente.`
      });
    }

    logger.error('Error al crear pedido:', error);
    next(error);
  }
}

// 4. Adicionar ítems a una comanda activa
async function appendItemsToOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de pedido inválido.'
      });
    }

    const parsed = appendItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { items } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Buscar el pedido y asegurar que esté activo (PENDING o READY)
      const order = await tx.order.findFirst({
        where: { id, deletedAt: null }
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (order.status === 'PAID' || order.status === 'CANCELLED') {
        throw new Error('ORDER_INACTIVE');
      }

      let additionalCost = 0;
      const orderItemsToCreate = [];

      for (const itemInput of items) {
        const item = await tx.item.findFirst({
          where: { id: itemInput.itemId, deletedAt: null }
        });

        if (!item) {
          throw new Error(`ITEM_NOT_FOUND:${itemInput.itemId}`);
        }

        if (!item.isAvailable) {
          throw new Error(`ITEM_NOT_AVAILABLE:${item.name}`);
        }

        additionalCost += item.price * itemInput.quantity;

        orderItemsToCreate.push({
          orderId: id,
          itemId: item.id,
          quantity: itemInput.quantity,
          price: item.price,
          notes: itemInput.notes || null,
          selectedModifiers: itemInput.selectedModifiers || null
        });
      }

      // Crear los nuevos ítems de la comanda
      await tx.orderItem.createMany({
        data: orderItemsToCreate
      });

      // Actualizar el valor total de la orden
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          total: order.total + additionalCost
        },
        include: {
          table: true,
          waiter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          orderItems: {
            where: { deletedAt: null },
            include: {
              item: true
            }
          }
        }
      });

      return updatedOrder;
    });

    logger.info(`Se adicionaron ítems al pedido ID ${id}`);

    return res.status(200).json({
      status: 'success',
      order: result
    });

  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Pedido no encontrado.'
      });
    }

    if (error.message === 'ORDER_INACTIVE') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se pueden adicionar ítems a un pedido pagado o cancelado.'
      });
    }

    if (error.message.startsWith('ITEM_NOT_FOUND:')) {
      const itemId = error.message.split(':')[1];
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: `El plato o bebida con ID ${itemId} no existe o está inactivo.`
      });
    }

    if (error.message.startsWith('ITEM_NOT_AVAILABLE:')) {
      const itemName = error.message.split(':')[1];
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: `El plato o bebida '${itemName}' no está disponible actualmente.`
      });
    }

    logger.error('Error al adicionar ítems al pedido:', error);
    next(error);
  }
}

// 5. Cambiar el estado del pedido (con RBAC interno)
async function updateOrderStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de pedido inválido.'
      });
    }

    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Datos de entrada inválidos.',
        errors: parsed.error.format()
      });
    }

    const { status } = parsed.data;
    const userRoles = req.user.roles;

    // RBAC a nivel de transición de estado
    if (status === 'CANCELLED') {
      if (!userRoles.includes('ADMINISTRADOR')) {
        return res.status(403).json({
          status: 'error',
          statusCode: 403,
          message: 'Permiso denegado. Solo los administradores pueden cancelar pedidos.'
        });
      }
    } else if (status === 'PAID') {
      if (!userRoles.includes('CAJERO') && !userRoles.includes('ADMINISTRADOR')) {
        return res.status(403).json({
          status: 'error',
          statusCode: 403,
          message: 'Permiso denegado. Solo cajeros y administradores pueden marcar pedidos como pagados.'
        });
      }
    } else if (status === 'READY') {
      if (!userRoles.includes('COCINERO') && !userRoles.includes('MESERO') && !userRoles.includes('ADMINISTRADOR')) {
        return res.status(403).json({
          status: 'error',
          statusCode: 403,
          message: 'Permiso denegado. Rol no autorizado para marcar pedidos como listos.'
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, deletedAt: null }
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      // No permitir modificar estados si el pedido ya está pagado o cancelado (estados finales)
      if (order.status === 'PAID' || order.status === 'CANCELLED') {
        throw new Error('ORDER_ALREADY_FINALIZED');
      }

      // Actualizar el estado del pedido
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
        include: {
          table: true,
          waiter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          orderItems: {
            where: { deletedAt: null },
            include: {
              item: true
            }
          }
        }
      });

      // Si el pedido se marca como PAID o CANCELLED, y tiene mesa asignada,
      // verificar si hay otros pedidos activos en esta misma mesa.
      // Si no los hay, liberar la mesa (poner en FREE).
      if ((status === 'PAID' || status === 'CANCELLED') && order.tableId) {
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: id },
            status: { in: ['PENDING', 'READY'] },
            deletedAt: null
          }
        });

        if (activeOrdersCount === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: 'FREE' }
          });
        }
      }

      return updatedOrder;
    });

    logger.info(`Pedido ID ${id} actualizado a estado ${status}`);

    return res.status(200).json({
      status: 'success',
      order: result
    });

  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Pedido no encontrado.'
      });
    }

    if (error.message === 'ORDER_ALREADY_FINALIZED') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se puede modificar un pedido que ya ha sido pagado o cancelado.'
      });
    }

    logger.error('Error al actualizar estado del pedido:', error);
    next(error);
  }
}

// 6. Obtener pedidos optimizados para la cocina (KDS)
async function getKitchenOrders(req, res, next) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [pending, ready] = await Promise.all([
      // Pedidos PENDING (por preparar), más antiguos primero (FIFO)
      prisma.order.findMany({
        where: {
          status: 'PENDING',
          deletedAt: null
        },
        include: {
          table: true,
          waiter: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          orderItems: {
            where: { deletedAt: null },
            include: {
              item: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      // Pedidos READY despachados hoy, más recientes primero
      prisma.order.findMany({
        where: {
          status: 'READY',
          updatedAt: { gte: todayStart },
          deletedAt: null
        },
        include: {
          table: true,
          waiter: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          orderItems: {
            where: { deletedAt: null },
            include: {
              item: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    return res.status(200).json({
      status: 'success',
      pending,
      ready
    });
  } catch (error) {
    logger.error('Error al obtener pedidos de cocina (KDS):', error);
    next(error);
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  appendItemsToOrder,
  updateOrderStatus,
  getKitchenOrders
};
