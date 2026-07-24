@echo off
chcp 65001 > nul
title 🔥 Sistema Restaurante El Fogón - Inicio Rápido

echo ======================================================================
echo          🔥 RESTAURANTE EL FOGÓN - INICIADOR AUTOMÁTICO 🔥
echo ======================================================================
echo.

:: 1. Comprobar instalación de Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js no está instalado en este equipo.
    echo 💡 Por favor descárgalo e instálalo desde: https://nodejs.org/ (Versión LTS)
    echo    Luego de instalarlo, vuelve a hacer doble clic en este archivo.
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js detectado correctamente.
echo.

:: 2. Crear archivos .env si no existen
if not exist "backend\.env" (
    echo ⚙️ Configurando variables de entorno para el Backend...
    copy "backend\.env.example" "backend\.env" > nul
)

if not exist "frontend\.env" (
    echo ⚙️ Configurando variables de entorno para el Frontend...
    copy "frontend\.env.example" "frontend\.env" > nul
)

:: 3. Verificar e instalar dependencias del Backend
if not exist "backend\node_modules\" (
    echo 📦 Instalando librerías del Backend (esto tomará solo unos segundos)...
    cd backend
    call npm install
    cd ..
    echo ✅ Backend listo.
    echo.
)

:: 4. Generar Cliente Prisma e Inicializar Base de Datos
echo 🗄️ Verificando y preparando Base de Datos y Registros Semilla...
cd backend
call npx prisma generate > nul
call npx prisma db push --accept-data-loss > nul
call npx prisma db seed > nul
cd ..
echo ✅ Base de datos y registros semilla inicializados con éxito.
echo.

:: 4. Verificar e instalar dependencias del Frontend
if not exist "frontend\node_modules\" (
    echo 📦 Instalando librerías del Frontend (esto tomará solo unos segundos)...
    cd frontend
    call npm install
    cd ..
    echo ✅ Frontend listo.
    echo.
)

:: 5. Iniciar Backend en una ventana independiente
echo 🚀 Arrancando Servidor de la API (Backend)...
start "🔥 El Fogón - Backend (Puerto 4000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: 6. Iniciar Frontend en otra ventana independiente
echo 💻 Arrancando Interfaz Web (Frontend)...
start "🔥 El Fogón - Frontend (Puerto 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo 🟢 EL SISTEMA SE ESTÁ EJECUTANDO CORRECTAMENTE
echo ======================================================================
echo 🌐 Abre tu navegador en: http://localhost:3000
echo.
echo 👤 Credenciales de Acceso Rápidas:
echo    ------------------------------------------------------------------
echo    [ADMINISTRADOR] -> usuario: admin@elfogon.com   | clave: Admin123!
echo    [MESERO]        -> usuario: waiter@elfogon.com  | clave: Waiter123!
echo    [COCINERO]      -> usuario: chef@elfogon.com    | clave: Chef123!
echo    [CAJERO]        -> usuario: cashier@elfogon.com | clave: Cashier123!
echo ======================================================================
echo.

:: Intentar abrir la URL en el navegador por defecto
timeout /t 3 > nul
start http://localhost:3000

pause
