# Sistema de diseño de Elda Centro (org-app)

Este documento describe el sistema de diseño **real** de la aplicación, extraído
del código existente (no inventado). Su propósito es que cualquier página nueva
o modificada sea indistinguible en look & feel de las demás. Cuando este
documento y el código difieran, gana el código de las páginas más nuevas y
mejor hechas (Territorios, Ayuda, visita del Superintendente de Circuito) —
son la referencia; si una página vieja no las sigue, la página vieja está mal,
no el documento.

Última revisión: 2026-07-14, durante la auditoría de consistencia de toda la app.

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

### 2.3 Radios

```
--radius-xs   2px   --radius-l    8px    --radius-xxl  16px
--radius-s    4px   --radius-xl  12px    --radius-max  999px (pill)
--radius-m    6px
```

Además existe una segunda escala semántica (`--r-lg: 26px`, `--r-md: 20px`,
`--r-sm: 15px`) usada por páginas/tarjetas de contenedor de nivel superior
(ej. la tarjeta raíz de una página). **Las dos escalas conviven a propósito**:
`--radius-*` para controles internos (botones, chips, inputs, filas),
`--r-*` para el contenedor de página. No mezclar libremente; si dudas, mira
qué usa una página hermana ya bien hecha (Territorios, Ayuda).

### 2.4 Sombras

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

**El `text-transform: uppercase` como estilo SÍ es correcto** cuando lo aplica
una clase del sistema a propósito (`h2-caps` para cabeceras de sección con
fondo de color, `button-caps` para el texto de todos los botones). Eso es
CSS puro sobre texto normal en Frase-caso — el HTML/JSX debajo sigue
escribiéndose en minúsculas salvo la primera letra; es el navegador quien lo
muestra en mayúscula. **Lo que hay que corregir es texto escrito a mano
en mayúsculas o en Title Case dentro del JSX/strings**, no las clases CSS
`uppercase` en sí.

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
| Una tarjeta/superficie | `@components/card`, o un `Box` con `backgroundColor: var(--card)`, `border: 1px solid var(--line)`, `borderRadius: var(--r-lg)` — **una sola vez por jerarquía**, ver §8 | Repetir el mismo fondo/borde en un componente Y en su contenedor padre |
| Pestañas | `@components/scrollable_tabs` o `@components/segmented_control` | `<Tabs>`/`<Tab>` de MUI sueltos |
| Un desplegable | `@components/select` | `<Select>` de MUI directo |
| Iconos | `@components/icons` (308 iconos ya disponibles, revisa antes de traer uno de otra librería) | Emoji o símbolos sueltos en texto (`▾`, `✕`, `→`) como si fueran iconos |

> **Nota sobre `info_tip`:** antes de esta auditoría solo soportaba
> `color: 'white' | 'blue'`. Se le añadieron las 4 severidades semánticas
> (`info`/`success`/`warning`/`error`, con `'blue'` conservado como alias de
> `'info'` por compatibilidad) precisamente para tener un único componente de
> banner inline en toda la app — antes de esto, cada página que necesitaba un
> aviso de color usaba `<Alert>` de MUI en crudo.

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

### 7.3 Dos escalas de radio (`--radius-*` y `--r-*`)
Ver §2.3 — es coexistencia intencional (controles vs. contenedor de página),
no una a eliminar.

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

## 11. Pendiente de baja prioridad (no bloqueante)

- **Radios de borde como píxeles sueltos en vez de `var(--radius-*)`:**
  ~33 archivos usan `borderRadius: '12px'`/`'8px'`/`'6px'`/`'16px'`/`'999px'`
  etc. en vez del token equivalente. El valor numérico YA coincide con la
  escala real (`12px = --radius-xl`, `999px = --radius-max`, etc.), así que
  no es un bug visual — el render es idéntico — solo higiene de código
  (evitar que un cambio futuro de la escala no los alcance). Corregir de
  forma oportunista al tocar cada archivo, no amerita una pasada dedicada.
