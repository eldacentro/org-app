# Módulo de Territorios — Informe de traspaso (handoff)

> Documento para que otro agente/CLI continúe el desarrollo del **módulo de
> Territorios** en `org-app` (`elda-centro-app`) sin introducir errores.
> Estado: **Fases 1–4 completas + S-13 oficial + notificaciones reales.**
> Última actualización: 2026-06-06.

---

## 0. TL;DR — lo que ya funciona

Se construyó, dentro de `org-app`, un módulo completo de Territorios que replica
(y mejora) **Territory Helper**, con **sincronización instantánea** entre
dispositivos:

- **Fase 1 — Base:** modelo de datos en Firestore, zonas (CRUD + color),
  **importación KML/KMZ**, mapa Leaflet (OSM + satélite Esri), Dexie v20.
- **Fase 2 — Publicador:** "Mis territorios" (con fecha de entrega/vencimiento),
  detalle con 3 pestañas (Mapa / Imagen / Direcciones), **Solicitar**,
  **Entregar** (trabajado / devolver sin trabajar).
- **Fase 3 — Responsables:** panel con pestañas (Territorios, Asignaciones,
  Solicitudes, Estadísticas, Campañas, Importar/Exportar, Configuración);
  historial de asignaciones (base del S-13), aprobación de direcciones, subida de
  imagen PNG, detección automática del responsable del departamento "Territorios".
- **Fase 4 — Campañas + Export:** campañas con territorios de campaña marcados
  **(C)** y auto-cierre; **export S-13 (PDF) idéntico al oficial**, Excel, CSV,
  KML, GeoJSON.
- **Notificaciones reales:** avisos de "territorio atrasado" que llegan al
  instante al publicador como banner en "Mis territorios".

Todo verificado: `tsc --noEmit` sin errores en los archivos del módulo, `eslint`
limpio, y todos los módulos transforman en Vite. El S-13 generado se comparó
visualmente con el formulario oficial del usuario.

---

## 1. Arquitectura y decisiones clave (LEER ANTES DE TOCAR)

El módulo **NO** usa el flujo E2E normal de la app (Dexie + sync cifrado del
backend). Sigue el **patrón "Documentos"** del fork: **Firestore directo** bajo
`congregation/{congId}/...` con `onSnapshot` en tiempo real + Firebase Storage
para ficheros. Esto da la sincronización instantánea que pidió el usuario.

Patrón de referencia original: `src/features/documentos/`,
`src/services/firebase/documentos.ts`, `src/states/documentos.ts`.

### Seguridad de datos (híbrido)
- Geometría, zonas, números/nombres, colores, fechas y `personUid` → **texto
  plano**. El `personUid` es opaco; **el nombre se resuelve en cliente** desde la
  tabla `persons` (que YA está cifrada E2E) → no se duplica PII de nombres.
- Texto libre sensible → **cifrado** con `encryptData(texto, congMasterKey)` y
  prefijo `enc::`: `territory_locations.direccion/nota`,
  `territory_assignments.notas`, `territories.notas`. Se descifra en el callback
  de `onSnapshot`. Helpers `enc()`/`dec()` en `services/firebase/territories.ts`.

### ⚠️ Gotchas que CAUSARON bugs y ya están resueltos (no reintroducir)
1. **Firestore NO admite arrays anidados.** La geometría GeoJSON (`coordinates`)
   son arrays anidados → se guarda **serializada a string JSON**
   (`serializeGeometry`) y se parsea al leer (`parseGeometry`). Nunca guardar el
   objeto geometry directo.
2. **Firestore rechaza campos `undefined`.** `getFirestore()` se inicializa SIN
   `ignoreUndefinedProperties`. Todo payload con campos opcionales pasa por
   `stripUndefined(...)` antes de `setDoc`/`batch.set`. No cambiar la init global.
3. **Referencias de colección/documento.** `collection(firestore,'congregation',
   congId)` es inválido (2 segmentos = documento). Para el doc de ajustes se usa
   `fsDoc(firestore,'congregation',congId,'territory_settings','settings')`.
4. **Grid de MUI:** el proyecto usa **breakpoints con nombre propios**
   (`mobile`, `tablet600`, `laptop`, …), NO `xs/sm/md`. Usar
   `<Grid size={{ mobile: 6, tablet600: 4, laptop: 3 }}>`. (Hay ~480 errores TS
   preexistentes en el repo por usar xs/sm/md; no bloquean el build de Vite.)
