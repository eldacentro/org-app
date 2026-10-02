# Los iconos de la app

## De dónde sale todo

El dibujo original es **`apple-touch-icon.svg`** (fondo azul `rgb(48,108,180)`,
libro blanco). No se toca: es el que usa Safari cuando alguien añade la app a
la pantalla de inicio desde el botón de compartir.

De ahí salen, con el logo recolocado, las otras dos fuentes:

| Fuente                 | Qué lleva                                    |
| ---------------------- | -------------------------------------------- |
| `icon-maskable.svg`    | Fondo azul a sangre + logo blanco            |
| `icon-monochrome.svg`  | Solo la silueta, negra y sin fondo           |

## Por qué el logo NO va a sangre

Android no enseña el icono tal cual: le aplica una **máscara** —círculo,
cuadrado redondeado, gota— que cambia según el teléfono y el lanzador. Lo que
queda fuera se recorta.

- **Adaptativo de Android:** el lienzo es 108, pero solo se ve seguro el
  cuadrado central de 72 → el **66,7 %**.
- **`purpose: maskable` (web):** lo garantizado es el **círculo central del
  80 %** del lado.

El icono que había ocupaba el **80 % de ancho** y llegaba a las esquinas, así
que en la pantalla de inicio salía recortado y enorme. Ahora el logo mide el
**60 % de ancho** (53,6 % de alto, que conserva su proporción) y **ningún píxel
pasa del 37,5 % de radio** desde el centro — con 2,5 puntos de margen sobre el
límite del 40 %.

El **fondo sí va a sangre**: si no llegara al borde, la máscara dejaría
esquinas transparentes.

## El temático (Android 13+)

`icon-monochrome.svg` no lleva fondo y va en negro, pero **el color da igual**:
Android usa solo el canal alfa y lo pinta con el color del fondo de pantalla.
Las tres rayitas de cada página son huecos de verdad —no rectángulos blancos—,
así que se ven bien sea cual sea el color que le toque.

## Qué icono usa cada sitio

| Fichero                             | Quién lo usa                                |
| ----------------------------------- | ------------------------------------------- |
| `apple-touch-icon.png`              | iOS, pantalla de inicio                     |
| `apple-touch-icon.svg`              | Safari, al compartir → añadir a inicio      |
| `icon-192/512x512.png`              | `purpose: any` — avisos, pantalla de carga  |
| `icon-maskable-192/512x512.png`     | Android, pantalla de inicio                 |
| `icon-monochrome-192/512x512.png`   | Android 13+, iconos temáticos               |
| `icon-android-adaptive-108x108.png` | Lo mismo, declarado a 108                   |

Los `icon-192/512x512.png` van **a sangre a propósito**: nadie los enmascara y
en un aviso se ven pequeños, así que ahí interesa que el logo llene.

## Cómo regenerarlos

Hace falta `rsvg-convert` (`brew install librsvg`):

```bash
cd public/img/icon
for s in 180 192 512 1024; do
  rsvg-convert -w $s -h $s icon-maskable.svg -o icon-maskable-${s}x${s}.png
done
for s in 192 512; do
  rsvg-convert -w $s -h $s icon-monochrome.svg -o icon-monochrome-${s}x${s}.png
done
rsvg-convert -w 108 -h 108 icon-monochrome.svg -o icon-android-adaptive-108x108.png
```

Si cambias el dibujo, comprueba después que sigue dentro de la zona segura: el
radio máximo del logo tiene que quedar por debajo del 40 % del lado.

## iOS no admite icono oscuro ni Liquid Glass (comprobado 2026-10-02)

En una app **nativa** el icono se entrega como un `.icon` de Icon Composer con
sus variantes —clara, oscura, monocroma y la de cristal—, y el sistema elige.
**En una app web instalada no hay nada de eso:** la pantalla de inicio usa UNA
imagen y no hay forma de darle alternativas.

Lo comprobado, para no volver a investigarlo:

- El manifiesto solo admite `src`, `sizes`, `type` y `purpose` en cada icono.
  No existe `color_scheme` ni `icon_variants` — eso sigue siendo una propuesta.
