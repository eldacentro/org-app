# Sistema de diseño de Elda Centro (org-app)

Este documento describe el sistema de diseño **real** de la aplicación, extraído
del código existente (no inventado). Su propósito es que cualquier página nueva
o modificada sea indistinguible en look & feel de las demás. Cuando este
documento y el código difieran, gana el código de las páginas más nuevas y
mejor hechas (Territorios, Ayuda, visita del Superintendente de Circuito) —
son la referencia; si una página vieja no las sigue, la página vieja está mal,
no el documento.

Última revisión: 2026-07-29 — se fijó la escala de FORMA, el lenguaje de
MOVIMIENTO y el de ESTADOS (§2.3 a §2.5), que era lo que faltaba para que esto
fuese un sistema y no una lista de buenas costumbres.

---

## 1. Principio general

**No reimplementar con MUI en crudo lo que ya existe en `src/components/`.**
Casi cada vez que una página usa `<Button>`, `<Dialog>`, `<Alert>`, `<Switch>`,
`<Checkbox>` o `<TextField>` importados directamente de `@mui/material`, es una
señal de que se saltó el sistema de diseño. Los componentes de `src/components/`
son wrappers finos sobre MUI que ya aplican los tokens correctos — úsalos.

Antes de escribir una línea de `sx` con un color, tamaño o radio a mano,
comprueba si existe un token o un componente que ya resuelva eso.

---

## 2. Tokens (custom properties CSS)

Todos viven en `src/global/global.css` (paleta por tema, vía `[data-theme=...]`)
e `src/global/index.css` (capa semántica). **Nunca** hardcodear un color hex o
rgba en una página — siempre a través de `var(--token)`, para que los 8 temas
(claro/oscuro × 4 colores) y modo oscuro funcionen solos.

### 2.1 Color — capa semántica (preferir siempre esta sobre la de abajo)

| Token | Uso |
|---|---|
| `--paper` | Fondo de la página (detrás de las tarjetas) |
| `--card` | Fondo de una tarjeta/superficie elevada |
| `--surface-2` | Inputs, popovers, elementos "un nivel más elevados" que la tarjeta |
| `--ink` | Texto principal (**no** `--black`, aunque hoy sea un alias — ver §7.1) |
| `--ink-2` | Texto secundario/atenuado (antes `--grey-400`) |
| `--ink-3` | Texto terciario, el más apagado (antes `--grey-350`) |
| `--line` / `--line-2` | Bordes y divisores sutiles (línea 1 = 10% opacidad, línea 2 = 15%) |
| `--brand` / `--brand-deep` / `--brand-tint` | Alias de `--accent-main` / `--accent-dark` / `--accent-150` |
| `--ok` / `--ok-tint` | Éxito (alias de `--green-main` / `--green-secondary`) |
| `--amber` / `--amber-tint` | Aviso (alias de `--orange-main` / `--orange-secondary`) |
| `--error-main` / `--error-dark` / `--error-150` | Error (alias de `--red-*`) |
| `--always-white` | Blanco fijo, NO cambia con el tema (texto sobre fondos de color sólido) |

### 2.2 Color — capa de paleta (la usan los tokens de arriba; úsala solo si no hay alias semántico)

`--accent-main/-dark/-150/-200/-300/-400`, `--grey-100…600`, `--red-*`,
`--green-*`, `--orange-*` — cada uno redefinido por tema en `global.css`.

### 2.3 Forma (radios)

**Una sola escala, elegida por el ROL del elemento — nunca por la página.**

| Token | Valor | Para qué |
|---|---|---|
| `--shape-xs` | 8px | Casillas, badges, cuadraditos de fecha |
| `--shape-sm` | 12px | Campos, desplegables, filas de lista |
| `--shape-md` | 16px | Paneles anidados, barras (selector plegado), tarjeta pequeña |
| `--shape-lg` | 20px | **La** tarjeta estándar de una página |
| `--shape-xl` | 28px | Diálogos, hojas, tarjeta destacada del inicio |
| `--shape-full` | 999px | Botones (**también los de icono**), píldoras, chips, pestañas, buscador, barras de progreso |

La regla en una frase: **cuanto más pequeño y más interactivo, más redondo en
proporción**; los contenedores grandes se quedan en una curva generosa pero
contenida. Todo lo que se pulsa y no es un contenedor tiende a `--shape-full`
— así "esto se toca" se reconoce por la forma, antes de leer nada.

Los nombres viejos (`--radius-*`, `--r-*`) **ya no los usa nadie**: los 396
sitios se migraron de una vez el 2026-07-30, con el valor intacto (cada alias
tenía un equivalente exacto en la tabla, así que no cambió un solo píxel). Las
definiciones se quedan en `global/index.css` **de red**: `global.css` lo genera
`npm run generate:css` y allí siguen declarados con los valores ANTIGUOS
(`--radius-l: 8px`), así que sin esa red un `var(--radius-l)` escrito por
descuido cogería el valor viejo sin avisar. En código nuevo, `--shape-*`
siempre. `--radius-none` se queda: 0 no es una forma, es su ausencia.

**Nunca un píxel suelto.** Si ninguno de los seis encaja, casi siempre es que
el elemento está mal clasificado, no que falte un token.

#### Un diálogo es `--shape-xl`; un MENÚ no

Es la confusión que más veces se coló: `<Dialog>` y `<Menu>` se estilan igual
(`PaperProps` / `slotProps.paper`), así que se copiaban el uno del otro. Pero
no son lo mismo:

- **`<Dialog>` → `--shape-xl`.** Es una superficie que se apodera de la
  pantalla; las esquinas marcan que está por encima de todo lo demás.
