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

## La regla que SÍ importa: el icono de iOS va a sangre y sin transparencia

**iOS compone sobre NEGRO lo que sea transparente**, y después recorta con su
squircle. Si el icono trae sus propias esquinas redondeadas y el hueco va
transparente, hay que comparar los dos redondeos — y el de iOS es menos
redondo de lo que parece:

| | Redondeo |
| --- | --- |
| Squircle de iOS | ~22,4 % del lado (40 px en 180) |
| `apple-touch-icon.png` de ahora | **31,7 %** del lado (57 px en 180) |

Como el del icono es MAYOR, su esquina transparente no cae entera dentro de lo
que iOS recorta: **queda un reborde negro en las cuatro esquinas**. Son 1.708
píxeles totalmente transparentes (y 2.264 no opacos) de 32.400. Medido sobre el
fichero, no estimado.

Por eso el icono de Android se ve limpio y el de iOS no: el de Android va a
sangre (`icon-maskable.svg`, fondo hasta el borde) y el de iOS lleva su propia
silueta recortada.

**Qué exportar entonces,** venga de Icon Composer o de donde sea:

- Cuadrado completo, **sin esquinas redondeadas propias** y **sin canal alfa**.
  El redondeo lo pone iOS.
- 180×180 para `apple-touch-icon.png`. Un 1024×1024 como maestro no sobra.
- Opaco de verdad: lo que quede translúcido se verá negro, no blanco.

Y recuerda lo de siempre: en el teléfono el icono no cambia hasta quitar la app
de la pantalla de inicio y volver a añadirla.

## Un aviso

En el teléfono, cambiar el icono **no se ve hasta reinstalar la app**. Android
se queda con el que guardó al añadirla a la pantalla de inicio. Hay que
quitarla y volver a añadirla.
