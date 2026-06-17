# Manual de Usuario — Sistema El Fogón

Bienvenido al manual operativo de **El Fogón**, la plataforma integrada de gestión de salón, pedidos, cocina y caja del restaurante. Este manual está dividido por perfiles de usuario para facilitar el entrenamiento del personal.

---

## 👤 1. Perfil: Administrador

El Administrador tiene el control total sobre la configuración del comedor, la base de usuarios y la oferta del menú.

### A. Gestión de Zonas y Mesas
*   **Ingreso**: Menú Lateral -> **Gestión de Mesas**.
*   **Crear una Zona**: Haz clic en "Crear Zona", ingresa el nombre (ej. *Terraza*, *VIP*) y una descripción opcional.
*   **Crear una Mesa**: Haz clic en "Crear Mesa", especifica el número correlativo y la zona a la que pertenece.
*   **Regla de Seguridad**: El sistema no te permitirá eliminar una zona si contiene mesas, ni eliminar una mesa si tiene comandas pendientes en cocina. Primero debes reubicar o cerrar dichas cuentas.

### B. Gestión de la Carta y Menú
*   **Ingreso**: Menú Lateral -> **Carta / Menú**.
*   **Categorías**: Crea las categorías de los platos (ej. *Corrientes*, *Ejecutivos*, *Bebidas*).
*   **Crear Platos**: Haz clic en "Registrar Plato/Bebida". Define el nombre, descripción, precio base (en pesos) y modificadores opcionales en formato de texto.
*   **Disponibilidad Rápida**: Si un plato se agota en cocina, puedes pulsar el switch **"Disponible"** directamente en la lista para ocultar el plato del panel de pedidos del mesero al instante.

### C. Gestión de Personal (Usuarios y Roles)
*   **Ingreso**: Menú Lateral -> **Gestión de usuarios**.
*   **Registrar Nuevo Empleado**: Presiona "Registrar Empleado". Ingresa el nombre, apellido, correo electrónico y contraseña inicial. Selecciona uno o más roles de trabajo (ej: *Mesero*, *Cajero*).
*   **Modificar Empleado**: Haz clic en el botón de edición (`✏️`) para actualizar la información básica del personal, reasignar sus roles de trabajo, o restablecer su contraseña de acceso.
*   **Desactivar o Eliminar**: Puedes desactivar la cuenta marcando el switch "Cuenta Activa" como falso, o eliminarlo lógicamente haciendo clic en el icono de papelera (`🗑️`).
*   **Regla de Seguridad**: El sistema bloqueará la eliminación o desactivación de un usuario si este tiene actualmente un turno de caja abierta activo. Primero se debe realizar el cierre de caja.

### D. Visualización de Logs de Auditoría
*   **Ingreso**: Menú Lateral -> **Logs de auditoría**.
*   **Visualización**: Muestra el historial completo de cambios en el sistema con marcas de tiempo precisas, nombres de usuario, acciones realizadas (ej: *ELIMINAR_USUARIO*) y descripciones legibles.
*   **Filtros**: Permite realizar búsquedas cruzadas por empleado, tipo de acción, o un rango de fechas específico.
*   **Metadatos**: Registra la dirección IP de la máquina de red y el cliente de navegación para verificar la procedencia de cualquier acción.

---

## 👤 2. Perfil: Mesero (Tomar Pedidos)

El mesero es el encargado de atender al cliente y transmitir el pedido en tiempo real a la cocina.

### A. Plano del Salón
*   **Ingreso**: Menú Lateral -> **Mis Mesas Activas**.
*   **Código de Colores**:
    *   🟢 **Verde (Libre)**: Mesa vacía lista para recibir clientes.
    *   🔴 **Rojo (Ocupada)**: Mesa con un servicio activo de comida.
    *   🟡 **Amarillo (Reservada)**: Mesa guardada para un cliente.
*   **Ayuda Rápida**: En la parte superior verás un panel informativo que te recordará qué hacer según el color de cada mesa.

### B. Registrar una Comanda
1.  En la mesa en verde del salón, presiona **Tomar Pedido**.
2.  **Selección de Mesa o Modalidad**: 
    *   Si seleccionas una mesa física, el tipo de pedido se fijará automáticamente como **Presencial** (🍽️).
    *   Si deseas registrar un pedido para llevar o a domicilio, selecciona **Para Llevar / Delivery** en el menú de mesas. Esto desbloqueará un desplegable de **Tipo de Pedido** para que elijas entre **Para Llevar** (🛍️) o **Domicilio** (🛵).
3.  Empieza a añadir platos haciendo clic en ellos del menú de la izquierda.
4.  **Configurador de Plato**: Al seleccionar un plato, se abre un cuadro para configurar notas (ej. *"Sin cebolla"*), cantidades y seleccionar los modificadores del plato (ej: término de la carne, sabor de bebida).
5.  **Vaciar Comanda**: Si cometiste un error general, puedes presionar **Vaciar** en la cabecera de la comanda derecha. El sistema te pedirá confirmación antes de limpiar todo.
6.  **Salir al Salón**: Si presionas **Volver al Salón** teniendo ítems en el carrito, se disparará una alerta previniendo que cierres la pantalla por accidente y pierdas tu progreso.
7.  Presiona **Enviar Comanda a Cocina** para despachar el pedido. Si es presencial, la mesa pasará a color 🔴 **Rojo** automáticamente.

