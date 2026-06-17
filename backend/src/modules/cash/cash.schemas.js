const { z } = require('zod');
const { escapeHtml } = require('../../utils/sanitize');

const openRegisterSchema = z.object({
  openingBalance: z.number({
    required_error: 'El saldo inicial de apertura es obligatorio.'
  }).int().nonnegative('El saldo inicial de apertura no puede ser negativo.'),
  notes: z.string().trim().max(500, 'Las notas no pueden exceder los 500 caracteres.').optional().nullable().transform(val => val ? escapeHtml(val) : val)
});

const closeRegisterSchema = z.object({
  actualClosingBalance: z.number({
    required_error: 'El saldo real de cierre es obligatorio.'
  }).int().nonnegative('El saldo real de cierre no puede ser negativo.'),
  notes: z.string().trim().max(500, 'Las notas no pueden exceder los 500 caracteres.').optional().nullable().transform(val => val ? escapeHtml(val) : val)
});

module.exports = {
  openRegisterSchema,
  closeRegisterSchema
};
