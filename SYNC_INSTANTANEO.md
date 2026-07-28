# Sincronización casi-instantánea (señal Firestore + subida inmediata)

> Documento de referencia completo. Escrito para poder diagnosticar y resolver
> cualquier problema de este sistema sin contexto previo.
>
> Desplegado el 2026-07-11. Commits clave: backend `7505089` (emisión de señal),
> frontend `911d85129` (escucha tras flag de prueba), `e07940c90` (activado por
> defecto + chequeo activo de actualizaciones PWA).

---

## 1. Qué es, en una frase

Un "timbre" sin contenido: cuando un dispositivo sube cambios reales, el backend
escribe en Firestore *qué tablas* avanzaron de versión (solo nombres y
timestamps), todos los demás dispositivos lo escuchan en tiempo real y
**adelantan su ciclo de sincronización normal** — la subida, descarga, cifrado
E2E y fusión son EXACTAMENTE las de siempre; lo único que cambia es *cuándo*
arranca el ciclo. Resultado: de minutos a unos segundos de extremo a extremo
(el presupuesto real, tramo a tramo, está en la sección 3b).

## 2. Por qué está diseñado así

El sync clásico es lento por una razón estructural: los datos van cifrados de
extremo a extremo (E2E) con la clave de la congregación, así que el servidor no
puede leerlos, ni fusionarlos, ni avisar de qué cambió. Los dispositivos
preguntaban cada X minutos (`backupInterval` + jitter en `useWebWorker`).

La señal resuelve solo la parte del *aviso* sin tocar el E2E:

- **La señal no contiene ningún dato** — solo nombres de tabla y timestamps de
  versión. Aunque alguien la leyera entera, no aprende nada.
- **Se genera en el servidor** (no en el cliente que sube). Esto da
  compatibilidad automática: un dispositivo con la app vieja que sube cambios
  también hace sonar el timbre para los demás, sin saber que existe.
- **Todo es aditivo**: si Firestore falla, si la señal no llega, o si se apaga
  con el kill-switch, la app funciona exactamente como antes (el intervalo
  periódico de `useWebWorker` sigue intacto como red de seguridad).

## 3. Flujo completo, paso a paso

```
Dispositivo A edita algo (p. ej. una casilla de asistencia)
  │
  │ (1) el guardado local en Dexie marca send_local=true en appDb.metadata
  ▼
useInstantSync (A) lo detecta via useLiveQuery → espera ~4 s (agrupa ráfagas)
  │
  │ (2) postMessage('startWorker') → ciclo de sync normal del worker
  ▼
Worker (A): GET backup → merge → POST cong_backup (solo tablas con send_local)
  │
  ▼
Backend Render: saveUserBackupAsync guarda las tablas recibidas
  │
  │ (3) diff de cong.metadata ANTES vs DESPUÉS → solo las tablas que avanzaron
  ▼
emitSyncSignal escribe en Firestore:
  congregation/{congId}/sync/signal  ←  { tables: { meeting_attendance: "2026-…" }, updated_at }
  │
  ▼
Dispositivos B..Z: onSnapshot recibe el doc al instante
  │
  │ (4) comparan cada versión del doc con la suya local (appDb.metadata)
  │     · solo si la remota es MÁS NUEVA → programan sync
  │     · con retraso aleatorio de 1–8 s (30 dispositivos no golpean a la vez)
  ▼
Worker (B..Z): ciclo de sync normal → descargan, descifran, fusionan → dato visible
```

## 3b. Cuánto tarda de verdad, tramo a tramo (medido 2026-07-28)

La cifra que circulaba antes ("~5–15 s") estaba estimada a ojo y **se dejaba
fuera dos tramos de 3 s**: el debounce del worker (`DEBOUNCE_MS` en
`backupAction.ts`), que se aplica en el que sube Y en el que baja. Este es el
recorrido completo, con los tramos constantes leídos del código y el tránsito
de Firestore medido contra el proyecto real:

