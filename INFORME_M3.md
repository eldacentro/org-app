# Material Design 3 frente al sistema de Elda Centro

Revisión hecha el 13 de agosto de 2026.

> **Estado a 14 de agosto de 2026: los nueve hallazgos están aplicados.**
> Este documento se queda como está —es el informe de la revisión, con lo que
> se midió ANTES— porque el razonamiento de por qué sí y por qué no sigue
> siendo la referencia. Lo que se hizo, y cómo, está en `DESIGN_SYSTEM.md`:
> §2.1a (`--on-*`), §2.1b (contraste medido), §2.1c (interlineado), §2.5a
> (objetivo táctil) y §2.5b (movimiento reducido y foco).
>
> Lo único que NO se ha tocado de la lista es el hallazgo 8 —un control de
> tamaño de texto en Ajustes— porque no es un arreglo sino una función nueva,
> con su pantalla y su decisión de producto detrás. Y el matiz del pie de
> diálogo (sección 5) sigue abierto a propósito: cambia el peso visual de todas
> las confirmaciones de borrado de la app, y eso es una decisión, no un
> defecto.

El encargo no era «pásate a M3». Era: qué nos falta, qué haríamos mejor, qué
vale la pena traerse, qué NO nos conviene y por qué, y dónde lo nuestro ya es
mejor. Eso es lo que hay abajo.

**Veredicto en tres frases.** Nuestro sistema de diseño está por delante de M3
en las cosas que M3 no se molesta en decidir por ti (forma por rol, jerarquía
del botón principal, mayúsculas en español, anidado de tarjetas). Está por
detrás en una sola cosa, y es grave: **el color no garantiza el contraste**, y
eso se nota justo en el público que más nos importa. De M3 hay que traerse una
idea —los colores «on-», que es cómo M3 hace imposible el fallo que tenemos— y
media docena de arreglos baratos. Todo lo demás de M3 (color dinámico, la etapa
Expressive, los muelles de movimiento) es coste sin beneficio para esta app.

---

## 1. Cómo se ha hecho

**Fase 1 — M3.** Se recorrió `m3.material.io` en un navegador de verdad, no de
memoria (el sitio es una SPA: `WebFetch` solo devuelve el título). Se leyeron
fundamentos, sistema de color y roles, elección de esquema, tipografía y
tokens de escala, forma y escala de radios, elevación, sistema de movimiento
físico, rejillas/espaciado/densidad, puntos de corte, iconografía,
accesibilidad (contraste y objetivos táctiles), estados y capas de estado,
guía de redacción, el catálogo de componentes y el anuncio de M3 Expressive.

Hay cosas recientes que conviene saber que están ahí: la actualización de
**mayo de 2025** (Expressive), los **tres niveles de contraste** tokenizados,
el **soporte de altura de línea por familia de escritura** (agosto de 2026) y
el renombrado de «window size classes» a **breakpoints** con el nuevo _layout
scaffold_ (mayo de 2026).

**Fase 2 — la app.** Se leyó `DESIGN_SYSTEM.md`, `MAQUETACION_MOVIL.md` y
`DIALOGOS_IOS.md`; se inspeccionaron los tokens (`global/index.css`,
`global/global.css`), los componentes propios y el tema de MUI. Y se **levantó
la app en modo de prueba** (`vite --mode test`, puerto 4137) a 375 px de ancho
para medir en pantalla lo que no se puede deducir leyendo: contrastes reales,
tamaños de objetivo táctil, interlineados renderizados y anillos de foco con
teclado real.

Los números que aparecen abajo están **medidos**, no estimados.

> Nota de utilería: se añadió una entrada `test` a `.claude/launch.json` para
> poder arrancar el modo de prueba desde el navegador integrado. Es lo único
> que se ha escrito fuera de este documento.

---

## 2. Qué es M3 hoy, en corto

Para que la comparación se lea sin tener que abrir el sitio:

- **Color.** No es una paleta: es un sistema de **paletas tonales** (13 tonos
  por familia) sobre las que se definen **26 roles** agrupados en primary,
  secondary, tertiary, error, surface y outline. La pieza clave es la
  convención **`on-`**: cada color de relleno tiene su color de contenido
  emparejado (`primary` ↔ `on primary`), y **el par está construido para dar
  contraste**. M3 lo dice explícitamente: «el sistema está construido sobre
  parejas accesibles» y advierte de que combinarlos mal «rompe la
  accesibilidad». Hay cinco niveles de superficie (`surface container
lowest…highest`) que sustituyeron a las sombras de M2. Desde mayo de 2025
  hay **tres niveles de contraste** (estándar, medio, alto) como preferencia
  del usuario. El color dinámico (del fondo de pantalla) es opcional; el
  esquema **estático** es una opción de primera clase y M3 recomienda
  empezar ahí.
- **Tipografía.** Cinco roles (display, headline, title, body, label) × tres
  tamaños = 15 estilos base, más 15 «enfatizados» añadidos en Expressive.
  Escala Segunda Mayor (1,125) anclada en 14. Tamaños en `sp`/`rem`.
- **Forma.** Escala de 10 pasos por «cantidad de redondez» (0, 4, 8, 12, 16,
  20, 28, 32, 48, full). Y una regla que nos importa: **redondez óptica**,
  `radio interior = radio exterior − relleno`.
