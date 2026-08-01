# Los vídeos de presentación — cómo se hacen

**Estado: en pausa (2026-08-01).** El proceso funciona de principio a fin y hay
un plano de referencia aprobado. Lo que falta está al final del documento.

Vídeos cortos que enseñan qué puede hacer cada hermano en la aplicación. Van
por WhatsApp (vertical) y se proyectan alguna vez en el Salón (horizontal).

**El principio:** no se animan capturas de pantalla, se anima **la aplicación
de verdad**, funcionando, con datos ficticios. Como los vídeos de producto de
Apple, que son su producto real con diseño de movimiento alrededor.

## Cómo se hace un vídeo, hoy

```bash
cd videos
node grabar.mjs              # recorre la app y graba el gesto
node suavizar.mjs informe    # 60 fps limpios
cp tomas/informe/suave.mp4 public/
npx remotion render src/index.ts Prueba out/prueba-crudo.mp4 --frames-per-second=60 --crf=14
ffmpeg -y -i out/prueba-crudo.mp4 -vf "tmix=frames=3,fps=30" -crf 15 out/prueba.mp4
```

Necesita el preview de la app levantado en el **4137** (`npm run preview`).

## Las piezas

| Fichero | Qué hace |
|---|---|
| `grabar.mjs` | Recorre la app y graba la interfaz **funcionando**. Saca los fotogramas y un `marcas.json` con qué se tocó, cuándo y **en qué coordenada**. |
| `suavizar.mjs` | De fotogramas irregulares a 60 fps limpios, interpolando el movimiento. |
| `src/marca.ts` | Colores y curvas, copiados de la aplicación. |
| `src/camara.tsx` | La cámara en espacio 3D: acercarse cambia la perspectiva, no el tamaño. |
| `src/Prueba.tsx` | El montaje del informe: planos, dedo, cerco, plano a sangre. |
| `src/Maestro.tsx` | El primer intento, con rótulos. **Superado** — se conserva solo como referencia de lo que NO queremos. |

## Tres trampas que costaron encontrar, y que no hay que volver a pisar

1. **El screencast ignora `deviceScaleFactor`.** Entrega los fotogramas al
   tamaño del viewport EN PUNTOS: salían a 402×874 y los planos cerrados
   ampliaban una imagen diminuta. `maxWidth` tampoco lo sube. La vuelta es dar
   un viewport tres veces mayor y devolver la maquetación a tamaño de móvil con
   `zoom` — la app sigue viendo 402 px y sus mismas medias queries, pero se
   pinta sobre 1206 píxeles reales.
2. **El screencast solo emite al repintar**, o sea unos 8 fps y a ráfagas.
   Reproducir esos fotogramas a ritmo fijo deforma el movimiento. Por eso se
   guarda el sello temporal de cada uno y `suavizar.mjs` remuestrea.
3. **Recargar la página rehace los datos de prueba** y vuelve a pedir
   confirmación. Nunca se navega por la dirección: se pulsa, o se va atrás.

## Lo que quedó pendiente

- **El envío del informe.** «Enviar» está deshabilitado hasta que la aplicación
  lo permite, y no se consiguió con los datos de prueba ni esperando, ni
  desplazando, ni forzando la pulsación. El vídeo termina en «guardado». Sin
  eso falta el final natural: el visto de confirmación.
- **Más capa de gráficos.** Solo existe el cerco. Faltaría un contador que se
  dibuje junto a las horas, y la animación de sincronización entre dispositivos
  (planos 7 y 8 del guión, que son compuestos y no capturas).
- **Decidir el recorte del plano a sangre.** Está a `z = 1.75`, que corta por
  los lados. Se ve intencionado, pero conviene decidirlo a propósito.
- **La voz.** El guión está escrito ([GUION_MAESTRO.md](./GUION_MAESTRO.md))
  pero sin grabar. Va **plano a plano**, un archivo por plano: así un cambio en
  la interfaz cuesta ocho segundos de audio y no setenta y cinco.
- **Los siete cortos de rol.** Solo cuando el maestro esté cerrado.

## Los siete cortos (cuando se retome)

| Vídeo | Para quién | Duración |
|---|---|---|
| Tu informe y tus asignaciones | Todo publicador | ~40 s |
| Informes y asistencia | Secretario | ~45 s |
| Programar las reuniones | Editores de reunión | ~50 s |
| Discursos y oradores | Coordinador de discursos | ~40 s |
| Exhibidores y salidas | Comité de servicio | ~45 s |
| Territorios | Comité de servicio y ancianos | ~45 s |
| Tu grupo | Superintendentes de grupo | ~35 s |

**Nadie ve más de dos:** el maestro y el suyo. El reparto sigue la misma lógica
que la Ayuda — a cada uno lo que le toca.

## Herramientas

Node 22, ffmpeg 8.1, Remotion y Playwright, todo instalado. `videos/node_modules`,
`out/`, `tomas/` y `public/` no van a Git: se regeneran.
