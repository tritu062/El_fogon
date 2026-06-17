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

---

## 👥 Endpoints de Gestión de Usuarios (`/users`)
Todos los endpoints de este módulo requieren autenticación y están restringidos a usuarios con el rol `ADMINISTRADOR`.

### `GET /api/users`
Obtiene la lista de todos los usuarios registrados que no han sido eliminados lógicamente (soft-delete).
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Respuestas:**
    *   **`200 OK`:**
        ```json
        {
          "status": "success",
          "users": [
            {
              "id": 2,
              "email": "waiter@elfogon.com",
              "firstName": "Mesero",
              "lastName": "El Fogón",
              "isActive": true,
              "createdAt": "2026-06-17T19:03:34.000Z",
              "updatedAt": "2026-06-17T19:03:34.000Z",
              "deletedAt": null,
              "roles": ["MESERO"]
            }
          ]
        }
        ```

---

### `GET /api/users/:id`
Obtiene los detalles y roles de un usuario específico.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Respuestas:**
    *   **`200 OK`:**
        ```json
        {
          "status": "success",
          "user": {
            "id": 2,
            "email": "waiter@elfogon.com",
            "firstName": "Mesero",
            "lastName": "El Fogón",
            "isActive": true,
            "roles": ["MESERO"]
          }
        }
        ```
    *   **`404 Not Found`:** Usuario inexistente o eliminado.

---

### `POST /api/users`
Crea un nuevo usuario en el sistema. (Alias funcional de `/api/auth/register`).
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "email": "nuevo@elfogon.com",
      "password": "Password123!",
      "firstName": "Nombre",
      "lastName": "Apellido",
      "roles": ["MESERO", "CAJERO"]
    }
    ```
*   **Respuestas:**
    *   **`201 Created`:** Usuario registrado correctamente.

---

### `PUT /api/users/:id`
Actualiza la información, estado de activación o asignación de roles de un usuario existente.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "firstName": "NuevoNombre",
      "roles": ["CAJERO"],
      "isActive": false
    }
    ```
*   **Respuestas:**
    *   **`200 OK`:** Usuario actualizado correctamente.
    *   **`400 Bad Request`:** Si se intenta desactivar (`isActive: false`) a un usuario que posee una caja chica abierta.
        ```json
        {
          "status": "error",
          "statusCode": 400,
          "message": "No se puede desactivar a un usuario que tiene una sesión de caja abierta activa."
        }
        ```

---

### `DELETE /api/users/:id`
Realiza la eliminación lógica (soft-delete) de un usuario en el sistema.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Respuestas:**
    *   **`200 OK`:** Usuario eliminado correctamente.
    *   **`400 Bad Request`:** Si el administrador intenta autoeliminarse o si el usuario tiene una caja chica abierta.

---

## 📊 Endpoints de Auditoría (`/audit-logs`)

### `GET /api/audit-logs`
Obtiene el historial de auditoría del sistema con filtros de búsqueda y paginación.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Parámetros de Consulta (Query Params):**
    *   `userId` (opcional): ID del usuario que realizó la acción.
    *   `action` (opcional): Acción a buscar (ej: `ELIMINAR_USUARIO`).
    *   `startDate` (opcional): Rango de fecha inicial (ISO format).
    *   `endDate` (opcional): Rango de fecha final (ISO format).
    *   `page` (opcional): Número de página (por defecto 1).
    *   `limit` (opcional): Elementos por página (por defecto 50).
*   **Respuestas:**
    *   **`200 OK`:**
        ```json
        {
          "status": "success",
          "total": 12,
          "page": 1,
          "limit": 20,
          "logs": [
            {
              "id": 12,
              "userId": 1,
              "action": "ACTUALIZAR_USUARIO",
              "description": "Se actualizó al usuario ID 3 (waiter@elfogon.com). Campos modificados: firstName, roles",
              "ipAddress": "::1",
              "userAgent": "Mozilla/5.0...",
              "createdAt": "2026-06-17T19:20:10.000Z",
              "user": {
                "id": 1,
                "email": "admin@elfogon.com",
                "firstName": "Admin",
                "lastName": "El Fogón"
              }
            }
          ]
        }
        ```

---

## 🛍️ Endpoints de Pedidos / Comandas (`/orders`)

