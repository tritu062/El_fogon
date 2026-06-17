# 🎓 Guía Pedagógica y de Auditoría Técnica — Proyecto El Fogón

Esta guía está diseñada para estudiantes de desarrollo de software y auditoría de sistemas. Su objetivo es explicar en detalle los cimientos de la arquitectura, analizar los fallos críticos de concurrencia y seguridad resueltos durante las iteraciones del proyecto y enseñar cómo probar los llamados a la API de forma didáctica.

---

## 🏛️ 1. Análisis de los Cimientos del Sistema

El Fogón utiliza un patrón de diseño moderno y seguro estructurado en un **Monorepo Modular**:

```mermaid
graph TD
    subgraph Frontend (React SPA)
        A[AppRoutes] --> B[ProtectedRoutes]
        B --> C[Vistas por Rol: Admin, Mesero, Cocinero, Cajero]
    end
    subgraph Backend (Node.js & Express)
        D[Express Router] --> E[Middleware Autenticación]
        E --> F[Middleware RBAC]
        F --> G[Controladores de Módulo]
        G --> H[Prisma Client]
    end
    subgraph Base de Datos
        H --> I[PostgreSQL]
    end
```

### Principios Fundamentales del Backend
1.  **Aislamiento por Dominios de Negocio:** En lugar de la estructura clásica MVC dispersa, cada dominio (ej: `auth`, `users`, `orders`, `bills`, `cash`) almacena sus rutas, esquemas de validación y controladores en una misma carpeta. Esto facilita la mantenibilidad a los estudiantes.
2.  **Validación en Frontera con Zod:** Las solicitudes de red se validan y sanean inmediatamente al entrar al servidor en los controladores mediante esquemas de Zod (Zod Schemas). Esto previene que datos mal formados, inyecciones de código (XSS) o datos nulos alcancen la base de datos PostgreSQL.
3.  **Trazabilidad con Audit Logs:** Las mutaciones sobre datos críticos (crear usuario, cancelar plato, arqueo de caja) se registran de manera obligatoria en la tabla `AuditLog` dentro de transacciones SQL, capturando el ID del usuario, la acción, la IP de red y la marca de tiempo exacta.

---

## 🐛 2. Historial de Fallos Críticos y Mitigaciones
Durante las iteraciones de desarrollo se resolvieron varios errores críticos que sirven como excelentes casos de estudio en concurrencia y seguridad:

### Caso A: Colisión de Tokens JWT en las Pruebas
> [!WARNING]
> **El Problema:** Al ejecutar pruebas automatizadas paralelizadas, múltiples llamadas a firmas de JWT con el mismo usuario (`userId: 1`) generadas en la misma fracción de segundo producían tokens exactamente idénticos (mismo `iat` y `exp`). Esto hacía que el mecanismo de detección de reutilización de tokens marcara falsas alarmas, provocando fallas intermitentes.
> 
> **La Solución:** Asignar identificadores de usuario diferenciados a nivel de pruebas (`userId: 99`, `userId: 4`, etc.) e inyectar un payload de firma único (como un identificador de prueba único `jti`), asegurando la unicidad absoluta de la firma y previniendo colisiones.

### Caso B: Doble Ocupación de Mesa (Condición de Carrera)
> [!CAUTION]
> **El Problema:** Dos meseros intentaban tomar un pedido sobre la misma mesa libre al mismo tiempo. Ambos hacían la consulta inicial, leían que la mesa estaba `FREE` y creaban dos comandes activas paralelas asociadas a la misma mesa física.
> 
> **La Solución:** Envolver el chequeo y la actualización del estado de la mesa dentro de una transacción transaccional atómica de Prisma (`prisma.$transaction`). La primera consulta bloquea la mesa, y la segunda lee el estado actualizado a `OCCUPIED` rechazando la operación con error `TABLE_ALREADY_OCCUPIED` (HTTP 400).

### Caso C: Pérdida de Centavos en División de Cuentas (Split Bills)
> [!IMPORTANT]
> **El Problema:** Al dividir una cuenta de, por ejemplo, $100.01 entre 3 personas usando tipos de datos `Float` en Javascript, se obtenían pagos de $33.33666... lo que generaba errores de cuadre por centavos perdidos e impedía cerrar la factura.
> 
> **La Solución:** 
> 1.  Almacenar y operar todos los montos monetarios como enteros (`Int`) en centavos (ej: $100.01 son `10001`).
> 2.  **Partes Iguales:** Calcular el monto base por persona $S = \lfloor T / N \rfloor$ y el residuo $R = T \pmod N$. Asignar $S + 1$ centavos a las primeras $R$ personas y $S$ centavos al resto.
> 3.  **Selección de Ítems:** En cobros por selección de ítems, el último pago se calcula directamente como el saldo restante exacto (`remaining`), garantizando un cuadre contable impecable.

