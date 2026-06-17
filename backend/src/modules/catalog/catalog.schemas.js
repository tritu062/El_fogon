const { z } = require('zod');
const { escapeHtml } = require('../../utils/sanitize');

const createCategorySchema = z.object({
  name: z.string({
    required_error: 'El nombre de la categoría es obligatorio.',
    invalid_type_error: 'El nombre de la categoría debe ser un texto.'
  }).trim().min(1, 'El nombre de la categoría no puede estar vacío.').transform(escapeHtml),
  description: z.string().trim().optional().nullable().transform(val => val ? escapeHtml(val) : val)
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la categoría no puede estar vacío.').optional().transform(val => val ? escapeHtml(val) : val),
  description: z.string().trim().optional().nullable().transform(val => val ? escapeHtml(val) : val)
});

const modifierSchema = z.object({
  name: z.string({
    required_error: 'El nombre del modificador es obligatorio.'
  }).trim().min(1, 'El nombre del modificador no puede estar vacío.').transform(escapeHtml),
  options: z.array(z.string().trim().min(1, 'La opción no puede estar vacía.').transform(escapeHtml)).min(1, 'Debe haber al menos una opción.')
});

const createItemSchema = z.object({
  name: z.string({
    required_error: 'El nombre del plato/bebida es obligatorio.',
    invalid_type_error: 'El nombre del plato/bebida debe ser un texto.'
  }).trim().min(1, 'El nombre del plato/bebida no puede estar vacío.').transform(escapeHtml),
  description: z.string().trim().optional().nullable().transform(val => val ? escapeHtml(val) : val),
  price: z.number({
    required_error: 'El precio es obligatorio.',
    invalid_type_error: 'El precio debe ser un número.'
  }).int('El precio debe ser un número entero (centavos).').nonnegative('El precio no puede ser negativo.'),
  imageUrl: z.string().url('La URL de la imagen no es válida.').or(z.string().length(0)).optional().nullable(),
  isAvailable: z.boolean().optional().default(true),
  categoryId: z.number({
    required_error: 'La categoría es obligatoria.',
    invalid_type_error: 'El ID de la categoría debe ser un número.'
  }).int().positive(),
  modifiers: z.array(modifierSchema).optional().nullable()
});

const updateItemSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del plato/bebida no puede estar vacío.').optional().transform(val => val ? escapeHtml(val) : val),
  description: z.string().trim().optional().nullable().transform(val => val ? escapeHtml(val) : val),
  price: z.number().int().nonnegative('El precio no puede ser negativo.').optional(),
  imageUrl: z.string().url('La URL de la imagen no es válida.').or(z.string().length(0)).optional().nullable(),
  isAvailable: z.boolean().optional(),
  categoryId: z.number().int().positive().optional(),
  modifiers: z.array(modifierSchema).optional().nullable()
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema
};
