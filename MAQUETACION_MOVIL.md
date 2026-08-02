# En el móvil, la maquetación no responde a su punto de corte

## El síntoma

En un iPhone, varias pantallas se ven como si fueran anchas:

- **Exhibidores y Salidas de predicación**: el sitio sale A LA DERECHA del
  nombre y cortado, cuando en móvil tiene que ir DEBAJO.
- **Los botones** de «Ajustes del mes» y «Lista / Cuadrícula» aparecen
  desplazados a un lado en vez de donde deben.
- Carlos lo describió así: «obviamente creo que es algo que está afectando
  varias partes». Y tiene razón: no es de una pantalla.

Hay capturas de la MISMA pantalla en dos momentos distintos —una correcta y
otra no—, así que es algo que cambió, no algo que siempre estuvo mal.

## Lo que ya está comprobado (no repetir)

**La regla está bien escrita.** En `src/pages/exhibitors/index.tsx`, la fila
del nombre y el sitio dice:

```js
flexDirection: { mobile: 'column', tablet600: 'row' }
```

**Y los puntos de corte están bien definidos.** En `src/states/app.ts`, dentro
de `appThemeState`:

```js
keys:   ['mobile','mobile400','tablet','tablet500','tablet600',
         'tablet688','laptop','desktop','desktopLarge']
values: { mobile: 0, mobile400: 400, tablet: 480, tablet500: 500,
          tablet600: 600, tablet688: 688, laptop: 768,
          desktop: 1200, desktopLarge: 1400 }
```

Con eso, en una pantalla de ~400 px `flexDirection` TIENE que resolver a
`column`. Que salga `row` significa que **el tema no está llegando a los
componentes**, y entonces `mobile` y `tablet600` no significan nada: MUI cae a
sus puntos por defecto (`xs`, `sm`, `md`…), no reconoce esas claves y el objeto
se resuelve de cualquier manera — normalmente quedándose con el último valor,
que aquí es `row`.

**Esa es la hipótesis a confirmar o descartar antes de tocar nada.**

## Por dónde empezar

1. **Reproducirlo.** `npm run build` y el preview en el 4137, a 402 px de
   ancho. Abrir Exhibidores y mirar en las herramientas de desarrollo el
   `flex-direction` calculado de la fila del nombre. Si sale `row`, está
   reproducido sin necesidad de un móvil.

2. **Seguir el tema hasta el componente.** `appThemeState` (en
   `src/states/app.ts`) construye el tema con `createTheme`. Comprobar:
   - Que el `ThemeProvider` que lo usa envuelve de verdad a toda la
     aplicación, y que no hay un segundo `ThemeProvider` o un `createTheme`
     por defecto tapándolo más adentro.
   - Que `useBreakpoints` (en `src/hooks`) lee ESE tema y no otro.
   - Que el átomo no se está recreando en cada render: `appThemeState` es
     derivado y depende de `appFontState` y `appLangField`; si devuelve un
     objeto nuevo cada vez, MUI puede quedarse a medias.

3. **Si el tema sí llega**, entonces la hipótesis es falsa y hay que medir de
   verdad: qué ancho cree tener el contenedor. Puede ser que algún padre esté
   dando un ancho mayor que el de la ventana —un `min-width`, un `overflow` o
   una tabla— y que el punto de corte, que va por VENTANA y no por contenedor,
   sea el correcto pero la caja no.

## Lo otro, que es distinto y sí está confirmado

**El título de la cabecera no está centrado respecto a la página.** En
`src/layouts/navbar/index.tsx`, en móvil la fila usa
`justifyContent: 'space-between'`, así que el título se coloca donde lo dejan
los bloques de los lados: dos iconos a la izquierda, uno o dos a la derecha. Se
ve «casi centrado» y se desplaza según la página.

Para centrarlo de verdad hay que sacarlo del reparto: posición absoluta al 50 %
de la barra, o tres columnas con los laterales del mismo ancho reservado.

**Toca la cabecera de TODAS las páginas**, así que hay que comprobarlo página
por página, incluidas las que llevan dos botones a la derecha y las de título
largo, que es donde se rompe.

## Un cabo suelto de color

Los colores `--group-5` y `--group-9` están intercambiados entre la versión de
`global.css` del 2 de julio y la del 2 de agosto. Se dejó la de julio. Nadie ha
confirmado cuál es la buena — preguntarle a Carlos o mirar qué color tiene cada
grupo en la aplicación.

## Cómo NO hacerlo

El 2 de agosto se rompieron dos cosas por cambios amplios sin comprobar en
pantalla: una regla global de diálogos que descuadró el visor de territorios, y
una restauración de `global.css` que se llevó dos tamaños de letra. Las dos se
detectaron porque Carlos las vio, no porque fallara nada.

Así que aquí: **un cambio, una comprobación en pantalla, un commit.** Y a 402 px
de ancho, que es donde vive el problema.

## Contexto útil

- `converter/css/guardia.mjs` impide que `npm run generate:css` borre colores.
  Hoy ese comando FALLA a propósito: faltan trece variables en las fuentes de
  Figma (los diez colores de grupo y tres grises). Es correcto que falle hasta
  que alguien las lleve a `converter/css/sources/`.
- `src/global/global.css` se genera. Lo escrito a mano ahí se pierde en la
  siguiente regeneración si no está también en las fuentes.
