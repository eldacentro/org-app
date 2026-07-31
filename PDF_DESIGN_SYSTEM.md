# El sistema de documentos impresos

Gobierna **todo lo que la app imprime**. El código está en
[`src/views/design/`](./src/views/design/).

> **Origen.** Lo diseñó Claude Design (proyecto «Sistema PDF Elda Centro»). La
> especificación original —con la justificación de cada número y los doce
> documentos uno a uno— vive en el `ESPECIFICACION.md` de ese proyecto. Este
> documento es lo que hace falta para mantener el código.

Léelo **antes** de tocar una plantilla de `src/views`.

---

## 0. Qué entra y qué no

| | |
|---|---|
| **Los doce documentos de la app** | Usan este sistema. |
| **Los formularios oficiales** — S-140, S-89, S-21, S-88 | **No se tocan.** Reproducen impresos de la organización. |

De un formulario oficial sí se corrige un **dato equivocado** (que llevara el
nombre de otra congregación). Eso no es diseño.

**react-pdf no lee CSS.** Estos valores no son —ni pueden ser— los de
`global.css`; están repetidos a propósito y calibrados para tinta, no para
pantalla. Por eso el gris secundario es más oscuro aquí que en la app.

---

## 1. Cimientos → [`tokens.ts`](./src/views/design/tokens.ts)

**Si un número no está ahí, no debería estar escrito en una plantilla.**

### Color

`ink #1A1A2E` · `secondary #5D6673` · `faint #98A1AD` · **`accent #306CB4`** ·
`accentDark #245188` · `wash #EEF4FC` · `accentLine #C8DAF0` ·
`border #D9E2EE` · `hairline #E3E8EF` · `zebra #F8FAFD` · `inactive #C4CBD4`

Estados: `ok` · `warn` · `danger`, cada uno con su lavado.

**Categóricos** (`category`): tesoros, maestros, vida cristiana; los diez
grupos; asamblea, visita, campaña, conmemoración. **Solo clasifican**: se usan
en un cuadradito de 6×6 y su rótulo, nunca como fondo ni como borde.

### Tipografía — once estilos, cada uno con un trabajo

`sheetTitle` 16/800 · `sheetSubtitle` 9,5/500 · `dateCapsule` 8/700 versalitas ·
`cardHeader` 8,5/700 versalitas · `heading` 10,5/700 · `body` 9/400 ·
`bodyStrong` 9/600 · `label` 7/700 versalitas · `meta` 8/500 ·
`calendarNumeral` 13/800 · `footer` 7/400

### Escalas

Espacio 3·5·8·12·18·26 — Radios 4 (celda) · 6 (tarjeta) · **5,5 (interior)** ·
cápsula — Líneas 0,5 y 2,5 — Márgenes 36 vertical · 26 apaisado

---

## 2. La anatomía de la hoja → [`Sheet`](./src/views/design/Page.tsx)

```
┌──────────────────────────────────────────────┐
│ ▣ Elda Centro                 ( AGOSTO 2026 )│  firma + cápsula
│                                              │  +12
│ Programa de exhibidores                      │  título 16/800
│ Turnos y responsables                        │  +3, subtítulo
│ ▬▬▬ ──────────────────────────────────────── │  +10, LA REGLA
│                                              │  +14
│ …contenido…                                  │
│ ──────────────────────────────────────────── │
│ Elda Centro · Documento   Hoja 1 de 2 · …    │  pie fijo
└──────────────────────────────────────────────┘
```

**La regla** —guion azul de 26 × 2,5 + hairline— es el único gesto gráfico del
sistema y lo que hace que las doce hojas se reconozcan a dos metros. No se toca
ni en modo compacto.

El nombre de la congregación **siempre** por parámetro. El wordmark pone la
última palabra en 800 y el resto en 500.

---

## 3. Vocabulario

| Pieza | Cuándo |
|---|---|
| `PdfCard` | Agrupar lo que va junto. **Siempre con banda.** |
| `PdfTable` | Muchas filas con las mismas columnas |
| `PdfKeyValue` | Datos sueltos, apilados |
| `PdfGrid` | Calendario de celdas sueltas |
| `PdfNote` | El bloque destacado. **Uno por hoja** |
| `PdfBadge` | Estado, y el hueco «Sin asignar» |
| `PdfCategory` | Cuadradito + rótulo del color de la categoría |
| `PdfDiamond` | ◆ responsable / precursor |
| `PdfEmpty` · `PdfHairline` | El vacío y la línea interior |

---

## 4. Las reglas (citables)

- **R1 · Una cabecera, doce documentos.** Firma + cápsula + título 16 + regla.
- **R2 · La fecha es el periodo, no el día.** La cápsula va a mes: «Agosto
  2026», «Agosto – Septiembre 2026», «2026 – 2027». La numeración y la fecha de
  actualización, en el pie. → [`fecha.ts`](./src/views/design/fecha.ts)
- **R3 · Un solo acento.** El azul de marca no clasifica; los categóricos no
  visten.
- **R4 · La banda de la tarjeta es sagrada.** Lavado + 8,5/700 versalitas en
  acento oscuro. Ni tarjetas sin cabecera ni rellenos de azul intenso.
- **R5 · El fondo nunca toca la curva.** Todo hijo con fondo lleva su propio
  radio (exterior − borde = 5,5). `overflow: hidden` **no recorta fondos** en
  react-pdf: de ahí venían las esquinas blancas de la cuadrícula vieja.
- **R6 · Profundidad = superficie + línea.** Sin sombras ni degradados.
- **R7 · Los bordes no se parten.** Nada de bordes rectos contra el canto de una
  caja redondeada; separar con hairlines interiores a ≥9 pt del canto.
- **R8 · Tablas sin jaula.** Cebra en las filas pares; **nunca** verticales.
- **R9 · El vacío se dice.** `—`, «Sin asignar», «Sin salidas este día».
- **R10 · Lo que se busca, en 600.** Nombre y hora, siempre.
- **R11 · Los bloques no se parten a ciegas.** `wrap={false}`,
  `minPresenceAhead={40}`, pie `fixed`.
- **R12 · Versalitas solo para rótulos** (7–8,5 pt). Nunca en títulos ni cuerpo.

### Modo compacto

Para los que **deben caber en una hoja** (4, 5, 7, 10, 12). Se aplica UNA escala
global, nunca ajustes sueltos: cuerpo 9 → 8,2 · relleno de fila 4,5 → 3 · banda
5 → 3,5 · hueco entre tarjetas 12 → 8 · margen 36 → 30.

No se tocan el título, la regla ni el pie. Nada por debajo de 7,5.

---

## 5. Cómo se comprueba

**Renderizando el PDF y mirándolo.** Los peores defectos que ha tenido este
código —verticales cortas, esquinas blancas, uñitas con muescas, columnas que
se tocan— son invisibles leyendo y evidentes en el papel.

Contar páginas sin abrir nada:

```bash
python3 -c "import re;d=open('x.pdf','rb').read();print(len(re.findall(rb'/Type\s*/Page[^s]',d)))"
```