- **`<Menu>` / `<Popover>` / el desplegable de un `Select` → `--shape-sm`.**
  Es la continuación del control que lo abrió — sale pegado a él, y con 28px
  parece una hoja aparte flotando encima en vez de la lista de ese campo.

A 2026-07-30 había **cuatro** radios distintos repartidos por los ~30 diálogos
escritos a mano (16, 20, 12 y 28px) y solo UNO coincidía con
`@components/dialog`. Todos pasaron a `--shape-xl`. Si escribes un diálogo a
mano, mejor no lo hagas: usa `@components/dialog`.

#### Los esqueletos de carga copian la forma de lo que sustituyen

Un `<Skeleton>` con un radio inventado hace que la pantalla **salte** al llegar
los datos. El radio del esqueleto se saca del elemento real, no a ojo: la
tarjeta del día es `--shape-sm` porque `.meeting-row .day-badge` lo es, y la
píldora de la hora es `--shape-full` porque `.meeting-row .meeting-time` lo es.

#### Concentricidad — manda sobre la tabla de arriba

Cuando un elemento **comparte esquina con el contenedor que lo envuelve**, su
radio ya no lo decide su papel: lo decide la geometría.

```
radio interior = radio exterior − hueco
```

Dos curvas que arrancan del mismo punto con radios distintos no encajan: entre
ellas queda un hueco que crece y decrece, y se lee como un error aunque no se
sepa nombrar. Es lo que pasaba con el botón de "Programas semanales" del
inicio: la tarjeta iba a 28 y el botón, por la regla de "todo botón es
píldora", a 999.

**Cuándo aplica:** solo si el elemento toca de verdad la esquina — un botón a
lo ancho pegado al fondo de una tarjeta, una cabecera de color pegada arriba.
Un botón suelto en una fila, o un icono centrado con aire por los cuatro lados,
no comparte esquina con nada y se queda con la forma de su papel.

**Truco práctico:** haz que el hueco sea el `padding` del contenedor y nada
más. Si te sale un número que no es un token, casi siempre es que el hueco está
fuera de la rejilla — arregla el hueco, no el radio. (El botón del inicio tenía
7px de padding más 6px de margen: 13 de hueco, para un radio ideal de 15 que no
existe en ninguna escala.)

**Y el hueco es UNO para toda la tarjeta.** No basta con que el botón sea
concéntrico: tiene que arrancar de la misma línea vertical que el título y que
las filas de arriba, o se sale del límite que sigue todo lo demás. Un
contenedor con `padding: 8` cuyos hijos se meten otros 13 por su cuenta tiene
en realidad **dos** márgenes interiores, y el que se pegue al de fuera cantará.

Así que: el `padding` de la tarjeta ES el margen interior, los hijos no añaden
el suyo, y de ahí sale el radio. Con `padding: 16` sobre `--shape-xl` (28) el
interior cae en 12 = `--shape-sm`.

Si una fila necesita que su fondo de hover **se derrame** más allá de esa línea
—para no verse apretada—, se hace con margen negativo, nunca moviendo el
contenido: `margin: 0 -8px; padding: 14px 8px;`. El fondo se ensancha, el texto
se queda alineado.

### 2.4 Movimiento

```
--motion-fast    150ms   lo que responde al dedo (fondo, color, opacidad)
--motion-medium  250ms   lo que cambia de tamaño o aparece
--ease-standard    cubic-bezier(0.2, 0, 0, 1)   todo lo demás
--ease-emphasized  cubic-bezier(0.3, 0, 0, 1)   lo que se despliega
```

Más allá de 300 ms una aplicación de consulta se siente lenta, no elegante.
Nunca animar `width`/`height`/`top` si se puede animar `transform`/`opacity`.

### 2.5 Estados

Un solo lenguaje para "puedes tocarme", "estoy pulsado" y "estoy elegido", en
vez de que cada componente se lo invente.

```
--state-hover            8%  de marca sobre transparente
--state-pressed         14%  de marca sobre transparente
--state-selected         fondo de lo elegido (--accent-150)
--state-selected-strong  su hover (--accent-200)
--state-selected-ink     texto de lo elegido (--accent-dark)
--state-disabled-opacity 0.38
```

Foco visible: `outline: 2px solid var(--accent-main)` con `outlineOffset: 2px`.

**Lo elegido va tintado con el texto en azul oscuro, jamás en color pleno.** El
color pleno está reservado a la acción principal de la pantalla (§6.2). Una
pestaña elegida no es un botón. Esto vale por igual para pestañas, segmented
control, chips de semana y rejillas de mes: antes cada uno tenía su dibujo.

#### Un solo dibujo de "elegido", sin excepciones

Píldora tintada (`--state-selected`) con el texto en `--state-selected-ink`.
Vale para pestañas, segmented control, chips de semana, años y rejillas de mes.

Durante un rato esto tuvo DOS dibujos —subrayado para las "pestañas de sección"
y tinte para "elegir un valor"— con el argumento, que suena bien, de que una
sección es un sitio donde estás y un valor es algo que has escogido. Es la
convención de Material Design y no es una tontería.

**Se descartó al intentar aplicarla.** ¿"Entre semana / Fin de semana" en
Ajustes es una sección, o es elegir qué reunión configuras? ¿"Asignaciones que
tengo / Delegado"? ¿"Todas las personas / Visto recientemente"? Las tres son
ambiguas, y una regla que obliga a dudar en cada caso no ordena nada: reparte
los dibujos según el humor de quien escriba la pantalla, que es exactamente de
donde veníamos.

Precio que se paga, dicho claro: el subrayado "ata" la pestaña al panel de
debajo y el tinte no. Se acepta — el panel empieza justo debajo y se entiende
igual.