### C. Adicionar a una Mesa Ocupada
1.  Si el cliente pide algo extra, busca la mesa roja en el salón y presiona **Adicionar**.
2.  El sistema te indicará en un banner de color amarillo que estás en **Modo Adición** y a qué comanda se sumarán los platos.
3.  Agrega los nuevos platos al carrito y pulsa **Adicionar a Comanda**. El total se acumulará de forma segura en el backend y se transmitirá a la cocina.

### D. Seguimiento de Pedidos Activos (Mis Pedidos Activos)
*   **Ingreso**: Menú Lateral -> **Pedidos Activos**.
*   **Actualización en Vivo**: Los pedidos se actualizan automáticamente cada 10 segundos en esta vista mediante short-polling.
*   **Estados de Preparación**: Puedes ver en tiempo real el progreso de cada pedido:
    *   `PENDING`: Esperando en cola.
    *   `PREPARING`: En elaboración por cocina.
    *   `READY`: Elaborado y listo en la mesa de despacho.
    *   `SERVED`: Entregado al cliente.
*   **Acción de Entrega**: Cuando veas que un pedido cambia al estado `READY` (tarjeta de color verde), ve a la zona de despacho por los platos y, al entregarlos a los clientes, presiona el botón **Entregar Pedido** para cambiar su estado a `SERVED`.
*   **Solicitar Pre-cuenta**: Cuando la mesa solicite el cobro, presiona el botón **Solicitar Pre-cuenta**. Esto le enviará una señal visual instantánea al Cajero en su pantalla de cuentas pendientes para indicarle que debe facturar esa mesa.

### E. Anular o Cancelar Platos con Motivo
1.  Si necesitas eliminar un plato de un pedido que ya fue enviado, ve a la tarjeta del pedido en **Pedidos Activos** y haz clic en el icono de papelera al lado del plato que deseas retirar.
2.  **Motivo Obligatorio**: Se abrirá un cuadro donde deberás escribir obligatoriamente un motivo claro y descriptivo de la cancelación (mínimo 3 caracteres, ej: *"Cliente canceló porque demoró mucho"*).
3.  **Auditoría**: Toda cancelación queda guardada en la base de datos vinculada a tu usuario, IP y hora, en los Logs de Auditoría para control de pérdidas.
4.  **Regla de Seguridad**: Si el plato ya fue preparado por cocina (estados `READY` o `SERVED`), el botón estará bloqueado para ti. Deberás llamar a un **Administrador** para que inicie sesión y autorice la cancelación de dicho ítem.

---

## 👤 3. Perfil: Cocinero (KDS de Cocina)

El Cocinero trabaja con una pantalla oscura optimizada de alta visibilidad para coordinar la salida de platos.

### A. Estructura de la Pantalla
*   **Columna Izquierda (Comandas Pendientes)**: Lista en orden FIFO (las más viejas arriba) las comandas enviadas por los meseros.
*   **Columna Derecha (Despachadas Hoy)**: Muestra un historial rápido de las últimas comandas marcadas como listas durante el día.

### B. Semáforo de Tiempos
Cada tarjeta de pedido muestra un cronómetro en vivo desde que el mesero la envió:
*   ⏱️ **Verde**: Menos de 10 minutos en preparación.
*   ⏱️ **Amarillo**: De 10 a 14 minutos en preparación (pedido retrasado).
*   ⏱️ **Rojo Intermitente**: Más de 15 minutos (¡Alerta crítica de retraso!).

### C. Operación (Flujo en Dos Pasos)
Cada comanda que ingresa a la cocina pasa por dos etapas de preparación:
1.  **Etapa 1: Iniciar Preparación**: Cuando la comanda está en estado *En Cola* (⏳ badge amarillo), presiona el botón **Empezar Preparación** (botón azul con icono de gorro de chef). La comanda pasará a estado *Preparando* (🔥 badge naranja), notificando en tiempo real a la pantalla del mesero que sus platos ya están en elaboración. El pedido permanece en tu pantalla para que no pierdas su detalle.
2.  **Etapa 2: Despachar**: Una vez terminada la preparación de todos los platos del pedido, presiona el botón **Despachar Comanda** (botón verde con icono de check). El pedido desaparecerá de la cola de pendientes, se listará en la columna derecha de *Despachadas* y notificará al mesero para que retire el plato de cocina y lo sirva.
*   **Alerta Sonora**: Si ingresa un nuevo pedido, la pantalla emitirá un pitido de alerta. Puedes silenciar o activar este sonido pulsando el icono de altavoz/volumen en la barra superior. El pitido respetará estrictamente tu configuración de silencio.

---

## 👤 4. Perfil: Cajero (Facturación y Pagos)

