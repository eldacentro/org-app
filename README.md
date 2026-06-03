# Elda Centro

![Elda Centro](public/img/open-graph/elda-centro-og-image.png)

Aplicación de gestión interna y programación de reuniones para la congregación **Elda Centro**.

## Características Principales

*   📅 **Programas Semanales:** Creación y gestión automatizada de asignaciones para la reunión de entre semana y fin de semana.
*   📊 **Informes y Asistencia:** Registro de informes de servicio y estadísticas de asistencia de forma rápida y sencilla.
*   🔒 **Seguridad y Privacidad:** Encriptación de datos local y sincronización segura de extremo a extremo.
*   🛜 **Uso Sin Conexión (PWA):** Funciona completamente sin conexión a internet y sincroniza los cambios automáticamente cuando se detecta conexión.
*   🎨 **Interfaz Moderna:** Diseño premium con soporte para modo oscuro, claro y personalización de temas.

## Requisitos de Entorno

Asegúrate de configurar los archivos de entorno para el correcto funcionamiento de las conexiones a Firebase y API:

Crea un archivo `.env.local` en la raíz del proyecto con la siguiente estructura:

```env
VITE_FIREBASE_APIKEY=tu_api_key
VITE_FIREBASE_AUTHDOMAIN=app.eldacentro.com
VITE_FIREBASE_PROJECTID=elda-centro-app
VITE_FIREBASE_APPID=tu_app_id
VITE_APP_MODE="PRODUCTION"
VITE_APP_API_URL=https://api.eldacentro.com
```

## Desarrollo Local

1.  Instala las dependencias del proyecto:
    ```bash
    npm install
    ```
2.  Inicia el servidor de desarrollo local:
    ```bash
    npm run dev
    ```
3.  Para construir el paquete de producción:
    ```bash
    npm run build
    ```

## Despliegue

El proyecto está configurado para desplegarse en Firebase Hosting y Vercel.