- **Elevación.** Seis niveles. La diferencia grande con M2: **el tono
  sustituye a la sombra**; las sombras solo cuando de verdad hacen falta.
- **Movimiento.** Desde Expressive es un sistema de **muelles** (rigidez,
  amortiguación, velocidad inicial) con dos esquemas: `expressive` (rebota) y
  `standard` (no). Sustituye al de duración + curva.
- **Espaciado y densidad.** Rejilla, márgenes, y una escala de densidad
  numerada (0, −1, −2, −3). Con un aviso repetido: **no bajes el objetivo
  táctil de 48×48 por aumentar densidad**, y la densidad debe ser una opción
  del usuario, no un valor por defecto.
- **Adaptabilidad.** Cinco puntos de corte: compact (<600), medium (600–839),
  expanded (840–1199), large (1200–1599), extra-large (1600+).
- **Accesibilidad.** 4,5:1 texto pequeño, 3:1 texto grande y gráficos, 3:1
  para contenedores agrupados (un botón entre botones) pero **no** para
  elementos aislados y prominentes (un FAB). Objetivo táctil ≥48×48dp aunque
  el dibujo sea de 24, con 8dp de separación.
- **Estados.** Seis (enabled, disabled, hover, focused, pressed, dragged) con
  capa de estado a opacidad fija: hover 8 %, foco 10 %, pulsado 10 %,
  arrastre 16 %, deshabilitado 38 %. Y una regla: **la capa toma el color del
  CONTENIDO**, no un color fijo.

---

## 3. Hallazgos, ordenados por valor/esfuerzo

Cada uno lleva: **qué falta**, **qué dice M3**, **qué implica aquí** y
**riesgo**. Los cinco primeros son mejora real para nuestros usuarios. Los del
bloque B son mejora moderada. El bloque C está en la sección 4, como lo que
**no** hay que hacer.

---

### 1 · El texto terciario no es legible en 6 de los 10 temas

**Valor: muy alto · Esfuerzo: bajo · Riesgo: bajo**

**Qué falta.** `--ink-3` (alias de `--grey-350`) es el gris más apagado y se
usa en ~197 sitios. Medido, contra el fondo de tarjeta:

| Tema                                | `--ink-3` sobre tarjeta | ¿Pasa 4,5:1?     |
| ----------------------------------- | ----------------------- | ---------------- |
| **blue-light (el de por defecto)**  | **2,83**                | ❌               |
| blue-dark                           | 2,65                    | ❌               |
| green-dark                          | 2,93                    | ❌               |
| purple-dark                         | 2,75                    | ❌               |
| red-dark                            | 3,09                    | ❌               |
| orange-dark                         | 3,09                    | ❌               |
| green / red / orange / purple-light | 4,57                    | ✅ por los pelos |

Los cinco temas oscuros fallan, y el tema por defecto también. En pantalla se
ve así: la tira de semanas de Programas semanales («27 Jul», «3 Ago») sale a
**2,3:1**; «Última actualización: 13 Ago 2026», igual; el año «2024» del panel
de periodo, a 2,83.

**Qué dice M3.** El rol equivalente es `on surface variant` —«color de menor
énfasis para texto e iconos»— y está construido dentro de la pareja accesible:
M3 garantiza un mínimo por diseño, no por buena voluntad de quien elige el
gris. Además tokeniza tres niveles de contraste «para que la gente elija el que
mejor se ajusta a su vista».

**Qué implica aquí.** Subir el valor de `--grey-350` en cada tema hasta ≥4,5:1.
Es **una fila por tema en `global.css`** (y su fuente en `converter/css/`), no
197 ediciones. Ojo: `global.css` se regenera, así que el cambio tiene que ir a
`converter/css/sources/`, como se hizo con `--group-5`/`--group-9`.

**Riesgo.** Bajo. El texto apagado gana peso; hay que mirar dos o tres
pantallas donde `--ink-3` va sobre `--paper` en vez de sobre `--card` (0,2–0,3
puntos peor). Nada estructural.

> Es el mejor valor/esfuerzo del informe. Si solo se hace una cosa, esta.

---

### 2 · `prefers-reduced-motion` solo apaga la transición de página

**Valor: alto · Esfuerzo: muy bajo · Riesgo: bajo**

**Qué falta.** Hay 12 `@keyframes` y 26 usos de `animation:` en la app. El
único bloque `@media (prefers-reduced-motion: reduce)` desactiva **dos**:
`page-enter-forward` y `page-enter-back`. Se quedan fuera el `scale(0.92)` del
pulsado, `rise`, `pulse`, `wave` (la mano que saluda del Inicio), el brillo de
los esqueletos de carga y los Lottie (`react-lottie-player`), que animan en
bucle.

**Qué dice M3.** M3 no legisla `prefers-reduced-motion` como tal —es una
carencia nuestra, no una laguna de M3— pero sí insiste en que el movimiento
debe ser predecible y adaptarse al dispositivo. Y su propio catálogo pone el
listón: el nuevo _loading indicator_ «capta la atención mediante el
movimiento», que es exactamente lo que alguien con vestíbulo sensible o con un
teléfono de 2018 no quiere.

