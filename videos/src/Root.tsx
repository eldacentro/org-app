import React from 'react';
import { Composition } from 'remotion';
import { Maestro, DURACION_TOTAL } from './Maestro';
import { Hero, HERO_DURACION } from './Hero';

/**
 * Las composiciones. Vertical es la principal —así lo ve la gente en
 * WhatsApp— y del mismo código sale la horizontal para proyectar.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {/* El plano de referencia: se decide aquí el lenguaje antes de montar
        ocho vídeos con él. */}
    <Composition
      id="Hero"
      component={Hero}
      durationInFrames={HERO_DURACION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Maestro"
      component={Maestro}
      durationInFrames={DURACION_TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="MaestroHorizontal"
      component={Maestro}
      durationInFrames={DURACION_TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
