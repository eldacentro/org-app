import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { Fondo, PlanoTexto, Rotulo, Subtitulo, Telefono, Wordmark } from './piezas';
import { seg } from './marca';

/**
 * EL VÍDEO MAESTRO: «Qué es Elda Centro».
 *
 * Los planos salen de GUION_MAESTRO.md y las capturas de `capturar.mjs`, que
 * recorre la aplicación de verdad. Aquí no hay ni una imagen hecha a mano.
 *
 * **De momento las duraciones son fijas.** Cuando estén grabadas las voces,
 * cada plano durará lo que dure su audio y esto se leerá de ahí; el orden y el
 * texto no cambian.
 */

type Plano = {
  id: string;
  duracion: number;
  rotulo?: string;
  texto?: string;
  captura?: string;
  /** La frase que se narra. De aquí salen también los subtítulos. */
  voz: string;
};

export const PLANOS: Plano[] = [
  {
    id: '01-apertura',
    duracion: 4,
    voz: 'Elda Centro. Toda la congregación, en el bolsillo.',
  },
  {
    id: '02-porque',
    duracion: 6.5,
    texto: 'Saber cuándo te tocaba algo era mirar el tablón, buscar un mensaje antiguo… o preguntar.',
    voz: 'Hasta ahora, saber cuándo te tocaba algo era mirar el tablón, buscar un mensaje antiguo o preguntar. Y a veces enterarse tarde.',
  },
  {
    id: '03-asignaciones',
    duracion: 6.5,
    rotulo: 'Lo tuyo, primero',
    captura: '03-asignaciones.png',
    voz: 'Ahora, al abrir la aplicación, lo primero que ves es lo tuyo: lo que tienes asignado esta semana y lo que viene.',
  },
  {
    id: '04-informe',
    duracion: 7,
    rotulo: 'El informe,\nen dos toques',
    captura: '04-informe.png',
    voz: 'El informe de predicación se envía en dos toques. Pones las horas, le das a enviar, y llega.',
  },
  {
    id: '05-programas',
    duracion: 6.5,
    rotulo: 'Las reuniones,\nal día',
    captura: '05-programas.png',
    voz: 'Los programas de las dos reuniones están siempre ahí, con quién hace cada parte.',
  },
  {
    id: '06-territorios',
    duracion: 6.5,
    rotulo: 'Territorios',
    captura: '06-territorios.png',
    voz: 'Pides un territorio desde aquí, ves el mapa, y lo devuelves cuando terminas.',
  },
  {
    id: '09-cada-uno',
    duracion: 6,
    texto: 'Cada hermano ve lo que le corresponde.',
    voz: 'Cada hermano ve lo que le corresponde. Si llevas un encargo, tienes tus herramientas; y si no, la aplicación no te enseña de más.',
  },
  {
    id: '10-cierre',
    duracion: 4.5,
    voz: 'Elda Centro. Si te atascas, tienes la Ayuda dentro.',
  },
];

/**
 * Un fundido corto entre planos.
 *
 * Corto a propósito: un fundido largo se lee como duda. Lo justo para que el
 * corte no golpee.
 */
const Fundido: React.FC<{ duracion: number; children: React.ReactNode }> = ({
  duracion,
  children,
}) => {
  const frame = useCurrentFrame();
  const total = seg(duracion);

  const opacity = interpolate(
    frame,
    [0, seg(0.35), total - seg(0.35), total],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Maestro: React.FC = () => {
  let desde = 0;

  return (
    <AbsoluteFill style={{ fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <Fondo />

      {PLANOS.map((plano) => {
        const inicio = desde;
        desde += seg(plano.duracion);

        const esPortada = plano.id === '01-apertura' || plano.id === '10-cierre';

        return (
          <Sequence
            key={plano.id}
            from={inicio}
            durationInFrames={seg(plano.duracion)}
            name={plano.id}
          >
            <Fundido duracion={plano.duracion}>
              {esPortada && <Wordmark />}
              {plano.texto && <PlanoTexto texto={plano.texto} />}
              {plano.rotulo && <Rotulo texto={plano.rotulo} />}
              {plano.captura && <Telefono captura={plano.captura} />}
              {!esPortada && !plano.texto && <Subtitulo texto={plano.voz} />}
            </Fundido>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Lo que dura el vídeo entero, en fotogramas. */
export const DURACION_TOTAL = PLANOS.reduce((t, p) => t + seg(p.duracion), 0);