**Qué implica aquí.** Un bloque global en `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Más `play={!reduce}` en el envoltorio de Lottie. Media hora de trabajo.

**Riesgo.** Bajo. Hay que comprobar que ningún componente dependa del evento
`animationend` para funcionar (los Lottie de carga sí podrían: conviene
sustituirlos por su fotograma final, no por nada).

**Por qué encaja con el encargo.** «La animación bonita que gasta batería o va
a tirones en un móvil viejo no nos vale» — esto es exactamente esa palanca, y
respeta la decisión del propio usuario en vez de decidir por él.

---

### 3 · El anillo de foco está declarado pero no es del sistema

**Valor: medio-alto · Esfuerzo: bajo · Riesgo: bajo**

**Qué falta.** `DESIGN_SYSTEM.md` §2.5 declara la regla: `outline: 2px solid
var(--accent-main)` con `outlineOffset: 2px`. Pero está implementada **a mano
en unos 20 ficheros**. Medido en `/persons` con teclado real (40 elementos
enfocables): **18 tienen anillo, 22 no**. Entre los que no: los iconos
«Atrás», «Inicio» y «Ajustes rápidos» de la cabecera, el buscador, el botón de
filtros, las dos pestañas… y las 100 papeleras de eliminar.

**Qué dice M3.** El foco es uno de los seis estados y se aplica
sistemáticamente con capa de estado al 10 % **más** indicador. No es opcional
ni por componente.

**Qué implica aquí.** Una regla global en `index.css` sustituyendo las 20
copias:

```css
:where(
  button,
  a[href],
  [role='button'],
  [role='tab'],
  input,
  select,
  textarea
):focus-visible {
  outline: 2px solid var(--accent-main);
  outline-offset: 2px;
}
```

Con `:where()` la especificidad es 0, así que cualquier componente que ya tenga
la suya sigue ganando y no hay que borrar nada de golpe.

**Riesgo.** Bajo. Hay que mirar los sitios con `overflow: hidden` donde el
`outline-offset: 2px` se recorta (ahí toca `-2px`, como ya hacen las filas de
persona).

---

### 4 · El objetivo táctil de 48: todo botón mide 40, y la papelera 24

**Valor: muy alto · Esfuerzo: bajo-medio · Riesgo: bajo si se hace bien**

**Qué falta.** Medido en tres pantallas a 375 px:

| Elemento                                                             | Alto real   |
| -------------------------------------------------------------------- | ----------- |
| Cualquier `@components/button` (incluidos los de diálogo)            | **40 px**   |
| `nav-action-pill` («Exportar», «Autocompletar», «Importar/exportar») | **36 px**   |
| Chips de la tira de semanas de Programas semanales (×24)             | **34 px**   |
| Filas de mes/semana del panel de periodo                             | **34 px**   |
| Iconos de la cabecera (Atrás, Inicio, Ajustes rápidos)               | **40 × 40** |
| **Papelera «Eliminar a …» de cada persona (×100)**                   | **24 × 24** |
| Botón de ordenar semanas                                             | 24 × 24     |
| `ActionPill` (`padding: 6px 12px` sobre texto de 12px)               | ~29 px      |

El caso peor es la papelera de Personas: una **acción destructiva de 24×24 px**,
repetida cien veces, en una lista que se recorre con el pulgar.

**Qué dice M3.** Tajante y repetido en tres páginas distintas: el objetivo debe
ser **≥48×48dp aunque el dibujo sea de 24**, con **8dp de separación** entre
objetivos; y en la página de densidad avisa dos veces de no bajar de 48 al
comprimir. También reconoce que iOS recomienda 44.

**Qué implica aquí.** Y esto es lo importante: **no hay que agrandar los
botones.** Un botón de 40 px de alto está bien dibujado; lo que falta es el
área invisible alrededor. Se resuelve dentro de los componentes propios sin
mover un píxel de la maquetación ya medida:

```css
/* el dibujo sigue midiendo 40; el dedo acierta en 48 */
position: relative;
&::after {
  content: '';
  position: absolute;
  inset: -4px; /* 40 + 4 + 4 = 48 */
}
```

Son **cuatro o cinco componentes** —`button`, `icon_button`, `action_pill`,
`period_selector` y la tira de semanas— y alcanza a toda la app. La papelera de
Personas necesita además `padding` real, porque a 24 px hacen falta 12 por lado.

**Riesgo.** Bajo con el `::after` (no ocupa espacio en el flujo). **Medio-alto
si se sube el alto visible**: rompería la concentricidad calculada, los 56 px
del campo y los esqueletos de carga, que están todos medidos al píxel. No lo
hagas por ahí.

**Ojo con la separación.** M3 pide 8dp entre objetivos. Si se expanden a 48 los
chips de la tira de semanas, que hoy están a 34 con poco hueco, las áreas se
tocarán. Ahí toca revisar el `gap` a la vez.

---

### 5 · El texto blanco sobre el color de marca falla en 8 de los 10 temas

**Valor: muy alto · Esfuerzo: medio · Riesgo: medio**

**Qué falta.** El botón principal —lo más importante de cada pantalla, la regla
entera del §6.4c— pinta `--always-white` sobre `--accent-main`. Pero
`--accent-main` cambia de tono con el tema, y `--always-white` no cambia nunca.
Medido:

| Tema             | Blanco sobre `--accent-main` |                                         |
| ---------------- | ---------------------------- | --------------------------------------- |
| purple-light     | 5,68                         | ✅                                      |
| blue-light       | 4,74                         | ✅                                      |
| red-light        | 3,52                         | ❌                                      |
| purple-dark      | 3,56                         | ❌                                      |
| red-dark         | 3,38                         | ❌                                      |
| green-light      | 3,35                         | ❌                                      |
| blue-dark        | 2,88                         | ❌                                      |
| green-dark       | 2,40                         | ❌                                      |
| orange-dark      | 2,31                         | ❌                                      |
| **orange-light** | **2,29**                     | ❌ falla incluso el 3:1 de texto grande |

Y arrastra a todo lo que usa ese par: `ActionPill variant="solid"`,
`NavBarButton main`, el botón «Eliminar» rojo del diálogo de confirmación, las
cabeceras de sección con banda de color.

Hay un segundo síntoma del mismo origen: `--accent-main` usado como **texto**
sobre `--accent-100` (que es lo que hace `ActionPill` en `tinted` y `outline`)
da 2,24 en orange-light y 3,18 en green-light.

**La causa es estructural, y tiene nombre.** En los temas oscuros
`--accent-main` es un color **claro** (blue-dark: `#6499E4`) y sigue llevando
texto blanco encima. Eso es blanco sobre azul claro. No es un despiste: es que
el sistema no tiene forma de saber qué color de texto toca sobre el acento,
porque no existe ese token.

