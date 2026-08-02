# Encargo 6 — Retoques

**Riesgo: bajo. Se puede hacer en paralelo con los encargos 3, 4, 5 y 7.**

Cinco arreglos pequeños. El primero es el único que tiene sustancia: hoy se
puede cambiar un orador sin querer y no hay vuelta atrás.

---

## 1. El botón del Catálogo de oradores

En Reunión de entre semana / fin de semana hay un botón que abre el catálogo de
oradores (`features/meetings/weekend_editor/public_talk_selector/`, que monta
`speakers_catalog`). Tres problemas, en orden de importancia:

**a) Se cambia un orador sin querer.** Carlos le dio sin querer a un discursante
del catálogo y le cambió el que ya estaba puesto, sin aviso. **Si el campo ya
tiene un orador, antes de sustituirlo hay que preguntar**: un diálogo que diga a
quién quita y a quién pone. Si el campo está vacío, no preguntes nada — no
molestes cuando no hay nada que perder.

**b) El botón está dentro del campo.** Sácalo fuera, **como está el botón de
«Historial de asignaciones»** al lado de los otros campos. Ese es el patrón de la
app; que este lo siga.

**c) El botón «Invitación» no tiene el estilo de la app.** Al estilo correcto
(`DESIGN_SYSTEM.md`, componentes de `src/components`). Solo el aspecto: **lo que
hace no se toca** (`weekend_editor/usePublicTalkInvitation.tsx`).

## 2. Los botones de «Estado de los dispositivos», descentrados

En Gestión de usuarios, los botones bajo «Estado de los dispositivos»
(`features/congregation/app_access/devices_status/index.tsx`) no están centrados.

**Empieza por averiguar QUÉ los movió, no por añadir un `alignItems`.** En agosto
pasó lo mismo en Exhibidores y la causa era otra: un `alignItems: 'center'` en
una caja en dirección columna centraba el título mientras la fila de debajo iba
de borde a borde. Está contado en [`MAQUETACION_MOVIL.md`](../MAQUETACION_MOVIL.md).

Y Carlos pide lo mismo que aquella vez: **mira si el mismo cambio afectó a más
sitios.** Si encuentras el patrón, busca los demás casos antes de arreglar este.

## 3. La etiqueta del número de congregación

En Catálogo de oradores (`pages/persons/speakers_catalog/index.tsx`), cuando una
congregación no tiene número, sale la etiqueta vacía y queda «como una línea».

Sin número, **no se pinta la etiqueta**. Una etiqueta vacía no informa de nada;
solo desordena. Comprueba que no pasa lo mismo con los otros datos opcionales de
la misma tarjeta.

## 4. «Ver esta reunión completa»

En Programas semanales, pestaña de Visita del superintendente, los dos botones
dicen «Ver reunión completa» y deben decir **«Ver esta reunión completa»**.

Están en `features/meetings/weekly_schedules/circuit_visit/index.tsx:283` y `:306`.
Ojo: hay un comentario en `components/jw_library_link/index.tsx` que menciona el
texto viejo — actualízalo si queda desfasado.

## 5. Comprobar (no arreglar) la configuración de Departamentos

Carlos pregunta si la configuración de Departamentos —por semana, por reunión, con
turnos— se refleja bien en Programas semanales.

**La respuesta es que sí**, ya está comprobado leyendo el código: los ocho sitios
que pintan puestos preguntan a `services/app/departments_slots`, y el programa
semanal usa `buildDeptSlotGroups`, que agrupa con los rótulos «Entre semana» /
«Fin de semana» / «Principio» / «Final».

Lo que falta es **verlo en pantalla**, que es distinto de leerlo. Configura cada
combinación —por semana; por reunión; con dos turnos; por reunión **y** dos
turnos— y comprueba que sale bien en:

- El editor de Departamentos
- La pestaña de Departamentos de Programas semanales
- «Mis asignaciones»
- El inicio
- La exportación a PDF

**Si todo está bien, no cambies nada**: dilo y ya. Este punto es una verificación,
no un arreglo.

## Lo que NO se toca

- `pages/outgoing_speakers/index.tsx` — es del encargo 2.
- `features/meetings/weekend_editor/quick_settings/index.tsx` — es del encargo 3.
- `features/meetings/midweek_export/**` — es del encargo 7.
- La lógica de reparto (`services/app/schedules.ts`, `autofill.ts`) — es del
  encargo 1.

## Cómo se comprueba

1. En modo de prueba (`vite --mode test --port 4137`, enrutador de **hash**), uno
   por uno y a **402 px** de ancho además de en escritorio.
2. Para el punto 1: prueba los dos caminos —campo vacío (no pregunta) y campo con
   orador (pregunta, y al cancelar **no cambia nada**).
3. `npm run test:unit` (base **456**) y `npx tsc --noEmit` (base **129 errores
   preexistentes**).

## Reglas de la casa

- Rama propia. Un cambio, una comprobación en pantalla, un commit. Nunca
  `git add -A`.
- `DESIGN_SYSTEM.md` antes de tocar interfaz. Diálogos con `@components/dialog`,
  nunca MUI en crudo — y a pantalla completa, **sin márgenes** (`DIALOGOS_IOS.md`).
- No abrevies en la interfaz: «Número», no «Nro.».
- Datos de prueba en todo lo que circule.