El Cajero administra el flujo de caja diario, procesa pagos y liquida cuentas.

### A. Apertura de Turno (Drawer Lock)
*   **Ingreso**: Menú Lateral -> **Cuentas pendientes** o **Cierre de Caja**.
*   **Bloqueo de Seguridad**: Si es tu primer acceso del día, verás una pantalla obligatoria de **Apertura de Caja**.
*   1. Ingresa el **Monto Inicial** en pesos de la base de efectivo que recibes para dar cambio.
*   2. Agrega observaciones opcionales y presiona **Confirmar Apertura**.

### B. Liquidar Cuentas
1.  Ve a **Cuentas Pendientes**. Verás las mesas que están consumiendo y su total actual.
    *   **Pre-cuenta prioritaria**: Aquellos pedidos donde el mesero haya solicitado la cuenta aparecerán marcados con una insignia de campana parpadeante `🔔 Pre-cuenta` al principio de la lista.
2.  Presiona **Cobrar** en la mesa correspondiente para abrir el modal de facturación.
3.  **Cálculo de Impuestos y Descuentos**:
    *   Ingresa el porcentaje de impuesto (ej: *8* para Impoconsumo) si aplica.
    *   Ingresa descuentos en pesos si tienes autorizaciones. El total a cobrar se recalcula al instante.
    *   *Nota*: Para mantener consistencia, estos campos se deshabilitarán en cuanto registres el primer pago. Si necesitas corregirlos, deberás vaciar los pagos ingresados.
4.  **Cuentas Divididas y Medios de Pago**:
    *   **Pago General / Rápido**:
        *   **Pago Rápido**: Haz clic en "Full Efectivo", "Full Tarjeta" o "Full Transf." para cubrir el 100% de la cuenta con un solo clic.
        *   **Pago Mixto**: Selecciona el método, escribe el monto en la caja de texto y presiona el botón `+`. Puedes combinar, por ejemplo, $15,000 en Efectivo y el saldo con Tarjeta.
    *   **Dividir por Partes Iguales**:
        *   Ve a la pestaña **Partes Iguales** en la interfaz de cobro.
        *   Digita el número de personas ($N$) en los que deseas dividir la cuenta y haz clic en **Generar**.
        *   El sistema dividirá matemáticamente la cuenta total entre las $N$ partes. Para evitar la pérdida de centavos debido al redondeo, distribuirá el residuo de la división ($Total \pmod N$) asignando 1 centavo extra a los primeros pagos correspondientes.
        *   Esto agregará las $N$ partes a la lista de pagos en la pestaña principal. El cajero podrá cambiar el medio de pago de cualquiera de estas partes directamente usando el selector desplegable en cada fila.
    *   **Dividir por Selección de Ítems (Consumo Individual)**:
        *   Ve a la pestaña **Por Ítems** en la interfaz de cobro.
        *   Se mostrará la lista de platos y bebidas del pedido desglosada por unidades (si pidieron 2 cervezas, verás "Cerveza (Unidad 1)" y "Cerveza (Unidad 2)" de manera independiente).
        *   Marca la casilla de los platos que pagará el primer cliente.
        *   El sistema calculará automáticamente el monto exacto de esa selección, aplicando proporcionalmente el impuesto y descuento configurado globalmente para el pedido.
        *   Elige el medio de pago y haz clic en **Agregar Pago**. Los platos seleccionados cambiarán al estado **Asignado** (quedando deshabilitados de la selección).
        *   Repite el proceso seleccionando los platos del siguiente cliente. Si deseas liberar platos ya asignados, simplemente haz clic en el botón de eliminar (`🗑️`) del pago correspondiente en la lista de pagos acumulados.
5.  **Calculadora de Vuelto**: Si el cliente te da un billete de efectivo mayor al saldo restante, escribe el valor recibido. El sistema te mostrará de forma destacada el **Cambio / Vuelto** exacto a entregar en pesos.
6.  Presiona **Procesar y Emitir Factura**. Se generará el recibo oficial y se liberará la mesa a color 🟢 **Verde** automáticamente si no quedan más consumiciones asociadas.
7.  Se desplegará una vista previa estilo ticket térmico que puedes enviar a imprimir presionando **Imprimir Ticket**.

### C. Cierre de Caja (Arqueo)
*   **Ingreso**: Menú Lateral -> **Cierre de Caja**.
*   Verás un resumen con el desglose de ventas acumuladas por efectivo, tarjeta y transferencia durante tu turno.
*   **Previsor de Arqueo**: Digita el efectivo real que tienes físicamente en el cajón de dinero. 
    *   El sistema te dirá en tiempo real si tu caja está **cuadrada**, o si tienes un **faltante** o **sobrante** comparándolo contra el saldo esperado.
*   Digita notas opcionales y pulsa **Cerrar Turno de Caja** para finalizar la sesión del cajón de dinero.

### D. Historial
*   **Ingreso**: Menú Lateral -> **Historial de Transacciones**.
*   Busca facturas por fecha o número correlativo y vuelve a abrir cualquier recibo para reimpresiones o aclaraciones con el cliente.