- Las notas de WebKit de Safari 26 sí traen novedades de iconos (SVG y `data:`
  URL, también para apps web), y **no mencionan variantes** por modo claro u
  oscuro. Las de Safari 27, tampoco.
- `apple-touch-icon` no documenta ningún `media`, y la pregunta exacta en el
  foro de desarrolladores de Apple («cómo hacer que el icono de un acceso
  directo web se adapte como el de una app nativa») sigue **sin responder**.

Así que el trabajo de Icon Composer solo se aprovecha el día que haya una app
nativa de verdad. Guarda el `.icon` igualmente: es la fuente.

## Sí hay icono oscuro en iOS, y es cosa nuestra (2026-10-02)

iOS no admite variantes (arriba), pero **tampoco hace falta que las admita**:
el icono se captura EN EL MOMENTO de pulsar «Añadir a pantalla de inicio», y lo
que iOS lee entonces es el **DOM**, no el HTML que sirvió el servidor. Así que
basta con que el enlace apunte al icono bueno cuando el usuario comparte.

- `index.html` trae `<link id="apple-touch-icon" …>` **antes** del script de
  arranque, para que ese script pueda retocarlo antes de pintar nada.
- `syncHomeScreenIcon()` (`utils/common.ts`) lo pone según `data-theme`. Se
  llama desde `main.tsx` y desde el interruptor de tema, al lado de
  `syncStatusBarColor()`.
- Manda el tema de la **app**, no el del sistema: es el que se ve en pantalla.

| Tema de la app | Icono |
| --- | --- |
| claro | `apple-touch-icon.png` |
| oscuro | `apple-touch-icon-dark.png` |

El oscuro sale de la variante **Dark** de `Icons.icon` (Icon Composer), a 180.
Las variantes Clear y Tinted no sirven aquí: son efectos que el sistema compone
con el fondo de pantalla, y horneadas en un PNG plano se ven apagadas.

**El icono queda congelado** en el que hubiera al añadirlo. Cambiar de tema
después no cambia el que ya está en la pantalla de inicio: hay que quitarlo y
volver a añadirlo. Eso no es un fallo, es cómo funciona un acceso directo web.

## El icono de iOS lleva la silueta de Apple, y está bien

**iOS compone sobre NEGRO lo que sea transparente** y después recorta con su
squircle. De ahí la duda razonable: si el icono trae sus propias esquinas
redondeadas y el hueco va transparente, ¿asoma negro?

Aquí **no**. Comprobado comparando el perfil de transparencia de
`apple-touch-icon.png` con el que exporta **Icon Composer**, que es la
herramienta de Apple y dibuja la silueta oficial: **la máxima diferencia entre
las dos es de 1 px sobre 256**. Son la misma forma. Lo que iOS recorta es
exactamente lo que ya está transparente, así que no queda reborde.

> El 2026-10-02 escribí aquí lo contrario —que el icono redondeaba el 31,7 % y
> la máscara el 22,4 %, y que por eso salían esquinas negras—. **Estaba mal.**
> Comparaba dos cosas distintas: el 31,7 % es dónde empieza a haber píxel opaco
> en la primera FILA de un squircle, y el 22,4 % era un radio de esquina
> nominal. Y la simulación que lo "confirmaba" usaba una superelipse de
> exponente 5, más cuadrada que la forma real de Apple, así que el negro lo
> ponía mi propia máscara. Queda escrito para que nadie lo repita.

**Qué exportar entonces,** si algún día se cambia el dibujo: lo más seguro es
exportarlo **desde Icon Composer**, que ya da la silueta correcta, a 1024 y a
180. Si se genera por otro camino, o se respeta esa misma silueta, o se va a
sangre y sin canal alfa y que redondee iOS — lo que no vale es inventarse un
redondeo intermedio.

## Un aviso

En el teléfono, cambiar el icono **no se ve hasta reinstalar la app**. Android
se queda con el que guardó al añadirla a la pantalla de inicio. Hay que
quitarla y volver a añadirla.