| Tramo | Dónde está | Tiempo |
|---|---|---|
| Edición → se marca `send_local` | Dexie + `useLiveQuery` | ~0 s |
| Arranque de la subida | ver abajo: 3,0 s o 4,0+3,0 s | 3,0 / 7,0 s |
| Ciclo de subida (GET+merge+POST) | worker | 0,4–1,3 s |
| Agrupado de la señal en el backend | `SIGNAL_BATCH_MS` (Congregation.ts) | 0,5 s |
| Firestore → `onSnapshot` del receptor | medido | **0,15–0,35 s** |
| Reparto aleatorio en el receptor | `SIGNAL_DELAY_*` (instant_sync.ts) | 1–8 s |
| Debounce del worker (bajada) | `DEBOUNCE_MS` (backupAction) | 3,0 s |
| Ciclo de bajada | worker | 0,4–1,3 s |
| **Total, tablas con aviso directo** | | **8,5–17,5 s** |
| **Total, el resto** | | **12,5–21,5 s** |

**Por qué hay dos totales.** Unas diez tablas avisan al worker en el MISMO
guardado, desde `services/dexie/*.ts` (`meeting_attendance`, `exhibitors`,
`settings`, `upcoming_events`, `limpieza`, `evacuacion`, `responsabilidades`,
`service_outings`, `public_talk`, `circuit_visit`): en esas, la subida arranca
a los 3 s del debounce del worker y NO espera los 4 s de `useInstantSync`. Son
justo las que se editan a diario, así que el caso normal es el total de
arriba. Las que no tienen ese aviso directo dependen de `useInstantSync` y
pagan los 4 s + 3 s.

Cómo se midió el tránsito: con el service account del backend se escribió 8
veces en un documento de diagnóstico aparte (`sync/_diag_latency`, que ningún
cliente escucha, borrado al terminar) con una escucha `onSnapshot` puesta:
129, 145, 153, 179, 209, 218, 229 y 257 ms — mediana 209 ms. Desde un navegador
real contra el mismo proyecto, la respuesta llegó en 152 y 334 ms. Es decir: el
timbre viaja en menos de medio segundo y **nunca ha sido el cuello de botella**;
lo que costaba tiempo eran los agrupados del cliente.

**El debounce de 3 s del worker NO se toca, y conviene dejar escrito por qué**,
porque parece redundante con los 4 s de `useInstantSync` y no lo es. Se evaluó
quitarlo para ganar ~2 s y se descartó al contar los llamantes: hay **37 sitios
que hacen `postMessage('startWorker')`**, y unos diez son los `services/dexie/*`
de arriba, que disparan **en cada guardado, uno por casilla de asistencia**. Ese
debounce es lo único que impide un ciclo completo por pulsación, con los choques
409 y los `BACKUP_FAILED` que describe su propio comentario. Antes de tocarlo
habría que darle a cada llamante su propio agrupado.

Además del backup, **el envío de informes de publicadores** (`REPORT_SENT`,
cuentas normales y Pocket) también emite señal, porque avanza
`incoming_reports` — así el secretario ve llegar informes en segundos.

## 4. Archivos exactos

### Backend (`eldacentro/sws2apps-api`, deploy automático en Render al hacer push a main)

| Archivo | Qué hace |
|---|---|
| `src/v3/services/firebase/sync_signal.ts` | `emitSyncSignal(congId, before, after)`: diffea versiones y escribe el doc con `merge: true`. **Fire-and-forget con try/catch total**: jamás puede romper un guardado. |
| `src/v3/services/api/users.ts` → `saveUserBackupAsync` | Toma snapshot de `cong.metadata` antes de `cong.saveBackup(...)` y emite señal después. Es el embudo de TODAS las subidas de backup. |
| `src/v3/controllers/users_controller.ts` → flujo `REPORT_SENT` | Igual, alrededor de `user.postReport(report)`. |
| `src/v3/controllers/pockets_controller.ts` → flujo `REPORT_SENT` | Igual, para cuentas Pocket. |

### Frontend (`eldacentro/org-app`, deploy automático en Vercel al hacer push a main)

| Archivo | Qué hace |
|---|---|
| `src/wrapper/web_worker/useInstantSync.tsx` | El hook: escucha de señal + subida inmediata. Montado en `src/wrapper/web_worker/index.tsx` junto a `useWebWorker`. |
| `src/services/app/instant_sync.ts` | Las decisiones, fuera de React para poder probarlas: qué tablas traen algo nuevo, el reparto aleatorio y el agrupado de ráfagas. Pruebas en `instant_sync.test.ts`. |
| `src/services/firebase/sync_signal.ts` | `subscribeSyncSignal(congId, cb)` — onSnapshot del doc (mismo patrón que Documentos). Marca la primera entrega como `initial`. |
| `src/features/app_updater/useUpdater.tsx` | Chequeo activo de actualizaciones PWA (sección 8). |
| `firestore.rules` | Regla de la ruta `congregation/{congId}/sync/{docId}`. |

