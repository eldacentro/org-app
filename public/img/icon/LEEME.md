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

## Un aviso

En el teléfono, cambiar el icono **no se ve hasta reinstalar la app**. Android
se queda con el que guardó al añadirla a la pantalla de inicio. Hay que
quitarla y volver a añadirla.
