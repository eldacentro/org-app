import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';

/**
 * UNA CÁMARA, COMO LA DE AFTER EFFECTS.
 *
 * Lo que se lee como «esto lo ha hecho un artista» casi nunca es el objeto:
 * es la CÁMARA. Un plano cerrado no es un `scale`, es una cámara que se ha
 * acercado —y por eso la perspectiva cambia, el fondo se desplaza distinto que
 * el primer plano, y la sombra se abre—. Un `scale` plano se nota siempre.
 *
 * Aquí la escena vive en un espacio 3D real de CSS y esto mueve el punto de
 * vista: acercar (`z`), desplazar (`x`, `y`) y girar (`giroX`, `giroY`).
 * Remotion lo renderiza fotograma a fotograma, así que es determinista.
 *
 * `distancia` hace de distancia focal: más corta = más perspectiva, más
 * dramático. Como cambiar de un 85 mm a un 24 mm.
 */

export type Encuadre = {
  /** Acercamiento. 1 = plano general; 2.4 = plano muy cerrado. */
  z: number;
  /** Desplazamiento lateral y vertical, en porcentaje del alto. */
  x?: number;
  y?: number;
  /** Grados. Poquísimo: por encima de 8° deja de parecer producto. */
  giroX?: number;
  giroY?: number;
};

/** Las curvas. Todas *ease-out* o *in-out*; nada rebota. */
export const curvas = {
  /** El movimiento de cámara por defecto: arranca decidido y frena largo. */
  camara: Easing.bezier(0.16, 0.84, 0.24, 1),
  /** Para entradas de objeto: más seco. */
  entrada: Easing.bezier(0.22, 1, 0.36, 1),
  /** Para acompañar sin llamar la atención. */
  suave: Easing.bezier(0.4, 0, 0.2, 1),
};

const mezclar = (a: number, b: number, p: number) => a + (b - a) * p;

/**
 * Interpola entre dos encuadres. `p` ya viene con su curva aplicada.
 *
 * La deriva: aunque `desde` y `hasta` sean iguales, la cámara nunca se queda
 * perfectamente quieta. Un plano absolutamente inmóvil se lee como una foto;
 * medio por ciento de movimiento a lo largo del plano lo mantiene vivo sin
 * que nadie sepa por qué.
 */
export const Camara: React.FC<{
  desde: Encuadre;
  hasta: Encuadre;
  duracion: number;
  curva?: (n: number) => number;
  deriva?: boolean;
  children: React.ReactNode;
}> = ({ desde, hasta, duracion, curva = curvas.camara, deriva = true, children }) => {
  const frame = useCurrentFrame();

  const p = interpolate(frame, [0, duracion], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: curva,
  });

  const derivaZ = deriva ? interpolate(frame, [0, duracion], [0, 0.015]) : 0;

  const z = mezclar(desde.z, hasta.z, p) + derivaZ;
  const x = mezclar(desde.x ?? 0, hasta.x ?? 0, p);
  const y = mezclar(desde.y ?? 0, hasta.y ?? 0, p);
  const gx = mezclar(desde.giroX ?? 0, hasta.giroX ?? 0, p);
  const gy = mezclar(desde.giroY ?? 0, hasta.giroY ?? 0, p);

  return (
    <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: '50% 45%' }}>
      <AbsoluteFill
        style={{
          transformStyle: 'preserve-3d',
          transform: [
            `translateX(${x}%)`,
            `translateY(${y}%)`,
            `scale(${z})`,
            `rotateX(${gx}deg)`,
            `rotateY(${gy}deg)`,
          ].join(' '),
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