### El documento de señal

- Ruta: `congregation/{CONG_ID}/sync/signal` en Firestore del proyecto
  **elda-centro-app**. El `CONG_ID` es el UUID del backend (el mismo
  `cong_settings.cong_id` que usan Documentos y Territorios).
- Formato:
  ```json
  {
    "enabled": true,            // ausente = activo; false = kill-switch
    "tables": {
      "meeting_attendance": "2026-07-11T18:44:59.021Z",
      "persons": "2026-07-11T18:44:45.694Z"
    },
    "updated_at": "<timestamp>"
  }
  ```
- Los valores de `tables` son los mismos `cong.metadata` del backend: la fecha
  `updated` del archivo de esa tabla en Storage. El cliente guarda su copia en
  `appDb.metadata` (IndexedDB) — la comparación es lexicográfica de strings ISO.

## 5. Por qué NO puede haber bucle (verificado, no supuesto)

El miedo obvio: señal → todos sincronizan → sus syncs emiten señal → bucle
infinito de toda la congregación. Es imposible por CUATRO barreras
independientes, cada una verificada en el código:

1. **El cliente solo POSTea tablas con cambios reales.** `dbExportDataBackup`
   (worker) incluye cada tabla solo si su `metadata.send_local === true`. Un
   ciclo que solo descarga envía un POST sin contenido de tablas.
2. **El servidor solo re-escribe lo que recibe.** `Congregation.saveBackup`
   guarda cada tabla solo `if (cong_backup.tabla)`. Sin re-escritura, la fecha
   `updated` de Storage no avanza.
3. **La señal solo se emite con diff real.** `emitSyncSignal` compara versiones
   antes/después y no escribe nada si ninguna avanzó.
4. **El que sube no reacciona a su propia señal.** Sus versiones locales ya
   coinciden con las del doc cuando le llega → `hasNewer` da false.

Caso revisado a fondo: los admins/ancianos envían SIEMPRE las tablas de
territorios en el POST (línea `if (adminRole || elderRole || ...)` en
`backupUtils.ts` ~3061) aunque no hayan cambiado — pero el backend **no tiene
handler** para ellas en `saveBackup` (los territorios viven en Firestore
directo), así que las ignora y no avanzan versión. Peso muerto inofensivo.

Verificación empírica del despliegue: el doc de señal quedó sin avanzar durante
más de 1 h con dispositivos sincronizando activamente. Sin churn.

## 6. Protecciones a escala (30 dispositivos)

- **Retraso aleatorio 1–8 s** al recibir señal: las descargas se reparten, no
  golpean Render en el mismo instante. Era de 2–12 s, elegido antes de medir
  nada; con el tránsito ya medido (sección 3b) resultaba ser el tramo más
  grande de todo el recorrido.

  **La ventana la fija el pico de carga, no la latencia**, y esto es fácil de
  calcular mal: lo que se reparte NO son peticiones de ~7 KB (esa cifra vale
  solo para los ciclos en los que no ha cambiado nada). Cuando la tabla que ha
  cambiado es grande, cada dispositivo se baja la tabla entera, y eso son
  1,53 MB de programas o 2,88 MB de informes. Con 30 dispositivos:

  | Ventana | Dispositivos/s | Salida de Render |
  |---|---|---|
  | 10 s (2–12, la vieja) | 3,0 | ~4,6 MB/s |
  | **7 s (1–8, la actual)** | **4,3** | **~6,6 MB/s** |
  | 4 s (1–5) | 7,5 | ~11,5 MB/s |

  Y Render además se trae el fichero de Storage en cada petición. Con 1–8 la
  media del reparto baja de 7 s a 4,5 s —de ahí sale la mejora de latencia—
  sin acercarse al doble de pico. **Estrechar más solo tiene sentido después
  del sync incremental**, que es lo que quitaría los megas de la ecuación.
  **El reparto aleatorio no se puede quitar**: es lo único que impide que los
  30 lleguen en el mismo instante.
