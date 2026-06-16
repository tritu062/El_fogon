import React, { createContext, useState, useEffect } from 'react';
import api, { setAccessTokenInMemory } from '../lib/api';

export const AuthContext = createContext();

/**
 * Proveedor de Estado Global de Autenticación.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión activa al arrancar la app
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Al consultar /auth/me, el interceptor de Axios intentará automáticamente
        // refrescar el token si está vacío en memoria pero existe una cookie válida.
        const res = await api.get('/auth/me');
        if (res.data.status === 'success') {
          setUser(res.data.user);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Ignoramos error en el arranque silenciosamente; significa que no hay sesión activa
        setAccessTokenInMemory(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Escuchar el evento 'auth-logout' inyectado por el interceptor HTTP de Axios
  useEffect(() => {
    const handleForceLogout = (e) => {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      // Podríamos limpiar almacenamiento o alertar de expiración
      console.warn('Forzar Cierre de Sesión:', e.detail);
    };

    window.addEventListener('auth-logout', handleForceLogout);
    return () => window.removeEventListener('auth-logout', handleForceLogout);
  }, []);

  /**
   * Envía credenciales a la API para iniciar sesión.
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = res.data;
      
      // Guardar token en memoria
      setAccessTokenInMemory(accessToken);
      setUser(userData);
      setIsAuthenticated(true);
      return res.data;
    } catch (err) {
      setAccessTokenInMemory(null);
      setUser(null);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cierra la sesión activa en el cliente y en el servidor.
   */
  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Error al cerrar sesión en el servidor:', err);
    } finally {
      setAccessTokenInMemory(null);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