5. **`tsc` tiene ~480 errores preexistentes** en TODO el repo (no del módulo). El
   build real es Vite/esbuild (no typechea). Para validar el módulo:
   `npx tsc --noEmit 2>&1 | grep territor` debe salir **vacío**.

### Componentes/utilidades del proyecto que se reutilizan
- UI: `@components/dialog`, `@components/button` (variants: `main`,`tertiary`,
  `secondary`,`small`,`group`; props `disableAutoStretch`, `ariaLabel`, `sx`),
  `@components/textfield` (soporta `multiline`,`minRows`,`type`),
  `@components/typography`, `@components/page_title`, `@components/nav_bar_button`,
  `@components/filter_chip`, `@components/icons` (`IconAdd`,`IconDelete`,
  `IconMapOverview`,`IconSettings`, …).
- Hooks: `@hooks/index` → `useCurrentUser` (roles `isElder`,`isAdmin`,
  `isPublisher`,…), `useBreakpoints` (`tablet688Up`,…).
- Estados settings: `congIDState`, `congMasterKeyState`, `userLocalUIDState`,
  `congNameState`, `fullnameOptionState` (todos en `@states/settings`).
- Nombre desde uid: `buildPersonFullname(lastname, firstname, fullnameOption)`
  de `@utils/common` + `personsState`/`personsActiveState` de `@states/persons`.
- PDF: `@react-pdf/renderer` (`pdf(<Doc/>).toBlob()`), guardar con `saveAs` de
  `file-saver`. Excel: `write-excel-file/browser`. CSV: `papaparse`.
- Roles por departamento: `responsabilidadesState` (`@states/responsabilidades`)
  ya se llena globalmente desde IndexedDB en `wrapper/database_indexeddb/useIndexedDb.tsx`.

### Dependencias nuevas instaladas
`leaflet`, `react-leaflet` (v5), `@tmcw/togeojson`,
`@turf/boolean-point-in-polygon`, `@turf/centroid`, `@turf/area`,
`@types/leaflet`, `@types/geojson`. (KMZ usa `jszip`, ya estaba.)

---

## 2. Mapa de archivos del módulo

### Datos / lógica
- `src/definition/territories.ts` — TODOS los tipos + `DEFAULT_TERRITORY_SETTINGS`.
- `src/states/territories.ts` — átomos jotai + derivados (mis territorios,
  asignados, pendientes, `myUnreadNoticesState`, …).
- `src/services/firebase/territories.ts` — **núcleo**: subscribe*/save*/delete*
  de cada colección, Storage (KML/PNG), `enc/dec`, `serializeGeometry/parseGeometry`,
  `stripUndefined`.
- `src/services/dexie/territories.ts` — caché local de KML/PNG (tabla v20).
- `src/services/app/territories.ts` — lógica pura: `computeDueAt`, `isOverdue`,
  `daysSince`, `getZoneColor/Name`, `territoryLabel`, geometría
  (`geometryBounds`,`geometryCenter`), `serviceYearRange`, `statsRangeStart`,
  `formatTerritoryDate`.
- `src/utils/kml.ts` — `parseKmlFile` (KML/KMZ→GeoJSON), `geometryToKml`,
  `territoriesToKml`.
- `src/indexedDb/tables/territories.ts` + bump a **v20** en
  `src/indexedDb/appDb.ts` (ojo: otra sesión añadió `evacuacion` en v21).

### UI
- `src/pages/congregation/territories/index.tsx` — página: "Mis territorios"
  (todos) + `ResponsablesPanel` (si `useIsTerritoryManager`). Orquesta todos los
  diálogos.
