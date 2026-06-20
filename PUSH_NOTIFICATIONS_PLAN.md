# Plan: Notificaciones push en la PWA (org-app)

> Estado: propuesta para revisión. No se ha escrito código de implementación todavía.

## 1. Contexto y restricción central

`org-app` (elda-centro-app) es una PWA React + Vite con SW de Workbox (`generateSW`), respaldada
por `sws2apps-api`. Firebase ya está integrado en ambos lados (frontend = auth; backend =
`firebase-admin`), pero **no hay FCM**.

**Restricción que define el diseño — cifrado E2E.** En `src/constants/table_encryption_map.ts`
los campos sensibles (`persons.assignments`, nombres, contenido de horarios) están marcados como
`shared`, lo que significa que se cifran en el cliente con la **access code / master key** de la
congregación antes de subirse. El backend solo almacena texto cifrado y únicamente puede leer
campos `public` (uids, estructura).

➡️ **El backend NO puede saber quién fue asignado a qué.** Por tanto:
- La **detección de asignaciones** debe ocurrir en el **cliente** (tiene la clave; ya resuelve
  asignaciones en `src/features/meetings/my_assignments/useAssignments.ts`).
- El backend solo puede actuar como **relé de push** (sabe los uids de los miembros y sus tokens
  de dispositivo), no como compositor de contenido específico.

## 2. Disparadores requeridos (acordados con el usuario)

- Nuevas asignaciones de **cualquier tipo**: reunión entre semana, fin de semana, Departamentos,
  Salidas de predicación, Exhibidores.
- Cada **notificación in-app** existente debe disparar también un push.
- **Agrupación obligatoria:** si se asignan varias cosas a la vez (mismo evento de sync), enviar
  **un solo** push del tipo "Se te asignaron varias cosas", no uno por asignación.

## 3. Arquitectura recomendada (por fases)

### Fase 0 — Fontanería FCM (base para todo)

**Frontend**
- Añadir `getMessaging` / `getToken` / `onMessage` a `src/services/firebase/`.
  Nueva env var `VITE_FIREBASE_VAPID_KEY` (+ `messagingSenderId` en `firebaseConfig`).
- Crear `public/firebase-messaging-sw.js` (SW dedicado de FCM, convive con `service-worker.js`
  de Workbox — no se tocan entre sí). Registrar con scope propio.
- Servicio de permiso/token: pedir permiso **tras una acción del usuario** (no al cargar), obtener
  token, mandarlo al backend, y refrescarlo en `onTokenRefresh` / al cambiar de cuenta.

**Backend (`sws2apps-api`)**
- Modelo de **tokens de dispositivo por usuario**: `users/{uid}/push_tokens[]` con
  `{ token, platform, lastSeen }`. Métodos en `v3/classes/User.ts` + persistencia en
  `v3/services/firebase/users.ts`.
- Endpoints en `v3/routes/users.ts`: `POST /push/token` (registrar) y `DELETE /push/token`
  (al cerrar sesión / revocar permiso).
- Helper de envío `v3/services/firebase/messaging.ts` usando `getMessaging().sendEachForMulticast`
  con la app de `firebase-admin` ya inicializada en `v3/config/firebase_config.ts`.
- Manejo de tokens inválidos (limpiar los que devuelvan `messaging/registration-token-not-registered`).

**Caveats transversales**
- **iOS:** web push solo si la PWA está **instalada** en pantalla de inicio (Safari ≥ 16.4).
  En navegador normal de iOS no funciona → detectar y no prometer push ahí.
- Lifecycle del token: revocación de permiso, logout, multi-dispositivo, multi-cuenta.

### Fase 1 — v1 que entrega valor rápido

Dos mecanismos complementarios:

**(A) Notificaciones locales con la app/SW vivos (cubre la mayoría de casos)**
- Tras cada sync (en el flujo de `backupScheduler` / al refrescar `assignmentsHistoryState`),
  el cliente **calcula el diff** de asignaciones del usuario actual contra el último estado visto
  (guardar un snapshot, p. ej. `lastSeenAssignmentsState` en IndexedDB).
- Reutilizar la lógica existente de `useAssignments.ts` (departamentos, salidas, exhibidores,
  reuniones) extrayéndola a un util puro reutilizable.
- **Agrupación:** colapsar el diff en un único `Notification`:
  - 1 nueva → "Nueva asignación: {título}".
  - N>1 nuevas → "Se te asignaron {N} cosas nuevas" (cuerpo opcional con desglose por tipo).
