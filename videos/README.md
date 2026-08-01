# Los vídeos de presentación — cómo se hacen

Vídeos cortos que enseñan qué puede hacer cada hermano en la aplicación. Van
por WhatsApp (vertical) y se proyectan alguna vez en el Salón (horizontal).

**El principio:** no se animan capturas de pantalla, se anima **la aplicación
de verdad**, funcionando, con datos ficticios. Como los vídeos de producto de
Apple, que son su producto real con diseño de movimiento alrededor.

## Las tres piezas

1. **Sembrar** — el modo de prueba, con la congregación ficticia. Ya existe.
   Ni un nombre real sale en un vídeo que va a circular por WhatsApp.
2. **Capturar** — un guión por vídeo que recorre la aplicación sola y saca los
   fotogramas. Determinista: mismo guión, mismo resultado.
3. **Componer** — Remotion monta el marco del dispositivo, el metraje dentro,
   los rótulos, los subtítulos y las transiciones.

Al final: `npm run video -- --guion=maestro`.

## Por qué Remotion

React → MP4. El vídeo **es** código.

- Mismo lenguaje que la aplicación, así que se reutilizan sus tokens de color y
  su tipografía. La marca cuadra sola, sin ajustar nada a ojo.
- Va en Git, con su historial.
- **Cuando cambie la interfaz, se vuelve a renderizar y los vídeos se
  actualizan.** Vídeos que no caducan, que es lo que mata a los tutoriales
  grabados a mano.

After Effects daría lo mismo de bonito pero a mano, y cada rediseño obligaría a
rehacerlos uno a uno.

## La voz

Carlos graba, **plano a plano**: un archivo por plano, numerado
(`audio/maestro/01.m4a`…). Nunca los 75 segundos de una vez.

Es lo que salva la automatización: si cambia una pantalla, se vuelve a grabar
ese plano —ocho segundos— y no el vídeo entero. La duración de cada plano la
manda su audio; Remotion lo lee y coloca lo demás alrededor.

Los subtítulos se generan del mismo guión, sin transcribir nada.

## Formatos

Vertical **9:16** es el principal (WhatsApp, en el móvil). Del mismo código
sale la versión **16:9** para proyectar.

No es un reencuadre automático: los rótulos y el marco del dispositivo se
colocan distinto en cada uno. Se compone pensando en vertical y se adapta el
horizontal, no al revés.

## Estado

- [x] Guión del vídeo maestro — [GUION_MAESTRO.md](./GUION_MAESTRO.md)
- [ ] Grabar la voz del maestro (Carlos)
- [ ] Plantilla de Remotion: marco, tipografía, transiciones, punto del dedo,
      subtítulos
- [ ] Guiones de captura con automatización del navegador
- [ ] Renderizar el maestro y criticarlo
- [ ] Los siete cortos de rol

## Los siete cortos (después del piloto)

Solo cuando la plantilla del maestro esté aprobada. Cada uno hereda de ella, así
que lo único nuevo es su guión de capturas y sus rótulos.

| Vídeo | Para quién | Duración |
|---|---|---|
| Tu informe y tus asignaciones | Todo publicador | ~40 s |
| Informes y asistencia | Secretario | ~45 s |
| Programar las reuniones | Editores de reunión | ~50 s |
| Discursos y oradores | Coordinador de discursos | ~40 s |
| Exhibidores y salidas | Comité de servicio | ~45 s |
| Territorios | Comité de servicio y ancianos | ~45 s |
| Tu grupo | Superintendentes de grupo | ~35 s |

**Nadie ve más de dos:** el maestro y el suyo. Dos minutos en total. El reparto
sigue la misma lógica que la Ayuda — a cada uno lo que le toca.

## Herramientas ya disponibles

Node 22 y ffmpeg 8.1 instalados. Falta añadir Remotion y Playwright.
