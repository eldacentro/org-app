# org-app — notas para trabajar en este repo

PWA de congregación ("Elda Centro") en React + TypeScript + Vite + MUI + Jotai,
con Dexie (IndexedDB) y sincronización E2E contra `sws2apps-api` (backend
hermano, repo separado).

## Antes de tocar cualquier página o componente de UI

**Lee [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) primero.** Documenta el sistema
de diseño real de la app (tokens de color/radio/sombra, escala tipográfica
completa, espaciado, qué componente de `src/components/` usar en vez de MUI en
crudo, reglas de mayúsculas en español, y el anti-patrón de doble anidado de
tarjetas). Se escribió tras una auditoría completa de consistencia visual de
toda la app (2026-07) y es la referencia para que cualquier página nueva o
modificada sea indistinguible en look & feel de las demás.

Si vas a crear o editar un diálogo, botón, switch, checkbox, banner de
aviso, o cualquier pieza de UI — comprueba primero en ese documento si ya
existe el componente/token correcto antes de reimplementar algo con MUI en
crudo y `sx` a mano.

## Sincronización E2E — cuidado especial

Este repo ha sufrido más de un incidente real de pérdida de datos por bugs en
la capa de sincronización (ver commits y memorias de sesiones anteriores).
Cualquier cambio en `src/services/worker/backupUtils.ts`,
`src/services/dexie/*`, o la lógica de fusión/`updatedAt` merece revisión
extra cuidadosa antes de desplegar — un bug ahí se propaga a **todos los
dispositivos de la congregación**, no solo al que lo introdujo.

**Regla: la sincronización no escribe lo que no ha cambiado.** Cada
`dbRestore*` compara el resultado de la fusión con lo que ya está en Dexie
(`isSameRecord`, en `worker/merge.ts`) y solo guarda lo que difiere. No es
solo ahorro de escrituras: guardar un registro idéntico despierta a
`useLiveQuery`, que entrega un array nuevo y redibuja la pantalla entera —
era el parpadeo que aparecía solo cada pocos minutos. Si añades un
`bulkPut` nuevo en el ciclo de sync, pásalo por esa comparación.

Lo mismo vale para las **tablas derivadas** —tipos de semana, asignaciones,
discursos públicos y canciones—, que no vienen del servidor: se reconstruyen
enteras desde las traducciones al terminar cada sincronización. Se rehacen
con `dbReplaceTableIfChanged` (`services/dexie/rebuild.ts`), que compara por
clave primaria (`isSameTableContent`) y no toca la tabla si el contenido es
el mismo. Nunca vuelvas a poner ahí un `clear()` + `bulkPut()` a pelo.

**Regla: nada viaja en la subida sin `send_local`.** En `dbExportDataBackup`,
el rol dice QUIÉN puede subir una tabla y `send_local`, CUÁNDO hay algo que
subir: la condición se escribe `(rol) && send_local`, nunca con `||`. Si una
tabla se cuela sin cambios pendientes, la subida no queda vacía nunca, cada
ciclo hace POST, el servidor emite su señal de sync, la señal dispara otro
ciclo — y la congregación entera se sincroniza cada pocos segundos sin que
falle nada (pasó con las visitas del superintendente de circuito). Hay un
aviso en consola que lo detecta: `warnAboutUnrequestedTables`.

El registro de `metadata` lleva campos SUELTOS fuera de `metadata` (las
marcas de "reemplazo forzado ya aplicado"). Se guarda con `put`, que
reemplaza el registro entero, así que constrúyelo siempre con
`buildMetadataRecord`: perder esas marcas hace que una re-descarga forzada se
repita en cada ciclo y se coma las ediciones locales.

## Comandos útiles

- `npx tsc --noEmit -p tsconfig.json` — typecheck. El proyecto tiene un
  puñado de errores preexistentes de tipos en componentes con
  styled-components/emotion (ej. `card_header`, `date_picker`,
  `multi_select`) no relacionados con la lógica de negocio — no son tuyos a
  menos que los hayas causado tú.
- Preview con datos de prueba: `npm run preview` sirve `dist/` en el puerto
  4050 con un modo de "sembrado" de datos ficticios para verificar cambios
  de UI sin tocar datos reales.

## Pruebas automáticas

`npm run test:unit` (vitest, corre en Node, ~1 s). Cubren a propósito solo
donde un fallo se traduce en **datos perdidos o mal contados**, no la interfaz:

- `src/services/worker/merge.test.ts` — el motor de fusión de la sincronización
  (lo más nuevo gana, nunca se borra lo que solo está en un lado, marcas de
  borrado en ambos sentidos) y los tres filos conocidos que el esquema evita.
- `src/services/encryption/encryption.test.ts` — ida y vuelta del cifrado E2E,
  que con la clave equivocada falle en vez de devolver basura, y el reparto
  código de acceso / llave maestra.
- `src/services/app/retention.test.ts` — la norma de conservación de informes
  (activo, inactivo bautizado, sacado, no bautizado, nombramientos, asistencia).
- `src/utils/build_info.test.ts` — identidad de versión y antigüedad del sync.

**Si tocas cualquiera de esas cuatro cosas, ejecuta las pruebas.** Y si añades
un campo nuevo al esquema sincronizado, mira antes los "filos conocidos" de
merge.test.ts: una lista de valores sueltos o un registro sin `id`/`type` se
pierden en la fusión sin decir nada.