---

## 🧪 3. Guía de Pruebas de la API

Esta sección contiene instrucciones para realizar pruebas manuales del backend mediante comandos `curl` (o herramientas como Postman/Insomnia) utilizando las credenciales sembradas en desarrollo.

### A. Autenticación y Control de Accesos
Para interactuar con los endpoints seguros, primero debes iniciar sesión para obtener el `accessToken`.

```bash
# 1. Iniciar sesión como Cajero
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "cashier@elfogon.com", "password": "Cashier123!"}'
```
*Respuesta Esperada (200 OK):*
```json
{
  "status": "success",
  "accessToken": "eyJhbGciOiJI...",
  "user": { "id": 4, "email": "cashier@elfogon.com", "firstName": "Cajero" }
}
```
> [!NOTE]
> Copia el valor del `accessToken` de la respuesta y úsalo en la cabecera `Authorization: Bearer <Access_Token>` para el resto de los llamados seguros.

---

### B. Módulo de Caja Chica (`/api/cash-registers`)
El Cajero debe abrir su turno obligatoriamente antes de poder facturar.

```bash
# 1. Intentar cobrar una mesa antes de abrir caja (Debe fallar)
curl -X POST http://localhost:4000/api/bills \
  -H "Authorization: Bearer <Access_Token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "payments": [{"amount": 5000, "method": "EFECTIVO"}]}'
# Retorna: 400 Bad Request ("Debe abrir una sesión de caja antes...")

# 2. Abrir Turno de Caja con un saldo inicial de $10,000 (1000000 centavos)
curl -X POST http://localhost:4000/api/cash-registers \
  -H "Authorization: Bearer <Access_Token>" \
  -H "Content-Type: application/json" \
  -d '{"openingBalance": 1000000, "notes": "Fondo de apertura de turno tarde"}'
# Retorna: 201 Created

# 3. Consultar estadísticas y saldo esperado en vivo
curl -X GET http://localhost:4000/api/cash-registers/current \
  -H "Authorization: Bearer <Access_Token>"
# Retorna: 200 OK con estadísticas en vivo

# 4. Cerrar caja declarando un arqueo físico
curl -X POST http://localhost:4000/api/cash-registers/close \
  -H "Authorization: Bearer <Access_Token>" \
  -H "Content-Type: application/json" \
  -d '{"actualClosingBalance": 1000000, "notes": "Cierre de turno perfecto"}'
# Retorna: 200 OK mostrando discrepancia (ej: "discrepancy": 0)
```

---

### C. Módulo de Pedidos y Comandas (`/api/orders`)
Los meseros y administradores crean los pedidos, los cuales avanzan por la máquina de estados.

```bash
# 1. Crear un pedido presencial en Mesa 3
curl -X POST http://localhost:4000/api/orders \
  -H "Authorization: Bearer <Access_Token_Mesero>" \
  -H "Content-Type: application/json" \
  -d '{"tableId": 3, "items": [{"itemId": 1, "quantity": 2, "notes": "Sin cebolla"}]}'
# Retorna: 201 Created con el ID de la comanda (ej: 10)

# 2. Iniciar preparación en cocina (KDS)
curl -X PATCH http://localhost:4000/api/orders/10/status \
  -H "Authorization: Bearer <Access_Token_Cocinero>" \
  -H "Content-Type: application/json" \
  -d '{"status": "PREPARING"}'
# Retorna: 200 OK

# 3. Despachar comanda (READY)
curl -X PATCH http://localhost:4000/api/orders/10/status \
  -H "Authorization: Bearer <Access_Token_Cocinero>" \
  -H "Content-Type: application/json" \
  -d '{"status": "READY"}'
# Retorna: 200 OK

# 4. Solicitar Pre-cuenta
curl -X PATCH http://localhost:4000/api/orders/10/pre-bill \
  -H "Authorization: Bearer <Access_Token_Mesero>"
# Retorna: 200 OK (Marca isBillRequested a true, enviando prioridad al cajero)
```

---

## 👩‍🏫 4. Preguntas de Reflexión para los Alumnos
1.  **Concurrencia:** ¿Qué pasaría si la base de datos de El Fogón usara transacciones simples sin bloqueo al reservar mesas y dos usuarios intentaran reservar la misma mesa al mismo tiempo?
2.  **Seguridad:** ¿Por qué es una mala práctica de seguridad enviar el Refresh Token dentro del JSON de respuesta en el cuerpo HTTP?
3.  **Diseño:** ¿Qué ventajas operacionales y técnicas tiene almacenar el precio histórico de un plato en `OrderItem` en vez de enlazarlo únicamente mediante clave foránea a la tabla `Item`?
4.  **Matemática:** En la división por partes iguales, ¿por qué es importante el cálculo de centavos con enteros en vez del uso de la función decimal clásica en JavaScript?