- **Las señales en ráfaga se absorben en el disparo ya programado**, no lo
  reprograman. Antes cada señal hacía `clearTimeout` y sorteaba un retraso
  nuevo: con dos o tres hermanos editando a la vez (la noche de la asistencia,
  una reunión de ancianos) las señales caían cada pocos segundos, el disparo se
  posponía una y otra vez y el dispositivo se quedaba **sin sync instantáneo
  justo cuando más movimiento había**, sin que nada fallara ni se notara. Está
  cubierto por `instant_sync.test.ts` (una ráfaga de 60 s no llegaba a
  sincronizar ni una vez).
- **Debounce de ~4 s en la subida**: una ráfaga de ediciones (rellenar 5
  casillas) viaja en UNA subida. El worker añade su propio debounce de 3 s y
  coalescing (`pendingBackup`): señales durante un sync en curso ejecutan UN
  ciclo más al terminar, no N.
- **`getIdToken()` SIN forzar refresco** en los disparos instantáneos: usa el
  token cacheado (el SDK lo renueva solo si va a caducar). Forzarlo habría
  hecho que 30 dispositivos pidieran token a Google a la vez tras cada edición
  — el mismo patrón de "tráfico en bloque" que contribuyó al incidente de julio
  de 2026 (ver jitter en `useWebWorker.tsx`).
- **Guardas heredadas del ciclo periódico**: nunca dispara con una ficha de
  persona abierta (`/persons/:id`), ni en modo demo (`isTest`), ni offline, ni
  sin sesión de congregación (`congAccountConnectedState`), ni con el backup
  automático desactivado (`backupAutoState`).
- **Consumo Firestore**: ~1 escritura por subida real + 1 lectura por
  dispositivo conectado por cambio. Decenas de escrituras y cientos de lecturas
  al día — irrelevante frente a la cuota gratuita (20k/50k diarias).

### Por qué la escucha caída NO acorta el intervalo (decisión, 2026-07-28)

Se valoró que un dispositivo con la escucha muerta compensara sincronizando más
a menudo. **No se hace, a propósito.** El motivo es hacia dónde falla cada
opción: la escucha se cae sobre todo por cosas globales (Firestore con
problemas, un despliegue, un corte de red), así que acortar el intervalo
significa que los ~30 dispositivos de la congregación **doblan su ritmo de
peticiones contra Render justo en el momento en que algo va mal** — exactamente
la ráfaga en bloque que ya costó un disgusto (ver el jitter de
`useWebWorker.tsx`). El intervalo periódico existe precisamente para ser la red
de seguridad de este caso, y la escalera de reconexión de `sync_signal.ts`
(5 s → 15 s → 60 s → 300 s) ya termina en 5 minutos, que es el propio intervalo
de sync. Lo que sí se hace es **decirlo**: "Sin conexión con el aviso" en
"Acerca de la aplicación", para que se pueda diagnosticar en vez de adivinar.

## 7. Kill-switches (tres niveles, de menor a mayor alcance)

1. **Un dispositivo concreto** (para depurar): en su consola
   `localStorage.setItem('elda_sync_instant', '0')` y recargar. Para
   reactivar: `localStorage.removeItem('elda_sync_instant')` y recargar.
2. **Toda la congregación, al instante, sin redesplegar**: consola de Firebase
   → proyecto **elda-centro-app** → Firestore → colección `congregation` → doc
   del cong → subcolección `sync` → doc `signal` → añadir/editar campo
   `enabled` = `false` (boolean). Todos los timbres se apagan en segundos y la
   app vuelve al comportamiento clásico (intervalo). `enabled` = `true` o
   borrar el campo lo reactiva. El backend nunca pisa este campo (escribe con
   `merge: true`).
3. **Apagar la emisión en el backend**: revertir el commit `7505089` en
   `sws2apps-api` y push (Render redespliega solo). Solo necesario si la
   escritura misma diera problemas, cosa que su try/catch ya impide.

Las reglas de Firestore (`firestore.rules`) deniegan TODA escritura de clientes
en `congregation/{congId}/sync/{docId}` — solo escribe el Admin SDK del backend
(que se salta las reglas). Nadie puede falsificar señales.

## 7b. Indicadores de estado en la interfaz (commit `5c8855a76`)

