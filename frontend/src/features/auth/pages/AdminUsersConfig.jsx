import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { userService } from '../services/userService';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Mail, 
  User, 
  Check, 
  X, 
  AlertCircle, 
  UserCheck, 
  UserX,
  Lock,
  Loader2
} from 'lucide-react';

export default function AdminUsersConfig() {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Estados para el Modal (Crear / Editar)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Campos del Formulario
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roles: [],
    isActive: true
  });
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [formErrors, setFormErrors] = useState(null);

  const availableRoles = [
    { name: 'ADMINISTRADOR', description: 'Acceso total y configuración' },
    { name: 'MESERO', description: 'Toma de comandas y mesas' },
    { name: 'COCINERO', description: 'Preparación y KDS' },
    { name: 'CAJERO', description: 'Cobro de cuentas y arqueos' }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('No se pudo cargar el listado de usuarios del sistema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Limpiar alertas automáticamente
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      roles: [],
      isActive: true
    });
    setFormErrors(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setIsEditing(true);
    setSelectedUserId(user.id);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: '', // Vacío para no actualizar la contraseña a menos que se escriba una nueva
      roles: user.roles,
      isActive: user.isActive
    });
    setFormErrors(null);
    setModalOpen(true);
  };

  const handleCheckboxChange = (roleName) => {
    setFormData(prev => {
      const roles = prev.roles.includes(roleName)
        ? prev.roles.filter(r => r !== roleName)
        : [...prev.roles, roleName];
      return { ...prev, roles };
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setFormErrors(null);

    // Validar básico antes de enviar
    if (formData.roles.length === 0) {
      setFormErrors({ message: 'Debe seleccionar al menos un rol para el usuario.' });
      setFormSubmitLoading(false);
      return;
    }

    try {
      if (isEditing) {
        // En edición, si la contraseña está vacía no la enviamos
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        
        await userService.updateUser(selectedUserId, payload);
        setSuccessMsg('Usuario actualizado con éxito.');
      } else {
        await userService.createUser(formData);
        setSuccessMsg('Usuario registrado con éxito.');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error al guardar usuario:', err);
      const backendError = err.response?.data;
      if (backendError && backendError.message) {
        setFormErrors({ message: backendError.message, details: backendError.errors });
      } else {
        setFormErrors({ message: 'Ocurrió un error inesperado al procesar la solicitud.' });
      }
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      alert('No puedes eliminar tu propia cuenta en uso.');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea eliminar lógicamente al usuario ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      await userService.deleteUser(user.id);
      setSuccessMsg('Usuario eliminado con éxito.');
      fetchUsers();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      const backendError = err.response?.data;
      if (backendError && backendError.message) {
        setError(backendError.message);
      } else {
        setError('No se pudo eliminar al usuario. Intente de nuevo.');
      }
      // Hacer scroll hacia arriba para ver el banner de error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Gestión de Personal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Administración de cuentas de empleados, asignación de roles operativos y control de acceso.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-650 text-white rounded-xl shadow-md shadow-brand-500/20 font-bold transition-all text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-2xl text-sm font-medium flex items-center gap-3">
          <span className="text-lg">✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-250 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-2xl text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline font-semibold">Descartar</button>
        </div>
      )}

      {/* Listado de Usuarios */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
          <p className="text-sm text-slate-450 dark:text-slate-500 mt-3 font-semibold">Cargando personal...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/85">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Nombre</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Correo Electrónico</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Roles</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-sm">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-450 dark:text-slate-500 italic">
                      No se encontraron empleados registrados.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-350 flex items-center justify-center font-bold border border-slate-200/50 dark:border-slate-800">
                            {item.firstName.charAt(0)}{item.lastName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-white">{item.firstName} {item.lastName}</span>
                            {item.id === currentUser.id && (
                              <span className="ml-2 px-2 py-0.5 text-[10px] bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 font-extrabold rounded-md uppercase tracking-wider">Tú</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.roles.map(role => (
                            <span 
                              key={role} 
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg ${
                                role === 'ADMINISTRADOR'
                                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200/30'
                                  : role === 'MESERO'
                                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/30'
                                  : role === 'COCINERO'
                                  ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-400 border border-yellow-200/30'
                                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/30'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              <span>{role}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/15 rounded-lg border border-green-200/25">
                            <UserCheck className="w-3.5 h-3.5" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/15 rounded-lg border border-red-200/25">
                            <UserX className="w-3.5 h-3.5" />
                            Desactivado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 text-slate-500 hover:text-brand-500 dark:text-slate-450 dark:hover:text-brand-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(item)}
                            disabled={item.id === currentUser.id}
                            className={`p-2 rounded-xl transition-colors ${
                              item.id === currentUser.id 
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                                : 'text-slate-500 hover:text-red-500 dark:text-slate-450 dark:hover:text-red-450 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Fondo difuminado */}
          <div onClick={() => setModalOpen(false)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"></div>

          {/* Caja del Modal */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto z-10 animate-scale-in">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              {isEditing ? <Edit2 className="w-5 h-5 text-brand-500" /> : <UserPlus className="w-5 h-5 text-brand-500" />}
              <span>{isEditing ? 'Editar Empleado' : 'Registrar Empleado'}</span>
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mb-6">
              {isEditing ? 'Modifica los datos del personal o actualiza sus roles operativos.' : 'Crea una nueva cuenta de empleado con acceso restringido por roles.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formErrors && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40 text-red-750 dark:text-red-400 text-xs rounded-2xl flex flex-col gap-1.5 font-medium">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formErrors.message}</span>
                  </div>
                  {formErrors.details && (
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-semibold text-red-650 dark:text-red-400/90">
                      {Object.keys(formErrors.details).map(k => {
                        if (k === '_errors') return null;
                        const errorField = formErrors.details[k];
                        return <li key={k}>{errorField._errors?.join(', ')}</li>;
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* Fila de Nombres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Carlos"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 dark:text-slate-150"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">Apellido</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Mendoza"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 dark:text-slate-150"
                    />
                  </div>
                </div>
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="carlos@elfogon.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 dark:text-slate-150"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">Contraseña</label>
                  {isEditing && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold italic">Llenar solo para cambiar</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!isEditing}
                    placeholder={isEditing ? "••••••••" : "Admin123!"}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 dark:text-slate-150"
                  />
                </div>
              </div>

              {/* Selección de Roles */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 block mb-1">
                  Roles Operativos
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {availableRoles.map(role => {
                    const isChecked = formData.roles.includes(role.name);
                    return (
                      <button
                        key={role.name}
                        type="button"
                        onClick={() => handleCheckboxChange(role.name)}
                        className={`flex items-start text-left gap-3 p-3.5 rounded-2xl border transition-all ${
                          isChecked
                            ? 'bg-brand-50/40 border-brand-300 dark:bg-brand-950/10 dark:border-brand-850 text-brand-700 dark:text-brand-450 shadow-inner'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        <div className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : 'border-slate-300 dark:border-slate-750 bg-white dark:bg-slate-900'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-wide">{role.name}</div>
                          <div className="text-[10px] text-slate-450 dark:text-slate-500 font-medium mt-0.5">{role.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estado (Solo en Edición) */}
              {isEditing && (
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl">
                  <div>
                    <span className="text-sm font-bold block">Cuenta Activa</span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold block mt-0.5">
                      Si se desactiva, el empleado no podrá iniciar sesión en el sistema.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-10 h-5 rounded-full bg-slate-300 checked:bg-brand-500 transition-colors appearance-none cursor-pointer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white checked:after:translate-x-5 after:transition-all shadow-inner border border-slate-350 dark:border-slate-800"
                  />
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4.5 py-3 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold rounded-2xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitLoading}
                  className="flex-1 px-4.5 py-3 bg-brand-500 hover:bg-brand-650 text-white font-bold rounded-2xl text-sm shadow-md shadow-brand-500/15 flex items-center justify-center gap-2"
                >
                  {formSubmitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