- Enganchar también las **notificaciones in-app** (`useRemoteNotifications` /
  `dbNotificationsBulkPut`): cuando llega una nueva no leída, disparar el mismo `Notification`,
  respetando la agrupación en una misma tanda.

**(B) Push real con la app cerrada — versión genérica**
- Backend envía un **data-push sin contenido sensible** ("Tienes novedades en tu congregación")
  a los tokens de los miembros cuando cambian los horarios/personas (engancha en `saveSchedules`
  / `saveDepartmentsSchedule` / `savePersons` de `v3/classes/Congregation.ts`).
- `firebase-messaging-sw.js` muestra una notificación **genérica**; al tocarla, abre la app, que
  computa y navega a "Mis asignaciones".
- Para evitar spam: **debounce/coalesce** por congregación (una notificación por ventana de tiempo)
  y enviar solo a los miembros afectados cuando se pueda inferir por uids `public`.

### Fase 2 — Mejor UX: push específico aun con la app cerrada (preserva E2E)

Idea clave: la master key **ya vive en IndexedDB** del cliente, y un service worker **puede leer
IndexedDB**. Por tanto el SW puede descifrar localmente sin que el servidor vea texto plano.

- En `firebase-messaging-sw.js`, al recibir el data-push: leer la master key de IndexedDB, traer
  el delta cifrado del horario, **descifrar y computar el diff de asignaciones en el propio SW**,
  y mostrar una notificación **específica y agrupada** — todo local, servidor nunca ve el contenido.
- Requiere empaquetar en el SW la lógica de descifrado (`services/encryption`) + resolución de
  asignaciones (extraída en Fase 1). Más complejo de bundlear, pero es la única vía a "Se te
  asignó X" con la app cerrada respetando E2E.
- Consideración de seguridad: la clave en IndexedDB ya es accesible para la app; el SW no añade
  exposición material nueva, pero debe documentarse.

## 4. Lógica de agrupación (detalle)

Una "tanda" = el conjunto de cambios detectados en un mismo ciclo de sync / push. Algoritmo:
1. Computar `nuevas = asignacionesActuales − últimasVistas` (por `person_uid` del usuario).
2. Filtrar a futuras (fecha ≥ hoy) y no descartadas.
3. Si `nuevas.length === 0` → nada.
4. Si `=== 1` → notificación específica.
5. Si `> 1` → una sola notificación agrupada con conteo (+ opcional desglose por tipo:
   "2 reuniones, 1 salida de predicación").
6. Persistir `últimasVistas` para no re-notificar.

## 5. Archivos a tocar (mapa)

**org-app**
- `src/services/firebase/index.ts` — init messaging + VAPID.
- `src/services/firebase/messaging.ts` *(nuevo)* — getToken/onMessage/registro.
- `public/firebase-messaging-sw.js` *(nuevo)* — SW de FCM.
- `src/features/.../push_optin/` *(nuevo)* — UI de permiso.
- Util de asignaciones extraído desde `src/features/meetings/my_assignments/useAssignments.ts`.
- Estado/tabla `lastSeenAssignments` en `src/indexedDb/` + diff en el flujo de sync
  (`src/services/app/backupScheduler.ts`).
- Enganche en `src/features/app_notification/container/useRemoteNotifications.tsx`.

**sws2apps-api**
- `v3/classes/User.ts` + `v3/services/firebase/users.ts` — tokens por usuario.
- `v3/routes/users.ts` — endpoints register/unregister token.
- `v3/services/firebase/messaging.ts` *(nuevo)* — envío FCM + limpieza de tokens.
- Enganches de cambio en `v3/classes/Congregation.ts` (`saveSchedules`, etc.).

## 5b. Estado de implementación — Fase 0 (fontanería FCM) ✅

Implementado y verificado (typecheck + lint limpios en ambos repos):

**org-app (frontend)**
- `.env.local` / `.env.example`: añadidas `VITE_FIREBASE_MESSAGINGSENDERID` y `VITE_FIREBASE_VAPID_KEY`.
- `src/services/firebase/index.ts`: `messagingSenderId` en `firebaseConfig`.
- `src/services/firebase/messaging.ts` *(nuevo)*: `isPushSupported`, `requestPushToken`,
  `revokePushToken`, `onForegroundPush`. Registra el SW de FCM pasando la config pública por
  query string (funciona en dev y prod sin hardcodear).
- `public/firebase-messaging-sw.js`: reescrito el stub previo para usar la config real, icono
  válido (`/img/icon/icon-192x192.png`), `tag` para colapsar (preparado para agrupación) y
  handler de `notificationclick` que enfoca/navega. Conserva el truco de dedupe del evento push.
