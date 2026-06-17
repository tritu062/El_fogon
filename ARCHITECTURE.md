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

---

## 🔁 Máquina de Estados Operacional (Pedidos)

Se ha ampliado el ciclo de vida del pedido para dar soporte al KDS (Cocina) y Mesas:
1.  **`PENDING`**: Pedido ingresado por el mesero.
2.  **`PREPARING`**: Cocina inicia la elaboración del plato.
3.  **`READY`**: Cocina despacha la comanda y notifica al mesero.
4.  **`SERVED`**: Mesero entrega la comanda a la mesa.
5.  **`PAID`** / **`CANCELLED`**: Caja liquida la cuenta (Paid) o el Administrador anula el consumo (Cancelled).

Estas transiciones de estado operan bajo **transacciones de Prisma** (`prisma.$transaction`) y escriben de forma transparente registros de auditoría en la tabla `AuditLog` para un control estricto de pérdidas.

### Decisiones de Concurrencia y Negocio en Pedidos:
*   **Prevención de Doble Ocupación de Mesas:** Al intentar crear un pedido presencial, se verifica que la mesa física tenga el estado `FREE` dentro de la transacción de Prisma. Si no está libre, se hace rollback y se retorna un código `TABLE_ALREADY_OCCUPIED` (400), evitando condiciones de carrera donde dos meseros abran la misma mesa simultáneamente.
*   **Pedidos Multimodales (`orderType`):** Se introdujo la columna `orderType` (`PRESENCIAL`, `PARA_LLEVAR`, `DOMICILIO`). Los pedidos no presenciales (`PARA_LLEVAR` o `DOMICILIO`) se crean con `tableId: null`, eliminando la dependencia física de una mesa.
*   **Solicitud de Pre-cuenta (`isBillRequested`):** Se implementó una bandera booleana `isBillRequested` en el pedido. Cuando el mesero la activa (`PATCH /api/orders/:id/pre-bill`), avisa al cajero de forma asíncrona que el cliente desea pagar, manteniendo el estado operacional del salón en orden.
*   **Cancelación de Ítems con Motivo y Soft-Delete:** Para anular un plato, se aplica soft-delete a nivel de `OrderItem` (`deletedAt`) y se recalculan los totales del pedido dentro de una transacción. Esta acción exige un motivo de texto que se registra en `AuditLog`. Además, si el plato ya está en estado `READY` o `SERVED`, la API restringe la acción únicamente a usuarios con el rol `ADMINISTRADOR`.
*   **Monitoreo KDS en Dos Etapas (`PENDING` y `PREPARING`):** La cola de cocina pendiente (`getKitchenOrders`) realiza una consulta unificada de pedidos en estado `PENDING` y `PREPARING`. Esto permite que cuando un cocinero inicie la preparación de un pedido, este no desaparezca de la pantalla, sino que permanezca visible con la insignia **"Preparando"** y cambie su acción a **"Despachar"** para una transición fluida en dos etapas.

---

## 🛡️ Integridad de Datos en Gestión de Usuarios

Para proteger la integridad financiera y operativa:
*   **Guardias de Caja Abierta:** El controlador bloquea la deactivación (`isActive: false`) o eliminación lógica (`deletedAt`) de cualquier usuario si existe un registro activo de `CashRegister` en estado `OPEN` asociado a su identificador.
*   **Consistencia de Claves Foráneas en Soft Delete:** Al eliminar lógicamente un usuario, no se destruyen las relaciones históricas de pedidos y arqueos de caja en la base de datos (se usa `deletedAt` en la tabla intermedia `UserRole`), cumpliendo con la restricción `onDelete: Restrict` a nivel PostgreSQL sin romper el histórico comercial.

---

## 💵 Arquitectura Financiera y Cuentas Divididas (Cajero)

Para asegurar la robustez de las transacciones comerciales y el cuadre financiero del restaurante, el sistema implementa la siguiente lógica en el módulo de caja:

### 1. Control de Turno de Caja (`CashRegister`)
*   **Apertura y Cierre:** El cajero debe declarar un saldo de apertura (`openingBalance`). El estado de la caja pasa a `OPEN`, lo que desbloquea la capacidad de cobrar.
*   **Monitoreo en Vivo:** Cada pago procesado con método `EFECTIVO` se acumula en el saldo esperado (`expectedClosingBalance = openingBalance + cashPayments`). Los pagos electrónicos (Tarjeta y Transferencia) se registran en las estadísticas, pero se excluyen del arqueo físico de caja ya que se transfieren directamente a las cuentas bancarias.
*   **Arqueo y Discrepancia:** En el cierre de caja, el cajero declara el saldo físico disponible (`actualClosingBalance`). La diferencia se guarda en la base de datos (`discrepancy = actualClosingBalance - expectedClosingBalance`) y se registra en `AuditLog` para su supervisión.

### 2. Facturación Atómica (`Bill` & `Payment`)
*   **Índice Único en Pedidos:** Cada comanda (`Order`) se factura de forma completa y posee una única factura asociada (`Bill` con relación `@unique` en `orderId`). Esto previene físicamente a nivel base de datos la duplicidad de facturas.
*   **Colección de Pagos Relacionados:** La factura (`Bill`) contiene una lista de registros de pago (`Payment[]`), lo que permite registrar múltiples transacciones dentro de la misma factura (soporte nativo para pagos mixtos y cuentas divididas).

### 3. Algoritmo para División por Partes Iguales (Evitar Pérdida de Centavos)
*   **Problema de Redondeo:** Dividir montos no divisibles (ej. $100.01 entre 3 personas) mediante floats en JS puede generar descuadres de centavos.
*   **Solución Matemática:** Trabajando en centavos de entero (`total`):
    *   Monto base por pago: $S = \lfloor \text{total} / N \rfloor$
    *   Residuo: $R = \text{total} \pmod N$
    *   El sistema genera $R$ transacciones de pago de valor $S + 1$, y las restantes $N - R$ de valor $S$. La suma de las partes siempre da exactamente el `total` esperado, sin sobrar ni faltar centavos.

### 4. División por Selección de Ítems (Cálculos Proporcionales)
*   **Desglose a Nivel de Unidad:** El frontend expande el arreglo `OrderItem` a unidades individuales de consumo para permitir cobrar artículos con cantidad superior a 1 (ej: cobrar 1 de 2 cervezas a un cliente).
*   **Distribución Proporcional de Impuestos y Descuentos:**
    *   Proporción de subtotal: $P = \text{Subtotal de Ítems Seleccionados} / \text{Subtotal Total de la Orden}$
    *   Impuesto parcial: $T_{prop} = \text{round}(T_{total} \times P)$
    *   Descuento parcial: $D_{prop} = \text{round}(D_{total} \times P)$
    *   Total de la porción a cobrar: $Total_{part} = \text{Subtotal Seleccionado} + T_{prop} - D_{prop}$
*   **Ajuste de Cierre de Cuenta:** Para evitar la acumulación de diferencias por redondeo, en la última porción a liquidar (cuando los ítems seleccionados completan el 100% de la orden), el monto total se fija exactamente al valor del saldo restante de la cuenta (`remaining`).
