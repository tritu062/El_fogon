const { z } = require('zod');
const { escapeHtml } = require('../../utils/sanitize');

const orderItemInputSchema = z.object({
  itemId: z.number({
    required_error: 'El ID del plato/bebida es obligatorio.'
  }).int().positive(),
  quantity: z.number({
    required_error: 'La cantidad es obligatoria.'
  }).int().positive('La cantidad debe ser mayor que 0.'),
  notes: z.string().trim().max(255, 'La nota no puede exceder los 255 caracteres.').optional().nullable().transform(val => val ? escapeHtml(val) : val),
  selectedModifiers: z.record(z.any()).optional().nullable() // e.g. { "Término": "3/4" }
});

const createOrderSchema = z.object({
  tableId: z.number().int().positive().optional().nullable(),
  orderType: z.enum(['PRESENCIAL', 'PARA_LLEVAR', 'DOMICILIO'], {
    invalid_type_error: 'El tipo de pedido debe ser uno de: PRESENCIAL, PARA_LLEVAR, DOMICILIO.'
  }).optional().default('PRESENCIAL'),
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
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED'], {
    required_error: 'El estado del pedido es obligatorio.',
    invalid_type_error: 'El estado del pedido debe ser uno de: PENDING, PREPARING, READY, SERVED, PAID, CANCELLED.'
  })
});

module.exports = {
  createOrderSchema,
  appendItemsSchema,
  updateOrderStatusSchema
};
