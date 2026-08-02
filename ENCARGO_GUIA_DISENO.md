# Encargo: la guía del sistema de diseño de la aplicación

*(Este archivo ES el prompt. Se le pasa entero a quien vaya a escribirla.)*

---

Escribe la guía del sistema de diseño de **la aplicación** de Elda Centro,
tomando como modelo la que ya existe para los documentos impresos:
[`PDF_DESIGN_SYSTEM.md`](./PDF_DESIGN_SYSTEM.md).

## Por qué, si ya hay un DESIGN_SYSTEM.md

Lo hay —1.026 líneas— y tiene información buena, pero **está escrito como el
informe de una auditoría**, no como una guía: mezcla el sistema con los
hallazgos de aquel repaso, la deuda conocida, los pendientes y una sección
titulada «Hallazgo grande (2026-07-14)». Sirve para saber qué pasó en julio;
no sirve para que alguien abra una pantalla nueva y sepa cómo hacerla.

El de los PDF sí sirve, y por eso es el modelo. Fíjate en lo que hace bien:

- **Empieza por lo que NO entra.** Su sección 0 dice que los formularios
  oficiales quedan fuera. Sin eso, media guía es ambigua.
- **Cada sección apunta a un archivo de código**, no a una idea. «Cimientos →
  `tokens.ts`», «La hoja → `Page.tsx`». La guía describe lo que existe; el
  código manda.
- **Las reglas son citables.** Están numeradas para poder decir «esto rompe la
  R7» en una revisión, en vez de discutir de gustos.
- **Termina con cómo se comprueba.** No con buenas intenciones: con el comando.

El resultado sustituye a `DESIGN_SYSTEM.md`. Lo que de aquel documento sea
sistema, se queda; lo que sea crónica de una auditoría, fuera —el historial de
Git ya lo guarda—.

## De dónde sacar la verdad

**Mídelo, no lo supongas.** Todo lo que afirme la guía tiene que salir del
código o de la pantalla:

| Qué | Dónde |
|---|---|
| Colores, sombras, radios | `src/global/global.css` (**generado**, ver abajo) |
| Clases de texto | `src/global/index.css` — unas 130 |
| Puntos de corte | `appThemeState`, en `src/states/app.ts` |
| Componentes | `src/components/` — 81 carpetas |
| Cabecera y armazón | `src/layouts/navbar/` |
| Modo de prueba | `vite --mode test --port 4137`, enrutador de **hash** (`#/exhibitors`) |

Cuando una regla tenga excepciones reales, dilas. Una guía que promete
uniformidad donde no la hay se deja de usar en cuanto alguien la pilla mintiendo.

## Lo que la guía TIENE que llevar

Además de lo obvio —color, tipografía, espaciado, forma, componentes—, estas
cosas se han pagado caras este año y no pueden faltar:

1. **`global.css` se genera y `index.css` no.** `npm run generate:css` reescribe
   el primero desde las exportaciones de Figma de `converter/css/sources/`. Todo
   lo que se ajuste a mano en `global.css` y no esté en las fuentes se pierde en
   la siguiente regeneración, sin fallar nada. Ya pasó dos veces: se llevó por
   delante el tema Rojo entero y el azul de la congregación. Hoy lo impide
   `converter/css/guardia.mjs`, que aborta si desaparece una variable o una
   clase. **Esto merece su propia sección, no una nota al pie.**

2. **El diálogo, y sus dos formas.** `src/components/dialog` pone los márgenes
   seguros de iOS y el alto máximo. Pero **un diálogo a pantalla completa NO
   lleva márgenes**: ahí quien respeta la muesca es el relleno del contenido.
   Confundirlas descuadró el visor de territorios. Ver `DIALOGOS_IOS.md`.

3. **La cabecera de página.** Tres columnas con los laterales al mismo ancho
   mínimo, para que el título quede centrado respecto a la PÁGINA y no respecto
   al hueco que dejen los iconos. Ver `MAQUETACION_MOVIL.md`, que explica por
   qué `space-between` no vale y por qué el suelo de 62 px.

4. **Cuándo apilar y cuándo poner en fila.** El caso de Exhibidores está
   documentado y es contraintuitivo: el punto de corte no es dónde *cabe* el
   contenido, es dónde cabe **sin envolver**, porque una fila que envuelve
   conserva su ancho natural y deja hueco muerto. Mismo documento.

5. **Los contadores.** `@components/count_badge` —la chapa junto al rótulo—, que
   NO es `@components/badge`, que es la píldora de un estado. Nunca el número
   dentro de la frase entre paréntesis.

6. **Mayúsculas en español.** Ya está bien tratado en el documento actual;
   consérvalo. Es de lo que más se incumple sin querer.

7. **Qué componente usar en vez de MUI en crudo**, y los casos en que MUI en
   crudo es legítimo.

## Cómo se comprueba

La guía tiene que terminar diciendo cómo se audita una pantalla con ella. Y si
puedes dejar algo automático —un `npm run` que detecte tamaños de letra fuera
de la escala, colores a pelo o clases inexistentes—, mejor que una lista de
buenos propósitos. Ya existe `npm run check:css`; mira si se puede ampliar.

## Cómo NO hacerlo

- **No inventes el sistema que te gustaría.** Documenta el que hay. Si algo está
  mal, dilo en una sección aparte de deuda, no lo escribas como si ya fuera así.
- **No la escribas de memoria.** Abre los archivos. La app tiene 81 componentes
  y 130 clases de texto; una guía con datos aproximados es peor que no tenerla.
- **No la hagas larga por ser larga.** La de los PDF son 231 líneas y se usa. La
  actual son 1.026 y hay que buscar dentro. Si hay que elegir, gana la que se
  consulta.

## Un aviso sobre el estado

Carlos dice, con razón, que la app está prácticamente terminada. Esto no es un
encargo para cambiar cosas: es para **dejar escrito lo que ya está bien**, y que
lo que venga después no lo estropee. Si al escribirla encuentras
inconsistencias, **anótalas en la sección de deuda; no las arregles sobre la
marcha**. Se deciden aparte, una a una y comprobando en pantalla.
