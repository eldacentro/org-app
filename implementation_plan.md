# Notificaciones y Rediseño de UI de Territorios

Este plan detalla la implementación de notificaciones Push y por correo electrónico (Resend) para la asignación y solicitud de territorios, así como el rediseño estético de la pestaña de Notificaciones.

> [!IMPORTANT]
> **Revisión del Usuario Requerida**
> Necesito tu confirmación sobre cómo está conectado **Resend** a la aplicación. Por favor, lee la sección de **Preguntas Abiertas** más abajo y dime cómo debemos enviar los correos.

## Preguntas Abiertas

> [!WARNING]
> **1. Conexión con Resend**
> Mencionaste que "Resend ya está conectado a la app". Sin embargo, no veo referencias a Resend en el código de React. ¿Tienes instalada la **Extensión de Firebase "Trigger Email"** (o similar) que escucha una colección específica en la base de datos (por ejemplo, la colección `mail`)? Si es así, la implementación consistirá en escribir un documento en esa colección para que la extensión envíe el correo. Por favor confírmame el nombre de la colección o si la integración se hace de otra forma (por ejemplo, llamando a un endpoint específico de tu backend).

> [!WARNING]
> **2. Correos de Destinatarios**
> Para enviar el correo de "X solicitó un territorio", ¿a quién debe llegarle? ¿Al correo del coordinador/superintendente de servicio, o a una dirección genérica de la congregación? ¿O el sistema debe buscar los correos de todos los responsables de territorios?

## Cambios Propuestos

### 1. Notificaciones Push para Asignaciones

Actualmente la app envía notificaciones Push al *solicitar* y al *entregar* un territorio (mediante la API `apiSendTerritoryPush`). Sin embargo, no las envía al **asignar** uno. 

- **[MODIFY] [DialogAsignar.tsx](file:///Users/carlossacajr./projects/org-app/src/features/territories/dialogs/DialogAsignar.tsx)**
  - Importar e invocar `apiSendTerritoryPush` justo después de guardar la asignación, enviando una alerta al publicador con el título "Nuevo territorio" y el mensaje "Se te ha asignado el territorio X".

### 2. Notificaciones por Correo Electrónico (Resend)

Asumiendo que utilizamos una colección de Firestore (ej. `mail`) escuchada por una extensión de Firebase:

- **[NEW] [email.ts](file:///Users/carlossacajr./projects/org-app/src/services/firebase/email.ts)**
  - Crear una función `sendEmailNotification({ to, subject, html })` que inserte un documento en la colección de correos.
- **[MODIFY] [DialogSolicitar.tsx](file:///Users/carlossacajr./projects/org-app/src/features/territories/dialogs/DialogSolicitar.tsx)**
  - Al solicitar un territorio, obtener el correo del responsable (o enviar a un correo por defecto) llamando a `sendEmailNotification` con el asunto "Nueva solicitud de territorio".
- **[MODIFY] [DialogAsignar.tsx](file:///Users/carlossacajr./projects/org-app/src/features/territories/dialogs/DialogAsignar.tsx)**
  - Al asignar, buscar el correo del publicador beneficiario (a través del estado global de personas) y enviar el correo: "Se te ha asignado el territorio X".

### 3. Rediseño de la UI de Notificaciones

Mejoraremos visualmente el componente de notificaciones para que luzca muy "premium", enfocándonos en un diseño limpio, moderno, sin depender simplemente de añadir emojis. 

- **[MODIFY] [NotificationItem/index.tsx](file:///Users/carlossacajr./projects/org-app/src/features/app_notification/notification_item/index.tsx)**
  - Cambiar los bordes, añadir sombras sutiles (box-shadow) y efectos de hover (`transform: translateY(-2px)`).
  - Estilizar el punto indicador de "No leído" con un efecto de "pulse".
  - Mejorar la tipografía y el contraste de colores de los textos descriptivos.
- **[MODIFY] Componentes de Botones en Notificaciones** (ej. `TerritoryAssignedNotice`, `TerritoryAccessRequest`)
  - Rediseñar los botones de acción ("Ver Territorio", "Aprobar", "Marcar como leído") para que tengan mejor espaciado (padding), bordes redondeados y colores sólidos atractivos.

## Plan de Verificación

### Verificación Manual
1. Asignar un territorio y verificar que se lanza correctamente la notificación Push y se escribe el documento en la base de datos de correos.
2. Solicitar un territorio y verificar el envío del correo de solicitud.
3. Abrir el panel de notificaciones y confirmar que el rediseño es visualmente atractivo y los botones funcionan correctamente.
