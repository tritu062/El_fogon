# 🎓 Bitácora de Aprendizaje — El Fogón (Etapa 1)

Este documento resume los conceptos clave, técnicas de programación y lecciones arquitectónicas aprendidas durante la construcción de la base del sistema de gestión de **El Fogón**.

---

## 🐋 1. Dockerización Avanzada y Caché de Capas

### Concepto
Docker construye imágenes ejecutando instrucciones secuenciales en un archivo `Dockerfile`. Cada instrucción representa una "capa" física en el disco duro.
*   **Aprovechamiento de Capas:** En nuestros Dockerfiles, realizamos lo siguiente:
    ```dockerfile
    COPY package*.json ./
    RUN npm install
    COPY . .
    ```
*   **Por qué se hace:** Al copiar únicamente los archivos descriptores de dependencias (`package.json`) e instalar los paquetes *antes* de copiar el código fuente completo, Docker cacheará la capa de `npm install`. Si modificamos el código fuente de JavaScript, Docker omitirá volver a descargar todos los paquetes de Node, reduciendo el tiempo de compilación a menos de 5 segundos. 🚀

---

## 🔒 2. Seguridad en Sesiones HTTP: Cookies vs LocalStorage

### localStorage
*   **Qué es:** Almacenamiento local del navegador expuesto a Javascript.
*   **Riesgo:** Si un atacante inyecta código malicioso (XSS) mediante campos de entrada no saneados, puede acceder al objeto global `localStorage` y robar el token de acceso del usuario para suplantar su identidad.

### httpOnly Cookie + JWT en Memoria (Nuestra Arquitectura)
Para mitigar esto, implementamos un flujo híbrido:
1.  **Access Token en Memoria:** Almacenado en una variable de javascript normal dentro de la aplicación. Al cerrarse la pestaña del navegador, el token se destruye. Javascript no puede ser consultado desde fuera para leer esta variable, protegiéndola de ataques XSS.
2.  **Refresh Token en Cookie httpOnly:** El navegador gestiona la cookie automáticamente de forma nativa. Javascript tiene el acceso estrictamente bloqueado. Las cabeceras `Secure` (exige HTTPS) y `SameSite=Strict` (impide el envío en peticiones de origen cruzado de terceros) actúan como escudo blindado contra el robo de sesiones y ataques de falsificación de solicitudes (CSRF).

---

## 🔄 3. Interceptores de Axios y Manejo de Colas

### El problema de la caducidad
Cuando un usuario tiene la pestaña abierta y su Access Token (de 15 minutos de vida) expira, la siguiente llamada HTTP a la API fallará con un código `401`. Si el usuario tiene 4 componentes en pantalla que hacen peticiones paralelas simultáneas, todas fallarán.