**Qué dice M3.** Esto es _exactamente_ el problema que resuelven los roles
`on-`. En M3, `primary` es el tono 40 en tema claro y el tono **80** en tema
oscuro; y `on primary` es el tono 100 en claro y el tono **20** en oscuro. O
sea: **en tema oscuro el texto sobre el color primario es oscuro, no blanco.**
La pareja está garantizada por construcción, y M3 dedica una página entera a
avisar de que romper el emparejamiento «rompe la accesibilidad».

**Qué implica aquí.** Y es menos de lo que parece: **no hace falta traerse HCT,
ni las paletas tonales de 13 pasos, ni el color dinámico.** Hace falta un token
nuevo por tema:

```css
/* light: el acento es oscuro → texto claro */
--on-brand: var(--always-white);
/* dark: el acento es claro → texto oscuro */
--on-brand: rgba(15, 17, 23, 1);
```

…y ajustar los dos o tres acentos claros de los temas claros (naranja y verde)
para que el par llegue a 4,5:1, o darles también tinta oscura.

El trabajo de verdad está en **separar los 181 usos de `--always-white`** entre
los que van sobre el acento (→ `--on-brand`) y los que van sobre otra cosa —una
foto, un rojo de error, la tarjeta de marca del Inicio—, que se quedan como
están. Eso es revisión caso por caso, no un reemplazo ciego.

**Riesgo.** Medio. Es un cambio visible: en los temas oscuros el botón
principal pasa de letra blanca a letra oscura, que es _raro de ver la primera
vez_ aunque sea lo correcto. Conviene hacerlo tema por tema y mirarlo.

**Nota honesta sobre prioridad.** Este hallazgo es el más importante del
informe y no está el primero porque cuesta más que los cuatro de arriba, no
porque importe menos. Los cuatro primeros son de una tarde. Este es de una
semana bien hecha.

---

### 6 · El interlineado está por debajo de M3 en todo el cuerpo de texto

**Valor: alto · Esfuerzo: medio · Riesgo: medio-alto**

**Qué falta.** Medido en pantalla, ratio interlineado/tamaño:

| Nuestra clase   | Nuestro valor   | Ratio    | Equivalente M3    | Ratio M3 |
| --------------- | --------------- | -------- | ----------------- | -------- |
| `label-small-*` | 12 / 14         | **1,17** | label small 11/16 | 1,45     |
| `body-small-*`  | 13 / 16         | **1,23** | body medium 14/20 | 1,43     |
| `body-regular`  | 15 / 20         | **1,33** | body large 16/24  | 1,50     |
| `h2`            | 18 / 24 (móvil) | 1,33     | title large 22/28 | 1,27     |

Los títulos están bien —ahí M3 también aprieta— pero **el cuerpo y las
etiquetas van entre un 10 % y un 24 % por debajo**.

Y no es teórico: el propio `DESIGN_SYSTEM.md` §2.3 documenta que a 1,17 «los
rabitos que bajan (g, p, q, y, j) se cortan por debajo» y que hubo que
arreglarlo con relleno en la etiqueta de **todos** los campos con rótulo de la
app. Eso es el mismo problema visto desde el otro lado: la caja iba justa
porque el interlineado iba justo.

**Qué dice M3.** La escala fija el interlineado por token, no a ojo. Y la
actualización de **agosto de 2026** va más allá: adapta el interlineado a la
familia de escritura (latino, árabe, birmano, nastaliq) porque «ignorar la
altura de escritura puede provocar texto solapado e interfaces rotas». La app
tiene más de cincuenta idiomas.

