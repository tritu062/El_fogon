# Guía Técnica de Aprendizaje — Proyecto El Fogón

Esta guía está diseñada para estudiantes de desarrollo de software y auditoría de sistemas. Su objetivo es explicar las decisiones arquitectónicas del proyecto integrado **El Fogón** y guiar al lector en el análisis del código fuente.

---

## 🏗️ Arquitectura General del Monorepo

El Fogón está construido bajo una estructura de **Monorepo** que agrupa el Frontend y el Backend en un solo repositorio de Git. Esto facilita el control de versiones y el despliegue coordinado.

### Docker Compose
Para asegurar que el proyecto se ejecute exactamente igual en cualquier máquina local (evitando el clásico *"en mi máquina sí funciona"*), se orquestan tres contenedores independientes en [docker-compose.dev.yml](file:///d:/Cris/docker-compose.dev.yml):
1.  **db**: Base de datos relacional PostgreSQL.
2.  **backend**: Servidor de APIs REST en Node.js/Express.
3.  **frontend**: Cliente SPA en React 18 / Vite.

---

## 📅 Fase por Fase: ¿Qué se hizo y por qué?

### 📁 Fase 1: Arquitectura y Docker
*   **¿Qué?**: Configuración de las variables de entorno, Dockerfiles, y volumenes compartidos.
*   **¿Por qué?**: Separar los contenedores permite escalar de manera independiente (ej: más servidores backend sin duplicar la base de datos). Los volúmenes permiten que el código modificado en la máquina host se actualice automáticamente dentro del contenedor en tiempo real.

### 🗄️ Fase 2: Base de Datos PostgreSQL y Prisma
*   **¿Qué?**: Creación del esquema inicial de base de datos con **Prisma ORM** y script de siembra.
*   **¿Por qué?**: Prisma actúa como traductor seguro entre JavaScript y SQL (ORM). El script de siembra (`seed.js`) garantiza que al levantar el sistema por primera vez existan los roles operacionales predefinidos y un usuario administrador inicial con el cual operar.

### 🌐 Fase 3: Backend — API y Middlewares
*   **¿Qué?**: Estructuración del servidor HTTP, logs estructurados (Winston) y middlewares.
*   **¿Por qué?**: 
    *   **Rate Limiting**: Bloquea IPs que hacen peticiones excesivas para prevenir ataques de denegación de servicio (DDoS).
    *   **Error Handler**: Centraliza el formateo de errores para no revelar detalles técnicos o trazas de código sensibles en producción.
    *   **Zod**: Valida que las variables de entorno de configuración existan y tengan el tipo adecuado antes de arrancar.

### 🛡️ Fase 4: Autenticación y Control de Acceso (RBAC)
*   **¿Qué?**: Inicio de sesión mediante JWT, bloqueo de cuentas y tokens de refresco de un solo uso.
*   **¿Por qué?**:
    *   **Lockout (Bloqueo)**: Previene ataques de fuerza bruta bloqueando la cuenta durante 15 minutos tras 5 fallos.
    *   **HttpOnly Cookies**: El Refresh Token se almacena en una cookie no accesible desde JavaScript, haciéndolo inmune a robos por scripts maliciosos (ataques XSS).
    *   **Token Rotation**: Cada vez que se pide un nuevo token de acceso se invalida el refresh token anterior. Si se detecta un refresh token viejo, se asume robo de sesión y se cancela la sesión de de inmediato.

### ⚛️ Fase 5: SPA con React 18
*   **¿Qué?**: Cliente en React con Axios, contextos para Tema/Autenticación y enrutador por rol.
*   **¿Por qué?**:
    *   **Axios Interceptors**: Permite interceptar errores `401 Unauthorized` para renovar el Access Token en segundo plano sin que el usuario lo note.
    *   **ProtectedRoute**: Protege las rutas en el navegador. Un usuario no puede saltarse las vistas escribiendo URLs a mano si no posee el rol adecuado (`MESERO`, `CAJERO`, etc.).

### 🛋️ Fase 6: Zonas y Mesas
*   **¿Qué?**: CRUD de áreas físicas del restaurante y estado de mesas.
*   **¿Por qué?**:
    *   **Soft Delete**: Al borrar una mesa, no se elimina de la base de datos físicamente (lo cual rompería la contabilidad histórica de pedidos). En su lugar, se actualiza la columna `deletedAt` y se filtra en consultas.
    *   **Integridad referencial**: Se impide borrar mesas que tengan comandas en curso (`PENDING` o `READY`).

### 🍔 Fase 7: Menú y Pedidos
*   **¿Qué?**: CRUD de la carta y transacción de toma de pedidos.
*   **¿Por qué?**:
    *   **Centavos en Moneda**: Para evitar que Javascript redondee incorrectamente y se pierda dinero (ej: `19.99 * 3`), todos los precios se guardan y operan como enteros en centavos ($15.50 son `1550`).
    *   **Precio de Venta Histórico**: El precio de los platos se copia a la comanda en el momento del pedido para que si el administrador sube el precio de la carta mañana, no se altere el costo de las ventas de hoy.

### 📺 Fase 8: Panel de Cocina (KDS)
*   **¿Qué?**: Pantalla oscura de cocina con polling corto (15s) y alerta de sonido.
*   **¿Por qué?**:
    *   **Semáforo de tiempos**: Verde (<10m), Amarillo (10-15m) y Rojo (>=15m) para identificar cuellos de botella visualmente.
    *   **Sintetizador de Audio**: Emite un beep mediante la API de Audio de HTML5 en vez de depender de cargar un archivo de audio pesado que pueda fallar.

### 💳 Fase 9: Caja, Cobros y Cierre
*   **¿Qué?**: Apertura/cierre de turnos de caja, pagos divididos y consecutivo de facturas.
*   **¿Por qué?**:
    *   **Drawer Lock**: Se obliga a abrir caja antes de cobrar para asegurar que el dinero registrado tenga una sesión de arqueo clara.
    *   **Diferencias Contables**: El sistema compara el conteo físico del cajero contra el total esperado (Apertura + Ventas en Efectivo) calculando la discrepancia para auditoría del administrador.

---

## 🛠️ Plan de Ejercicios Prácticos para Estudiantes

Para que los estudiantes demuestren su comprensión del código, se proponen los siguientes cuatro retos progresivos de actualización:

### 📝 Reto 1: Agregar Capacidad a las Mesas
*   **Objetivo**: Añadir el campo de capacidad de comensales a las mesas.
*   **Tareas**:
    1.  Modificar [schema.prisma](file:///d:/Cris/backend/prisma/schema.prisma) para añadir `capacity Int @default(4)` al modelo `Table`.
    2.  Crear una migración (`npx prisma migrate dev --name add_table_capacity`).
    3.  Actualizar la validación Zod en `tables.schemas.js` para validar que la capacidad sea un entero positivo mayor a cero.
    4.  Actualizar la interfaz del administrador (`AdminTablesConfig.jsx`) para poder ingresar/editar la capacidad.
    5.  Mostrar un icono de personas y el número de capacidad en la tarjeta de mesa (`TableCard.jsx`).

### 📝 Reto 2: Agregar Método de Pago de Cortesía
*   **Objetivo**: Permitir cobros de comandas especiales para consumo del personal u ocasiones excepcionales.
*   **Tareas**:
    1.  Añadir el valor `CORTESIA` al enum `PaymentMethod` en `schema.prisma`.
    2.  Aplicar la migración de base de datos.
    3.  Asegurar que el backend permita este método y actualice la sesión de caja (los cobros de cortesía no incrementan el efectivo esperado en gaveta).
    4.  Añadir el botón "Cortesía (100% descuento)" o registrar el pago de cortesía en el modal de cobro (`PaymentModal.jsx`).

### 📝 Reto 3: Modificador de Propina (Cargo por Servicio)
*   **Objetivo**: Permitir añadir un porcentaje opcional de propina voluntaria al total de la cuenta.
*   **Tareas**:
    1.  Actualizar `createBillSchema` en `bills.schemas.js` para recibir opcionalmente `tip` (entero en centavos).
    2.  Guardar la propina en una nueva columna `tip` en el modelo `Bill`.
    3.  Actualizar la calculadora de cobro en `PaymentModal.jsx` añadiendo botones de selección rápida de propina (+5%, +10% o valor libre) que actualice el total esperado a cobrar en tiempo real.
    4.  Reflejar la propina de forma clara en el ticket de venta final.

### 📝 Reto 4: Registro del Tiempo de Preparación en Cocina
*   **Objetivo**: Medir la eficiencia de los cocineros registrando cuánto tarda cada comanda.
*   **Tareas**:
    1.  Modificar el modelo `Order` agregando la columna `preparedAt DateTime?` en `schema.prisma`.
    2.  En el controlador del backend `updateOrderStatus`, cuando el estado transiciona a `READY`, setear `preparedAt: new Date()`.
    3.  Crear un endpoint simple `GET /api/orders/stats` que calcule el tiempo promedio de preparación del día (diferencia en minutos entre `preparedAt` y `createdAt`).
    4.  Mostrar esta métrica en la barra superior del KDS (`KitchenKds.jsx`).
