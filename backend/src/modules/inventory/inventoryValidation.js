const { z } = require('zod');

// Categorías válidas para insumos
const CATEGORIES = ['CARNES', 'VERDURAS', 'LACTEOS', 'ABARROTES', 'BEBIDAS', 'DESECHABLES', 'OTROS'];

// Unidades de medida válidas
const UNITS = ['KG', 'LB', 'G', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES', 'CAJAS'];

// Esquema para crear o actualizar un insumo
const ingredientSchema = z.object({
  name: z.string({ required_error: 'El nombre del insumo es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),
  category: z.enum(CATEGORIES, { invalid_type_error: 'Categoría de insumo inválida.' })
    .default('ABARROTES'),
  unit: z.enum(UNITS, { invalid_type_error: 'Unidad de medida inválida.' })
    .default('UNIDADES'),
  currentStock: z.number({ invalid_type_error: 'El stock debe ser un número.' })
    .min(0, 'El stock no puede ser negativo.')
    .default(0),
  minStock: z.number({ invalid_type_error: 'El stock mínimo debe ser un número.' })
    .min(0, 'El stock mínimo no puede ser negativo.')
    .default(0),
  unitCost: z.number({ invalid_type_error: 'El costo unitario debe ser un número entero en centavos.' })
    .int('El costo unitario debe estar expresado en centavos.')
    .min(0, 'El costo unitario no puede ser negativo.')
    .default(0)
});

// Esquema para registrar un movimiento de inventario (compra, consumo diario, merma, ajuste)
const movementSchema = z.object({
  ingredientId: z.number({ required_error: 'El ID del insumo es obligatorio.' })
    .int()
    .positive(),
  type: z.enum(['DAILY_CONSUMPTION', 'PURCHASE', 'WASTAGE', 'ADJUSTMENT'], {
    required_error: 'El tipo de movimiento es obligatorio (DAILY_CONSUMPTION, PURCHASE, WASTAGE, ADJUSTMENT).'
  }),
  quantity: z.number({ required_error: 'La cantidad es obligatoria.' })
    .positive('La cantidad debe ser mayor a 0.'),
  unitCost: z.number().int().min(0).optional(),
  notes: z.string().trim().max(255, 'Las notas no pueden superar 255 caracteres.').optional(),
  date: z.string().datetime().optional()
});

// Esquema para registro masivo de consumo diario al final del turno/día
const bulkDailyConsumptionSchema = z.object({
  date: z.string().optional(),
  items: z.array(z.object({
    ingredientId: z.number().int().positive(),
    quantity: z.number().positive(),
    notes: z.string().trim().optional()
  })).min(1, 'Debe incluir al menos un insumo consumido.')
});

module.exports = {
  CATEGORIES,
  UNITS,
  ingredientSchema,
  movementSchema,
  bulkDailyConsumptionSchema
};