- `src/features/territories/`
  - `useTerritories.tsx` — hook singleton de suscripciones (siembra ajustes).
  - `useIsTerritoryManager.tsx` — elder/admin **o** miembro del departamento
    cuyo nombre contiene "territorio" (sin acentos).
  - `usePersonName.tsx` — resolutor `(uid)=>nombre`.
  - `map/TerritoryMap.tsx` — Leaflet OSM/Esri + polígono + ubicación en vivo.
  - `DialogVerTerritorio.tsx` — detalle 3 pestañas + Entregar/Asignar + subir img.
  - `DireccionesTab.tsx` — "No visitar": ver/añadir/aprobar/borrar.
  - `MisTerritorios/MisTerritoriosSection.tsx` — lista del publicador + **banner
    de avisos**.
  - `dialogs/DialogEntregar.tsx`, `dialogs/DialogSolicitar.tsx`,
    `dialogs/DialogAsignar.tsx` (territorio fijo o selector + opcional campaña).
  - `responsables/ResponsablesPanel.tsx` — 7 pestañas.
  - `responsables/AsignacionesTab.tsx` — historial por territorio (base S-13).
  - `responsables/SolicitudesTab.tsx` — solicitudes (desaparecen al atender).
  - `responsables/EstadisticasTab.tsx` — resumen + atrasados (Notificar real) +
    no asignados hace más tiempo.
  - `responsables/ConfiguracionTab.tsx` — ajustes.
  - `responsables/CampanasTab.tsx` + `DialogCrearCampana.tsx`.
  - `responsables/ImportExportTab.tsx` + `useTerritoryExport.tsx` +
    `S13Document.tsx`.
  - `responsables/DialogZonas.tsx`, `responsables/DialogImportarKml.tsx`.

### Wiring
- Ruta `/congregation/territories` en `src/App.tsx` (lazy `Territorios`).
- Tarjeta en `src/pages/category_dashboards/congregation/index.tsx`
  (icono `IconMapOverview`).
- Reglas: `firestore.rules` (8 colecciones + `territory_notices`),
  `storage.rules` (nuevo), declaradas en `firebase.json`.

---

## 3. Modelo de datos (Firestore: `congregation/{congId}/...`)

Tipos exactos en `src/definition/territories.ts`. Resumen de colecciones:

- `territory_zones/{id}` — `{id, nombre, color, orden, updatedAt}`.
- `territories/{id}` — `{id, zoneId, numero, nombre?, geometry(JSON string en
  Firestore), imageURL?, imageFileName?, kmlURL?, notas?(cifrado), tags[],
  lastWorkedAt?, updatedAt}`.
- `territory_assignments/{id}` — `{id, territoryId, personUid, assignedAt, dueAt?,
  returnedAt?, status('asignado'|'trabajado'|'no_trabajado'), isCampaign,
  campaignId?, notas?(cifrado), assignedBy?, updatedAt}`. **Historial completo,
  no se borra salvo acción explícita.**
- `territory_locations/{id}` — "No visitar": `{id, territoryId, etiqueta,
  direccion(cifrado), nota?(cifrado), aprobada, addedBy, approvedBy?, createdAt,
  updatedAt}`.
- `territory_campaigns/{id}` — `{id, nombre, fechaInicio, fechaFin,
  estado('planificada'|'activa'|'pasada'), territoryIds[], updatedAt}`.
- `territory_requests/{id}` — solicitudes: `{id, personUid, nota?, createdAt,
  atendidaPor?, atendidaAt?}`. (Patrón "desaparece al atender" = `atendidaPor`.)
- `territory_notices/{id}` — avisos al publicador: `{id, personUid, mensaje,
  territoryId?, sentBy?, createdAt, leido?}`.
- `territory_tags/{id}` — etiquetas (definidas, **UI aún no construida**).
- `territory_settings/settings` — doc único de configuración.

Asignaciones guardan SOLO `personUid`; el nombre se resuelve en cliente.

---

## 4. Despliegue / acciones manuales pendientes

- **No hay `.firebaserc` ni Firebase CLI** en este entorno → el usuario despliega
  reglas a mano (consola de Firebase) o instalando la CLI. Firestore es de
  **producción**.
- **Reglas a desplegar** (ya están en `firestore.rules`): las 8 colecciones de
  territorios **+ `territory_notices`** (la última se añadió al final; si el
  usuario ya pegó las anteriores, le falta esta). Y `storage.rules` para
  `congregation/{congId}/territories/{fileName}`.
- Las reglas son **permisivas** (cualquier usuario autenticado), igual que
  Documentos. Mejora futura recomendada: acotar por pertenencia a la congregación
  con custom claims.

---

## 5. Cómo verificar (sin romper nada)

```bash
cd org-app
npx tsc --noEmit 2>&1 | grep -iE "territor|utils/kml"   # debe salir VACÍO
npx eslint src/features/territories src/pages/congregation/territories \
  src/services/app/territories.ts src/utils/kml.ts        # sin errores
npm run dev                                               # arranca Vite
```
El dev server **flota entre el puerto 4050 y 4051** (según cuál esté libre).
Mira la línea `Local:` del log.

**Verificación de transformación de un módulo** (sin abrir el navegador):
`curl -s -o /dev/null -w "%{http_code}" http://localhost:PUERTO/src/.../archivo.tsx`
debe devolver `200`.

