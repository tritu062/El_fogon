const { z } = require('zod');

const paymentInputSchema = z.object({
  amount: z.number({
    required_error: 'El monto del pago es obligatorio.'
  }).int().positive('El monto del pago debe ser mayor que 0.'),
  method: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'], {
    required_error: 'El método de pago es obligatorio.',
    invalid_type_error: 'El método de pago debe ser uno de: EFECTIVO, TARJETA, TRANSFERENCIA.'
  })
});

const createBillSchema = z.object({
  orderId: z.number({
    required_error: 'El ID de pedido es obligatorio.'
  }).int().positive(),
  discount: z.number().int().nonnegative('El descuento no puede ser negativo.').default(0),
  tax: z.number().int().nonnegative('El impuesto no puede ser negativo.').default(0),
  payments: z.array(paymentInputSchema, {
    required_error: 'Debe especificar al menos un pago.'
  }).min(1, 'Debe registrar al menos un método de pago.')
});

module.exports = {
  createBillSchema
};
