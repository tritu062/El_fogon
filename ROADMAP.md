# 🗺️ Hoja de Ruta de Desarrollo (Roadmap) — El Fogón

Esta sección traza la planificación de los siguientes módulos operativos de **El Fogón** para completar la suite de gestión del restaurante.

---

## 📅 Resumen de Fases Futuras

| Módulo / Fase | Descripción | Estimación de Complejidad | Tiempo Estimado (Desarrollo) |
| :--- | :--- | :---: | :---: |
| **Fase 6: Salón y Mesas** | CRUD de mesas, zonas (interior, terraza) y estados dinámicos de salón. | **Baja - Media** | 1 semana |
| **Fase 7: Pedidos e Items** | Gestión de platos/bebidas, categorías y toma de comandas. | **Alta** | 2 semanas |
| **Fase 8: Panel de Cocina (KDS)** | Despacho de comandas en tiempo real (WebSockets / Polling). | **Media** | 1 semana |
| **Fase 9: Caja y Pagos** | Cuentas, división de facturas, métodos de pago y arqueo de caja. | **Media - Alta** | 1.5 semanas |
| **Fase 10: Inventario y Recetas** | Insumos, control de stock y descuento automático por plato vendido. | **Alta** | 2.5 semanas |
| **Fase 11: Reportes y Analíticas** | Panel con gráficos de ventas, platos populares y horas pico. | **Media** | 1 semana |

---

## 🛠️ Detalle Técnico de los Próximos Módulos

### 1. Salón y Mesas (Fase 6)
*   **Objetivo:** Permitir al administrador configurar el layout del comedor y al mesero ver la disponibilidad de mesas.
*   **Base de Datos:** Añadir tablas `zones` (id, name, description) y `tables` (id, number, capacity, status [FREE, OCCUPIED, RESERVED, DIRTY], zoneId).
*   **Frontend:** Vista de grid interactiva del salón con filtros por zonas y cambios de color según el estado.

### 2. Catálogo y Pedidos (Fase 7)
*   **Objetivo:** Permitir la toma de pedidos desde tablets y la impresión o envío de comandas a la cocina.
*   **Base de Datos:** Tablas `categories`, `items` (platos, bebidas), `orders` (cabecera con total, mesa, mesero, estado [PENDING, PREPARING, READY, SERVED, PAID, CANCELLED]) y `order_items` (detalle de platos pedidos).
*   **Desafío Clave:** Sincronización de pedidos y cálculo automático de subtotales en el backend.

### 3. Pantalla de Cocina - KDS (Fase 8)
*   **Objetivo:** Reemplazar las comandas impresas en papel por una pantalla táctil en cocina.
*   **Técnica:** Implementar comunicación mediante **WebSockets** (con Socket.io) para recibir comandas nuevas de forma instantánea sin necesidad de recargar la página.
*   **Desafío Clave:** Gestión de temporizadores visuales para alertar al chef si un plato lleva más de 15 minutos en preparación.

### 4. Caja, Pagos y Cierre (Fase 9)
*   **Objetivo:** Permitir al cajero liquidar cuentas, emitir recibos y realizar cierres diarios de caja.
*   **Base de Datos:** Tabla `bills` (facturas), `payments` (monto, tipo [EFECTIVO, TARJETA, TRANSFERENCIA]) y `cash_registers` (apertura, cierre, saldo esperado, saldo real, discrepancias).
*   **Desafío Clave:** Implementar el pago dividido (split bill) de forma matemática sin perder centavos por redondeos.

### 5. Inventario e Ingredientes (Fase 10)
*   **Objetivo:** Descontar automáticamente insumos del almacén al vender platos y alertar sobre escasez.
*   **Base de Datos:** Tablas `ingredients` (stock, stock mínimo, unidad), y la tabla intermedia de recetas `recipe_ingredients` (ej. 1 Hamburguesa requiere 150g de carne, 1 pan, 15g de queso).
*   **Desafío Clave:** Evitar condiciones de carrera (Race Conditions) al restar existencias simultáneamente durante ventas masivas.