**Render del S-13 para inspección visual** (poppler ya instalado vía brew, pero
el tool Read no lo encuentra en PATH; renderizar a mano):
1. Crear un script temporal en la raíz de `org-app` que importe `S13Document`
   (sin alias `@`, ruta relativa) y use `ReactPDF.renderToFile(...)`.
2. `npx tsx _tmp.tsx` → `/opt/homebrew/bin/pdftoppm -png -r 130 archivo.pdf out`
   → leer el PNG. Borrar el script temporal después.

⚠️ Hay un bug AJENO al módulo: `src/pages/congregation/evacuacion/index.tsx`
importa `useHasWebAccount` de `@hooks/index`, que **no existe** → rompe el escaneo
de dependencias de Vite (no el módulo de Territorios). Es trabajo en curso de otra
sesión; **no tocar** sin coordinar.

---

## 6. Próximos pasos / mejoras pendientes (orden sugerido)

1. **Push real de notificaciones.** Hoy `territory_notices` llega al instante
   in-app (banner). Para push del SO al móvil, conectar con la **Fase 0 de FCM**
   ya existente (`src/services/firebase/messaging.ts`, backend `sws2apps-api`
   `v3/.../messaging`). Disparar push al crear: (a) `territory_requests` → a los
   responsables; (b) `territory_notices` → al publicador destinatario. Ver
   `PUSH_NOTIFICATIONS_PLAN.md`. Restricción E2E: el backend solo conoce uids/tokens.
2. **Etiquetas (tags).** El tipo `TerritoryTag` y la colección existen; falta UI
   para crear/asignar etiquetas y filtrar por ellas (útil: "con escaleras",
   "casas"). Estado `territoryTagsState` ya suscrito.
3. **Edición de polígonos en el mapa** (secundario; el usuario casi no edita).
   Añadir `leaflet-geoman` o `leaflet-draw` en `TerritoryMap`/un editor para
   dibujar/ajustar `geometry`.
4. **Editar territorio** (número, nombre, zona, notas, borrar) — hoy solo se
   importan y se sube imagen; falta un diálogo de edición/borrado de territorio
   (con confirmación; usar `deleteTerritoryCompleto`).
5. **Import Excel/CSV** de territorios (hoy solo KML; export sí está completo).
6. **Backup/integridad.** Verificar que las subcolecciones de territorios entran
   en `src/services/app/backupScheduler.ts` (`triggerAutoBackup`) o añadir un
   export periódico. El usuario remarcó que las **campañas** deben respaldarse.
7. **Afinado del S-13** si el superintendente pide formato más exacto (tamaños de
   fuente, posición exacta del nombre dentro del bloque "Assigned to").
8. **Tightening de reglas** (custom claims por congregación).

---

## 7. Contexto del proyecto base (no específico de Territorios)

- `org-app` = PWA React 19 + Vite 7 + MUI 7 + Dexie + Firebase + TanStack Query +
  jotai. Backend: `sws2apps-api` (Express + Firestore + firebase-admin).
- App **E2E-encriptada**: campos sensibles (`persons.assignments`, nombres,
  horarios) se cifran en cliente con la access code / master key de la
  congregación antes de subir (ver `src/constants/table_encryption_map.ts`). Por
  eso el backend no puede saber quién está asignado a qué — la detección vive en
  el cliente. (El módulo de Territorios elude esto usando Firestore directo, como
  Documentos.)
- Plan de implementación original completo:
  `~/.claude/plans/scalable-bouncing-hartmanis.md`.

---

## 8. Convenciones de estilo a respetar

- Variables CSS del tema: `var(--ink)`, `var(--ink-2)`, `var(--card)`,
  `var(--line)`, `var(--brand)`, `var(--blue-main)`, `var(--green-main)`,
  `var(--orange-main)`, `var(--red-main)`, `var(--r-sm)`, `var(--r-md)`,
  `var(--always-white)`.
- Textos de UI en **español** (la app es de una congregación hispanohablante);
  las etiquetas internas del **S-13 van en inglés** (es el formulario oficial).
- Diálogos: copiar el patrón de `DialogZonas`/`DialogCrearCampana` (Dialog con
  `PaperProps` + botones `tertiary`/`main`).
- Confirmaciones destructivas con `window.confirm` (patrón de la app); borrar
  asignación/campaña/territorio SIEMPRE confirma y avisa del impacto en el S-13.
