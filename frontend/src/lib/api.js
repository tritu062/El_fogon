import axios from 'axios';

// Instancia única de Axios configurada para conectar con la API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true // Habilita el envío automático de cookies httpOnly (Refresh Token) en las llamadas
});

// Variable en memoria para almacenar de forma segura el JWT Access Token (lejos de XSS)
let inMemoryAccessToken = null;

/**
 * Expone la asignación del token en memoria para que pueda ser actualizado por el AuthContext.
 * @param {string|null} token JWT Access Token obtenido de la API.
 */
export const setAccessTokenInMemory = (token) => {
  inMemoryAccessToken = token;
};

// 1. Interceptor de Solicitud (Request Interceptor)
api.interceptors.request.use(
  (config) => {
    // Si tenemos un token en memoria, lo inyectamos en las cabeceras
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables de control para manejar solicitudes concurrentes al expirar el Access Token
let isRefreshing = false;
let failedQueue = [];

/**
 * Resuelve o rechaza todas las solicitudes en cola una vez completado el refresco.
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. Interceptor de Respuesta (Response Interceptor)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error no proviene de la API o la solicitud ya fue reintentada, rechazamos de inmediato
    if (!error.response || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Código 401 indica que el Access Token expiró o es inválido
    if (error.response.status === 401 && !originalRequest.url.includes('/auth/login')) {
      
      // Si el endpoint que dio 401 fue el propio de refresco, la cookie expiró. Desloguear.
      if (originalRequest.url.includes('/auth/refresh')) {
        setAccessTokenInMemory(null);
        window.dispatchEvent(new CustomEvent('auth-logout', { detail: 'Sesión expirada.' }));
        return Promise.reject(error);
      }

      // Si ya hay un refresco en curso, agregamos esta solicitud a la cola de reintentos
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Iniciamos el proceso de refresco (solo una solicitud a la vez)
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Llamada a POST /auth/refresh (el navegador envía la cookie httpOnly automáticamente)
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data;

        // Guardar nuevo token en memoria y resolver cola
        setAccessTokenInMemory(accessToken);
        processQueue(null, accessToken);

        // Reintentar la solicitud original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si falla la rotación del refresh token (ej. expirado o reutilizado), se desloguea al usuario
        processQueue(refreshError, null);
        setAccessTokenInMemory(null);
        window.dispatchEvent(new CustomEvent('auth-logout', { detail: 'Su sesión ha caducado por seguridad.' }));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
