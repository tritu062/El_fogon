# 🔌 Documentación de la API de El Fogón

Esta sección describe los endpoints HTTP disponibles en la API del servidor backend, incluyendo sus métodos, parámetros, cabeceras, respuestas y políticas de acceso.

*   **URL Base en Desarrollo Local:** `http://localhost:4000`
*   **Formato de Intercambio:** `application/json`

---

## 🏥 Endpoint de Salud (Health)

### `GET /health`
Verifica la disponibilidad operativa de la API y la conectividad a la base de datos PostgreSQL.
*   **Autenticación Requerida:** No (Público).
*   **Cabeceras:** Ninguna.
*   **Respuestas:**
    *   **`200 OK` (Operativo):**
        ```json
        {
          "status": "UP",
          "timestamp": "2026-06-16T20:15:40.123Z",
          "services": {
            "api": "UP",
            "database": "UP"
          }
        }
        ```
    *   **`503 Service Unavailable` (Base de Datos Caída/Degradada):**
        ```json
        {
          "status": "DEGRADED",
          "timestamp": "2026-06-16T20:15:40.123Z",
          "services": {
            "api": "UP",
            "database": "DOWN"
          }
        }
        ```

---

## 🔑 Endpoints de Autenticación y Autorización (`/auth`)

### `POST /auth/login`
Autentica las credenciales del usuario. Emite el Access Token en el JSON y el Refresh Token en una cookie HttpOnly.
*   **Autenticación Requerida:** No (Público).
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "email": "admin@elfogon.com",
      "password": "Admin123!"
    }
    ```
*   **Respuestas:**
    *   **`200 OK` (Exitoso):**
        *   *Cabecera de Respuesta:* `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict`
        ```json
        {
          "status": "success",
          "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "user": {
            "id": 1,
            "email": "admin@elfogon.com",
            "firstName": "Admin",
            "lastName": "El Fogón"
          }
        }
        ```
    *   **`401 Unauthorized` (Credenciales Incorrectas):**
        *   *Mensaje varía según los intentos restantes antes del bloqueo:*
        ```json
        {
          "status": "error",
          "statusCode": 401,
          "message": "Credenciales incorrectas. Te quedan 4 intentos antes del bloqueo."
        }
        ```
    *   **`423 Locked` (Cuenta Bloqueada por Fuerza Bruta):**
        ```json
        {
          "status": "error",
          "statusCode": 423,
          "message": "Cuenta bloqueada temporalmente debido a intentos fallidos. Intenta nuevamente en 15 minutos."
        }
        ```

---

### `POST /auth/register`
Registra un nuevo empleado en el sistema asignándole roles iniciales.
*   **Autenticación Requerida:** **Sí** (Debe incluir un Access Token válido).
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Cabeceras:** `Authorization: Bearer <Access_Token>`
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "email": "mesero1@elfogon.com",
      "password": "SecurePassword123!",
      "firstName": "Juan",
      "lastName": "Gómez",
      "roles": ["MESERO"]
    }
    ```
*   **Respuestas:**
    *   **`201 Created` (Registro Exitoso):**
        ```json
        {
          "status": "success",
          "message": "Usuario registrado correctamente.",
          "user": {
            "id": 2,
            "email": "mesero1@elfogon.com",
            "firstName": "Juan",
            "lastName": "Gómez"
          }
        }
        ```
    *   **`400 Bad Request` (Fallo de Validación / Contraseña Débil):**
        ```json
        {
          "status": "error",
          "statusCode": 400,
          "message": "La contraseña no cumple con la política de seguridad: Mínimo 8 caracteres, al menos una letra mayúscula, una letra minúscula, un número y un carácter especial."
        }
        ```
    *   **`409 Conflict` (Correo Duplicado):**
        ```json
        {
          "status": "error",
          "statusCode": 409,
          "message": "El correo electrónico ya está registrado en el sistema."
        }
        ```

---

### `POST /auth/logout`
Invalida la sesión actual del usuario eliminando el Refresh Token de la base de datos y limpiando la cookie del navegador.
*   **Autenticación Requerida:** **Sí**.
*   **Cabeceras:** `Authorization: Bearer <Access_Token>`
*   **Respuestas:**
    *   **`200 OK` (Cierre Exitoso):**
        *   *Cabecera de Respuesta:* Borra la cookie `refreshToken`.
        ```json
        {
          "status": "success",
          "message": "Sesión cerrada correctamente."
        }
        ```

---

### `POST /auth/refresh`
Genera un nuevo par de Access y Refresh Tokens mediante la política de rotación de un solo uso.
*   **Autenticación Requerida:** No directamente, pero lee la cookie del navegador.
*   **Cabeceras/Cookies:** Debe incluir la cookie `refreshToken`.
*   **Respuestas:**
    *   **`200 OK` (Rotación Exitosa):**
        *   *Cabecera de Respuesta:* `Set-Cookie: refreshToken=<nuevo_token>; HttpOnly; Secure; SameSite=Strict`
        ```json
        {
          "status": "success",
          "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
        ```
    *   **`403 Forbidden` (Detección de Reutilización / Token Robado):**
        *   *Nota:* Al ocurrir esto, el sistema revoca inmediatamente todas las sesiones del usuario de forma proactiva.
        ```json
        {
          "status": "error",
          "statusCode": 403,
          "message": "Sesión inválida por posible compromiso de seguridad. Debe iniciar sesión nuevamente."
        }
        ```

---

### `GET /auth/me`
Obtiene los datos del perfil y roles del usuario autenticado.
*   **Autenticación Requerida:** **Sí**.
*   **Cabeceras:** `Authorization: Bearer <Access_Token>`
*   **Respuestas:**
    *   **`200 OK`:**
        ```json
        {
          "status": "success",
          "user": {
            "id": 1,
            "email": "admin@elfogon.com",
            "firstName": "Admin",
            "lastName": "El Fogón",
            "roles": ["ADMINISTRADOR"]
          }
        }
        ```
