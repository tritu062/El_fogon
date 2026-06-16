# 🔥 El Fogón — Sistema de Gestión para Restaurante Mediano

Este es el repositorio base del sistema de gestión para el restaurante **El Fogón**, diseñado como un **Monorepo** y completamente preparado para entornos de desarrollo y producción mediante Docker y despliegues locales.

---

## 📂 Árbol del Proyecto y Estructura

```text
D:\Cris\ (Raíz del proyecto)
├── docker-compose.yml              # Configuración base de Docker (PostgreSQL)
├── docker-compose.dev.yml          # Modificaciones para desarrollo (Backend + Frontend)
├── ARCHITECTURE.md                 # Decisiones arquitectónicas y seguridad detalladas
├── API.md                          # Catálogo y contratos de endpoints HTTP
├── LEARNING.md                     # Conceptos educativos explicados detalladamente
├── ROADMAP.md                      # Planificación de fases y estimación de complejidad
├── README.md                       # Esta guía de inicio rápido
├── backend/                        # API REST de Node.js / Express
│   ├── Dockerfile.dev              # Receta Docker de Desarrollo para el backend
│   ├── package.json                # Gestión de dependencias de la API
│   ├── .env.example                # Plantilla de variables de entorno
│   ├── .env                        # Variables locales activas
│   ├── prisma/
│   │   ├── schema.prisma           # Modelado relacional y constraints de base de datos
│   │   └── seed.js                 # Semilla para roles y administrador semilla
│   ├── src/
│   │   ├── app.js                  # Inicialización y middlewares de Express
│   │   ├── index.js                # Oyente de puerto del servidor
│   │   ├── config/                 # Validadores de entorno, Winston y Prisma
│   │   ├── middlewares/            # CORS, request logging, rate limits, error handler
│   │   └── modules/                # Características de negocio (Health, Auth)
│   └── tests/                      # Suite de pruebas con Vitest y Supertest
└── frontend/                       # Cliente web de React 18 / Vite
    ├── Dockerfile.dev              # Receta Docker de Desarrollo para el frontend
    ├── package.json                # Dependencias del cliente web
    ├── index.html                  # Plantilla HTML raíz
    ├── tailwind.config.js          # Configuración de Tailwind CSS con modo oscuro
    ├── vite.config.js              # Configuración de puerto y bind host de Vite
    ├── src/
    │   ├── main.jsx                # Renderizador de React DOM
    │   ├── App.jsx                 # Inyector de contextos globales y rutas
    │   ├── index.css               # Estilos globales y Google Fonts
    │   ├── context/                # Estados de tema y autenticación reactivos
    │   ├── lib/                    # api.js con interceptor de cola de refresco
    │   ├── routes/                 # ProtectedRoutes (RBAC) y RoleRedirect
    │   ├── layouts/                # DashboardLayout responsivo con Sidebar/Navbar
    │   └── features/               # LoginPage y paneles por rol (Dashboards)
    └── dist/                       # Build optimizado compilado de producción
```

---

## 🚀 Requisitos e Instalación Rápida

### Prerrequisitos
*   [Node.js v18+](https://nodejs.org/) instalado.
*   [PostgreSQL](https://www.postgresql.org/) corriendo de forma local o [Docker Desktop](https://www.docker.com/) instalado y activo.

### Paso 1: Configurar Variables de Entorno
Crea y rellena el archivo `.env` en los subdirectorios.
*   **En `backend/.env`**:
    ```ini
    PORT=4000
    NODE_ENV=development
    FRONTEND_URL=http://localhost:3000
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=restaurante_el_fogon
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurante_el_fogon?schema=public
    JWT_ACCESS_SECRET=tu_secreto_super_seguro_de_acceso_123!
    JWT_REFRESH_SECRET=tu_secreto_super_seguro_de_refresh_321!
    ```
*   **En `frontend/.env`**:
    ```ini
    VITE_API_URL=http://localhost:4000
    ```

---

## 🛠️ Comandos de Ejecución y Consola

### 1. Levantar el Backend (API)
Desde una consola en `backend/`:
```bash
# Instalar dependencias
npm install

# Generar el cliente Prisma e inicializar base de datos
npx prisma migrate dev --name init

# Arrancar en modo desarrollo con nodemon
npm run dev
```

### 2. Levantar el Frontend (Cliente React)
Desde otra consola en `frontend/`:
```bash
# Instalar dependencias
npm install

# Arrancar el servidor de desarrollo de Vite
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000) e inicia sesión con las credenciales de desarrollo por defecto:
*   **Usuario:** `admin@elfogon.com`
*   **Contraseña:** `Admin123!`

---

## 🧪 Pruebas Unitarias y Automatización

Para validar la fiabilidad de la API, middlewares de rate limit, atrapamiento de rutas no válidas (404), bloqueos por fuerza bruta y control de acceso (RBAC), ejecuta la suite de pruebas desde la terminal en `backend/`:
```bash
npm run test
```
*Vitest cargará la configuración simulada de `tests/setup.js`, mockeará la capa de llamadas a Postgres y ejecutará los 11 casos de prueba.*

---

## 📦 Compilación para Producción

Para compilar el frontend React a un paquete estático optimizado y minificado de producción:
```bash
cd frontend
npm run build
```
*Los archivos compilados (HTML, CSS y JS) se guardarán en la carpeta `dist/`, listos para ser servidos por un servidor Nginx, CDN o el propio backend.*
