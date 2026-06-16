const { z } = require('zod');

const createTableSchema = z.object({
  number: z.number({
    required_error: 'El número de mesa es obligatorio.',
    invalid_type_error: 'El número de mesa debe ser un valor numérico.'
  }).int('El número de mesa debe ser un número entero.').positive('El número de mesa debe ser mayor que 0.'),
  zoneId: z.number({
    required_error: 'El ID de la zona es obligatorio.',
    invalid_type_error: 'El ID de la zona debe ser un valor numérico.'
  }).int('El ID de la zona debe ser un número entero.').positive('El ID de la zona debe ser válido.')
});

const updateTableSchema = z.object({
  number: z.number().int().positive().optional(),
  zoneId: z.number().int().positive().optional(),
  status: z.enum(['FREE', 'OCCUPIED', 'RESERVED']).optional()
});

const updateTableStatusSchema = z.object({
  status: z.enum(['FREE', 'OCCUPIED', 'RESERVED'], {
    required_error: 'El estado de la mesa es obligatorio.',
    invalid_type_error: 'El estado de la mesa debe ser uno de: FREE, OCCUPIED, RESERVED.'
  })
});

module.exports = {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema
};
