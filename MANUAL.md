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
1.  En la mesa en verde, presiona **Tomar Pedido**.
2.  Selecciona la mesa si no se pre-cargó, y empieza a añadir platos haciendo clic en ellos.
3.  **Configurador de Plato**: Al seleccionar un plato, se abre un cuadro para configurar notas (ej. *"Sin cebolla"*) y cantidades.
4.  **Vaciar Comanda**: Si cometiste un error general, puedes presionar **Vaciar** en la cabecera de la comanda derecha. El sistema te pedirá confirmación antes de limpiar todo.
5.  **Salir al Salón**: Si presionas **Volver al Salón** teniendo ítems en el carrito, se disparará una alerta previniendo que cierres la pantalla por accidente y pierdas tu progreso.
6.  Presiona **Enviar Comanda a Cocina** para despachar el pedido. La mesa pasará a color 🔴 **Rojo** automáticamente.

### C. Adicionar a una Mesa Ocupada
1.  Si el cliente pide algo extra, busca la mesa roja y presiona **Adicionar**.
2.  Agrega los nuevos platos al carrito y pulsa **Adicionar a Comanda**. El total se acumulará de forma segura.

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

### C. Operación
*   Al terminar la preparación de todos los platos de una tarjeta, presiona **Despachar Comanda**. El pedido desaparecerá de los pendientes, se moverá al historial de despachados y alertará al mesero para servirlo.
*   **Alerta Sonora**: Si ingresa un nuevo pedido, la pantalla emitirá un pitido de alerta. Puedes silenciar o activar este sonido pulsando el icono de campana/altavoz (`🔔`) en la barra superior.

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
2.  Presiona **Cobrar** en la mesa correspondiente para abrir el modal de facturación.
3.  **Cálculo de Impuestos y Descuentos**:
    *   Ingresa el porcentaje de impuesto (ej: *8* para Impoconsumo) si aplica.
    *   Ingresa descuentos en pesos si tienes autorizaciones. El total a cobrar se recalcula al instante.
4.  **Medios de Pago (Pagos Divididos/Mixtos)**:
    *   **Pago Rápido**: Haz clic en "Full Efectivo", "Full Tarjeta" o "Full Transf." para cubrir el 100% de la cuenta con un solo clic.
    *   **Pago Mixto**: Selecciona el método, escribe el monto y presiona el botón `+`. Puedes combinar, por ejemplo, $15,000 en Efectivo y el saldo con Tarjeta.
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