> **Deuda abierta:** hay TRES componentes de pestañas (`@components/tabs`,
> `@components/scrollable_tabs`, `@components/segmented_control`). Los tres
> dibujan ya lo mismo, así que la inconsistencia visual está resuelta, pero
> sobran dos. Fundirlos es tarea aparte: `tabs` gestiona además el panel de
> contenido y lo usan once sitios.

**Y en las dos direcciones:** lo que se puede pulsar SIEMPRE reacciona al
hover/pulsación; lo que no se puede pulsar NUNCA lleva borde + sombra de botón.

### 2.6 Sombras

```
--small-card-shadow   tarjeta en reposo / hover ligero
--big-card-shadow     tarjeta grande destacada
--hover-shadow        hover de un elemento interactivo
--btn-shadow          botón flotante / FAB
--pop-up-shadow       diálogos y menús flotantes
--left/right-sidebar-shadow   paneles laterales
--error/warning/success/message-glow   resplandor de estado (notificaciones, banners destacados)
```

Nunca escribir `box-shadow: 0px 4px 12px rgba(...)` a mano — siempre uno de
estos.

---

## 3. Tipografía

**Todo el texto de la app usa una de estas clases vía `className` en
`@components/typography` (o `<Typography className="...">`). Nunca
`fontSize`/`fontWeight` sueltos en `sx` salvo un ajuste real y puntual.**

La razón NO es sólo el orden: **un `fontSize` a mano se queda fuera de los dos
escalones de texto**. La app agranda el texto ×1,15 en dos situaciones —tablet
táctil, y la página de Programas semanales— y lo hace redefiniendo estas clases
dentro de una media query (`global/index.css`, al final). Los estilos de `sx`
son clases de emotion que ese CSS no alcanza, así que un `fontSize: '13.5px'`
escrito a mano **no crece en una tablet** y acaba más pequeño que el texto de al
lado. A 2026-07-30 quedan ~150 sitios así, casi todos en Exhibidores y Salidas.

| Clase | Tamaño (móvil → escritorio) | Uso |
|---|---|---|
| `h1` | 20px → 24px, semibold | Título de página |
| `h2` | 18px → 20px, semibold | Título de sección/tarjeta |
| `h2-caps` | 18px → 20px, uppercase | Cabecera de sección con fondo de color (ej. "TESOROS DE LA BIBLIA" en el programa) — el `uppercase` aquí es **intencional y correcto**, no un error de mayúsculas |
| `h3` | 16px → 18px, medium | Subtítulo |
| `h4` | 15px → 16px, medium | Subtítulo pequeño / etiqueta de campo destacada |
| `body-regular` | 15px → 16px | Texto de cuerpo por defecto |
| `body-regular-semibold` | 15px → 16px, semibold | Cuerpo con énfasis (nombre en una fila, valor destacado) |
| `body-small-regular` | 13px → 14px | Texto secundario de cuerpo |
| `body-small-semibold` | 13px → 14px, semibold | Texto secundario con énfasis |
| `body-small-medium` | 13px → 14px, medium | Peso intermedio para texto secundario |
| `label-small-regular` | 12px | Metadatos, timestamps, captions |
| `label-small-medium` | 12px, medium | Metadatos con algo de énfasis |
| `label-small-semibold` | 12px, semibold | Etiqueta de campo pequeña con énfasis |
| `button-caps` | 12px → 14px, uppercase | Texto de botón — lo aplica `@components/button` solo, no usar suelto |
| `big-numbers` / `huge-numbers` | 48px / 64px | Cifras destacadas de dashboard |

> **Nota de mantenimiento (2026-07-14):** `body-regular-semibold`,
> `label-small-semibold` y `body-small-medium` ya estaban en el tipo
> `CustomClassName` (`src/definition/app.ts`) y se usaban en decenas de
> archivos, pero sin tener NUNCA una definición CSS — el texto renderizaba sin
> ningún estilo. Se añadieron sus definiciones en `global.css` (mismo
> tamaño/interlineado que su clase hermana más cercana, peso intermedio). De
> paso, se quitaron del tipo `body-medium-semibold` y `body-semibold`: estaban
> en el tipo pero con CERO usos reales y CERO definición CSS — muerte
> silenciosa, no una clase pendiente de arreglar. Si ves una clase de texto
> que "no hace nada", sospecha primero que está huérfana antes de asumir que
> el navegador la ignora por otra razón. También se encontró y corrigió
> `body-small` (sin sufijo) en `responsabilidades/index.tsx` — un typo
> aislado por `body-small-regular`.
>
> **Cómo se hizo esta comprobación (repetible):** listar todas las
> `className="..."` de una sola palabra en minúsculas usadas en
> `src/features`/`src/pages`/`src/components`, y comprobar cuáles NO tienen
> una regla `.clase { ... }` en `global.css` ni en `index.css`. Ojo: esto da
> falsos positivos con clases que son "ganchos" estructurales/de
> comportamiento (ej. `schedules-view-week-selector`, usada solo como
> selector CSS desde un `sx` padre o como ancla de `querySelector`, nunca
> pensada para tener estilo propio) — no son bugs de tipografía, hay que
> descartarlas a mano.

No inventar tamaños nuevos (`fontSize: '13.5px'`, `'12.5px'`, `'14px'` sueltos
en `sx`). Si ninguna clase encaja, es señal de que falta una clase en la
escala — añádela aquí y en `global.css`, no la hardcodees en la página.

---

## 4. Espaciado

La app usa una rejilla de **8px** (con 4px como paso mínimo para ajustes
finos): `4, 8, 12, 16, 20, 24, 32`. Los valores dominantes son `8px` y `16px`
(gap entre elementos relacionados y separación entre bloques,
respectivamente). Evitar valores sueltos como `6px`, `10px`, `14px`,
`18px` salvo que ya exista ese patrón exacto en un componente hermano.

