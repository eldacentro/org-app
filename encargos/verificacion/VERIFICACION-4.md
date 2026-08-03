# Verificación del encargo 4 — Materiales de reunión e importaciones

Rama: `worktree-agent-ad78acc8bad77e6e2`
Worktree: `/Users/carlossacajr./projects/org-app/.claude/worktrees/agent-ad78acc8bad77e6e2`

No he mirado nada en pantalla: hay un solo navegador y cinco sesiones a la vez.
Esto es la lista de lo que hay que mirar, en orden, con lo que se espera ver.

---

## 0. Antes de nada: la respuesta al riesgo principal

**Pregunta:** canciones y discursos públicos son tablas derivadas que se
reconstruyen enteras al terminar cada sincronización
(`dbReplaceTableIfChanged`). Si una importación manual escribe ahí, ¿la pisa el
ciclo siguiente?

**Respuesta: sí la pisaría — y por eso no se escribe ahí. Conviven, y el patrón
ya existía en la casa.**

Los discursos públicos llevan tiempo resolviéndolo así, y el cancionero hereda
el mismo trato:

1. Lo importado NO se escribe en la tabla derivada. Se escribe en una tabla
   aparte que nadie reconstruye: `public_talks_override` para los bosquejos,
   `songs_override` (nueva) para los cánticos.
2. La reconstrucción, después de armar la lista desde las traducciones, aplica
   esa tabla POR ENCIMA antes de guardar:
   `dbPublicTalkUpdate` → `applyPublicTalksOverride`
   `dbSongUpdate` → `applySongsOverride` (`src/utils/songs.ts`)
3. El resultado es que cada ciclo rehace la lista y vuelve a dejar lo importado
   en pie. Y como el contenido sale idéntico, `isSameTableContent` devuelve
   verdadero y `dbReplaceTableIfChanged` **ni siquiera escribe**.

**No he tocado `rebuild.ts`, ni nada de `services/worker/*`.** La
reconstrucción sigue siendo exactamente la de antes; lo único que ha cambiado
es que lo que reconstruye ya incluye lo importado.

Un cabo suelto que hay que saber: **el cancionero importado no se sincroniza.**
Meter una tabla nueva en la subida exige tocar el worker y que el backend
—otro repositorio— la acepte, y nada de eso entra en este encargo. Es de ESE
dispositivo, y la pantalla lo dice con todas las letras. Los bosquejos sí se
sincronizan, porque su tabla ya viajaba.

---

## 1. Lo que no he podido comprobar y hay que comprobar sí o sí

**No tengo el `.jwpub` del cancionero.** En `~/Downloads` hay `pt14_S.jwpub`,
`wcg_S.jwpub` y `w_S_202609.jwpub`, ninguno es un cancionero ni el S-34. Así
que **el camino feliz de la importación del cancionero no está probado contra
un archivo real**: he verificado la lógica de lectura contra `pt14_S.jwpub`
(que sí tengo) y he escrito el lector para que saque el número del título
("42. Título", como los bosquejos) o de la columna `ChapterNumber` (como se
espera del cancionero), pero **cuál de los dos caminos usa de verdad el
cancionero está sin confirmar**.

Hace falta bajar de jw.org el `.jwpub` del cancionero (`sjj`/`sjjm`, en
español) y hacer la prueba 4. Si saliera «Este archivo no es el cancionero», el
sitio a mirar es `parseJwpubFile` en `src/services/app/jwpub_import.ts`.

---

## 2. Modo de prueba: Materiales de reunión, sin nada importado

```
npx vite --mode test --port 4137
```
Enrutador de **hash**: `http://localhost:4137/#/meeting-materials`

Ancho de escritorio (1280) y ancho de móvil (390).

Qué se espera ver, de arriba abajo:

- Las filas de importar, ahora **cuatro** en vez de dos (la cuarta solo si el
  usuario es coordinador de discursos públicos):
  1. «Importar desde jw.org» (solo con conexión)
  2. «Importar desde archivo .jwpub»
  3. **«Importar el cancionero desde archivo .jwpub»** — nueva
  4. **«Importar bosquejos desde archivo .jwpub»** — nueva
