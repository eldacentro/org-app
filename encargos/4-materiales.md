# Encargo 4 — Materiales de reunión e importaciones

**Riesgo: medio. Se puede hacer en paralelo con los encargos 3, 5, 6 y 7.**

---

## El hallazgo que da sentido a todo esto

**Las canciones no se actualizan solas.** Ni por la API ni por sincronización:
salen de `src/locales/{idioma}/songs.json`, que viaja **dentro de la
aplicación** (`services/i18n/index.ts:56`) y solo cambia cuando se publica una
versión nueva.

Así que hoy **no existe ninguna forma** de actualizar el cancionero desde la
aplicación. Si eso deja de mantenerse aguas arriba, la congregación se queda con
el cancionero que tenga. Poder importarlo a mano no es un plan B: es la única
vía que habría.

## Lo que hay que hacer

### 1. Importar el cancionero desde un `.jwpub`

Una importación manual del cancionero, en **Materiales de reunión**, junto a las
otras dos que ya viven ahí.

Lo que ya existe y hay que reutilizar en vez de reinventar:

- `features/meeting_materials/jw_import/` y `epub_import/` — las dos
  importaciones actuales, con su patrón de progreso y resultado.
- El motor de `.jwpub` **ya está descifrado y verificado** en este proyecto (ver
  la memoria «org-app jwpub studio»). Búscalo antes de escribir un lector nuevo.
- `services/dexie/songs.ts` y `states/songs.ts` — dónde acaban las canciones.

**La regla que no se salta** (memoria «org-app import wipe rule», y hay un
incidente real detrás): **una tabla vacía en un archivo NUNCA borra nada.** Si el
`.jwpub` no trae canciones, no se toca el cancionero. Importar sustituye lo que
viene, no vacía lo que falta.

### 2. Los Discursos públicos, también desde Materiales de reunión

Hoy la lista de discursos públicos se importa desde su propia página
(`pages/meeting_materials/public_talks_list/`, con
`features/meeting_materials/public_talks/import_talks/`). Que se pueda **también**
desde Materiales de reunión, y que **se refleje ahí**: cuántos discursos hay,
cuándo se importaron, de dónde.

No dupliques la lógica: la importación es la misma, lo que cambia es desde dónde
se llama.

### 3. Que en todos los casos se vea la procedencia

Materiales de reunión **ya hace esto bien** para el material de las reuniones:
tiene un `ORIGEN` con «Desde .jwpub» / «Desde jw.org» / «Origen desconocido», y
enseña cuándo se importó (`pages/meeting_materials/index.tsx`). Extiende ese
mismo tratamiento —el mismo vocabulario y las mismas etiquetas— al cancionero y
a los discursos públicos.

Para el cancionero, que se vea además **qué cancionero es**: no basta con la
fecha de importación si no se sabe qué se importó.

### 4. Arreglar el informe de la importación de discursos

Carlos: *«en teoría me debe decir qué es lo que se está actualizando, pero
cuando lo hago con el mismo archivo no me dice que está todo correcto»*.

Está en `features/meeting_materials/public_talks/import_talks/useImportTalks.tsx`.
**Reprodúcelo primero** —importa dos veces el mismo archivo y mira qué dice— y
arréglalo para que el informe cubra los cuatro casos:

- **Nada ha cambiado.** Que lo diga con esas palabras. Es el caso que falla hoy y
  el más frecuente: quien reimporta quiere confirmación, no silencio.
- Discursos **nuevos**: cuántos.
- Discursos **cambiados**: cuántos, y cuáles (el número y el título viejo → nuevo).
- Discursos que **ya no están** en el archivo: cuántos — y **qué se va a hacer con
  ellos**, que hoy no se dice. Con la regla de arriba: no se borran.

## Lo que NO se toca

- La sincronización (`services/worker/*`, `services/dexie/*` más allá de las
  tablas de canciones y discursos). Ojo: **canciones y discursos públicos son
  tablas derivadas** que se reconstruyen desde las traducciones al terminar cada
  sincronización (`CLAUDE.md`, sección de sincronización). Si importar a mano
  escribe ahí, **el siguiente ciclo de sincronización puede pisarlo**. Averigua
  cómo conviven las dos cosas ANTES de implementar, y dilo en el commit. Es el
  riesgo principal de este encargo.
- Los formularios oficiales.

## Cómo se comprueba

1. **Pruebas automáticas** de la importación: que un archivo sin canciones no
   borra las que hay, que reimportar lo mismo no cambia nada, y que el informe
   cuenta bien los cuatro casos.
2. **La prueba que importa de verdad**: importar el cancionero, **forzar un ciclo
   de sincronización** y comprobar que las canciones importadas **siguen ahí**. Si
   la reconstrucción de tablas derivadas se las lleva, el trabajo no vale.
3. En pantalla, en modo de prueba (`vite --mode test --port 4137`, enrutador de
   **hash**): las tarjetas de Materiales de reunión con y sin material importado.
4. `npm run test:unit` (base **456**) y `npx tsc --noEmit` (base **129 errores
   preexistentes**).

## Reglas de la casa

- Rama propia. Un cambio, una comprobación en pantalla, un commit. Nunca
  `git add -A`.
- `DESIGN_SYSTEM.md` antes de tocar interfaz; componentes de `src/components`.
  Diálogos con `@components/dialog`.
- No abrevies en la interfaz: «Número», no «Nro.».
- Datos de prueba en todo lo que circule.