**Qué implica aquí.** Subir el interlineado de tres o cuatro clases en
`index.css` —**no** en `global.css`, que se regenera, y **antes** del escalón de
tablet, por lo que ya explica el §3 sobre el orden de las reglas—.

**Riesgo. Este es el hallazgo con más riesgo del informe, y hay que decirlo.**
Cambiar el interlineado cambia el alto de casi todo: la concentricidad
calculada (`interior = exterior − hueco`), los 56 px del campo con etiqueta
dentro, los esqueletos de carga que copian la forma del elemento real, las
alturas de fila medidas en Exhibidores y Salidas. No es un cambio de token: es
una pasada con comprobación en pantalla.

**Recomendación concreta.** Partirlo:

1. **`label-small-*` de 14 a 16.** 1,17 es indefendible y es la clase de los
   metadatos, que es donde peor se lee. Poco texto afectado, mucho beneficio.
2. **`body-small-*` de 16 a 18.** Segundo paso, ya con más cuidado.
3. **`body-regular` de 20 a 22.** Aparte, y solo si los dos anteriores han
   salido limpios.

No hacer los tres a la vez. «Un cambio, una comprobación en pantalla, un
commit», que es lo que dice `MAQUETACION_MOVIL.md` y tiene razón.

---

### 7 · Un modo de más contraste, como preferencia

**Valor: alto para nuestro público · Esfuerzo: medio · Riesgo: bajo**

**Qué falta.** Nada roto: una capacidad que no tenemos.

**Qué dice M3.** Desde mayo de 2025, los roles de color soportan **tres niveles
de contraste** tokenizados —estándar, medio y alto— «para que la gente elija el
que mejor se ajusta a sus necesidades de visión». Y el principio que lo
sustenta, de la página de accesibilidad, es el que mejor describe a nuestros
usuarios: _«las experiencias universales por defecto rara vez sirven a todo el
mundo»_.

**Qué implica aquí.** El mecanismo **ya existe entero**: hay 10 temas por
`[data-theme]` y una pantalla de Ajustes donde se eligen. Un modo de contraste
alto sería un tercer eje que redefine media docena de tokens —`--ink-2`,
`--ink-3`, `--line`, `--line-2`, el borde de tarjeta y `--state-selected`— y no
toca ni un componente.

**Riesgo.** Bajo: es opcional y no cambia nada para quien no lo active. El
coste real es definir los valores altos para 10 temas y comprobarlos.

**Pero con una condición.** Esto va **después** del hallazgo 1. Un modo de
contraste alto no es una excusa para dejar el modo normal por debajo del
mínimo: el estándar tiene que pasar 4,5:1 igual, y el alto es para quien
necesita más.

---

### 8 · El tamaño del texto no responde a la preferencia del usuario

**Valor: medio-alto · Esfuerzo: ver abajo · Riesgo: alto por el camino obvio**

**Qué falta.** Medido: subir `html { font-size: 24px }` **no cambia ni un
píxel** del texto de la app. Toda la escala está en px (130 reglas de la app en
px frente a 63 en rem, que vienen de MUI y pierden). El resultado es que la
preferencia de tamaño de letra del navegador no hace nada; solo funciona el
zoom.

**Qué dice M3.** Los tamaños van en `sp` (Android) o `rem` (web) precisamente
para esto, y documenta la conversión: `SP/16 = rem`.

**Qué implica aquí, y por qué NO recomiendo el camino obvio.** Migrar la escala
a rem choca de frente con tres cosas que ya han mordido antes: el conversor de
Figma escupe px y **regenera `global.css` entero**; el candado `check:css`
existe justamente porque una regeneración ya se llevó tres clases por delante
(97 textos mal, dos veces); y el escalón ×1,15 está escrito en px dentro de una
media query. Es un cambio con alta probabilidad de romper algo en silencio,
que es el peor tipo de rotura en este repo.

**La alternativa, que da el 90 % del beneficio con el 10 % del riesgo:** el
escalón ×1,15 **ya existe y ya funciona**. Hoy se activa por contexto (tablet
táctil, y la página de Programas semanales). Convertirlo en **un control de
Ajustes** —«Tamaño del texto: normal / grande / muy grande», que ponga una
clase en `<html>`— reutiliza el mecanismo probado, no toca el generador, y le
da a un hermano de 78 años el mando que hoy no tiene.

Esto no es adoptar M3. Es adoptar **el principio de M3** («honra a los
individuos») por el camino que esta app puede recorrer sin romperse.

---

### 9 · La capa de estado toma el color de la marca, no el del contenido

**Valor: bajo-medio · Esfuerzo: bajo · Riesgo: bajo**

**Qué falta.** Nuestros tokens de estado son casi idénticos a los de M3 —hover
8 %, pulsado 14 % (M3: 10 %), deshabilitado 0,38 (M3: 0,38)—, lo cual dice que
el sistema se pensó bien. La diferencia es que los nuestros están **fijados al
acento**:

```css
--state-hover: color-mix(in srgb, var(--accent-main) 8%, transparent);
```

**Qué dice M3.** «Por defecto, el color de la capa de estado de un componente
se deriva del color de su contenido». Si el contenido es rojo, la capa es roja.