- Padding interno de una tarjeta: `16px` (móvil) — `20-24px` (escritorio).
- Gap entre campos de un formulario: `16px`.
- Gap entre elementos de una fila (icono + texto): `8px`.
- Padding de un diálogo (`DialogActions`/pie): `16px`.

---

## 5. Mayúsculas y capitalización (español)

**Nunca "Title Case" anglosajón.** En español solo va en mayúscula la primera
palabra de una frase y los nombres propios — el resto en minúscula.

- ✅ "Ajustes del mes", "Restaurar a global", "Mantener activas estas salidas"
- ❌ "Ajustes Del Mes", "Restaurar A Global", "Mantener Activas Estas Salidas"

**Los botones ya NO van en versalitas (2026-07-30).** `button-caps` conserva el
nombre —lo genera el conversor de tokens— pero se redefine en
`global/index.css`: 14px, peso 600, tal como se escribe. El motivo es que la
app ya se contradecía sola: los botones `variant="small"` nunca transformaron
nada, así que en la misma pantalla convivían "Categorías" y "CANCELAR". Y en
español las etiquetas son largas: en versalitas se alargan más y pierden la
silueta de la palabra, que es por donde se reconocen de un vistazo.

**El `text-transform: uppercase` sigue siendo correcto en `h2-caps`**, y solo
ahí: la mayúscula separa la cabecera de una sección del texto que va dentro,
que es un trabajo distinto de etiquetar un botón. Eso es CSS puro sobre texto
escrito en Frase-caso — el JSX debajo sigue en minúsculas salvo la primera
letra. **Lo que hay que corregir es texto escrito a mano en mayúsculas o en
Title Case dentro del JSX/strings**, no esa clase.

### "Aquí todavía no hay nada" — `@components/empty_state`

Una lista vacía nunca se deja en blanco: se dice qué falta y, si se puede, qué
hacer. Pero con UN dibujo, no siete.

```tsx
<EmptyState
  icon={<IconInfo color="var(--accent-dark)" />}
  title="No hay documentos en esta categoría"
  description="Cuando se suba uno, aparecerá aquí."
/>
```

- **Lleva la superficie de tarjeta por defecto**, y no es adorno: este bloque
  ocupa el sitio de la tarjeta que habría si hubiese contenido. Sin ella, el
  círculo del icono —un lavado del acento— queda casi del color del fondo de la
  página y el texto flota sin nada que lo sujete. Se comprobó mirándolo.
- `surface={false}` **solo** cuando el estado vacío ES la pantalla entera
  (Avisos, Mis asignaciones): ahí no sustituye a ninguna tarjeta.
- `compact` para dentro de un diálogo o de una lista con scroll, donde un
  bloque alto no cabe.
- **Nunca borde punteado.** Un recuadro punteado significa "aquí se suelta
  algo" (arrastrar y soltar); para una lista vacía es ruido.

A 2026-07-30 había SIETE dibujos distintos y no diferían en un detalle:
diferían en todo — borde punteado o sólido, tres radios, tres clases de texto,
dos tamaños de icono, uno en horizontal, dos sin caja, uno que era un
`Typography` a secas, y el de Inicio con el borde en `rgba(59,114,196,.15)`: el
azul del tema por defecto congelado.

### Meses y días: en minúscula, salvo que abran la etiqueta

En español "el 27 de julio", no "el 27 de Julio". La mayúscula solo la lleva la
primera palabra de la frase.

Por eso los nombres viven **en minúscula** —en `locales/es-ES/general.json` y en
`@utils/nombres_fecha`, que es la copia para lo que no pasa por i18n— y la
mayúscula la pone **quien construye la etiqueta**, con
`capitalizarPrimera()` de `@utils/common`:

```
`${capitalizarPrimera(mes)} ${año}`   →  "Julio 2026"    (el mes abre)
`${dia} de ${mes}`                    →  "30 de julio"   (va dentro)
```

Las plantillas del diccionario dicen cuál es cuál sin tener que pensarlo:
`tr_monthYear` es `{{ month }} {{ year }}` —el mes abre, lleva mayúscula— y
`tr_longDateFullMonthNoYearLocale` es `{{ date }} de {{ month }}` —va dentro,
minúscula—.

**Nunca `.toLowerCase()` en el código para conseguirlo.** La app trae más de
cincuenta idiomas y en alemán los meses van en mayúscula por ser sustantivos:
la regla es del idioma y vive en su diccionario. Ya hubo un intento así —un
`monthCase` en `upcoming_events.ts` que preguntaba "¿estamos en español?"—, y
solo arreglaba una pantalla de las trece que tenían el fallo.

### Un verbo por acción, y el más corto que se entienda

"Guardar", nunca "Guardar cambios" — si el botón está en un formulario, ya se
sabe qué guarda. Lo mismo con el resto: `Eliminar` para borrar un registro,
`Borrar` **solo** para vaciar algo que sigue existiendo (`tr_clearAll`,
"Borrar semanas seleccionadas"), `Añadir` para meter algo en una lista,
`Crear` para hacer algo que no existía, `Aceptar` para cerrar dando el
enterado (nunca "OK", que además es un anglicismo).

Y el nombre de una cosa se escribe **igual en todas partes**: la app decía
"llave maestra" en 21 sitios y "clave maestra" en uno — justo el botón que la
establece. Antes de inventar una etiqueta, `grep` de cómo se llama ya.

**La Ayuda cita botones: tiene que citarlos literalmente.** Decía "Restaurar
Fijos" y "Restaurar al Global" cuando los botones dicen otra cosa; y las dos
páginas gemelas (Exhibidores y Salidas) llamaban distinto a la misma acción.

