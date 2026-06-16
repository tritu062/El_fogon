# 🏛️ Documento de Arquitectura de Software — El Fogón

Este documento detalla las decisiones de diseño arquitectónico tomadas durante la primera etapa de construcción del sistema de gestión para el restaurante **El Fogón**.

---

## 🗺️ Patrón Arquitectónico General: Monorepo Modular

El proyecto está diseñado bajo una estructura de **Monorepo** que agrupa el frontend y el backend en un solo repositorio Git, organizando la lógica en contenedores independientes de desarrollo y producción.

### Justificación de Monorepo
1.  **Sincronización Atómica:** Permite desplegar características de extremo a extremo (ej. un nuevo endpoint de pedido y su formulario en la pantalla del mesero) en un solo commit coherente.
2.  **Consistencia de Entornos:** La infraestructura completa se modela en archivos centralizados de Docker Compose en la raíz.

---

## 💾 Capa de Persistencia: PostgreSQL & Prisma ORM

Se utiliza **PostgreSQL 15** como motor relacional, orquestado y persistido mediante volúmenes Docker. El acceso a datos se abstrae con **Prisma ORM**.

### Decisiones de Diseño de Base de Datos
*   **Identificadores Secuenciales (`Int`):** Se eligieron claves primarias secuenciales auto-incrementales para optimizar la indexación física (B-Tree) y simplificar consultas de depuración interna.
*   **Auditoría Estricta:** Cada tabla implementa `created_at` (marca de tiempo fija de creación) y `updated_at` (marca de tiempo mutable al editar).
*   **Borrado Lógico (Soft Delete):** Se implementó la columna opcional `deleted_at`. Las eliminaciones cambian este campo para preservar la integridad referencial histórica en las transacciones comerciales (comandas y cierres de caja).

---

## ⚙️ Capa del Servidor (Backend): Node.js & Express

El backend se estructura como una API REST JSON modular basada en **Express.js**, orientada a dominios de negocio (Features).

### Organización por Dominios
En lugar de agrupar archivos por tipo (controllers, routes, models), el código se divide en carpetas independientes de negocio (ej. `src/modules/auth`, `src/modules/health`). Esto simplifica el mantenimiento a largo plazo al localizar toda la lógica de un módulo en un solo lugar.

### Flujo de Ejecución HTTP y Middlewares
Cada solicitud HTTP entrante recorre la siguiente pila secuencial:
1.  **CORS:** Habilita orígenes selectivos con credenciales activas.
2.  **JSON / Cookie Parser:** Serializa datos de entrada y cookies del navegador.
3.  **Request Logger (Winston):** Registra auditoría de accesos.
4.  **Rate Limiter:** Mitiga ataques DoS limitando IPs a 100 llamadas por 15 minutos.
5.  **Rutas por Dominios:** Ejecución del controlador.
6.  **ErrorHandler Centralizado:** Captura excepciones no controladas y unifica la salida JSON.

---

## 🔒 Estrategia de Seguridad y Autenticación (RBAC + JWT)

El sistema implementa un control de acceso basado en roles (RBAC) con un esquema de tokens desacoplados.

```text
+-----------------------+      Access Token (JWT - En Memoria)      +--------------------+
|   Frontend (React)    | ----------------------------------------> |  Backend (Express) |
|                       | <---------------------------------------- |                    |
|   Estado temporal     |       Refresh Token (Cookie HttpOnly)     |  Filtro RBAC/Token |
+-----------------------+                                           +--------------------+
```

### 1. Mitigación contra XSS y CSRF
*   **Access Token (JWT - En Memoria):** Se expide con una duración corta (15 minutos). Al guardarse en una variable de Javascript en memoria y no en `localStorage`, es inmune a ataques XSS (robo de tokens mediante scripts maliciosos inyectados en la página).
*   **Refresh Token (JWT - Cookie HttpOnly):** Se expide con una duración de 7 días. Se almacena en una cookie del navegador configurada con las propiedades:
    *   `httpOnly`: Impide que Javascript lea el token.
    *   `Secure`: Exige conexión HTTPS (en producción).
    *   `SameSite=Strict`: Evita el envío cruzado mitigando ataques CSRF.

### 2. Rotación de Refresh Tokens (Rotación de un Solo Uso)
Para evitar que un token de refresco robado sea utilizado indefinidamente:
*   Los Refresh Tokens se registran de forma persistente en la tabla `refresh_tokens`.
*   Al refrescar sesión, el token de refresco antiguo **se elimina** y se expide un nuevo par.
*   **Detección de Reutilización (Ataques):** Si la API recibe un refresh token válido (en firma) pero que **no** está en la base de datos, asume que fue robado y reutilizado. Como medida de seguridad inmediata, el servidor **revoca todos los Refresh Tokens** asociados a ese usuario, cerrando su sesión en todos los dispositivos y obligándole a re-autenticarse.

### 3. Mitigación de Fuerza Bruta (Bloqueo de Cuentas)
El inicio de sesión supervisa los intentos de acceso fallidos:
*   Cada fallo incrementa `login_attempts` en la tabla `users`.
*   Al alcanzar **5 intentos fallidos consecutivos**, se calcula la fecha `lock_until = NOW() + 15 minutos`.
*   Cualquier llamada posterior al login antes de que expire ese tiempo es rechazada con un código `423 Locked`.
*   Un login exitoso reinicia el contador de intentos a 0 y borra el bloqueo.

---

## 🎨 Capa del Cliente (Frontend): React SPA & Tailwind

El frontend se construye sobre **React 18** y **Vite**, utilizando **Tailwind CSS** para un diseño dinámico.

### Interceptor de Refresco en Cola
Para evitar que la interfaz del usuario parpadee o que múltiples peticiones paralelas disparen llamadas redundantes de refresco al caducar el Access Token:
*   El cliente HTTP (Axios) intercepta las respuestas.
*   Si una solicitud responde con `401 Unauthorized`, el interceptor pausa las solicitudes entrantes y las coloca en una cola temporal (`failedQueue`).
*   Se ejecuta una única solicitud `/auth/refresh` en segundo plano.
*   Si el refresco tiene éxito, se actualiza el Access Token en memoria, se re-inyectan las cabeceras a la cola en espera y se reintentan las llamadas originales de forma transparente al usuario.
*   Si el refresco falla, se limpia la sesión y se despacha un evento global para redirigir al usuario al Login.
