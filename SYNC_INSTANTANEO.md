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
arranca el ciclo. Resultado: de minutos a ~5–15 segundos de extremo a extremo.

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
  │     · con retraso aleatorio de 2–12 s (30 dispositivos no golpean a la vez)
  ▼
Worker (B..Z): ciclo de sync normal → descargan, descifran, fusionan → dato visible
```

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
| `src/wrapper/web_worker/useInstantSync.tsx` | El hook completo: escucha de señal + subida inmediata. Montado en `src/wrapper/web_worker/index.tsx` junto a `useWebWorker`. |
| `src/services/firebase/sync_signal.ts` | `subscribeSyncSignal(congId, cb)` — onSnapshot del doc (mismo patrón que Documentos). |
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

- **Retraso aleatorio 2–12 s** al recibir señal: las descargas se reparten, no
  golpean Render en el mismo instante.
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
| **Check verde** pequeño (~4 s) | Botón de perfil | Acaba de completarse una sincronización (propia o descarga silenciosa) sin error — confirmación transitoria de "acabas de recibir lo último". |
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

## 9. Playbook de diagnóstico

### "No se sincroniza rápido"

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
   - Al llegar cambio de otro (2–12 s tras la señal):
     `instant sync triggered - remote signal`
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