**Qué implica aquí.** Donde estos tokens se aplican sobre algo que no es de
marca —una fila con acción destructiva, un chip con el color de una zona de
territorio— el realce tira a azul y desafina. `@components/button` ya lo hace
bien por su cuenta (usa `var(--${color}-secondary)` en el hover con color),
así que esto solo afecta a los usos genéricos de los tokens.

Se arregla con una variante `--state-hover-on` que acepte el color por
`color-mix`, o simplemente escribiendo el `color-mix` en el sitio donde el
color es un dato.

**Riesgo.** Bajo. **Pero valor bajo también**: es corrección fina, no
legibilidad. Va al final de la lista a propósito.

---

## 4. Lo que de M3 NO nos conviene, y por qué

Esta sección es tan parte del encargo como la anterior.

### Color dinámico

M3 lo vende como su gran característica: la app toma los colores del fondo de
pantalla del usuario. **No.** Tres razones concretas de esta app:

1. La congregación **comparte capturas y se ayuda por teléfono**. «Dale al
   botón azul de arriba» deja de significar nada si el botón es verde en el
   teléfono del otro.
2. Solo funciona bien en Android 12+. Aquí hay iPhones y teléfonos modestos.
3. Ya tenemos personalización: 10 temas elegidos a mano. Es la misma promesa
   («que se vea como tú quieres») con el soporte intacto.

**Lo que sí me llevo es el mecanismo, no la personalización:** las parejas
`on-` (hallazgo 5) son la parte del sistema de color de M3 que resuelve un
problema real nuestro. El color dinámico es la parte que crea uno.

### M3 Expressive, como paquete

Google respalda Expressive con su investigación más grande —46 estudios, más de
18.000 participantes— y uno de los resultados es que la gente localiza los
elementos clave **hasta cuatro veces más rápido** en pantallas expresivas. Es
un dato serio y no lo voy a despachar.

Pero conviene mirar **qué** de Expressive hace ese trabajo. Las siete tácticas
que enumera el anuncio son: (1) variedad de formas, (2) color rico y
contrastado, (3) tipografía que guía la atención, (4) contener contenido para
dar énfasis, (5) movimiento fluido, (6) flexibilidad de componentes, (7)
momentos «hero».

Lo que hace que encuentres antes un botón es **2, 3 y 4** — contraste,
jerarquía tipográfica y agrupación. Y esas tres **ya son el eje de nuestro
sistema**: el §6.4c (un solo botón azul), el §2.5 (lo elegido va tintado, el
color pleno está reservado) y el §8 (una tarjeta por jerarquía) dicen lo mismo
con otras palabras. Los hallazgos 1, 5 y 6 de este informe son precisamente
«hacer 2, 3 y 4 bien».

Lo que **no** nos sirve es 1, 5 y 7: formas abstractas, rebote y momentos
hero. Cuestan GPU y batería en un teléfono viejo y no aportan nada a «¿quién
lleva la oración el jueves?». Y el propio M3 avisa: _«las formas sin un motivo
claro detrás añaden más ruido visual que deleite»_.

**Veredicto: adoptar la tesis (énfasis y jerarquía), descartar el envoltorio.**

### El sistema de movimiento por muelles

Sustituye duración + curva por rigidez/amortiguación/velocidad. En Jetpack
Compose sale gratis: 21 componentes ya lo traen. **En web no existe** — la
propia tabla de disponibilidad de M3 dice «Compatible with Compose springs. See
specs» para web y «Unavailable» para Flutter. Implementarlo aquí significa una
librería de física o escribir curvas `linear()` a mano en cada transición.

Nuestro `--motion-fast: 150ms` / `--motion-medium: 250ms` con techo declarado
de 300 ms está bien calibrado para una app de consulta, y el razonamiento
escrito («más allá de 300 ms una aplicación de consulta se siente lenta, no
elegante») es mejor argumento que el de M3 para nuestro caso. **No.**

### Los 30 estilos tipográficos

15 base + 15 enfatizados. Nuestra escala tiene 14 clases y **ya cuesta
mantenerlas vivas**: hay dos incidentes documentados de clases que
desaparecieron al regenerar el CSS, uno de ellos con 97 textos rotos. Duplicar
la escala es duplicar esa superficie de fallo. **No.**

Lo que sí tenemos ya, con otro nombre: el concepto de «estilo enfatizado» son
nuestros pares `-regular` / `-semibold`. Es la misma idea con la mitad de
piezas.

### La escala de forma de 10 pasos

La nuestra tiene 6 y se elige **por rol**, con una regla que cabe en una frase.
La de M3 tiene 10 y se elige por «cantidad de redondez deseada», que no es una
regla: es una preferencia. Ver sección 5. **No.**

### Los componentes nuevos de Expressive

Split button, FAB menu, loading indicator, docked/floating toolbars, botones
de cinco tamaños con morfeo de forma. En el catálogo, casi todos dicen **«Web:
Unavailable»** o «Web: Expressive: Unavailable». Habría que escribirlos desde
cero. Y no resuelven ningún problema que tengamos. **No.**

### Navegación inferior de M3