Comprobar siempre: si el texto fuente en el string ya está en mayúsculas y NO
pasa por una clase `-caps`, es casi seguro un error a corregir.

---

## 6. Componentes — qué usar y cuándo

| Necesito... | Usar | No usar |
|---|---|---|
| Un botón | `@components/button` (`variant`: `main` \| `secondary` \| `tertiary` \| `small` \| `semi-white` \| `group`) | `<Button>` de `@mui/material` directo |
| Un diálogo con título + contenido + acciones | `@components/dialog` envolviendo `Typography` (`h2`/`var(--ink)` título, `body-small-regular`/`var(--ink-2)` subtítulo) + fila de `@components/button` al final (`tertiary` cancelar a la izquierda, `main` acción principal a la derecha) | `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` de MUI sueltos |
| Confirmar una acción (¿seguro que...?) | `useConfirm()` de `@components/confirm_dialog` | Un `Dialog` custom ad-hoc para cada confirmación |
| Un interruptor con etiqueta | `@components/switch_with_label` (o `@components/switch` a secas si no hay etiqueta) | `<Switch>` + `<FormControlLabel>` de MUI |
| Una casilla | `@components/checkbox` (acepta `label` directamente) | `<Checkbox>` + `<FormControlLabel>` de MUI |
| Un aviso/banner inline (info, éxito, aviso, error) | `@components/info_tip` (`color`: `info` \| `success` \| `warning` \| `error` \| `white` — ver nota) | `<Alert severity="...">` de MUI |
| Una tarjeta/superficie | `@components/card`, o un `Box` con `backgroundColor: var(--card)`, `border: 1px solid var(--line)`, `borderRadius: var(--shape-lg)` — **una sola vez por jerarquía**, ver §8 | Repetir el mismo fondo/borde en un componente Y en su contenedor padre |
| Pestañas | `@components/scrollable_tabs` o `@components/segmented_control` | `<Tabs>`/`<Tab>` de MUI sueltos |
| Un desplegable | `@components/select` | `<Select>` de MUI directo |
| Iconos | `@components/icons` (308 iconos ya disponibles, revisa antes de traer uno de otra librería) | Emoji o símbolos sueltos en texto (`▾`, `✕`, `→`) como si fueran iconos |
| Marcar una tarjeta con el color de su categoría | `accentSurface()` de `@components/accent_surface` — ver §6.3 | `borderLeft: '4px solid <color>'` (la "uñita") |
| Una acción con forma de píldora (JW Library, Google Maps, Consejos, Documentos, «Ver reunión completa») | `@components/action_pill` — ver §6.2 | Un `Box component="a"` con su propio `px`/`py`/`borderRadius` |
| Buscar dentro de una lista | `@components/search_bar` | Un `TextField` con `IconSearch` de adorno |
| Elegir el mes que se está mirando (Exhibidores, Salidas) | `@components/month_selector` | Rehacer la tira de meses con `Box`+`Chip` en la página |
| Elegir la semana que se está mirando | `@features/meetings/weekly_schedules/week_selector` (Programas semanales) o `@components/collapsible_selector` si hace falta el panel plegable | Copiar la cabecera «Semana: … / Cambiar» a mano |
| Ir a la semana anterior/siguiente desde un editor | `@features/meetings/week_navigator` | Un par de `IconButton` con flechas por cada editor |
| Escribir el nombre de quien tiene una parte | `@features/meetings/weekly_schedules/assignee_name` | Repetir el `Typography` + viñeta en cada pestaña |

### 6.2 Las tres variantes de `ActionPill` van por JERARQUÍA, no por pantalla

- `solid` — **la** acción de la pantalla. Hay una. Es lo único que lleva color
  pleno, y por eso ninguna otra cosa debe llevarlo: ni una pestaña elegida, ni
  una etiqueta, ni un contador.
- `tinted` — una acción **dentro de una tarjeta**. No compite con la tarjeta que
  la contiene ni con la acción principal de la pantalla.
- `outline` — una acción que **se repite en una lista**. En «Mis asignaciones»
  hay una por fila: rellenas serían un muro de color.

Las tres comparten tamaño (`padding: 6px 12px`, `--shape-full`) a propósito:
antes eran cinco copias con cuatro tamaños distintos y se notaba al verlas en la
misma pantalla.

### 6.3 Marcar una tarjeta con el color de su categoría — `accentSurface`

**No uses `borderLeft: '4px solid <color>'`.** Es la "uñita" que estaba copiada
en veintitantos ficheros con cuatro grosores distintos (2, 3, 4 y 5px), y no es
cuestión de gusto que se vea mal: un borde recto pegado al canto de una caja
redondeada **pelea con la propia esquina** — el color llega arriba, se corta en
seco donde empieza la curva y deja dos muescas. Cuanto más redonda la tarjeta,
peor; y la escala nueva subió todos los radios.

En su lugar, `accentSurface(color)` de `@components/accent_surface`: una
cápsula de 4px **con su propio radio completo**, metida dentro del margen y más
corta que la tarjeta, más un lavado del mismo color al 6%. Al no tocar ningún
canto no hay nada con lo que pelear, y al ser redonda pertenece a la misma
familia que el resto. El lavado es lo que hace que la fila se lea "de esta
categoría" de un vistazo, sin depender de una línea de 4px.

```tsx
<Box sx={{ ...tarjeta, ...accentSurface(zone.color) }}>
```

Incluye el `paddingLeft` que hace falta para que el contenido no pise la
cápsula. Pasa `{ tint: false }` si la tarjeta ya tiene fondo propio.