### `POST /api/orders`
Registra un nuevo pedido o comanda.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `MESERO`, `ADMINISTRADOR`.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "tableId": 5, // ID de la mesa física, opcional si no es presencial.
      "orderType": "PRESENCIAL", // Opciones: PRESENCIAL, PARA_LLEVAR, DOMICILIO. Por defecto PRESENCIAL.
      "items": [
        {
          "itemId": 1,
          "quantity": 2,
          "notes": "Sin cebolla",
          "selectedModifiers": { "Término": "3/4" }
        }
      ]
    }
    ```
*   **Respuestas:**
    *   **`201 Created`:** Pedido registrado correctamente.
    *   **`400 Bad Request`:** Si la mesa seleccionada ya está ocupada (`TABLE_ALREADY_OCCUPIED`) o el plato solicitado no está disponible.

---

### `PATCH /api/orders/:id/items`
Adiciona platos o bebidas a una comanda activa.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `MESERO`, `ADMINISTRADOR`.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "items": [
        {
          "itemId": 2,
          "quantity": 1,
          "notes": "Extra salsa"
        }
      ]
    }
    ```
*   **Respuestas:**
    *   **`200 OK`:** Ítems agregados correctamente y total acumulado actualizado.

---

### `PATCH /api/orders/:id/status`
Actualiza el estado de preparación o entrega de una comanda (RBAC interno de transiciones de estado).
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos por Transición:**
    *   `PREPARING` / `READY`: `COCINERO`, `MESERO`, `ADMINISTRADOR`.
    *   `SERVED`: `MESERO`, `ADMINISTRADOR`.
    *   `PAID`: `CAJERO`, `ADMINISTRADOR`.
    *   `CANCELLED`: `ADMINISTRADOR`.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "status": "SERVED"
    }
    ```
*   **Respuestas:**
    *   **`200 OK`:** Estado actualizado correctamente. Registra la acción en `AuditLog`.
    *   **`403 Forbidden`:** Si el rol del usuario no tiene permisos para la transición solicitada.

---

### `PATCH /api/orders/:id/pre-bill`
Solicita la pre-cuenta (cobro) de un pedido activo. Flaggea `isBillRequested` en `true`.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `MESERO`, `ADMINISTRADOR`.
*   **Respuestas:**
    *   **`200 OK`:** Pre-cuenta solicitada correctamente. Registra la acción en `AuditLog`.
    *   **`400 Bad Request`:** Si el pedido ya ha sido pagado o cancelado.

---

### `DELETE /api/orders/:orderId/items/:itemId`
Cancela un ítem individual de una comanda activa con un motivo obligatorio.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `MESERO`, `ADMINISTRADOR`.
    *   *Regla Especial:* Si el pedido ya está en estado `READY` o `SERVED`, solo un `ADMINISTRADOR` puede realizar la cancelación.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "reason": "El cliente canceló porque demoró mucho en cocina"
    }
    ```
*   **Respuestas:**
    *   **`200 OK`:** Ítems eliminados lógicamente (soft-delete), total deducido correctamente. Registra la acción en `AuditLog`.
    *   **`400 Bad Request`:** Si no se provee un motivo válido (mínimo 3 caracteres).
    *   **`403 Forbidden`:** Si se requiere rol de Administrador para cancelar ítems que ya están listos o servidos.

---

## 💵 Endpoints de Facturación y Cobros (`/api/bills`)

