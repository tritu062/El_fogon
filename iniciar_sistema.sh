#!/usr/bin/env bash

echo "======================================================================"
echo "         🔥 RESTAURANTE EL FOGÓN - INICIADOR AUTOMÁTICO 🔥"
echo "======================================================================"
echo ""

# 1. Comprobar instalación de Node.js
if ! command -v node &> /dev/null
then
    echo "❌ ERROR: Node.js no está instalado en este sistema."
    echo "💡 Descárgalo e instálalo desde: https://nodejs.org/ (Versión LTS)"
    exit 1
fi

echo "✅ Node.js detectado correctamente."
echo ""

# 2. Crear archivos .env si no existen
if [ ! -f "backend/.env" ]; then
    echo "⚙️ Configurando variables de entorno para el Backend..."
    cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚙️ Configurando variables de entorno para el Frontend..."
    cp frontend/.env.example frontend/.env
fi

# 3. Verificar e instalar dependencias del Backend
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Instalando librerías del Backend..."
    cd backend && npm install && cd ..
fi

# 4. Generar Cliente Prisma y Sembrar Base de Datos
echo "🗄️ Verificando y preparando Base de Datos y Registros Semilla..."
cd backend
npx prisma generate
npx prisma db push --accept-data-loss
npx prisma db seed
cd ..
echo "✅ Base de datos y registros semilla inicializados con éxito."
echo ""

# 4. Verificar e instalar dependencias del Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalando librerías del Frontend..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "🚀 Arrancando Servidor Backend (Puerto 4000) y Frontend (Puerto 3000)..."

(cd backend && npm run dev) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "======================================================================"
echo "🟢 EL SISTEMA SE ESTÁ EJECUTANDO CORRECTAMENTE"
echo "======================================================================"
echo "🌐 Abre tu navegador en: http://localhost:3000"
echo ""
echo "👤 Credenciales de Acceso Rápidas:"
echo "   ------------------------------------------------------------------"
echo "   [ADMINISTRADOR] -> usuario: admin@elfogon.com   | clave: Admin123!"
echo "   [MESERO]        -> usuario: waiter@elfogon.com  | clave: Waiter123!"
echo "   [COCINERO]      -> usuario: chef@elfogon.com    | clave: Chef123!"
echo "   [CAJERO]        -> usuario: cashier@elfogon.com | clave: Cashier123!"
echo "======================================================================"
echo ""

# Abrir el navegador según el SO
sleep 2
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
fi

wait $BACKEND_PID $FRONTEND_PID