> **Nota sobre `info_tip`:** antes de esta auditoría solo soportaba
> `color: 'white' | 'blue'`. Se le añadieron las 4 severidades semánticas
> (`info`/`success`/`warning`/`error`, con `'blue'` conservado como alias de
> `'info'` por compatibilidad) precisamente para tener un único componente de
> banner inline en toda la app — antes de esto, cada página que necesitaba un
> aviso de color usaba `<Alert>` de MUI en crudo.

### 6.4 Etiquetas de estado: `Badge` si el significado es fijo, chip de color si el color es un DATO

Regla de decisión, y no hay tercera opción:

| El color viene de… | Qué se usa |
|---|---|
| El **significado** (atrasado, libre, en curso, campaña, caducado…) | `Badge` de `@components/badge`, con `color` de la paleta de tokens |
| Un **dato** que alguien eligió (color de una zona, de una etiqueta) | Un chip que reciba ese color como prop — ej. `TagChip` de Territorios |

Por qué importa: en Territorios había **ocho** maneras distintas de pintar la
misma idea de "etiqueta de estado", cada una con su `fontSize` (`0.75rem`,
`11px`, `12px`, `13px`) y su `fontWeight` a pelo. Puestas dos en la misma
pantalla no parecían de la misma aplicación.

Y un aviso concreto: **el fondo de un chip NUNCA se construye pegando dígitos
hexadecimales al final del color** (`` `${color}15` ``, `` `${color}1A` ``).
Ese truco solo funciona si el color es un HEX literal de 6 dígitos; con
`var(--ink-2)` produce una cadena inválida y el elemento sale **sin fondo y
sin borde**. Pasó de verdad en las campañas "pasadas". Para mezclar, se usa
`color-mix(in srgb, <color> N%, transparent)`, que funciona con cualquier
color, tokens incluidos.

### 6.5 Un campo con un botón al lado: NUNCA se estira el botón al alto del campo

Un campo mide 56px (etiqueta dentro) y un botón mide 40. Puestos en la misma
fila de flexbox, `align-items` vale `stretch` por defecto, así que el botón
crece hasta los 56 y los dos acaban con **el mismo borde superior y el mismo
borde inferior, al píxel**. Ahí es donde nace la sensación de que "no
combinan": el ojo deja de ver dos controles y ve UNO solo, y un solo objeto
con dos radios distintos canta.

El arreglo no es igualar los radios, es dejar de soldarlos:

```tsx
<Box sx={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
  <TextField label="Nueva ubicación" … />   {/* 56 de alto, --shape-sm */}
  <Button variant="main" …>Añadir</Button>   {/* 40 de alto, --shape-full */}
</Box>
```

Con el botón a su alto de siempre son dos cosas separadas y cada una se queda
con la forma que le toca por su papel (§2.3): el campo cuadradito porque
**contiene** algo, el botón píldora porque **hace** algo. De paso, el botón
deja de ser un 40% más alto que todos los demás botones de la app.

**No** se resuelve al contrario. Redondear el campo del todo lo convierte en
una caja de búsqueda —que es otra cosa— y lo separa de los otros ~600 campos.
Y bajar el botón a 12px solo porque tiene un campo al lado convierte la regla
en "píldora, salvo cuando…", y por ese camino se vuelve a los nueve dialectos.

La excepción real serían dos controles **pegados sin hueco**, como un buscador
con su lupa dentro: ahí sí son un objeto y comparten un solo radio. Ese patrón
no existe en esta app, y no conviene introducirlo.

### 6.7 Degradados: fuera del contenido, permitidos como ambiente

No es "ningún degradado nunca". La línea está en QUÉ pinta:

**Fuera** — sobre una superficie de contenido: cabeceras de tarjeta, botones,
barras de una gráfica, franjas de acento. Compiten con lo que hay encima, y en
una gráfica además engañan: el ojo lee el degradado como si el valor cambiara
a lo alto de la barra, cuando lo que mide es la altura. Se quitaron de las
cabeceras de Exhibidores y Salidas, del botón de la ficha de territorio y del
gráfico anual del Informe.

**Permitidos** — como fondo ambiental de una pantalla o de una hoja: el lavado
de `.screen`, el aura de `.glow`, el fondo de las pantallas de arranque, el
desvanecido sobre una foto de perfil. Ahí no hay nada debajo que estorbar y
dan profundidad.

**Con una condición, siempre**: los colores salen de tokens
(`rgba(var(--x-base), a)` o `color-mix`). Un degradado con un HEX dentro es un
color congelado que ignora los cinco temas — pasó con el azul del armazón y
con el rojo del aviso de "sin conexión".

### 6.6 Los plurales se escriben, no se concatenan

`` `${n} territorios` `` escribe "1 territorios". Siempre la forma completa:

```tsx
{n === 1 ? '1 territorio' : `${n} territorios`}
```

Aparecía en cuatro sitios del módulo de Territorios a la vez.

### 6.1 Patrón canónico de un diálogo con formulario (referencia: `DialogZonas`, Territorios)

```tsx
<Dialog open={open} onClose={onClose}>
  <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
    Título del diálogo
  </Typography>
  <Typography className="body-small-regular" sx={{ color: 'var(--ink-2)', mb: 3 }}>
    Explicación breve de qué hace este diálogo.
  </Typography>

  {/* contenido / formulario */}

  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: 3 }}>
    <Button variant="tertiary" onClick={onClose}>Cancelar</Button>
    <Button variant="main" onClick={handleSave}>Guardar</Button>
  </Box>
</Dialog>
```

Reglas de botones en un pie de diálogo:
- El botón que **cancela/cierra sin efecto** = `tertiary`, siempre a la
  izquierda del principal.
- El botón que **confirma/guarda** = `main`, siempre el más a la derecha.
- Una acción **destructiva o de reset** (ej. "Restaurar a global", "Borrar")
  = `secondary` con `color="red"`, separada a la izquierda del todo (opuesta
  a cancelar/guardar) si conviven en el mismo pie.
