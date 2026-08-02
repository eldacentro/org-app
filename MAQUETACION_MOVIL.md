# En el móvil, la maquetación no responde a su punto de corte

> **Estado (2 de agosto de 2026): cerrado.** La hipótesis del documento
> original —«el tema no llega a los componentes y los puntos de corte no
> significan nada»— se midió en pantalla y es **falsa**. Lo que sí estaba
> torcido era otra cosa, y está arreglado. Abajo queda todo, con lo medido,
> para que nadie vuelva a tirar del hilo equivocado.

## Lo que se buscaba

- **Exhibidores y Salidas de predicación**: el sitio salía a la derecha del
  nombre y cortado, cuando en móvil tiene que ir debajo.
- **Los botones** de «Ajustes del mes» y «Lista / Cuadrícula» aparecían
  desplazados a un lado en vez de donde deben.
- El título de la cabecera no estaba centrado respecto a la página.

## Lo que se midió (y descarta la hipótesis)

Con la app corriendo a 375 y a 402 px de ancho, mirando el DOM de verdad:

| Qué | Esperado | Medido |
|---|---|---|
| Fila del nombre y el sitio (Salidas) | `column` | **`column`** ✔ |
| `matchMedia('(min-width:600px)')` | `false` | `false` ✔ |
| CSS que emite un `sx` con puntos de corte | `@media (min-width: 480px)` | **exactamente eso** ✔ |

Es decir: **el tema SÍ llega a los componentes**, `mobile` y `tablet600`
significan lo que tienen que significar, y el `ThemeProvider` de `App.tsx`
envuelve toda la aplicación sin ningún otro tema tapándolo. El síntoma del
sitio a la derecha **no se reproduce** en el código actual.

La explicación más probable de las dos capturas —una correcta y otra no— es
que el móvil estuviera enseñando una versión vieja guardada por el service
worker de la PWA. Si vuelve a pasar: antes de tocar nada, mirar en Ajustes ▸
Acerca de qué build tiene el teléfono y compararlo con el desplegado.

## Lo que sí estaba mal, y ya está arreglado

**1. El título de la cabecera, ahora centrado de verdad.**
`src/layouts/navbar/index.tsx`. En móvil la fila usaba
`justifyContent: 'space-between'`, así que el título se colocaba donde lo
dejaban los bloques de los lados —dos iconos a la izquierda, uno o ninguno a
la derecha— y se movía de una página a otra.

Ahora son tres columnas: `minmax(62px, 1fr) auto minmax(62px, 1fr)`. Los 62
px son lo que miden los dos iconos de la izquierda, y son un SUELO: así las
dos columnas laterales valen siempre lo mismo, sobre espacio o no sobre, y el
título queda centrado respecto a la PÁGINA. Sin ese suelo, un subtítulo largo
—el de Ayuda mide 243 px— se comía el espacio libre y los lados volvían a
quedar desiguales.

Comprobado en **24 páginas**: el centro del título coincide con el centro de
la ventana con 0 px de desvío en todas, incluidas las de título largo
(«Programa de departamentos») y las que llevan subtítulo (Ayuda). De 688 px
para arriba se mantiene la fila de siempre, con el título pegado a los iconos
y los botones de acción a la derecha.

**2. Los botones de Exhibidores y Salidas.**
`src/pages/exhibitors/index.tsx` y `src/pages/predicacion_salidas/index.tsx`.
La columna de la cabecera llevaba `alignItems: 'center'`, y en dirección
columna eso centra en horizontal: **el título de sección salía centrado
mientras la fila de controles de debajo iba de borde a borde**, con el botón
pegado al margen izquierdo y el selector al derecho. Esa mezcla es lo que se
leía como «los botones están echados a un lado». Con un mes de nombre corto
cantaba muchísimo; con «agosto» casi no se notaba porque el título llenaba la
línea entera.

Ahora el título va al margen izquierdo como en el resto de la app (Programas
semanales, Territorios…), y la fila de controles queda a ras de los dos
márgenes, en línea con el título y con las tarjetas de abajo.

