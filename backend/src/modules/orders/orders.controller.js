const { prisma } = require('../../config/db');
const logger = require('../../config/logger');
const { escapeHtml } = require('../../utils/sanitize');
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

    const { tableId, orderType, items } = parsed.data;
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

        if (table.status !== 'FREE') {
          throw new Error('TABLE_ALREADY_OCCUPIED');
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
          orderType: orderType || 'PRESENCIAL',
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

      // Registrar acción en log de auditoría
      await tx.auditLog.create({
        data: {
          userId: waiterId,
          action: 'CREAR_PEDIDO',
          description: `Se creó el pedido ID ${order.id} (Tipo: ${order.orderType}) asignado a ${tableId ? `Mesa ${order.table.number}` : 'Para Llevar/Domicilio'} por un total de $${(order.total / 100).toFixed(2)}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

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

    if (error.message === 'TABLE_ALREADY_OCCUPIED') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'La mesa seleccionada ya está ocupada por otro pedido activo.'
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
    } else if (status === 'PREPARING' || status === 'READY') {
      if (!userRoles.includes('COCINERO') && !userRoles.includes('ADMINISTRADOR') && !userRoles.includes('MESERO')) {
        return res.status(403).json({
          status: 'error',
          statusCode: 403,
          message: 'Permiso denegado. Solo cocineros, meseros y administradores pueden cambiar este estado.'
        });
      }
    } else if (status === 'SERVED') {
      if (!userRoles.includes('MESERO') && !userRoles.includes('ADMINISTRADOR')) {
        return res.status(403).json({
          status: 'error',
          statusCode: 403,
          message: 'Permiso denegado. Solo los meseros y administradores pueden marcar pedidos como servidos.'
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

      // Registrar acción en log de auditoría
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ACTUALIZAR_ESTADO_PEDIDO',
          description: `Se actualizó el estado del pedido ID ${id} de ${order.status} a ${status}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
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
            status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
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
      // Pedidos PENDING o PREPARING (por preparar), más antiguos primero (FIFO)
      prisma.order.findMany({
        where: {
          status: { in: ['PENDING', 'PREPARING'] },
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

// 7. Solicitar pre-cuenta para un pedido
async function requestOrderPreBill(req, res, next) {
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
      where: { id, deletedAt: null }
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Pedido no encontrado.'
      });
    }

    if (order.status === 'PAID' || order.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se puede solicitar pre-cuenta para un pedido ya pagado o cancelado.'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { isBillRequested: true },
        include: {
          table: true,
          waiter: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      // Crear log de auditoría
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'SOLICITAR_PRECUENTA',
          description: `Se solicitó la pre-cuenta (cobro) para el pedido ID ${id} (${updated.tableId ? `Mesa ${updated.table.number}` : 'Para Llevar/Domicilio'})`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return updated;
    });

    logger.info(`Pre-cuenta solicitada para pedido ID ${id} por usuario ID ${req.user.id}`);

    return res.status(200).json({
      status: 'success',
      order: result
    });
  } catch (error) {
    logger.error(`Error al solicitar pre-cuenta para pedido ID ${req.params.id}:`, error);
    next(error);
  }
}

// 8. Cancelar un ítem individual de la comanda con motivo
async function cancelOrderItem(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (isNaN(orderId) || isNaN(itemId)) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'ID de pedido o ID de ítem inválido.'
      });
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Debe proporcionar un motivo válido de al menos 3 caracteres.'
      });
    }

    const sanitizedReason = escapeHtml(reason.trim());

    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener pedido
      const order = await tx.order.findFirst({
        where: { id: orderId, deletedAt: null }
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (order.status === 'PAID' || order.status === 'CANCELLED') {
        throw new Error('ORDER_FINALIZED');
      }

      // 2. Obtener el ítem de la comanda
      const orderItem = await tx.orderItem.findFirst({
        where: { id: itemId, orderId, deletedAt: null },
        include: { item: true }
      });

      if (!orderItem) {
        throw new Error('ORDER_ITEM_NOT_FOUND');
      }

      // 3. Regla de seguridad: Si está READY o SERVED, solo el Administrador puede cancelarlo
      if (order.status === 'READY' || order.status === 'SERVED') {
        if (!req.user.roles.includes('ADMINISTRADOR')) {
          throw new Error('ADMIN_REQUIRED');
        }
      }

      // 4. Soft-delete del ítem de comanda
      await tx.orderItem.update({
        where: { id: itemId },
        data: { deletedAt: new Date() }
      });

      // 5. Restar valor del total de la comanda
      const costToDeduct = orderItem.price * orderItem.quantity;
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          total: { decrement: costToDeduct }
        },
        include: {
          table: true,
          waiter: {
            select: { id: true, firstName: true, lastName: true }
          },
          orderItems: {
            where: { deletedAt: null },
            include: { item: true }
          }
        }
      });

      // 6. Escribir registro en AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CANCELAR_ITEM_PEDIDO',
          description: `Se canceló el ítem ${orderItem.item.name} (Cant: ${orderItem.quantity}) de la comanda ID ${orderId}. Motivo: ${sanitizedReason}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return updatedOrder;
    });

    logger.info(`Se canceló ítem ID ${itemId} del pedido ID ${orderId} por usuario ID ${req.user.id}`);

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
    if (error.message === 'ORDER_FINALIZED') {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No se pueden cancelar ítems de un pedido que ya ha sido pagado o cancelado.'
      });
    }
    if (error.message === 'ORDER_ITEM_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'El ítem especificado no pertenece a este pedido o ya fue eliminado.'
      });
    }
    if (error.message === 'ADMIN_REQUIRED') {
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Acceso denegado. Se requiere rol de Administrador para cancelar platos que ya están listos o servidos.'
      });
    }

    logger.error('Error al cancelar ítem de comanda:', error);
    next(error);
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  appendItemsToOrder,
  updateOrderStatus,
  getKitchenOrders,
  requestOrderPreBill,
  cancelOrderItem
};