Con el sync instantáneo, cada edición de cualquier hermano dispara una descarga
silenciosa en todos los dispositivos. Para que la app no parezca "siempre
ocupada", cada indicador tiene un significado preciso:

| Indicador | Dónde | Significado |
|---|---|---|
| Aro **naranja** alrededor del avatar | Botón de perfil (arriba dcha.) | Tienes cambios locales pendientes de subir (`send_local`). Se subirán en segundos. |
| Circulito **azul** girando | Botón de perfil | Subiendo TUS cambios ahora mismo (`isSyncing && isPendingSync` en `account_header_icon`). Las descargas de cambios ajenos NO lo activan. |
| **Puntito verde** (~4 s) | Botón de perfil (esquina inf. dcha. del avatar) | Acaba de completarse una sincronización (propia o descarga silenciosa) sin error — confirmación transitoria de "acabas de recibir lo último". |
| Texto "**Todo actualizado · …**" + icono verde | Menú de perfil → Sincronizar datos | Último sync hace <1 min y sin ciclo en curso (`isUpToDate` en `useManualSync`). Con más minutos vuelve al texto neutro "Sincronizado hace N minutos". |

Archivos: `src/components/account_header_icon/index.tsx`,
`src/hooks/useManualSync.tsx`, `src/layouts/navbar/index.tsx`, strings
`tr_lastSyncAppDataNow/Recently` en `src/locales/*/dashboard.json`.

Nota: la DURACIÓN del circulito azul es la duración real de un ciclo completo
(GET → merge → POST). La señal acelera cuándo ARRANCA el ciclo, no cuánto dura.
El worker cronometra cada ciclo en consola (`[backup] sync completo en Xms`).

Perfilado real (2026-07-11): un ciclo limpio son 0,4–1,3 s; la fusión local son
solo 100–200 ms. Los dos ladrones de tiempo encontrados y corregidos:

- **`error_api_sync-conflict` con espera fija de 10 s** (choque con la subida
  simultánea de otro dispositivo — normal con el sync instantáneo). Desde
  `9b81639bc` (frontend) el conflicto reintenta a los 2–4 s con jitter, hasta
  5 intentos; los 10 s quedan solo para errores reales.
- **GETs de 3–5 s en el backend**: `getPersons()` descargaba ~100 archivos de
  Cloud Storage en secuencia. Desde `695f79b` (backend) las descargas van en
  paralelo (`Promise.all`) en `Congregation.getPersons`, `getCongPersons` y
  `getApplications`.
- **POST vacío que fallaba con conflicto** (`0f9c16014`, frontend): un ciclo
  disparado por la señal de otro dispositivo es SOLO de descarga; el GET ya
  trae lo nuevo y el export produce `{}`. Antes se hacía igualmente un POST
  vacío que, con otro dispositivo subiendo a la vez, devolvía
  `error_api_sync-conflict` y tras 5 reintentos mostraba un falso
  `BACKUP_FAILED`. Ahora, si el payload está vacío, se omite el POST y el
  ciclo se completa. **Nota**: un GET/POST grande (varios MB, decenas de
  segundos) solo ocurre en un sync COMPLETO — tras pulsar "Sincronizar datos"
  (que hace `dbMetadataReset`) o el primer login. En operación normal los GET
  son ~7 KB.

## 7c. "Sincronizar datos" vs. "Volver a descargar los datos" (commit `be1c6540f`)

Hay TRES niveles de sincronización, y es importante no confundirlos:

| Acción | Qué hace | Coste | Dónde |
|---|---|---|---|
| **Sync instantáneo automático** | Sube tus cambios ~4 s tras editarlos; baja lo de otros al recibir señal. Silencioso. | ~7 KB | Automático, siempre |
| **"Sincronizar datos"** (botón manual) | Un ciclo normal: sube lo pendiente (`send_local`) + baja lo nuevo. NO resetea versiones. | ~7 KB, 1-2 s | Menú de perfil + tarjeta del panel |
| **"Volver a descargar los datos"** | `dbMetadataReset()` → versiones a `''` → el servidor reenvía TODO y se re-fusiona. Recuperación cuando algo no se ve bien. | varios MB, ~30 s | "Acerca de la aplicación", con confirmación |