Ni nos aplica. M3 dice «no muestres a la vez una navigation bar y una toolbar»,
y nosotros ya usamos panel de inicio con baldosas + barra de acciones flotante,
que es justo su recomendación de _docked toolbar_. Lo cumplimos sin haberlo
buscado. Nada que traerse.

### Los formularios oficiales (S-140, S-89, S-21, S-88, S-13)

Fuera del análisis por encargo, y bien fuera. Son **documentos**, no interfaz:
su maquetación la fija la organización, no el sistema de diseño. M3 no tiene
nada que decir sobre un S-88, y `PDF_DESIGN_SYSTEM.md` ya es el sitio correcto
para lo que sí hay que decidir ahí.

---

## 5. Dónde lo nuestro es mejor que M3 para nuestro caso

Siete cosas, y no por cortesía.

**1 · La escala de forma se elige por ROL, no por gusto.** M3 tiene 10 pasos
nombrados por redondez y una guía que dice que personalizar «a veces es
necesario, e incluso se anima». Eso reparte la decisión según el humor de quien
escriba la pantalla — que es exactamente el estado del que salimos con las dos
escalas viejas. Nuestros 6 pasos con «cuanto más pequeño y más interactivo, más
redondo» se aplican sin dudar.

Y aquí ya nos habíamos traído lo mejor de M3 sin saberlo: la **concentricidad**
(`radio interior = radio exterior − hueco`) es literalmente la _optical
roundness_ de M3 (`outer radius − padding = inner radius`). La diferencia es que
la nuestra viene con el caso real que la motivó escrito al lado —el botón de
«Programas semanales» del Inicio— y con el truco práctico de que el hueco sea
el `padding` del contenedor. Eso vale más que la fórmula sola.

**2 · La regla del único botón azul (§6.4c).** M3 dice que el estilo _filled_
debe usarse «con moderación, idealmente para una sola acción por página»… y ahí
lo deja. Nuestra regla tiene cinco cláusulas, incluidas dos que M3 no tiene:
_ninguna acción destructiva lo es nunca_ y _si la acción deja de tener sentido,
deja de ser azul_ (`main={!monthIsPublished}`). Es más estricta y está mejor
razonada.

**3 · Las mayúsculas en español.** M3 dice «usa sentence case» y lo justifica
en inglés. Nosotros tenemos el problema resuelto de verdad: `capitalizarPrimera()`
en quien construye la etiqueta, y documentadas las dos puertas falsas —por qué
NO `textTransform: capitalize` («Miércoles 1 De Agosto») y por qué NO
`.toLowerCase()` (en alemán los meses van en mayúscula)—. M3 ni se plantea que
el problema exista.

**4 · `accentSurface` frente a la «uñita».** Que un borde recto de 4px pegado
al canto de una caja redondeada **pelea con la propia esquina** y deja dos
muescas es un hallazgo que M3 no documenta en ninguna parte, y que se agrava
justo con lo que M3 recomienda (radios más generosos). La cápsula con su propio
radio más el lavado al 6 % es mejor solución que cualquier cosa que diga el
sitio de M3.

**5 · El anti-patrón de doble tarjeta (§8) y «la tarjeta la pone quien la
usa».** M3 habla de contención y de agrupar, pero no da la regla de propiedad
que evita el marco dentro del marco. Nosotros sí.

**6 · El techo de 300 ms.** M3 Expressive va en dirección contraria: overshoot
y rebote por defecto. Para una app de consulta en un teléfono modesto, nuestro
techo es lo correcto, y está argumentado.

**7 · `DialogFooter` con dos formas.** M3 solo contempla botones de texto
alineados al canto final del diálogo. Nuestro pie cambia de forma con el sitio
—apilado a lo ancho en móvil, en fila a la derecha en escritorio— con el
razonamiento escrito («dos objetivos grandes para el pulgar» vs. «un Cancelar
de 496px no parece un botón»). Es mejor para móvil que lo que propone M3.

> **Un matiz sobre el punto 7, que sí vale la pena mirar.** En el diálogo de
> borrar una persona, el orden apilado deja «Eliminar» arriba, relleno de rojo
> y a todo lo ancho, y «Cancelar» debajo, solo con borde. La acción destructiva
> es el objetivo más grande, más llamativo y más cerca del pulgar. La decisión
> de apilar es buena; la de darle el peso visual máximo a lo irreversible,
> menos. M3 usa botones de texto para ambos precisamente para no crear ese
> camino ancho, y nuestro propio §6.4c ya dice que una destructiva «nunca» debe
> ser el camino ancho. Es una incoherencia interna, no un fallo de M3.
> **Sugerencia: en el pie apilado, la destructiva con borde rojo y `Cancelar`
> relleno.** Barato, y quita un borrado accidental de encima.

---

## 6. Qué sale casi gratis por venir de MUI, y qué cuesta de verdad

Porque el encargo lo pedía explícitamente.

### Casi gratis

