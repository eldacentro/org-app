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

### Tipografía

**La escala es `size`: diez números y ni uno más.** Es el único sitio de todo el
sistema donde se escribe un tamaño de letra; ninguna plantilla pone un
`fontSize` a mano, pide un estilo de `text`. Así una hoja no puede llevar el
cuerpo a 9 mientras la de al lado lo lleva a 8,5.

| | | |
|---|---|---|
| `badge` **7,2** | `label` **7,5** | `category` **8** |
| `meta` **8,5** | `cardHeader` **9** | `body` **9,5** |
| `subtitle` **10** | `heading` **11** | `numeral` **14** |
| `title` **17,5** | | |

Un escalón por encima de la especificación original (cuerpo 9 → 9,5): en papel
y a la luz de un tablón, el 9 se leía justo. **Para subir o bajar el sistema
entero se tocan esos diez números y nada más.**

Los estilos, cada uno con un trabajo: `sheetTitle` 17,5/800 · `sheetSubtitle`
10/500 · `dateCapsule` 8,5/700 versalitas · `cardHeader` 9/700 versalitas ·
`heading` 11/700 · `body` 9,5/400 · `bodyStrong` 9,5/600 · `label` 7,5/700
versalitas · `meta` 8,5/500 · `calendarNumeral` 14/800 · `footer` 7,5/400

### Escalas

Espacio 3·5·8·12·18·26 — Radios 4 (celda) · 6 (tarjeta) · **5,5 (interior)** ·
cápsula — Líneas 0,5 y 2,5 — Márgenes 36 vertical · 26 apaisado

---

## 2. La anatomía de la hoja → [`Sheet`](./src/views/design/Page.tsx)

```
┌──────────────────────────────────────────────┐
│ ▣ Elda Centro                 ( AGOSTO 2026 )│  firma + cápsula
│                                              │  +12
│ Programa de exhibidores                      │  título 17,5/800
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
| `PdfBullet` | El punto de una lista corta dentro de una celda |
| `PdfDiamond` | ◆ responsable / precursor |
| `PdfEmpty` · `PdfHairline` | El vacío y la línea interior |

---

## 4. Las reglas (citables)

- **R1 · Una cabecera, doce documentos.** Firma + cápsula + título 17,5 +
  regla. El subtítulo dice de qué va la hoja (día, hora, alcance), **no cuántas
  filas tiene**: un recuento no es un subtítulo, y donde hace falta va en la
  banda de la tarjeta.
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
- **R8 · Tablas sin jaula.** **La cebra empieza en la primera fila**, porque
  el encabezado de columnas ya va en blanco y dos bandas claras seguidas hacen
  perder el hilo. **Nunca** verticales, y hueco entre columnas para que un
  valor largo no toque el de al lado.
- **R9 · El vacío se dice.** `—`, «Sin asignar», «Sin salidas este día».
- **R10 · Lo que se busca, en 600.** Nombre y hora, siempre.
- **R11 · Los bloques no se parten a ciegas.** `wrap={false}`,
  `minPresenceAhead={40}`, pie `fixed`.
- **R12 · Versalitas solo para rótulos** (7,2–9 pt). Nunca en títulos ni cuerpo.
- **R13 · Nada que dependa de un glifo raro.** El ◆ y la viñeta se DIBUJAN, no
  se escriben: Figtree no trae U+25C6 y react-pdf no tiene fuente de reserva,
  así que lo que salía en el papel era un cuadrado vacío. Lo mismo vale para
  cualquier símbolo fuera del latín básico.
- **R17 · Un `<Text>` no mezcla cadenas sueltas con `<Text>` anidados.** O todos
  los hijos son elementos o ninguno lo es. Mezclarlos es donde react-pdf se deja
  piezas por el camino: así desaparecieron el orador del fin de semana y, en
  otra forma, así se descolgaba el conductor del estudio bíblico —la línea base
  de un texto de varias líneas es la ÚLTIMA, y una caja de dos `<Text>` hereda
  la del PRIMERO—.
- **R14 · El subtítulo es para decir algo, no para contar.** Solo lo llevan
  cuatro documentos, y en los cuatro añade lo que el título no dice: quién
  visita y qué semana, de quién es la invitación, qué significa el ◆. Los demás
  van sin él.
- **R15 · En un calendario, el día va arriba.** El nombre del día es el
  encabezado de su columna, no una línea dentro de cada celda: repetirlo treinta
  veces cuesta una línea por celda, que es justo lo que hace que un mes no quepa
  en la hoja. Un día fuera del mes es un **hueco** (`filler`), y un hueco no se
  pinta: ni borde ni franja. Franja tiene el día que existe y no tiene nada. El
  rótulo de la fila —«Semana 1»— va girado en un canalón de 14 pt: en
  horizontal se comía 42.
- **R16 · Todas las filas de la cuadrícula miden lo mismo.** La cuadrícula
  ocupa la hoja (`flexGrow: 1`) y cada fila se reparte el alto por igual. Sin
  eso, cada semana medía según lo que tuviera dentro —75,7 · 72,0 · 75,5 ·
  47,0— y, con las celdas exactamente del mismo ancho, unas cajas salían más
  achatadas que otras: el ojo lo lee como si la cuadrícula no cuadrara, aunque
  esté cuadrada al punto.

### Modo compacto

Para los que **deben caber en una hoja** (4, 5, 7, 10, 12). Se aplica UNA escala
global, nunca ajustes sueltos: cuerpo 9,5 → 8,7 · relleno de fila 4,5 → 3 ·
banda 5 → 3,5 · hueco entre tarjetas 12 → 8 · margen 36 → 30.

**El modo compacto aprieta la escala, no la estructura.** La versión anterior de
Contactos de emergencia subía la dirección a la línea del nombre a partir de 15
filas, y el resultado era que unas hojas se leían de una manera y otras de otra
según cuánta gente hubiera en el grupo. Ahora la hoja es siempre la misma, más
junta.

Y no lo decide el calendario, lo decide el **contenido**: un mes de seis semanas
con una salida al día cabe de sobra y uno de cuatro con tres al día no cabe, así
que el disparador es `semanas × lo más lleno que esté un día`.

No se tocan el título, la regla ni el pie. Nada por debajo de 7,2.

---

## 5. El nombre del archivo → [`nombre_pdf.ts`](./src/utils/nombre_pdf.ts)

Una sola forma para todo lo que la app exporta:

    <Documento> <sufijo>.pdf

El documento **se llama como se llama**: el mismo nombre que lleva impreso en
su propio pie. El sufijo identifica esa exportación y se escribe para que
ordene solo — `2026-08` un mes, `2026-08-03 a 2026-08-30` un rango de semanas,
o el sujeto cuando lo hay. Sin sufijo si el documento es una foto del momento.
Los formularios oficiales conservan su código delante: `S-89 2026-08-03 a
2026-08-24.pdf`.

Antes convivían en la misma carpeta `WM_20260803-20260830.pdf`,
`Field_Service_Groups.pdf`, `Departamentos_agosto_2026.pdf`,
`UpcomingEvents.pdf` y `Contactos-Emergencia-01-08-26.pdf`.

---

## 6. Cómo se comprueba

**Renderizando el PDF y mirándolo.** Los peores defectos que ha tenido este
código —verticales cortas, esquinas blancas, uñitas con muescas, columnas que
se tocan— son invisibles leyendo y evidentes en el papel.

Contar páginas sin abrir nada:

```bash
python3 -c "import re;d=open('x.pdf','rb').read();print(len(re.findall(rb'/Type\s*/Page[^s]',d)))"
```