- **Nunca dos botones que hacen lo mismo** (ej. "Cancelar" y "Cerrar" ambos
  cerrando sin guardar nada) — si no hay nada que confirmar, un único botón
  basta.

---

## 7. Deuda conocida (documentada a propósito, no ocultada)

Estas inconsistencias existen hoy en el código. Se documentan aquí para que
cualquier arreglo futuro sepa que son conocidas y por qué no se tocaron en
la primera pasada (o si se tocaron, qué se decidió).

### 7.1 `--black` vs `--ink`
`--ink: var(--black)` en `index.css` — son el mismo valor, y `--black-base`
SÍ se redefine por tema oscuro (no es un color fijo). Usar `var(--black)`
directamente **no es un bug visual** (se adapta igual que `--ink` a los 8
temas), pero es inconsistente de nombre: `--ink` es el token semántico
correcto y debería preferirse en código nuevo. No se ha hecho un
find-and-replace global de `--black` → `--ink` porque el volumen (96
archivos) no compensa el riesgo frente al beneficio (son idénticos en
runtime) — se corrige de forma oportunista al tocar cada archivo.

### 7.2 Pesos de fuente no estándar en `body-small-semibold`
Usa `font-weight: 450` (móvil) / `520` (escritorio) — valores que no
corresponden a ningún `@font-face` cargado (que van en pasos de 100: 300,
400, 500, 600, 700, 800, 900). El navegador resuelve al peso cargado más
cercano. No se ha tocado porque cambiar el valor numérico cambiaría el
renderizado visual ya aprobado; se documenta para que quien añada nuevas
clases de peso "semibold" no copie este patrón (usar 600, un peso real).

### 7.3 Dos escalas de radio (`--radius-*` y `--r-*`) — ~~deuda~~ **pagada (2026-07-29)**
Durante un tiempo este documento defendió que las dos escalas convivían "a
propósito" (controles vs. contenedor de página). No era verdad: en la práctica
cada componente elegía una al nacer, y a las dos escalas se sumaban ~35 radios
en píxeles sueltos (`10px`, `15px`, `17px`, `13px`…). El resultado eran cuatro
familias de esquina distintas visibles en una sola pantalla.

Resuelto en §2.3: una escala `--shape-*` por rol, con los nombres viejos
convertidos en alias. Lección para la próxima: **si una "coexistencia
intencional" no se puede explicar con una regla que diga qué usar en cada caso,
no es intencional — es deuda con buena prensa.**

### 7.4 Tokens de color CSS huérfanos (corregidos 2026-07-14)
Igual que las clases de tipografía huérfanas del §3, existían **15 custom
properties de color usadas en ~30 archivos que nunca se definieron en
ningún tema** (`var(--algo)` sin que `--algo` exista en `global.css` ni
`index.css`) — el navegador simplemente ignora la declaración, así que el
color/fondo/borde afectado no se aplicaba nunca (ej. `--brand-main-10` en
el borde de notificaciones no leídas, o `--red-800`/`--red-900` asumiendo
una escala numérica que la familia `red` nunca tuvo — solo tiene
`--red-main`/`--red-dark`/`--red-secondary`). Se sustituyeron todas por el
token real más cercano (`--accent-50`→`--accent-100`, `--bg-hover`→
`--accent-100`, `--grey-dark`→`--grey-600`, `--text-secondary`→`--ink-2`,
`--red-100/200/300/light`→`--red-secondary`, `--red-800/900`→`--red-dark`,
etc. — ver el commit de esta fecha para el mapeo completo).

**Cómo se hizo esta comprobación (repetible, mismo método que el §3):**
listar todos los `var(--x)` usados en `src/features`/`src/pages`/
`src/components`, y comprobar cuáles `--x` NO tienen una declaración
`--x: ...` en `global.css` ni `index.css`. A diferencia del chequeo de
clases de tipografía, aquí no hay tantos falsos positivos porque los
custom properties casi nunca se usan como simples ganchos de selector.

---

## 8. Anti-patrón: doble anidado de tarjetas

**Síntoma:** un recuadro con fondo/borde/sombra de tarjeta, dentro de OTRO
recuadro con el mismo fondo/borde/sombra — visualmente, un marco dentro de un
marco idéntico, sin motivo.

**Causa típica:** un componente de feature (ej. `MyCongregation` en el
catálogo de oradores) se diseñó para poder usarse de forma standalone y por
eso se auto-envuelve en una tarjeta — pero la página que lo consume TAMBIÉN
lo envuelve en una tarjeta (porque no sabía que el hijo ya lo hacía, o porque
se cambió después uno de los dos lados sin tocar el otro).

**Regla:** la tarjeta la pone **quien la usa**, no el componente reusable en
sí — un componente de feature que puede aparecer embebido en distintos
contextos NO debe asumir que es "la tarjeta de nivel superior". Si un
componente necesita SIEMPRE ser su propia tarjeta (nunca se usa embebido en
otra), está bien que se la ponga él mismo — pero entonces ninguna página que
lo consuma debe volver a envolverlo.

**Cómo detectarlo al auditar:** busca un `Box`/`Card` con
`backgroundColor: var(--card)` + `border: 1px solid var(--line)` cuyo
primer hijo directo sea otro elemento con exactamente esa misma combinación.

**Ejemplo real corregido:** `src/pages/persons/speakers_catalog/index.tsx`
envuelve `<MyCongregation />` + `<OtherCongregations />` en una tarjeta común;
`MyCongregation` tenía su propia tarjeta idéntica alrededor del título
"Tu congregación". Se quitó la tarjeta interna de `MyCongregation` (queda
solo como layout flexible, sin fondo/borde propios) — la tarjeta de la página
es la única.

