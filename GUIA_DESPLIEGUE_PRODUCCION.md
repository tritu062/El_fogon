# 🚀 Guía de Despliegue a Producción — El Fogón

Instrucciones paso a paso para desplegar la plataforma **El Fogón** en un entorno de producción de alta disponibilidad (VPS Linux Ubuntu 22.04 LTS / Debian / AWS EC2 / DigitalOcean).

---

## 📋 1. Requisitos Previos en el Servidor
- **SO**: Ubuntu Server 20.04 / 22.04 LTS (o equivalente Linux)
- **Node.js**: v20.x LTS o superior
- **Base de Datos**: PostgreSQL 15+ 
- **Gestor de Procesos**: PM2 (`npm install -g pm2`)
- **Servidor Web / Proxy Inverso**: Nginx (`sudo apt install nginx`)
- **Certificados SSL**: Certbot para HTTPS gratuito (`sudo apt install certbot python3-certbot-nginx`)

---

## 🔒 2. Variables de Entorno de Producción (`.env`)

En la carpeta `/backend/`, crear el archivo `.env`:

```ini
PORT=4000
NODE_ENV=production

# Cadena de conexión a PostgreSQL Producción
DATABASE_URL="postgresql://usuario_prod:password_seguro@localhost:5432/elfogon_db?schema=public&connection_limit=20"

# Secretos JWT (¡Usar cadenas aleatorias de al menos 64 caracteres!)
JWT_ACCESS_SECRET="clave_ultra_secreta_access_token_produccion_2026_elfogon"
JWT_REFRESH_SECRET="clave_ultra_secreta_refresh_token_produccion_2026_elfogon"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Dominio del Frontend para políticas CORS y cookies
FRONTEND_URL="https://elfogon.com"
```

---

## 🛠️ 3. Pasos de Instalación y Despliegue Backend

1. **Clonar el repositorio**:
   ```bash
   git clone -b desarrollo https://github.com/tritu062/El_fogon.git /var/www/elfogon
   cd /var/www/elfogon/backend
   ```

2. **Instalar dependencias y generar Prisma Client**:
   ```bash
   npm install --production=false
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

3. **Iniciar el backend con PM2 en Modo Clúster**:
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

---

## 💻 4. Construcción y Despliegue del Frontend (React + Vite)

1. En la carpeta `/frontend/`:
   ```bash
   cd /var/www/elfogon/frontend
   npm install
   npm run build
   ```
2. Los archivos compilados quedarán en `/var/www/elfogon/frontend/dist`.

---

## 🌐 5. Configuración de Nginx y SSL HTTPS (Certbot)

Crear el archivo de sitio en `/etc/nginx/sites-available/elfogon`:

```nginx
server {
    listen 80;
    server_name elfogon.com www.elfogon.com;

    # Frontend (Archivos Estáticos Compilados)
    location / {
        root /var/www/elfogon/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Backend (Proxy Inverso a Node.js en puerto 4000)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar el sitio e instalar certificado HTTPS:
```bash
sudo ln -s /etc/nginx/sites-available/elfogon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d elfogon.com -d www.elfogon.com
```

---

## 💾 6. Estrategia de Backups Automáticos de Base de Datos

Crear un script de respaldo `/var/backups/backup_elfogon.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/elfogon"
DATE=$(date +%Y-%m-%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U usuario_prod elfogon_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Eliminar backups de más de 30 días
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
```

Programar ejecución diaria a las 03:00 AM en `crontab -e`:
```cron
0 3 * * * /bin/bash /var/backups/backup_elfogon.sh
```

---

## ✅ Checklist Final de Producción
- [x] Middlewares de seguridad habilitados (`helmet`, `cors`, `rateLimiter`).
- [x] Compresión Gzip activada (`compression`).
- [x] Consultas SQL indexadas en base de datos.
- [x] SSL/HTTPS activo y redirección HTTP -> HTTPS forzada.
- [x] Monitoreo con PM2 (`pm2 status`, `pm2 logs`).