Antes (hasta `be1c6540f`), el botón "Sincronizar datos" hacía lo que hoy
hace "Volver a descargar" — un reset completo. La gente lo pulsaba por
costumbre "para asegurarse de subir sus datos", disparando re-descargas
completas innecesarias (con el sync instantáneo, sus cambios ya se suben
solos). Ahora el botón de uso diario es ligero y el reset pesado queda como
herramienta de recuperación aparte.

**Clave para diagnóstico**: el primer login de un dispositivo SÍ baja todo
—eso lo hace `dbMetadataDefault()` en `src/services/app/index.ts` al
arrancar (inicializa versiones vacías solo `if (!metadata)`)— y es
totalmente independiente de estos botones. Código de los tres: sync
instantáneo en `useInstantSync.tsx`; botones en `src/hooks/useManualSync.tsx`
(`handleManualSync` = ligero, `handleFullResync` = reset); UI de recuperación
en `src/features/about/`.

## 8. Actualizaciones PWA (el chequeo activo)

Problema que había: el navegador solo busca un `service-worker.js` nuevo al
navegar/recargar (por su cuenta, como mucho cada 24 h). Quien dejaba la app
abierta días no veía nunca el botón "Actualizar".

Solución (en `src/features/app_updater/useUpdater.tsx`): la app llama
`registration.update()` **cada 30 minutos** y también **al volver a primer
plano** (visibilitychange, con mínimo de 5 min entre chequeos). Cuando el
navegador descubre el SW nuevo, el flujo existente hace el resto:
`onWaiting/onUpdated` (ServiceWorkerWrapper en `RootWrap.tsx`) → snackbar
"Actualizar" → clic → recarga (con watchdog anti-cuelgue en `index.html`).

Nota: la PRIMERA adopción de la versión que trae este chequeo aún requiere una
recarga manual en dispositivos con la app abierta desde antes. A partir de ahí,
todas las versiones futuras les llegarán solas en ≤30 min.

**Botón "Actualizar la aplicación"** (en "Acerca de", `useAbout.handleForceReload`,
arreglado en `f4ecae708`): antes había que pulsarlo varias veces. Causa: el
`updatePwa()` de `@sws2apps/react-sw-helper` lanza `registration.update()` pero
NO lo espera — mira `registration.waiting` en el mismo instante, antes de que la
comprobación haya instalado el SW nuevo, así que el primer toque no activaba
nada; y recargaba a los 2 s fijos. Ahora se hace `await registration.update()`,
se escucha `controllerchange` para recargar justo cuando el SW nuevo toma el
control (con `skipWaiting: true` se autoactiva; además se le manda
`SKIP_WAITING` por si quedara a la espera), y hay red de seguridad por
temporizador. Un solo toque funciona; si ya está al día, recarga en seco a 1,2 s.

La lógica robusta vive ahora en `src/services/app/pwa_update.ts` (`forceAppUpdate`),
compartida por el botón y por la oleada forzada.

## 8b. Oleada de actualización forzada (commit `ec880e102`)

Para empujar la última versión a TODOS los dispositivos de una vez (que a partir
de ahí vayan con los arreglos aplicados), en vez de esperar al chequeo de 30 min.

- **Cliente**: `useForceUpdate` (montado en `web_worker/index.tsx`) escucha
  `congregation/{congId}/sync/force_update`. Si `target_build > __BUILD_NUMBER__`
  del dispositivo, llama a `forceAppUpdate()` — pero **esperando a que la persona
  no esté escribiendo** (input/textarea/contenteditable; re-chequea cada 5 s) y
  con retraso aleatorio 3–20 s (no recargar 30 dispositivos a la vez). Inerte
  para quien ya está al día (build ≥ target) → sin bucle. Apagable en un
  dispositivo con `localStorage.elda_force_update='0'`.
- **Disparo (admin)**: `sws2apps-api/scripts/force_update_wave.mjs`:
  `node scripts/force_update_wave.mjs <build>` (lanzar), `status`, `cancel`.
  Escribe el doc con el Admin SDK (las reglas de Firestore deniegan escritura a
  clientes; el doc está bajo `congregation/{congId}/sync/{docId}`, ya cubierto).
- **LÍMITE DE ARRANQUE (importante)**: una oleada solo llega a dispositivos que
  YA tienen el listener (build ≥ 5945, el commit que lo introdujo). La primera
  adopción de 5945 sigue dependiendo del chequeo de 30 min / reapertura. A partir
  de que todos estén en 5945+, cualquier oleada futura les llega en segundos.

