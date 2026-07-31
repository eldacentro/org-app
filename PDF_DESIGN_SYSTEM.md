# El sistema de diseño de los PDF

Este documento gobierna **todo lo que la app imprime**. El código vive en
[`src/views/design/`](./src/views/design/); aquí está el porqué.

Lo lee cualquiera que vaya a tocar una plantilla de `src/views`, **antes** de
tocarla.

---

## 0. Qué entra y qué no

| | |
|---|---|
| **Lo que diseña la app** — programas, listas, invitaciones, contactos | Usa este sistema. Once documentos. |
| **Los formularios oficiales** — S-140, S-89, S-21, S-88 | **No se tocan.** Reproducen impresos de la organización; su aspecto no nos pertenece y cambiarlo los invalida. |

De un formulario oficial sí se corrige un **dato equivocado** (que llevara el
nombre de otra congregación, por ejemplo). Eso no es diseño.

---

## 1. El problema que resuelve

Antes de esto, cada plantilla se había diseñado sola. El resultado medido:

- **Tres cabeceras** distintas para el mismo trabajo.
- **Cuatro pies** distintos, y varios con el nombre de nuestra congregación
  escrito a mano — cualquier otra imprimía sus hojas con el nuestro.
- **Seis copias** del logotipo, los mismos trazos SVG pegados a mano, cada una
  a su tamaño.
- Para el texto secundario convivían `#666666`, `#888888`, `#aaaaaa`,
  `#333333` y `#1a1a2e` **sin ningún criterio**.
- Tres maneras de pedir el mismo tamaño de página.
- La "uñita" de color con **dos grosores** sobre bloques con **cuatro radios**.

Puestas dos hojas juntas no parecían de la misma aplicación. Es el mismo
problema que [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) resolvió en la pantalla,
y esto es su equivalente en papel.

**Importante:** react-pdf no lee CSS. Los valores de aquí **no pueden**
compartirse con los de `global.css`; están repetidos a propósito. Si cambias un
token de la pantalla, este no se entera.

---

## 2. Cimientos

Todo sale de [`tokens.ts`](./src/views/design/tokens.ts). **Si un número no
está ahí, no debería estar escrito en una plantilla.**

### Color

Tres niveles de tinta, un acento, las superficies y los estados. Nada más.

| Token | Para qué |
|---|---|
| `ink` | El texto que se lee |
| `muted` | Lo secundario: fechas, notas, valores de apoyo |
| `faint` | Lo que casi no se lee: el pie |
| `accent` | **El único azul.** El del logotipo |
| `accentLine` / `accentSoft` | Su línea y su lavado |
| `line` / `lineSoft` | Líneas neutras |
| `zebra` / `surfaceMuted` | Franja alterna y superficie apagada |
| `ok` `warn` `danger` (+ `*Soft`) | **Solo estados.** Nunca decoración |

### Tipografía

Nueve estilos, cada uno con **un** trabajo. Si un texto no encaja en ninguno,
casi siempre sobra el texto, no falta el estilo.

`display` · `subtitle` · `section` · `heading` · `body` · `bodyStrong` ·
`label` · `meta` · `footnote`

### Espacio, forma y línea

`space` 3·5·8·12·18·26 — `radius` 3·5·9·full — `stroke` 0,5·1

Margen de página: **36** en vertical, **26** en apaisado (se estrecha para
ganar ancho útil).

---

## 3. La anatomía de una hoja

Siempre la misma. La pone [`Sheet`](./src/views/design/Page.tsx).

```
┌──────────────────────────────────────────────┐
│ [logo] Congregación            julio de 2026 │  barra de marca
│ ──────────────────────────────────────────── │  regla
│                                              │
│ Título de la hoja                            │  display
│ De qué va                                    │  subtitle
│                                              │
│ …secciones…                                  │
│                                              │
│ ──────────────────────────────────────────── │
│ Congregación            Página 1 de 2        │  pie (fijo)
└──────────────────────────────────────────────┘
```

Lo que cambia de un documento a otro es **lo de en medio**. Para eso están las
secciones, las tablas, las tarjetas y la cuadrícula: la consistencia está en el
marco y en el vocabulario, no en obligar a todos a tener la misma forma.

El nombre de la congregación **siempre** viene por parámetro. Nunca escrito.

---

## 4. Vocabulario