**2 bis. Y el hueco muerto de la franja ancha.** Alinear el título a la
izquierda destapó lo que de verdad veía Carlos: **de 480 px para arriba** la
cabecera ya estaba en modo fila, y como el título y los controles no caben en
una sola línea hasta unos 820 px (385 del título más largo + 16 + 372 del
grupo + 48 de márgenes), la fila ENVOLVÍA: el grupo bajaba a su propia línea
pero conservando su ancho natural. Resultado, a 600 px: la tarjeta llegaba a
576 y los controles se quedaban en 394. Los botones a la izquierda y 180 px de
hueco a la derecha.

Un `flexWrap` no puede arreglarlo, porque CSS no sabe si una línea ha
envuelto. El remedio es no envolver: **el corte pasa de 480 a 1200**, que es el
mismo con el que esta página ya se parte en dos columnas (`desktopUp`). Por
debajo de 1200 se apila y el grupo toma el ancho entero, con
`justifyContent: 'space-between'` para que el botón se vaya al margen
izquierdo y el selector al derecho. Comprobado a 375, 430, 480, 600, 700,
900, 1000 y 1280: el grupo empieza y acaba exactamente donde las tarjetas.

**3. Salidas se salía por el margen derecho.** Su grupo de controles se
dimensionaba por su contenido —160 del botón + 12 + 200 del selector = 372—
dentro de un hueco de 343, así que «Cuadrícula» asomaba por fuera. Antes se
repartía a los dos lados y disimulaba; al alinear a la izquierda quedó a la
vista. Se le ha puesto el mismo remedio que ya tenía Exhibidores: el grupo
toma el ancho entero en móvil y el selector cede lo justo. De paso, `flexWrap:
'wrap'`, que le faltaba: en una tablet de 520 el título se estrujaba en cuatro
renglones de dos palabras para dejar sitio a los controles.

Medido después: ambas páginas a 375 px van de 16 a 359 —los márgenes exactos
de la página— y `scrollWidth` es igual al ancho de la ventana, o sea que no
hay desbordamiento horizontal.

## El cabo suelto de color, resuelto

`--group-5` y `--group-9` no estaban «mal» en `global.css`: estaban en
desacuerdo con las fuentes de Figma, y por eso `generate:css` los giraba cada
vez que se ejecutaba.

De dónde venía. En septiembre de 2024, un commit de arriba (#2524, «export
multiple S-21 cards») regeneró el CSS y los intercambió respecto a lo que
había hasta entonces. Las fuentes se quedaron como estaban. Desde ese día la
app lleva **dos años** enseñando:

- `--group-5` → `#a8b93e` (oliva)
- `--group-9` → `#946951` (marrón)

Se ha arreglado por el lado de la FUENTE, no por el del CSS: se han
intercambiado los dos valores en `converter/css/sources/20240713-design-tokens.json`
(y en el `tokens.json` que sale de él) para que coincidan con lo que se ve.
Cuatro líneas.

Por qué así y no al revés: los hermanos llevan dos años asociando un color a
su grupo, y girarlos les cambiaría el color a los grupos 5 y 9 sin que nadie
gane nada. Al tocar la fuente, `generate:css` deja de pelearse con el archivo
y `global.css` no cambia ni un píxel.

Ojo para el futuro: si alguien vuelve a exportar las variables desde Figma, el
export traerá otra vez el orden de Figma y los girará. Habrá que arreglarlo en
Figma, o volver a hacer este mismo cambio.

## Cómo NO hacerlo

El 2 de agosto se rompieron dos cosas por cambios amplios sin comprobar en
pantalla: una regla global de diálogos que descuadró el visor de territorios, y
una restauración de `global.css` que se llevó dos tamaños de letra. Las dos se
detectaron porque Carlos las vio, no porque fallara nada.

Así que aquí: **un cambio, una comprobación en pantalla, un commit.** Y a 375 o
402 px de ancho, que es donde vive el problema.

## Contexto útil

- Para reproducir: `vite --mode test --port 4137` (ver la memoria «org-app modo
  de prueba local»). El enrutador es de **hash**, así que las páginas se abren
  con `#/exhibitors`, no con `/exhibitors`.
- `converter/css/guardia.mjs` impide que `npm run generate:css` borre colores.
  Hoy ese comando FALLA a propósito: faltan trece variables en las fuentes de
  Figma (los diez colores de grupo y tres grises). Es correcto que falle hasta
  que alguien las lleve a `converter/css/sources/`.
- `src/global/global.css` se genera. Lo escrito a mano ahí se pierde en la
  siguiente regeneración si no está también en las fuentes.
