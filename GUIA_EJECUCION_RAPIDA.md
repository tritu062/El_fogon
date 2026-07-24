# 🚀 Guía de Inicio Rápido para Ejecutar "El Fogón"

¡Bienvenido! Esta guía está diseñada para que **cualquier persona**, incluso sin experiencia técnica ni herramientas de programación previamente instaladas, pueda ejecutar el sistema en su computadora y ver todos los avances realizados hasta el momento.

---

## ⚡ Método 1: Inicio Súper Rápido con 1 Clic (Recomendado)

Hemos creado scripts automáticos que preparan todo por ti sin necesidad de ingresar comandos en terminales.

### Paso 1: Descargar e instalar Node.js (Si no lo tienes)
1. Ve al sitio oficial de Node.js: **[https://nodejs.org/](https://nodejs.org/)**
2. Haz clic en el botón verde grande que dice **"LTS"** (Long Term Support).
3. Abre el archivo descargado e instálalo presionando **"Siguiente"** en todas las pantallas hasta finalizar.

### Paso 2: Ejecutar el sistema
*   **Si usas Windows:** Haz **doble clic** sobre el archivo `iniciar_sistema.bat` ubicado en la carpeta principal del proyecto.
*   **Si usas Mac o Linux:** Abre una terminal en la carpeta e ingresa `./iniciar_sistema.sh`.

¡Listo! El archivo instalará automáticamente lo necesario, abrirá los servidores de fondo y lanzará tu navegador web en la dirección **`http://localhost:3000`**.

---

## 🐳 Método 2: Ejecución con Docker Desktop (Sin instalar Node.js)

Si prefieres usar Docker para ejecutar la aplicación en contenedores aislados:

1. Instala e inicia **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**.
2. Abre tu consola de comandos en la carpeta del proyecto.
3. Ejecuta el comando:
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```
4. Ingresa en tu navegador a **`http://localhost:3000`**.

---

## 🛠️ Método 3: Instalación Manual Tradicional

Si eres desarrollador y prefieres controlar cada proceso manualmente:

### 1. Iniciar la API (Backend)
```bash
# Entrar a la carpeta backend
cd backend

# Instalar dependencias
npm install

# Iniciar la base de datos (desarrollo)
npx prisma migrate dev --name init

# Sembrar datos iniciales (usuarios, catálogo, mesas)
npx prisma db seed

# Iniciar servidor en modo desarrollo (Puerto 4000)
npm run dev
```

### 2. Iniciar el Cliente Web (Frontend)
Desde otra ventana de terminal:
```bash
# Entrar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor web de desarrollo (Puerto 3000)
npm run dev
```

---

## 🔐 Credenciales de Prueba para Probar los 4 Roles

El sistema cuenta con datos de demostración previamente sembrados para que puedas probar las vistas y funcionalidades de cada tipo de empleado:

| Rol de Usuario | Correo Electrónico | Contraseña | Funciones Principales que puedes probar |
| :--- | :--- | :--- | :--- |
| 🛡️ **Administrador** | `admin@elfogon.com` | `Admin123!` | Resumen general, gestión de empleados, auditoría y configuración de menú y mesas. |
| 🍽️ **Mesero** | `waiter@elfogon.com` | `Waiter123!` | Mapa visual del salón, apertura de mesas, toma interactiva de pedidos y comanda digital. |
| 👨‍🍳 **Cocinero** | `chef@elfogon.com` | `Chef123!` | Pantalla KDS de cocina en tiempo real para marcar platos en preparación y despachados. |
| 💵 **Cajero** | `cashier@elfogon.com` | `Cashier123!` | Control de apertura/cierre de caja chica, cobro de pedidos, emisión de facturas y formas de pago. |

---

## 🧪 Verificación del Código y Pruebas Automatizadas

Si deseas verificar que todo el código del sistema funciona correctamente sin fallos:

1. **Pruebas de API y Seguridad (94 pruebas)**:
   ```bash
   cd backend
   npm test
   ```
2. **Prueba de Compilación para Producción del Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

---

## ❓ Preguntas Frecuentes y Solución de Problemas

*   **¿El navegador no abre automáticamente?** Abre Google Chrome, Edge o Firefox y visita manualmente la dirección: `http://localhost:3000`.
*   **¿Aparece un mensaje de puerto ocupado?** Asegúrate de no tener otra instancia del sistema ejecutándose o cierra otras terminales abiertas.