### `POST /api/bills`
Registra la factura oficial de cobro y los pagos realizados para una comanda activa.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `CAJERO`, `ADMINISTRADOR`.
*   **Cabeceras:** `Authorization: Bearer <Access_Token>`
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "orderId": 10,
      "discount": 500,
      "tax": 1000,
      "payments": [
        {
          "amount": 5000,
          "method": "EFECTIVO"
        },
        {
          "amount": 5500,
          "method": "TARJETA"
        }
      ]
    }
    ```
*   **Respuestas:**
    *   **`201 Created` (Facturación Exitosa):** Retorna la factura creada y los pagos vinculados. Pasa la comanda a `PAID` y libera la mesa si no hay más consumos pendientes.
        ```json
        {
          "status": "success",
          "bill": {
            "id": 1,
            "orderId": 10,
            "cashierId": 4,
            "cashRegisterId": 1,
            "subtotal": 10000,
            "tax": 1000,
            "discount": 500,
            "total": 10500,
            "invoiceNumber": "FAC-20260617-0001",
            "payments": [
              { "id": 1, "amount": 5000, "method": "EFECTIVO" },
              { "id": 2, "amount": 5500, "method": "TARJETA" }
            ]
          }
        }
        ```
    *   **`400 Bad Request` (Fallo de Cuadre / Sin Caja Abierta):**
        ```json
        {
          "status": "error",
          "statusCode": 400,
          "message": "Debe abrir una sesión de caja antes de poder registrar cobros."
        }
        ```
        *(O bien, "El monto ingresado en los pagos no coincide con el total calculado de la cuenta.")*
    *   **`404 Not Found` (Pedido no existe):**
        ```json
        {
          "status": "error",
          "statusCode": 404,
          "message": "El pedido solicitado no existe."
        }
        ```

---

### `GET /api/bills`
Obtiene el historial de facturas emitidas en el restaurante.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `CAJERO`, `ADMINISTRADOR`.
*   **Parámetros de Consulta (Query Params):**
    *   `cashierId` (Opcional): Filtrar por el identificador del cajero.
    *   `startDate` (Opcional): Fecha de inicio (ISO 8601).
    *   `endDate` (Opcional): Fecha final (ISO 8601).
*   **Respuestas:**
    *   **`200 OK`:** Retorna la lista de facturas ordenadas por fecha en sentido descendente.

---

## 🏧 Endpoints de Arqueos de Caja (`/api/cash-registers`)

### `POST /api/cash-registers`
Abre un turno / sesión de caja chica registrando un fondo inicial en efectivo.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `CAJERO`, `ADMINISTRADOR`.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "openingBalance": 10000,
      "notes": "Fondo de apertura para dar cambio."
    }
    ```
*   **Respuestas:**
    *   **`201 Created`:** Retorna el registro de caja abierta creado.
    *   **`400 Bad Request`:** Si el cajero en sesión ya cuenta con un arqueo activo en estado `OPEN`.

---

### `GET /api/cash-registers/current`
Obtiene la información y estadísticas de venta acumuladas en tiempo real de la caja abierta actualmente.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `CAJERO`, `ADMINISTRADOR`.
*   **Respuestas:**
    *   **`200 OK` (Caja activa encontrada):**
        ```json
        {
          "status": "success",
          "register": {
            "id": 1,
            "cashierId": 4,
            "openingTime": "2026-06-17T15:00:00.000Z",
            "openingBalance": 10000,
            "status": "OPEN"
          },
          "stats": {
            "totalSales": 25000,
            "cashPayments": 15000,
            "cardPayments": 5000,
            "transferPayments": 5000,
            "expectedClosingBalance": 25000
          }
        }
        ```
    *   **`200 OK` (Sin caja abierta):**
        ```json
        {
          "status": "success",
          "register": null
        }
        ```

---

### `POST /api/cash-registers/close`
Realiza el cierre físico de la caja, calculando en vivo el saldo de arqueo y discrepancias.
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `CAJERO`, `ADMINISTRADOR`.
*   **Cuerpo de la Solicitud (JSON):**
    ```json
    {
      "actualClosingBalance": 24800,
      "notes": "Faltante menor por cambio."
    }
    ```
*   **Respuestas:**
    *   **`200 OK` (Cierre Procesado):** Retorna la caja con estado `CLOSED`, la hora de cierre y la discrepancia calculada en centavos. Registra el cierre en `AuditLog`.
        ```json
        {
          "status": "success",
          "register": {
            "id": 1,
            "status": "CLOSED",
            "closingTime": "2026-06-17T20:30:00.000Z",
            "expectedClosingBalance": 25000,
            "actualClosingBalance": 24800,
            "discrepancy": -200
          }
        }
        ```
    *   **`404 Not Found`:** Si no se encuentra ninguna sesión abierta.

---

### `GET /api/cash-registers`
Listado de todas las sesiones históricas de arqueo de caja (Arqueos consolidados).
*   **Autenticación Requerida:** Sí.
*   **Roles Permitidos:** `ADMINISTRADOR`.
*   **Parámetros de Consulta (Query Params):**
    *   `status` (Opcional): Filtrar por `OPEN` o `CLOSED`.
    *   `cashierId` (Opcional): Filtrar por el identificador de un empleado de caja.
*   **Respuestas:**
    *   **`200 OK`:** Retorna la lista de todas las sesiones de caja con sus respectivos cajeros asociados.
