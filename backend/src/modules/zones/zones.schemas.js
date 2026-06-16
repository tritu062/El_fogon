const { z } = require('zod');

const createZoneSchema = z.object({
  name: z.string({
    required_error: 'El nombre de la zona es obligatorio.'
  }).min(2, 'El nombre de la zona debe tener al menos 2 caracteres.').max(50, 'El nombre de la zona no puede superar los 50 caracteres.'),
  description: z.string().max(255, 'La descripción no puede superar los 255 caracteres.').optional().nullable()
});

const updateZoneSchema = z.object({
  name: z.string().min(2, 'El nombre de la zona debe tener al menos 2 caracteres.').max(50, 'El nombre de la zona no puede superar los 50 caracteres.').optional(),
  description: z.string().max(255, 'La descripción no puede superar los 255 caracteres.').optional().nullable()
});

module.exports = {
  createZoneSchema,
  updateZoneSchema
};
