const { z } = require('zod');

const orderItemInputSchema = z.object({
  itemId: z.number({
    required_error: 'El ID del plato/bebida es obligatorio.'
  }).int().positive(),
  quantity: z.number({
    required_error: 'La cantidad es obligatoria.'
  }).int().positive('La cantidad debe ser mayor que 0.'),
  notes: z.string().trim().max(255, 'La nota no puede exceder los 255 caracteres.').optional().nullable(),
  selectedModifiers: z.record(z.any()).optional().nullable() // e.g. { "Término": "3/4" }
});

const createOrderSchema = z.object({
  tableId: z.number().int().positive().optional().nullable(),
  items: z.array(orderItemInputSchema, {
    required_error: 'Debe agregar al menos un plato/bebida al pedido.'
  }).min(1, 'El pedido debe contener al menos un plato o bebida.')
});

const appendItemsSchema = z.object({
  items: z.array(orderItemInputSchema, {
    required_error: 'Debe agregar al menos un plato/bebida para adicionar.'
  }).min(1, 'Debe proporcionar al menos un plato o bebida para adicionar.')
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'READY', 'PAID', 'CANCELLED'], {
    required_error: 'El estado del pedido es obligatorio.',
    invalid_type_error: 'El estado del pedido debe ser uno de: PENDING, READY, PAID, CANCELLED.'
  })
});

module.exports = {
  createOrderSchema,
  appendItemsSchema,
  updateOrderStatusSchema
};