- Las cuatro tienen que verse **idénticas entre sí**: mismo alto, mismo relleno
  (14px arriba/abajo, 16px a los lados), mismo borde `--accent-200`, mismo
  fondo `--accent-100`, mismo icono a la izquierda. Las cuatro pasan ahora por
  el mismo componente, así que si una se desalinea es un fallo de verdad.
- Con el tabulador se llega a las cuatro y se ve un cerco azul de foco.
- Abajo del todo, después de «La Atalaya · fin de semana», una sección nueva:
  **CANCIONERO Y DISCURSOS PÚBLICOS**, con dos tarjetas.
  - «Cancionero» — «N cánticos», la nota «Vienen dentro de la aplicación: solo
    cambian al publicarse una versión nueva», y una etiqueta gris **«Desde la
    aplicación»** a la derecha.
  - «Bosquejos de discursos públicos» — lo mismo.
- En móvil (390): las tarjetas no se desbordan a lo ancho, y la etiqueta cae
  debajo del texto en vez de aplastarlo.

Lo que hay que mirar con lupa: que la sección nueva **no rompa el patrón de
tarjeta** del resto de la página (mismo borde `--line`, mismo `--shape-sm`,
mismo fondo `--card`) y que no haya doble anidado de tarjetas.

---

## 3. El informe de importar bosquejos, los cuatro casos

Con el `.jwpub` de los bosquejos (S-34). Hace falta ser coordinador de
discursos públicos.

**Se llega desde dos sitios, y tiene que hacer lo mismo desde los dos:**
- `#/public-talks-list` → botón «Importar» de la barra
- `#/meeting-materials` → fila «Importar bosquejos desde archivo .jwpub»

### 3a. Primera importación (el archivo trae cambios)

Se espera un diálogo titulado **«Vista previa de importación»**, con el nombre
de la publicación debajo del título, y un recuadro con las **cinco líneas de
cuenta**:

```
El archivo trae            194 bosquejos
Sin cambios                190
Nuevos                     2
Cambian                    2
Ya no están en el archivo  0
```

Debajo, la lista de los que cambian: «Número 42» (no «Nro. 42»), la etiqueta
del tipo de cambio a la derecha, el título viejo tachado y el nuevo debajo.

Botones al pie: «Cancelar» (terciario, izquierda) e **«Importar»** (azul,
derecha).

### 3b. **El caso que fallaba**: reimportar EL MISMO archivo

Repetir la importación con el mismo archivo, sin cambiar nada.

Se espera:
- El diálogo se abre igual — **no un aviso al pie, no silencio**.
- Título: **«Nada ha cambiado»**.
- Un recuadro verde: «Nada ha cambiado. 194 bosquejos del archivo son idénticos
  a lo que ya tiene la aplicación.»
- Las cinco cuentas, con «Sin cambios: 194» y ceros en el resto.
- **Un solo botón**: «Entendido». No tiene que haber «Cancelar», porque no hay
  nada que cancelar.

Esto es lo que Carlos pidió, con esas palabras.

### 3c. Un archivo al que le faltan bosquejos

Si se consigue un archivo más corto (o de otra edición), se espera:
- «Ya no están en el archivo: N».
- Un recuadro de aviso naranja con los números concretos (hasta doce, luego
  «…») y la frase, literal: **«No se borran: se quedan tal como están. Importar
  sustituye lo que viene, no vacía lo que falta.»**
- Y después de confirmar: **esos bosquejos siguen en `#/public-talks-list`, con
  su título de siempre.** Esto es la regla de la casa; si falla aquí, para todo.

### 3d. Un archivo en otro idioma

Si el `.jwpub` está en un idioma distinto del que usa la congregación, arriba
del informe tiene que salir un aviso naranja diciendo qué idioma trae el
archivo y cuál se está usando.

---

## 4. **La prueba que de verdad importa**: el cancionero sobrevive a un ciclo de sincronización

Esta hay que hacerla en la aplicación de verdad, con cuenta y sincronización
activa (en modo de prueba no hay worker: `useWebWorker` se salta el hilo entero
cuando `isTest`, así que ahí no hay ciclo que forzar).

1. Ir a `#/meeting-materials` → «Importar el cancionero desde archivo .jwpub» y
   elegir el `.jwpub` del cancionero.
