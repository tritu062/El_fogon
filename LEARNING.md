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