## 9. Playbook de diagnóstico

### "No se sincroniza rápido"

0. **¿Qué dice "Acerca de la aplicación"?** La línea "Sincronización al
   momento" es lo primero que hay que mirar: dice si la escucha está viva,
   cuántos avisos han sonado desde que se abrió la app, cuántos traían datos
   nuevos y hace cuánto fue el último.

   **Ojo con lo que decía antes**: ese indicador se ponía a "último aviso hace
   0 minutos" en CADA arranque, hubiera sonado un timbre o no. La causa es que
   `onSnapshot` entrega siempre el documento que ya existe en cuanto uno se
   suscribe (comprobado contra el proyecto real: un callback a los 343 ms sin
   que nadie escribiera nada), y esa primera entrega se contaba como aviso. Es
   decir: el único instrumento que había para saber si la señal llegaba de
   verdad no medía eso, y por eso nunca se comprobó. Desde `sync_signal.ts` se
   marca esa entrega como `initial`: se REACCIONA a ella (es la que recupera lo
   que cambió con la app cerrada) pero no se cuenta.

1. **¿Versión correcta?** Configuración → Acerca de → build ≥ **5931**
   (el commit `e07940c90` o posterior). Si no: recargar dos veces.
2. **¿Flag de apagado olvidado?** En consola:
   `localStorage.getItem('elda_sync_instant')` — si devuelve `'0'`, ese
   dispositivo lo tiene apagado a mano.
3. **¿Kill-switch remoto activo?** Mirar el campo `enabled` del doc de señal
   (sección 7.2).
4. **¿Qué dice la consola del dispositivo?** Mensajes esperados:
   - Al editar (en el que edita, ~4 s después):
     `instant sync triggered - local changes pending`
   - Al llegar una señal con algo nuevo:
     `instant sync signal received - <tablas> (scheduled)` y, 1–8 s después,
     `instant sync triggered - remote signal`
   - Al llegar una señal que no traía nada para este dispositivo:
     `instant sync signal received - nothing newer (N tablas)`. **Este mensaje
     es el que distingue "la señal no llega" de "llega y no me toca"**, que era
     imposible de saber antes: la señal descartada se iba en un `return` mudo.
   - Si aparece `instant sync skipped (person detail open)`: tenía una ficha
     de persona abierta; es la pausa intencional, reintenta el intervalo.
   - Si no aparece NINGUNO: el hook no está armado → revisar puntos 1–3, y que
     el usuario esté logueado con la congregación conectada.
5. **¿La señal se está emitiendo?** (mitad servidor) — sección 9.1.

### 9.1 Inspeccionar la señal desde el Mac

Con el service account local del backend (`sws2apps-api/service-account.json`):

```bash
cd ~/projects/sws2apps-api
cat > /tmp/check_signal.mjs <<'EOF'
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();
for (const cong of await db.collection('congregation').listDocuments()) {
  const s = await cong.collection('sync').doc('signal').get();
  console.log(cong.id, JSON.stringify(s.data(), null, 2));
}
EOF
cp /tmp/check_signal.mjs . && node check_signal.mjs; rm check_signal.mjs
```

(Se copia dentro del repo para que resuelva `firebase-admin` de sus
node_modules.) Edita algo en la app y vuelve a leer: la tabla editada debe
mostrar un timestamp nuevo a los pocos segundos. Si no avanza → problema en el
backend (revisar logs de Render: buscar `sync signal emit failed`).

### 9.2 Medir el tiempo real de extremo a extremo

**La trampa que invalida la medición obvia**: dos pestañas del MISMO navegador
comparten IndexedDB. Un cambio hecho en una aparece en la otra al instante por
Dexie, sin pasar por el servidor — se mediría cero y no significaría nada. Hace
falta **dos perfiles distintos** (una ventana normal y otra de incógnito, dos
navegadores, o dos dispositivos), cada uno con su sesión.

Sonda: pegar esto en la consola de LOS DOS. No importa módulos, así que también
vale en producción (eldacentro.com), no solo en el servidor de desarrollo.