2. En el diálogo: comprobar que el **nombre del cancionero** sale debajo del
   título («Cantemos con gozo a Jehová» o el que sea) y que la cuenta de «El
   archivo trae» ronda los 150-160 cánticos.
3. Confirmar con «Importar».
4. Comprobar que los títulos importados se ven donde se usan los cánticos:
   `#/weekend-meeting` o `#/midweek-meeting`, en el selector de cántico.
5. **Forzar un ciclo de sincronización.** La forma más simple desde la
   interfaz: **navegar a `#/persons`** — entrar en Personas dispara un ciclo
   (`useWebWorker`, efecto de `location.pathname`). Esperar a que la rueda de
   sincronización termine.
6. **Volver a mirar los títulos de los cánticos. Tienen que seguir siendo los
   importados.** Si han vuelto a los de antes, la reconstrucción se los ha
   llevado y el trabajo no vale.
7. Repetirlo un par de veces, o dejar la aplicación abierta cinco minutos (el
   ciclo periódico) y volver a mirar.

**Comprobación equivalente, y esta sí se puede hacer en modo de prueba:**
cambiar el idioma de la aplicación y volver al de antes. Eso ejecuta
exactamente las mismas cuatro reconstrucciones que corren al terminar cada
sincronización (`dbWeekTypeUpdate`, `dbAssignmentUpdate`, `dbPublicTalkUpdate`,
`dbSongUpdate` — ver `src/features/language_switcher/useLanguage.tsx`). Si el
cancionero importado sobrevive a eso, sobrevive al ciclo de sincronización: es
el mismo camino de código.

---

## 5. La procedencia del cancionero, después de importarlo

Volver a `#/meeting-materials`, sección **CANCIONERO Y DISCURSOS PÚBLICOS**.

La tarjeta «Cancionero» tiene que haber cambiado:
- Debajo del rótulo, **el nombre del cancionero importado**.
- «N cánticos · importado el 3 ago 2026 · N títulos sustituidos».
- La nota: «Importado en este dispositivo. No viaja por la sincronización: en
  otro teléfono habría que importarlo también.»
- La etiqueta de la derecha, en verde: **«Desde .jwpub»** — la misma palabra
  que usan las tarjetas de material de arriba.

Y la de «Bosquejos de discursos públicos», después de la prueba 3:
- «N bosquejos · importado el … · N títulos sustituidos».
- Nota: «Los títulos importados se sincronizan con el resto de la
  congregación.»
- Etiqueta verde «Desde .jwpub».

---

## 6. Que un archivo equivocado no entre como cancionero

Con `~/Downloads/pt14_S.jwpub` (el Libro de los precursores):

`#/meeting-materials` → «Importar el cancionero desde archivo .jwpub» → elegir
ese archivo.

Se espera un aviso **rojo**, y **ningún diálogo de vista previa**:

> **Este archivo no es el cancionero**
> El archivo elegido es «Libro de los precursores» (símbolo «pt14»), con 35
> documentos numerados. Elige el .jwpub del cancionero.

Esto importa: sin la guarda, ese archivo se lee como 35 cánticos con los
títulos de sus capítulos, se confirma tan tranquilo, y deja los cánticos 1 al
35 con títulos que no son. Lo he comprobado leyendo el archivo directamente.

---

## 7. Que no se ha roto lo de siempre

- `#/meeting-materials` sigue enseñando los periodos de la Guía y de La Atalaya
  con sus etiquetas «Desde .jwpub» / «Desde jw.org» / «Origen desconocido»,
  el aviso de semanas que faltan, y la tarjeta de importación automática.
- «Importar desde jw.org» y «Importar desde archivo .jwpub» siguen funcionando
  igual que antes (el `<input type="file">` transparente de la segunda sigue
  siendo transparente y sigue cubriendo toda la fila).
- `#/public-talks-list` sigue con su botón «Importar» en la barra y su cambio
  entre lista y tabla.

---

## Los dos números

| | Antes | Después |
|---|---|---|
| `npm run test:unit` | 460 | **476** (+16 nuevas) |
| `npx tsc --noEmit -p tsconfig.json` | 129 | **129** |

`npm run build` pasa. `npx eslint` sobre todo lo tocado, limpio.