| Pieza | Cuándo |
|---|---|
| `PdfSection` | Divide la hoja en tramos con rótulo |
| `PdfTable` | Muchas filas con las mismas columnas |
| `PdfKeyValue` | Dos o tres datos sueltos, sin tabla |
| `PdfGrid` | Calendario: días en columnas, semanas en filas |
| `PdfCard` | Agrupar lo que va junto (un grupo, una semana) |
| `PdfNote` | Un bloque destacado, con su cápsula de color |
| `PdfBadge` | Estado: suspendido, sin asignar, precursor |
| `PdfEmpty` | "Aquí no hay nada", de una sola manera |

---

## 5. Las reglas

Estas son las que hay que saberse. Cada una viene de un fallo real.

### 5.1 Una tabla no lleva rejilla

Ni líneas verticales entre columnas, ni una línea bajo cada fila. Solo una
línea bajo la cabecera, y **franja alterna** para separar filas.

Una rejilla completa dice *"cada casilla es una casilla"*, y eso solo hace
falta cuando hay que rellenarla a mano. Las columnas ya están alineadas — eso
las separa. Se probó con líneas **y** franja a la vez: la franja parecía
suciedad.

**La franja empieza en la primera fila.** La cabecera no tiene fondo; si la
primera fila tampoco lo tuviera, arriba quedarían dos blancos seguidos y la
cuenta arrancaría mal.

### 5.2 Un rótulo y su valor no se separan con una rayita

Los separa el color y el peso. Una línea bajo cada dato convierte la hoja en un
impreso para rellenar a mano, que es justo lo que estos papeles no son.

### 5.3 El marco y las rayas los dibuja el contenedor, nunca las celdas

Esta es la que arregla la cuadrícula de Exhibidores y Salidas.

Se dibujaban con el borde de **cada celda** —`borderRight` y `borderBottom`—,
quitándoselo a la última fila y la última columna, y el marco lo ponía el
contenedor con `borderRadius` y `overflow: hidden`. Eso daba dos defectos:

1. **Las verticales no llegaban abajo.** La raya de una columna era el borde
   derecho de sus celdas, así que medía lo que midiera la celda. Si la última
   fila tenía menos contenido, la raya se paraba donde se acababa el contenido
   en vez de llegar al marco.

2. **Las esquinas de abajo se veían blancas.** Las celdas pintaban su fondo
   blanco hasta el canto, en cuadrado. En react-pdf el recorte de
   `overflow: hidden` **no llega a los fondos de los hijos**: el cuadrado
   blanco tapaba la curva y parecía que la línea se cortaba.

Ahora las verticales son elementos propios, en absoluto, que van de la cabecera
al suelo: son enteras siempre. Y el fondo lo pone la cuadrícula; las celdas son
transparentes.

### 5.4 Nada rectangular toca la esquina de nada redondeado

Corolario de la anterior, y vale para todo: si un hijo con fondo llega al canto
de un padre redondeado, se ve el pico. O el hijo redondea también, o no llega.

### 5.5 Un borde no es decoración

Un borde **delimita**. Si lo que se quiere es *marcar con color*, eso es una
**cápsula** (`PdfCapsule`): una barrita con su propio radio, metida dentro del
margen y más corta que el bloque.

Un borde recto pegado al canto de una caja redondeada pelea con la propia
esquina: el color llega arriba, se corta en seco donde empieza la curva y deja
dos muescas. Cuanto más redondo el bloque, peor.

### 5.6 La densidad se adapta al contenido, el diseño no

Un programa tiene que caber en **una hoja**, pero el número de filas no lo
decide el diseño: una semana con dos salidas de predicación cada día trae el
doble que otra normal.

Así que por encima de cierto número de filas la hoja **se aprieta sola**:
mismo dibujo, mismos colores, mismas franjas, solo un punto más pequeña y con
menos aire. El umbral se **mide** renderizando y contando páginas, no se
calcula.

### 5.7 El color de estado significa algo

`ok`, `warn` y `danger` solo para estados. Si el color no cambia lo que el
lector entiende, sobra.

### 5.8 Un solo azul

El del logotipo. Cualquier otro azul en un PDF es un error.

---

## 6. Cómo se comprueba

**Renderizando el PDF y mirándolo.** Leer el código no vale: los tres defectos
peores de esta ronda —las verticales cortas, las esquinas blancas y la uñita
que dejaba muescas— son invisibles en el código y evidentes en el papel.

Para contar páginas sin abrir nada:

```bash
python3 -c "import re;d=open('x.pdf','rb').read();print(len(re.findall(rb'/Type\s*/Page[^s]',d)))"
```