```js
(() => {
  const real = console.log.bind(console);
  const hora = (t = new Date()) => t.toISOString().slice(11, 23);
  const marca = (txt) => real(`%c⏱ ${hora()}  ${txt}`, 'color:#0a7');

  console.log = (...a) => {
    const t = a.map(String).join(' ');
    if (t.includes('instant sync')) marca('HOOK · ' + t.replace(/^\[app\]\s*/, ''));
    real(...a);
  };

  let previo = null;
  const leer = () => new Promise((r) => {
    const req = indexedDB.open('organized');
    req.onsuccess = () => {
      const tx = req.result.transaction('metadata', 'readonly');
      const get = tx.objectStore('metadata').get(1);
      get.onsuccess = () => r(get.result?.metadata ?? {});
      get.onerror = () => r({});
    };
    req.onerror = () => r({});
  });

  setInterval(async () => {
    const actual = await leer();
    if (previo) {
      for (const [tabla, v] of Object.entries(actual)) {
        const antes = previo[tabla];
        if (!antes) continue;
        if (!antes.send_local && v.send_local) marca(`EDICIÓN LOCAL · ${tabla}`);
        if (antes.send_local && !v.send_local) marca(`SUBIDA HECHA · ${tabla}`);
        if (antes.version !== v.version) marca(`DATO RECIBIDO · ${tabla}`);
      }
    }
    previo = actual;
  }, 250);

  marca('sonda activa');
})();
```

Cómo se lee: en el dispositivo que edita sale `EDICIÓN LOCAL` y luego
`SUBIDA HECHA`; en el otro sale `HOOK · instant sync signal received - <tabla>`
y después `DATO RECIBIDO · <tabla>`. **El número de extremo a extremo es de
`EDICIÓN LOCAL` (dispositivo A) a `DATO RECIBIDO` (dispositivo B)**, con la
misma tabla en ambos. Repetirlo 5 veces y quedarse con la mediana; el reparto
aleatorio hace que una sola medición no diga gran cosa.

Lo que revela cada tramo si sale mal:
- No sale `EDICIÓN LOCAL` → el cambio no marcó `send_local`; el problema no es
  el timbre, es el guardado.
- Sale `EDICIÓN LOCAL` pero nunca `SUBIDA HECHA` → falla la subida (mirar
  errores de red y `BACKUP_FAILED`).
- El emisor sube pero el receptor no ve ningún `HOOK` → **ahí sí es el timbre**:
  seguir por los puntos 1–5 de arriba y por la sección 9.1.
- Llega `HOOK · ... nothing newer` → la señal SÍ llega y no traía nada para
  este dispositivo (versiones ya al día, o una tabla que su rol no recibe).
  Esto es información, no un fallo.

### "A alguien no le sale el botón Actualizar"

1. Build actual del dispositivo (Acerca de) vs. `git rev-list --count HEAD`.
2. Si está en build < 5931: no tiene aún el chequeo activo — recarga manual
   (dos veces: la primera instala, la segunda activa).
3. Si está en build ≥ 5931 y lleva >30 min abierto sin aviso: comprobar en
   consola `navigator.serviceWorker.getRegistration().then(r => r.update())`
   a mano y ver si aparece el snackbar; si falla, mirar errores de red hacia
   `/service-worker.js` (¿lo sirve Vercel con caché rara?).

### Síntomas de bucle (nunca observados, por si acaso)

Muchos dispositivos mostrando "Sincronizando" constantemente + el doc de señal
avanzando versiones cada pocos segundos sin que nadie edite. Acción inmediata:
kill-switch remoto (`enabled: false`, sección 7.2) — corta el efecto en
segundos — y después investigar QUÉ tabla avanza sola (su nombre sale en el
doc) siguiendo la sección 5.

## 10. Relación con el resto del sistema

- **No sustituye** al intervalo periódico de `useWebWorker` (sigue corriendo
  con su jitter): es la red de seguridad para dispositivos con app vieja, sin
  señal, o si Firestore está caído.
- **No toca** el candado de programas ni el "forzar re-descarga"
  (`schedules_reset_at`) del incidente de julio de 2026 — conviven sin
  interferir; ver la documentación de ese incidente.
- **No afecta** a Documentos/Territorios, que ya eran instantáneos por
  Firestore directo (con datos legibles; por eso las tablas E2E NO se migraron
  a ese patrón — decisión deliberada de privacidad).
