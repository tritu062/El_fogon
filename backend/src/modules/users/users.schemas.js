const { z } = require('zod');
const { escapeHtml } = require('../../utils/sanitize');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#+])[A-Za-z\d@$!%*?&._\-#+]{8,}$/;

const updateUserSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.').trim().toLowerCase().optional(),
  firstName: z.string().trim().min(1, 'El nombre es obligatorio.').max(100).transform(escapeHtml).optional(),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio.').max(100).transform(escapeHtml).optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.string()).min(1, 'Debe asignar al menos un rol.').optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').regex(PASSWORD_REGEX, 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.').optional().nullable()
});

module.exports = {
  updateUserSchema
};
