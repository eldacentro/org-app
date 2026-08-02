# Encargo 2 — Publicar, en todas partes

**Riesgo: alto. Va después del encargo 1, no a la vez.**

Publicar decide **qué ve la congregación entera**. Un fallo aquí no se ve como
un fallo: se ve como un programa que desaparece.

---

## De dónde sale esto

En Departamentos se hizo un sistema de publicación que a Carlos le gusta y que
quiere en todos los demás módulos. Míralo antes de escribir nada:

- `services/app/month_publish.ts` — la decisión, compartida.
- `services/app/departments_publish.ts` — cómo se guarda cuando los datos son
  por semana.
- `services/app/service_outings_publish.ts` — cómo se guarda cuando hay ajustes.
- `features/departments_schedule/publish_dialog/index.tsx` — el diálogo: confirma,
  explica qué pasa al publicar y al retirar, y avisa de los puestos sin nadie.

Ya lo tienen: **Departamentos, Exhibidores, Salidas de predicación** y la
**Visita del superintendente**. Les falta: **Reunión de entre semana, Reunión de
fin de semana, Discursos salientes**. Y a todos les faltan las tres mejoras de
abajo.

## Lo que hay que hacer

### 1. Llevar el sistema a los tres que faltan

- **Reunión de entre semana** y **Reunión de fin de semana**. Ojo: aquí ya
  existe algo, `features/meetings/schedule_publish/` — un diálogo con casillas
  por mes y año. **No lo tires**: elévalo al estándar de Departamentos
  (confirmación, qué falta, qué pasa al publicar/retirar).
- **Discursos salientes**. Aquí no hay que avisar de «falta gente», que no
  aplica. Lo útil que sí se puede decir: **cuántas salidas del mes no tienen
  orador o no tienen fecha confirmada**, y si hay alguna sin discurso asignado.
  Propón la lista antes de implementarla.

Regla de oro, la misma que ya está escrita en `departments_publish.ts`:

> **Lo que hoy se ve, se sigue viendo.** Todo lo anterior a la fecha de corte se
> da por publicado. Si al desplegar esto la congregación deja de ver de golpe
> algo que ya estaba en marcha, el cambio está mal.

Elige la constante de corte (`*_DRAFT_FROM`) como en los otros: constante en el
código, no dato guardado, para que todos los dispositivos decidan igual sin
migrar nada.

### 2. El botón dice en qué estado está

Cuando un mes está publicado, el botón queda como **«Publicado»** — no como
«Publicar», que invita a pulsarlo otra vez sin saber si ya se hizo. Departamentos
ya lo hace; hazlo igual en todos.

### 3. Avisar cuando se cambia algo ya publicado

Si se edita una asignación de un mes **ya publicado**, hay que decirlo: la
congregación ya ha visto la versión anterior.

Mi recomendación —propón antes de implementar—: una tira arriba de la página,
«Este mes está publicado. Has cambiado 2 asignaciones desde entonces», con la
opción de volver a publicar para que salga el aviso a quien corresponda. Nada
modal, nada que interrumpa mientras se trabaja.

### 4. Avisar de las ausencias

Dos direcciones, y las dos hacen falta:

**a) Al asignar.** Si se pone a alguien que tiene una ausencia registrada en esa
fecha, el diálogo lo dice. La aplicación ya lo señala en algún sitio; **avisar
dos veces aquí es a propósito**, porque el primero se escapa.

**b) Al revés — alguien se pone de ausencia después de que ya lo asignaron.** Lo
que existe para resolverlo: `services/app/time_away.ts`,
`services/app/persons_away.test.ts` y las notificaciones con detección de cambios
de `services/push/diff.ts`. Por orden de valor:

1. **Un aviso en la propia página del programa**: «2 asignaciones chocan con una
   ausencia», y el campo marcado. No depende de que nadie mire el móvil.
2. **Una notificación al responsable** cuando la ausencia pisa una asignación
   **ya publicada** — que es cuando importa de verdad.
3. **Nada automático.** La aplicación no desasigna a nadie sola. Avisa, y decide
   una persona.

Empieza por el 1, que es el que da casi todo el valor sin tocar las
notificaciones.

### 5. La página de Discursos salientes, entera

Esta página es **tuya y de nadie más** en esta tanda de trabajo
(`pages/outgoing_speakers/index.tsx`). Aparte de publicar:

- **Las etiquetas de conteo.** Hoy hay `Discursos preparados ({preparedTalks.length})`
  y `Historial de salidas ({history.length})` — el número dentro de la frase,
  entre paréntesis. Va con **`@components/count_badge`**, la chapa junto al
  rótulo. Ojo: **no es `@components/badge`**, que es la píldora de un estado.
- **Traer aquí el ajuste de quién puede ver los discursos salientes.** Hoy vive
  en los ajustes rápidos de Reunión de fin de semana
  (`OutgoingTalkAccess`, en `features/congregation/settings/congregation_privacy/outgoing_talk_access`).
  Su sitio es esta página. **Tú solo lo AÑADES aquí**; quien lo quita del otro
  lado es el encargo 3, así que **no abras
  `features/meetings/weekend_editor/quick_settings/index.tsx`**.

## Lo que NO se toca

- La lógica de sincronización (`services/worker/*`, `services/dexie/*`). Si
  crees que necesitas tocarla, **para y pregunta**. Este repo ha perdido datos
  reales por bugs ahí.
- Los formularios oficiales (S-140, S-89, S-21, S-88, S-13).
- `weekend_editor/quick_settings/index.tsx` — es del encargo 3.

## Cómo se comprueba

1. **Pruebas automáticas** para cada módulo nuevo, como las que ya tiene
   `departments_publish`: que antes del corte todo se da por publicado, que un
   mes a medias no cuenta como publicado, y que publicar solo guarda lo que
   cambia (guardar un registro idéntico despierta la sincronización de toda la
   congregación para nada — está escrito en `CLAUDE.md`).
2. **En pantalla, en modo de prueba** (`vite --mode test --port 4137`, enrutador
   de **hash**), y con un mes **futuro**: los diálogos de publicar no aparecen en
   un mes ya pasado. Agosto de 2026 ya cuenta como pasado.
3. La comprobación que importa: **con un mes sin publicar, un hermano que no sea
   responsable no ve nada** ni en «Mis asignaciones» ni en el programa semanal.
   Compruébalo cambiando de vista, no leyendo el código.
4. `npm run test:unit` (base **456**) y `npx tsc --noEmit` (base **129 errores
   preexistentes**).

## Reglas de la casa

- Rama propia. Un cambio, una comprobación en pantalla, un commit. Nunca
  `git add -A`.
- `DESIGN_SYSTEM.md` antes de tocar interfaz. Diálogos con `@components/dialog`,
  nunca el `Dialog` de MUI en crudo — y si el diálogo va a pantalla completa, **sin
  márgenes** (ver `DIALOGOS_IOS.md`).
- No abrevies en la interfaz: «Número», no «Nro.».
- Datos de prueba en todo lo que circule.