### La solución: Cola de Promesas en Axios
Implementamos un interceptor de respuesta en [api.js](file:///D:/Cris/frontend/src/lib/api.js):
*   Cuando la primera petición falla con `401`, se activa una bandera de bloqueo `isRefreshing = true`.
*   Las otras 3 peticiones paralelas que fallan a continuación son interceptadas y devuelven una promesa pendiente, agregándose a una cola de espera `failedQueue`.
*   Axios ejecuta una llamada única a `/auth/refresh` para rotar el token.
*   Una vez obtenido el nuevo Access Token, se inyecta en memoria, se resuelven las promesas de la cola con el nuevo token, y se reintentan las 4 llamadas originales.
*   **Resultado:** Para el usuario, la aplicación sigue funcionando de manera continua sin recargar pantallas ni requerir un nuevo inicio de sesión manual.

---

## 🧪 4. Testing e Interoperabilidad ESM / CommonJS

### El desafío en Vitest
Durante las pruebas unitarias, nos encontramos con un fallo de tipo `TypeError: prisma.user.findFirst.mockResolvedValue is not a function`.
*   **Causa:** Nuestro código fuente utiliza CommonJS (`require()`), mientras que la suite de pruebas de Vitest utiliza ES Modules (`import`). Vitest cargaba una copia ES Module Namespace en los tests y los controladores leían del caché CommonJS nativo de Node, creando dos instancias separadas del cliente base de datos.
*   **Lección Aprendida:** Si los archivos bajo prueba se cargan con CommonJS y necesitamos aplicar espías (`vi.spyOn`), debemos utilizar `require()` en el archivo de test para importar los archivos locales del proyecto. Esto asegura que la prueba y el controlador operen sobre la misma referencia de memoria y que los espías funcionen correctamente.

---

## 🗄️ 5. Control de Acceso basado en Roles (RBAC) con Relaciones Explícitas

### Relaciones implícitas vs explícitas en Prisma
Las relaciones muchos a muchos implícitas de Prisma son fáciles de escribir pero rígidas. 
*   Al crear una tabla asociativa explícita (`UserRole`), pudimos dotarla de campos adicionales de auditoría (`createdAt`, `updatedAt`, `deletedAt`).
*   Esto nos permite mantener logs detallados de cuándo se le concedió o revocó un permiso a un empleado y aplicar borrados lógicos (*Soft Delete*) a las asignaciones de cargo sin romper el historial transaccional de ventas del restaurante.

---

## 🧹 6. Saneamiento automático contra XSS (Zod Transforms)

### Concepto
Sanear cadenas de texto contra XSS directamente en el controlador suele provocar omisiones humanas.
*   **La solución en Zod:** Usando la instrucción `.transform(escapeHtml)` de Zod, interceptamos el flujo de validación del input a nivel de esquema en [users.schemas.js](file:///D:/Cris/backend/src/modules/users/users.schemas.js).
*   **Por qué destaca:** Cualquier campo de texto (`firstName`, `lastName`) que contenga caracteres peligrosos como `<script>` o `"` es automáticamente transformado a entidades HTML seguras (`&lt;script&gt;`) *antes* de que llegue a las variables del controlador y se inserte en la base de datos.

---

## 🛡️ 7. Integridad en Eliminaciones de Catálogo (onDelete: Restrict)

### Concepto
¿Qué ocurre si borramos una categoría del menú que tiene 10 platos asignados? O una mesa con comandas activas.
*   **Restricción Física:** En el archivo `schema.prisma`, las relaciones clave usan `onDelete: Restrict`. PostgreSQL bloquea automáticamente cualquier intento físico de borrar la entidad padre si existen hijos vinculados.
*   **Capa de Servicio Inteligente:** En nuestros controladores del backend, realizamos una verificación proactiva (`prisma.item.count(...)` o `prisma.order.count(...)`) antes de procesar una baja o soft delete. Esto nos permite interceptar la acción y retornar un mensaje de error limpio en español (HTTP 400) al frontend en vez de colapsar con una excepción de base de datos genérica (HTTP 500).

---

## 📊 8. Trazabilidad Absoluta en Cambios Sensibles (Audit Logs)

### Concepto
Las mutaciones sobre usuarios, mesas o pedidos requieren supervisión para evitar fraudes internos (como el robo hormiga o la manipulación de accesos).
*   **Transacciones Atómicas:** Cada mutación de usuario o de comanda corre dentro de una transacción de Prisma (`prisma.$transaction`). La creación del registro en la tabla `AuditLog` es obligatoria para confirmar la transacción. Si falla la escritura del log, la acción principal hace rollback automático.
*   **Metadatos de Red:** Registramos no solo la acción, sino también la dirección IP origen (`req.ip`) y el User-Agent del navegador para identificar de qué terminal física provino el cambio administrativo.

---

## 🔒 9. Evitar Condiciones de Carrera en Asignación de Mesas (Race Conditions)

### Concepto
Si dos meseros abren la misma mesa libre a la vez, ambos leen el estado `FREE` y crean dos pedidos paralelos asignados a la misma mesa, duplicando consumos.
*   **La Solución:** Ejecutar la consulta de estado de la mesa y la creación de la comanda dentro de una transacción de Prisma (`prisma.$transaction`). Si el estado de la mesa no es `FREE`, la transacción aborta inmediatamente y lanza `TABLE_ALREADY_OCCUPIED` (400), garantizando que solo una comanda pueda abrir la mesa.

---

## 🛍️ 10. Desacoplamiento de Entidades Físicas (Pedidos Multimodales)

### Concepto
Modelar pedidos para llevar o a domicilio que no tienen una mesa física asociada, sin alterar la lógica comercial ni romper la base de datos.
*   **La Solución:** Permitir `tableId` como nullable y clasificar los pedidos mediante el enum `orderType` (`PRESENCIAL`, `PARA_LLEVAR`, `DOMICILIO`). En el frontend, el formulario de comanda adapta su UI dinámicamente: si se deselecciona la mesa física, se activa el dropdown de tipo de pedido (Para Llevar o Domicilio) y viceversa.

---

## 🧹 11. Seguridad en Cancelaciones: Reglas de Negocio Cruzadas

### Concepto
Evitar que los meseros cancelen platos de una comanda que ya han sido preparados o entregados, previniendo mermas financieras no autorizadas.
*   **La Solución:** Si el pedido está en estado `READY` o `SERVED`, el backend exige rol de `ADMINISTRADOR` para cancelar ítems. Si está en `PENDING` o `PREPARING`, el `MESERO` puede hacerlo pero el sistema le obliga a registrar un motivo (mínimo 3 caracteres), el cual se escribe atómicamente en `AuditLog` para auditorías de merma.

---

## 🍳 12. Monitoreo KDS Unificado y Control de Estado en Dos Fases

### Concepto
Evitar que los pedidos desaparezcan de la cola del KDS (Cocina) al iniciar su preparación, lo cual provocaba que el cocinero perdiera de vista el pedido antes de terminarlo.
*   **La Solución:** Modificar la consulta del KDS en el backend para incluir tanto pedidos `PENDING` (en cola) como `PREPARING` (en elaboración). En el frontend, se rediseñó el ciclo de vida visual de la tarjeta de comanda: si está en cola, muestra el botón **"Empezar Preparación"** y la insignia amarilla/gris. Si está en preparación, muestra el botón **"Despachar Comanda"** y la insignia de fuego naranja, logrando una operación coordinada en dos clics que previene pérdidas de información y mejora el ritmo de despacho.
*   **Control Sincronizado de Audio:** Al pasar el estado `soundEnabled` desde el componente KDS como parámetro al hook de consulta, se logró que la reproducción nativa del beeper web respete de forma estricta la preferencia del usuario en el navegador (silenciado/activo), solucionando un comportamiento molesto en ambientes reales de alta carga.

---

## 💵 13. Aritmética de Redondeo y Distribución Proporcional (Cuentas Divididas)

La implementación del cobro con cuentas divididas en una caja de restaurante introduce desafíos de redondeo matemático y consistencia de datos:

### A. Reparto Seguro de Residuo ($T \pmod N$)
*   **Problema:** Al dividir un total (ej. $100.01) entre $N$ personas, el uso de números flotantes de JavaScript puede generar un acumulado de centavos perdidos, impidiendo el cierre de la comanda en la base de datos (debido a validaciones de cuadre estricto).
*   **Aprendizaje:** Trabajar con aritmética de enteros en centavos y calcular la base $S = \lfloor T / N \rfloor$ y el residuo $R = T \pmod N$. Asignar $S + 1$ a los primeros $R$ pagos y $S$ a los $N - R$ restantes garantiza que la sumatoria total sea exactamente igual al valor facturado, resolviendo la pérdida de centavos a nivel de centésimas.

### B. Distribución Proporcional de Cargos e Impuestos
*   **Problema:** Al dividir por ítems seleccionados de manera manual, no se puede cobrar únicamente el precio base de los platos seleccionados. Se debe aplicar el descuento e impuesto global del pedido de forma justa y proporcional a lo que cada cliente consumió.
*   **Aprendizaje:** Calcular la proporción del subtotal de la selección contra el subtotal total del pedido:
    *   Proporción $P = Subtotal_{seleccionado} / Subtotal_{total}$
    *   Impuesto proporcional: $T_{prop} = \text{round}(T_{total} \times P)$
    *   Descuento proporcional: $D_{prop} = \text{round}(D_{total} \times P)$
    *   Monto de pago de la porción: $Total_{part} = Subtotal_{seleccionado} + T_{prop} - D_{prop}$

### C. Ajuste por Redondeo de Cierre (Last Portion Rounding Curing)
*   **Problema:** Incluso con redondeo simétrico (`Math.round`), la suma de proporciones redondeadas de forma independiente puede generar una discrepancia final de +/- 1 o 2 centavos en el saldo restante (`remaining`) de la cuenta.
*   **Aprendizaje:** Al registrar el pago por selección de ítems, si la cantidad de artículos seleccionados más los ya asignados completa la totalidad del pedido (100% de cobertura), el sistema descarta la fórmula proporcional para este último pago y le asigna exactamente el saldo restante exacto (`remaining`). Esto asegura que al registrar este último pago, el saldo de la factura pendiente pase a ser exactamente `0`, completando la comanda limpiamente.
