# Encargo 7 — El diálogo de exportar reuniones de entre semana

**Riesgo: bajo. Se puede hacer en paralelo con los encargos 3, 4, 5 y 6.**

Todo vive en `features/meetings/midweek_export/`. Nadie más toca esa carpeta en
esta tanda.

---

## 1. Una sola plantilla del S-140

Hoy el selector ofrece dos: la **Estándar** —la nuestra, con el branding de Elda
Centro— y el **S-140 oficial** de la organización. Los dos están en
`features/meetings/midweek_export/useMidweekExport.tsx` (`TemplateS140` y
`TemplateS140AppNormal`) con su selector en `S140TemplateSelector/`.

**Quita la oficial. Se queda la Estándar**, que es la que se usa.

Con eso, el selector de plantilla del S-140 se queda con una sola opción: **quita
el selector entero**, no lo dejes con un solo botón. Un selector de una cosa es
ruido.

> **Ojo con el alcance.** Aquí se **quita una plantilla del diálogo**. No se
> rediseña ningún formulario oficial — esa regla no cambia. Y **no toques el
> selector del S-89** (`S89TemplateSelector/`), que ese sigue con sus opciones.

Comprueba si `S140TemplateState` queda sin usar; si es así, límpialo también, y
mira si alguien tiene guardada la plantilla oficial como preferencia — al
quitarla debe caer en la Estándar sin dar error.

## 2. Rehacer el diálogo

Carlos: *«a veces es un poco enrevesado... cuando le das al botón de Exportar sin
nada seleccionado no te marca como que no hay nada seleccionado»*.

**El fallo concreto y seguro:** con nada marcado, «Exportar» no hace nada y no
dice por qué. Eso hay que arreglarlo sí o sí — **deshabilitando el botón** cuando
no hay nada marcado, que evita el callejón sin salida en vez de explicarlo.

**El resto es rediseño, y ahí propón antes de hacer.** Enseña a Carlos una
propuesta —una captura o dos, no una descripción— antes de reescribirlo. Lo que
yo miraría al abrirlo:

- **Cuántas decisiones pide** para lo que casi siempre es la misma exportación. Si
  el 90 % de las veces se marca lo mismo, que eso venga marcado.
- **Si se entiende qué va a salir.** Hoy se marcan casillas de programas y
  formularios y no se ve qué se está a punto de generar: cuántas hojas, de qué
  semanas.
- **Las semanas.** Que se vea cuáles entran, no solo que hay un rango.
- **El texto de arriba** (`tr_exportMidweekMeetinDesc`), que explica que se guarda
  la plantilla preferida — deja de tener sentido con una sola plantilla.

## Lo que NO se toca

- El contenido de ningún formulario oficial: S-140, S-89, S-21, S-88, S-13. Su
  diseño está cerrado.
- El selector del S-89.
- `pages/meetings/midweek/index.tsx` — la barra de la página es del encargo 2.
- La generación del PDF en sí, salvo lo mínimo para quitar la plantilla.

## Cómo se comprueba

1. En modo de prueba (`vite --mode test --port 4137`, enrutador de **hash**:
   `#/midweek`). Ojo: **la exportación depende de un interruptor que en los datos
   de prueba viene apagado** — hay que encenderlo para llegar al diálogo (está
   contado en [`DIALOGOS_IOS.md`](../DIALOGOS_IOS.md)).
2. **Exporta de verdad y abre el PDF.** Que el S-140 Estándar salga exactamente
   igual que antes del cambio: comparar dos PDF, no confiar en que sí.
3. A **402 px** de ancho además de en escritorio. Este diálogo ya está migrado a
   `@components/dialog`; que siga respetando la muesca.
4. `npm run test:unit` (base **456**) y `npx tsc --noEmit` (base **129 errores
   preexistentes**).

## Reglas de la casa

- Rama propia. Un cambio, una comprobación en pantalla, un commit. Nunca
  `git add -A`.
- `DESIGN_SYSTEM.md` antes de tocar interfaz; componentes de `src/components`.
- No abrevies en la interfaz: «Número», no «Nro.».
- Datos de prueba en todo lo que circule.