| Cosa                     | Por qué                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capas de estado y foco   | MUI ya trae `Mui-focusVisible` y el sistema de overlays. Buena parte del hallazgo 3 es **dejar de apagarlo** (hay `disableRipple` en `icon_button`) y poner una regla `:where()` global. |
| Objetivo táctil de 48    | Se resuelve con `sx` dentro de nuestros 4-5 componentes propios. MUI no estorba.                                                                                                         |
| Tokens de color por tema | El mecanismo `[data-theme]` + `generate:css` **ya existe y está probado**. Añadir `--on-brand` es una fila más por tema, igual que se hizo con `--group-5`/`--group-9`.                  |
| Interlineado             | Es un valor por clase en `index.css`. El riesgo está en la maquetación, no en la herramienta.                                                                                            |
| `prefers-reduced-motion` | CSS puro. No depende de MUI para nada.                                                                                                                                                   |
| Puntos de corte          | El tema de MUI ya los declara en `src/states/app.ts`. Cambiarlos es una línea (aunque **no** recomiendo cambiarlos, ver abajo).                                                          |

### Cuesta de verdad — y por eso no lo propongo

| Cosa                             | Coste real                                                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paleta tonal HCT auténtica       | 13 tonos × 6 familias × 10 temas, más reescribir el conversor de Figma. **Y no hace falta**: el hallazgo 5 se resuelve con un token por tema.                               |
| Color dinámico                   | No hay API web. Habría que traerse `@material/material-color-utilities` y generar el esquema en cliente en cada arranque — en una PWA sin conexión y en teléfonos modestos. |
| Muelles de movimiento            | Sin implementación web oficial. Librería de física o curvas a mano en cada transición.                                                                                      |
| Escala tipográfica en rem        | Choca con el generador de Figma y con el candado `check:css`, que existe porque esto ya se rompió dos veces.                                                                |
| Componentes nuevos de Expressive | «Web: Unavailable» en casi todo el catálogo nuevo. Escribirlos desde cero.                                                                                                  |

### Los 9 puntos de corte — mirar, no tocar

Los nuestros: 0 / 400 / 480 / 500 / 600 / 688 / 768 / 1200 / 1400. Los de M3:
600 / 840 / 1200 / 1600.

Hay cuatro cortes (480, 500, 600, 688) en un tramo de 208 px, y es probable que
alguno sea histórico. **Pero no propongo alinearlos con M3**: los nuestros
salieron de medir pantallas de verdad —el cambio de 480 a 1200 en Exhibidores y
Salidas está documentado en `MAQUETACION_MOVIL.md` con las medidas que lo
justifican, y con M3 ese caso habría quedado igual de mal—. Si algún día se
limpian, que sea midiendo otra vez, no copiando una tabla.

---

## 7. Resumen para decidir

| #   | Hallazgo                                        | Valor      | Esfuerzo   | Riesgo         | ¿Mejora real o alineación?      |
| --- | ----------------------------------------------- | ---------- | ---------- | -------------- | ------------------------------- |
| 1   | Subir `--ink-3` a ≥4,5:1 en los 10 temas        | Muy alto   | Bajo       | Bajo           | **Mejora real**                 |
| 2   | `prefers-reduced-motion` global                 | Alto       | Muy bajo   | Bajo           | **Mejora real**                 |
| 3   | Anillo de foco global con `:where()`            | Medio-alto | Bajo       | Bajo           | **Mejora real**                 |
| 4   | Objetivo táctil de 48 (área, no dibujo)         | Muy alto   | Bajo-medio | Bajo           | **Mejora real**                 |
| 5   | Token `--on-brand` (parejas `on-` de M3)        | Muy alto   | Medio      | Medio          | **Mejora real**                 |
| 6   | Interlineado, en tres pasos                     | Alto       | Medio      | **Medio-alto** | **Mejora real**                 |
| 7   | Modo de más contraste (opt-in)                  | Alto       | Medio      | Bajo           | **Mejora real**                 |
| 8   | Tamaño de texto en Ajustes (×1,15 ya existe)    | Medio-alto | Medio      | Bajo           | **Mejora real**                 |
| 9   | Capa de estado derivada del contenido           | Bajo-medio | Bajo       | Bajo           | Alineación (con algo de mejora) |
| —   | Pie de diálogo: no rellenar la destructiva      | Medio      | Muy bajo   | Bajo           | Coherencia interna              |
| ✗   | Color dinámico                                  | —          | Alto       | Alto           | **No**                          |
| ✗   | Expressive como paquete (formas, muelles, hero) | —          | Alto       | Alto           | **No**                          |
| ✗   | 30 estilos tipográficos                         | —          | Medio      | Alto           | **No**                          |
| ✗   | Escala de forma de 10 pasos                     | —          | Alto       | Medio          | **No — la nuestra es mejor**    |
| ✗   | Escala tipográfica en rem                       | —          | Alto       | Alto           | **No ahora** (usar el ×1,15)    |
| ✗   | Alinear los puntos de corte con M3              | —          | Medio      | Medio          | **No**                          |

**Si solo hay una tarde:** hallazgos 1, 2 y 3. Son tres ficheros, se comprueban
en pantalla en media hora y le cambian la vida a quien lee la app con 75 años.

**Si hay una semana:** los cinco primeros. El 4 y el 5 son los que de verdad
mueven la aguja, y el 5 es el único sitio donde M3 tiene algo estructural que
nosotros no.

**Lo que no hay que hacer nunca por parecerse a M3:** color dinámico, muelles,
formas abstractas y duplicar la escala tipográfica.