- `src/services/api/user.ts`: `apiRegisterPushToken`, `apiDeletePushToken`.
- `src/hooks/usePushNotifications.tsx` *(nuevo)* + export en `hooks/index.ts`: expone
  `supported`/`permission`/`enabled` + `enablePush`/`disablePush` para un toggle de ajustes.

**sws2apps-api (backend)**
- `v3/definition/user.ts`: `push_token?` en `UserSession` (token por dispositivo/sesión).
- `v3/classes/User.ts`: `updatePushToken`, `getPushTokens`, `removePushTokens`.
- `v3/controllers/users_controller.ts`: `registerPushToken`, `deletePushToken`
  (usan `res.locals.currentUser` + `signedCookies.visitorid`).
- `v3/routes/users.ts`: `POST /:id/push-token`, `DELETE /:id/push-token`.
- `v3/services/firebase/messaging.ts` *(nuevo)*: `sendPushToUsers(userIds, payload)` con
  multicast por lotes de 500 y limpieza automática de tokens inválidos.

**Toggle de opt-in (Mi perfil) ✅**
- `src/features/my_profile/notifications/` *(nuevo)*: sección "Preferencias de notificaciones"
  con un switch que llama a `enablePush`/`disablePush`. Reutiliza claves i18n ya traducidas en
  los 40 idiomas (`tr_notificationPreferences`, `tr_notifications`, `tr_myAssignmentsDesc`,
  `tr_notificationPreferencesDesc`) — cero traducciones nuevas. Switch deshabilitado cuando el
  navegador no soporta web push (iOS sin instalar) o el permiso está bloqueado, con texto guía.
- `src/pages/my_profile/index.tsx`: render de `<Notifications />` en la columna derecha
  (gateado a `isConnected`).

**Limpieza en logout ✅**
- `src/features/my_profile/logout_confirm/useLogoutConfirm.tsx`: antes de `handleDeleteDatabase`
  (que hace signOut), borra el token en backend + local (best-effort, no bloquea el logout).

Verificado: `tsc` sin errores en archivos nuevos, `eslint` limpio, y **`vite build` correcta**.

**Pendiente de Fase 0:**
- Prueba end-to-end real (permiso → token → envío de prueba desde el backend) — ver guía abajo.
- Copy explicativo específico para iOS / permiso bloqueado (hoy reusa un texto genérico).

## 7. Cómo probar la Fase 0 (end-to-end)

1. **Levantar:** frontend `npm run dev` (o usar `eldacentro.com`), backend desplegado/local.
   El push real solo funciona sobre **HTTPS** o `localhost` (no IP LAN).
2. **Activar:** entrar a *Mi perfil* → "Preferencias de notificaciones" → activar el switch.
   El navegador pide permiso → aceptar. Debe aparecer el snackbar de éxito.
3. **Verificar el token en backend:** confirmar que el `push_token` quedó guardado en la sesión
   del usuario (`v3/users/{id}/sessions.txt`, campo `push_token`).
4. **Enviar prueba:** desde el backend, llamar a `sendPushToUsers([userId], { title, body })`
   (p. ej. un script/endpoint dev temporal, o desde la consola de Firebase → Cloud Messaging →
   "Send test message" pegando el token).
5. **Comprobar entrega:**
   - App en primer plano → llega vía `onForegroundPush`.
   - App cerrada/en segundo plano → la muestra `firebase-messaging-sw.js` y al tocarla abre/enfoca
     la app.
6. **iOS:** instalar la PWA en pantalla de inicio primero; si no, el switch aparece deshabilitado.
7. **Logout:** cerrar sesión y confirmar que el `push_token` se eliminó de la sesión.

## 6. Decisiones abiertas (necesito tu input antes de implementar)

1. **¿Fase 1 (genérico) primero y Fase 2 después, o ir directo a Fase 2 (SW descifra)?**
   Recomiendo Fase 1 → Fase 2.
2. **Texto de la notificación agrupada:** ¿desglose por tipo o solo conteo?
3. **VAPID key / Firebase Cloud Messaging:** ¿ya está habilitado Cloud Messaging en el proyecto
   Firebase? Necesito la VAPID key y `messagingSenderId`.
4. **Alcance de iOS:** ¿toleramos que iOS solo funcione con PWA instalada (con aviso al usuario)?
5. **Preferencias por usuario:** ¿toggle para activar/desactivar push y por tipo de asignación?