---

## 9. Cómo auditar una página con este documento

Al revisar cualquier página, comprobar en este orden:

1. **Componentes:** ¿usa `@components/*` para botones/diálogos/switches/
   checkboxes/alerts, o MUI en crudo con `sx` reimplementando lo mismo?
2. **Tipografía:** ¿todo el texto pasa por una clase de la tabla del §3, o
   hay `fontSize`/`fontWeight` sueltos en `sx`/`style`?
3. **Color:** ¿todo color es un `var(--token)`, o hay hex/rgba a mano?
4. **Mayúsculas:** ¿algún string en el JSX está en Title Case o ALL CAPS sin
   pasar por una clase `-caps` intencional?
5. **Anidado:** ¿hay una tarjeta dentro de otra tarjeta igual? (§8)
6. **Botones de diálogo:** ¿siguen el orden y variantes del §6.1? ¿hay dos
   botones redundantes?
7. **Espaciado:** ¿los gaps/paddings son múltiplos de 4/8, o valores sueltos
   como 6px/10px/14px?
7b. **Concentricidad:** ¿hay algo redondeado que comparta esquina con su
   contenedor? Comprueba `interior = exterior − hueco` (§2.3). Si el
   contenedor lleva `overflow: hidden` y el hijo va a sangre, no hace falta
   cuenta: lo recorta el padre.
8. **Confirmaciones:** ¿usa `useConfirm()` para "¿seguro que...?", o un
   diálogo custom reinventado?

Si una página falla en 3+ de estos puntos, tratarla como página "no migrada"
y aplicar el mismo tratamiento que a `predicacion_salidas`/`exhibitors`
(las dos páginas de referencia de "antes" documentadas en el historial de
commits de esta auditoría).

---

## 10. Hallazgo grande (2026-07-14): `variant="secondary"` vs `variant="tertiary"`

Auditando toda la app se encontró que el botón "Cancelar/Cerrar sin guardar"
se renderizaba de **dos formas visualmente distintas** según la página: 111
usos de `variant="secondary"` (MUI `text`, sin borde) contra 65 de
`variant="tertiary"` (MUI `outlined`, con borde) para el mismo propósito.
Se normalizó caso por caso (revisando el `onClick` de cada botón, nunca un
reemplazo ciego de texto) en toda la app — ver §6.1 para la convención
canónica ya fijada. Si en el futuro aparece un `variant="secondary"` sin
`color="red"` en un botón que solo cierra/cancela sin guardar nada, es un
caso que se coló — corregirlo a `tertiary`.

## 11. Pendientes

- ~~Radios de borde como píxeles sueltos en vez de `var(--radius-*)`~~ —
  **corregido** (2026-07-14): 74 ocurrencias en 52 archivos, sustitución
  1:1 exacta (`12px` → `var(--radius-xl)`, etc.) por toda la app, sin
  riesgo visual porque el valor renderizado es idéntico al del token.

- ~~2 usos de `<Tabs>`/`<Tab>` de MUI en crudo en `ResponsablesPanel.tsx`
  (9 pestañas, una con `label` compuesto por un `Badge`) y
  `PanelInformacion.tsx` (4 pestañas)~~ — **migrados a
  `@components/scrollable_tabs`** (2026-07-14), verificados en navegador
  (modo de prueba) pestaña por pestaña, incluida la vista compleja
  "Territorios" con selección múltiple y la barra sticky de
  `ConfiguracionTab`. `ScrollableTabs` acepta `label: ReactNode`, así que el
  `Badge` de "Solicitudes" se conservó sin cambios.

- ~~30 `boxShadow` hardcodeados que no se adaptaban a modo oscuro~~ —
  **corregido** (2026-07-14): 15 archivos migrados a
  `var(--small-card-shadow)` / `var(--big-card-shadow)` / `var(--hover-shadow)`
  / `var(--btn-shadow)` / `var(--pop-up-shadow)` según el caso. Se dejaron
  intactos los brillos con tinte de color/marca, las sombras `inset` y los
  overlays de "glassmorphism" fijos y documentados de `evacuacion/` (su
  propio código ya explica que son un estilo claro deliberado, no
  theme-aware por diseño).

- ~~"Plan de Evacuación" en Title Case~~ — **corregido**: título de página,
  tile del dashboard de Congregación y `PageTitle` pasados a "Plan de
  evacuación" (sentence case).

- ~~Emojis usados como iconos (📄📊🗺💡⚠️🚨✅✓✕▾🎉📂🧯) en vez de
  `@components/icons`~~ — **corregido** (2026-07-14): ~20 ocurrencias en 15
  archivos sustituidas por el icono real más cercano semánticamente
  (`IconLightbulb`, `IconError`, `IconE911Emergency`, `IconCheckCircle`,
  `IconCheck`, `IconClose`, `IconSortDown`, `IconMapOverview`/`IconMapView`,
  `IconStats`, `IconSpreadsheet`, `IconS21Page`, `IconAssignment`,
  `IconPerson`, `IconLocation`, `IconInfo`). `SectionCard` (usado por
  `ImportExportTab`/`ConfiguracionTab` de Territorios) cambió su prop
  `icon` de `string` a `ReactNode` para aceptar componentes de icono en
  vez de un carácter de texto. Dos excepciones documentadas y deliberadas:
  el 👋 de saludo en `pages/dashboard/index.tsx` (decorativo, con su propia
  animación CSS `.waving-hand`, el usuario pidió explícitamente
  conservarlo) y los `✓`/`✗` de `server_snapshots/index.tsx` (van dentro
  de un `string` plano usado como `label` de una opción de `<Select>`, no
  admiten JSX sin reestructurar el componente).
