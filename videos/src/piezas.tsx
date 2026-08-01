import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { color, curva, partirWordmark, seg } from './marca';

/**
 * LAS PIEZAS DEL VÍDEO.
 *
 * Tres reglas rigen todo lo de aquí, y son las que separan un vídeo de
 * producto de un tutorial:
 *
 * 1. Una idea por plano. Nunca dos cosas moviéndose a la vez.
 * 2. El rótulo entra ANTES de que se mueva la interfaz. No se puede leer y
 *    seguir un movimiento al mismo tiempo.
 * 3. El teléfono no se mueve nunca. Lo que se mueve es lo de dentro.
 */

/** Entrada estándar: aparece subiendo un poco y frena. Nunca rebota. */
const useEntrada = (retrasoSeg = 0, recorrido = 42) => {
  const frame = useCurrentFrame();
  const t = frame - seg(retrasoSeg);

  const p = interpolate(t, [0, seg(0.55)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });

  return { opacity: p, transform: `translateY(${(1 - p) * recorrido}px)` };
};

/** El fondo. Un solo color de marca con una luz muy suave arriba. */
export const Fondo: React.FC<{ claro?: boolean }> = ({ claro }) => (
  <AbsoluteFill
    style={{
      background: claro
        ? color.fondoClaro
        : `radial-gradient(120% 70% at 50% 8%, ${color.acentoOscuro} 0%, ${color.fondo} 62%)`,
    }}
  />
);

/** El logotipo de texto, con la regla de la marca: «Elda **Centro**». */
export const Wordmark: React.FC<{ nombre?: string; tam?: number }> = ({
  nombre = 'Elda Centro',
  tam = 96,
}) => {
  const { lugar, marca } = partirWordmark(nombre);
  const e = useEntrada(0.15, 26);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...e, fontSize: tam, color: color.blanco, letterSpacing: '-0.02em' }}>
        <span style={{ fontWeight: 500 }}>{lugar} </span>
        <span style={{ fontWeight: 800 }}>{marca}</span>
      </div>
    </AbsoluteFill>
  );
};

/** Un plano de solo texto. Para lo que se entiende mejor sin enseñar nada. */
export const PlanoTexto: React.FC<{ texto: string; tam?: number }> = ({ texto, tam = 62 }) => {
  const e = useEntrada(0.2, 34);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 130px' }}>
      <div
        style={{
          ...e,
          fontSize: tam,
          lineHeight: 1.22,
          fontWeight: 600,
          color: color.blanco,
          textAlign: 'center',
          letterSpacing: '-0.02em',
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

/**
 * El teléfono con una pantalla dentro.
 *
 * El marco se dibuja, no es una foto de un iPhone: así no envejece con el
 * modelo del año y pesa nada. La pantalla entra con un empuje muy corto —el
 * marco ya está colocado— porque lo que interesa es el contenido.
 */
export const Telefono: React.FC<{ captura: string; retraso?: number }> = ({
  captura,
  retraso = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame: frame - seg(retraso),
    fps,
    config: { damping: 200, mass: 0.6 },
  });

  const ANCHO = 402 * 1.62;
  const ALTO = 874 * 1.62;

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: ANCHO,
          height: ALTO,
          borderRadius: 74,
          padding: 12,
          background: 'linear-gradient(160deg, #59657d 0%, #222a38 55%, #39445a 100%)',
          boxShadow: '0 60px 140px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
          opacity: interpolate(s, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(s, [0, 1], [46, 0])}px)`,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 62,
            overflow: 'hidden',
            background: color.blanco,
          }}
        >
          <Img src={staticFile(captura)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * El rótulo de un plano, arriba. Entra ANTES que el teléfono a propósito:
 * primero se lee qué vamos a ver, después se ve.
 */
export const Rotulo: React.FC<{ texto: string }> = ({ texto }) => {
  const e = useEntrada(0.1, 30);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 148 }}>
      <div
        style={{
          ...e,
          fontSize: 66,
          fontWeight: 800,
          color: color.blanco,
          textAlign: 'center',
          letterSpacing: '-0.025em',
          padding: '0 90px',
          lineHeight: 1.15,
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

/** El subtítulo, abajo. Hace falta: media congregación lo verá en silencio. */
export const Subtitulo: React.FC<{ texto: string }> = ({ texto }) => {
  const e = useEntrada(0.25, 16);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 132 }}>
      <div
        style={{
          ...e,
          maxWidth: 880,
          fontSize: 38,
          fontWeight: 500,
          lineHeight: 1.34,
          color: color.tenue,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

export { curva };
