import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Camara, curvas } from './camara';
import { color } from './marca';
import datos from '../tomas/informe/marcas.json';

/**
 * EL INFORME DE PREDICACIÓN, DE PRINCIPIO A FIN.
 *
 * Todo lo que se ve dentro del teléfono es la aplicación funcionando de
 * verdad, grabada por `grabar.mjs` y suavizada a 60 por `suavizar.mjs`. No hay
 * ni una imagen dibujada a mano ni una coordenada escrita a ojo: la cámara
 * encuadra los botones donde el grabador los encontró.
 */

const TIEMPOS: number[] = (datos as any).tiempos;

type Marca = { tipo: string; nombre?: string; fotograma: number; x: number; y: number };
const MARCAS: Marca[] = (datos as any).marcas;

const elemento = (n: string) => MARCAS.find((m) => m.tipo === 'elemento' && m.nombre === n);
const toques = MARCAS.filter((m) => m.tipo === 'toque');
const segundoDe = (f: number) => TIEMPOS[Math.min(f, TIEMPOS.length - 1)] ?? 0;

/** Relación de la pantalla del móvil. */
const PROPORCION = 874 / 402;

/** El alto del teléfono dentro del cuadro de 2560. */
const ALTO_TEL = 1880;
const ANCHO_TEL = ALTO_TEL / PROPORCION;

/** La grabación, a 60 y ya suavizada. */
const Grabacion: React.FC<{ desdeSeg: number }> = ({ desdeSeg }) => (
  <OffthreadVideo
    src={staticFile('suave.mp4')}
    startFrom={Math.max(0, Math.round(desdeSeg * 60))}
    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    muted
  />
);

/**
 * El dedo: presión y onda.
 *
 * Nada de cursor de ratón grabado — nadie usa un móvil con ratón, y verlo
 * rompe la ilusión al instante. Entra un poco antes del toque y la onda sale
 * al soltar, que es el orden real de un dedo sobre un cristal.
 */
const Dedo: React.FC<{ x: number; y: number; en: number; escala?: number }> = ({
  x,
  y,
  en,
  escala = 1,
}) => {
  const t = useCurrentFrame() - en;
  if (t < -9 || t > 28) return null;

  const entra = interpolate(t, [-9, 0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sale = interpolate(t, [15, 28], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const presion = interpolate(t, [0, 4, 11], [1, 0.8, 1], { extrapolateRight: 'clamp' });
  const onda = interpolate(t, [2, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `translate(-50%,-50%) scale(${escala})`,
        opacity: entra * sale,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 190,
          height: 190,
          margin: '-95px 0 0 -95px',
          borderRadius: '50%',
          border: '4px solid rgba(255,255,255,0.9)',
          transform: `scale(${0.26 + onda})`,
          opacity: (1 - onda) * 0.85,
        }}
      />
      <div
        style={{
          width: 86,
          height: 86,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          border: '3px solid rgba(255,255,255,0.95)',
          transform: `scale(${presion})`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
};

/**
 * CAPA DE GRÁFICOS: el cerco que señala.
 *
 * Lo que en After Effects se haría con una forma animada. Un rectángulo
 * redondeado que se dibuja alrededor de lo que importa —el trazo va
 * apareciendo, no aparece de golpe— y se va solo. Dirige la mirada sin una
 * palabra, que es de lo que se trata cuando no hay rótulos.
 */
const Cerco: React.FC<{
  x: number;
  y: number;
  ancho: number;
  alto: number;
  desde: number;
  dura: number;
}> = ({ x, y, ancho, alto, desde, dura }) => {
  const t = useCurrentFrame() - desde;
  if (t < 0 || t > dura) return null;

  const dibujo = interpolate(t, [0, 22], [0, 1], { extrapolateRight: 'clamp' });
  const sale = interpolate(t, [dura - 14, dura], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        left: `${(x - ancho / 2) * 100}%`,
        top: `${(y - alto / 2) * 100}%`,
        width: `${ancho * 100}%`,
        height: `${alto * 100}%`,
        overflow: 'visible',
        opacity: sale,
      }}
    >
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        rx="16"
        fill="none"
        stroke={color.acento}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - dibujo}
      />
    </svg>
  );
};

const Telefono: React.FC<{ giroY?: number; children: React.ReactNode }> = ({
  giroY = 0,
  children,
}) => (
  <div
    style={{
      width: ANCHO_TEL,
      height: ALTO_TEL,
      borderRadius: 96,
      padding: 13,
      transformStyle: 'preserve-3d',
      background:
        'linear-gradient(148deg, #7c8899 0%, #2a3140 26%, #1b2029 55%, #454e60 82%, #8b98aa 100%)',
      boxShadow:
        '0 5px 12px rgba(0,0,0,0.4), 0 50px 110px rgba(0,0,0,0.55), 0 110px 210px rgba(0,0,0,0.45), inset 0 1.5px 1.5px rgba(255,255,255,0.35)',
    }}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 84,
        overflow: 'hidden',
        background: '#fff',
        position: 'relative',
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(${112 - giroY * 3}deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 22%, rgba(255,255,255,0) 46%)`,
        }}
      />
    </div>
  </div>
);

/**
 * PLANO A SANGRE: la pantalla sin teléfono, llenando el cuadro.
 *
 * Hacía falta variedad de escala. Todo el vídeo era «el teléfono en el aire»,
 * y un montaje que no cambia de tamaño de plano cansa. Aquí se quita el marco
 * y se entra en el contenido: es el equivalente a un primerísimo plano.
 */
const ASangre: React.FC<{
  desdeSeg: number;
  x: number;
  y: number;
  z: number;
  children?: React.ReactNode;
}> = ({ desdeSeg, x, y, z, children }) => {
  // En píxeles, sin porcentajes anidados. La primera versión mezclaba
  // porcentajes de tres cajas distintas y el encuadre salía descentrado y con
  // el cerco fuera de sitio.
  const ancho = 1440 * z;
  const alto = ancho * PROPORCION;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#fff' }}>
      <div
        style={{
          position: 'absolute',
          width: ancho,
          height: alto,
          left: 720 - x * ancho,
          top: 1280 - y * alto,
        }}
      >
        <Grabacion desdeSeg={desdeSeg} />
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Centra un punto de la pantalla en el cuadro con el acercamiento pedido. */
const hacia = (x: number, y: number, z: number) => ({
  z,
  x: -(x - 0.5) * (ANCHO_TEL / 1440) * 100 * z,
  y: -(y - 0.5) * (ALTO_TEL / 2560) * 100 * z,
});

const horas = elemento('horas')!;
const guardar = elemento('guardar')!;
const t0 = segundoDe(toques[0].fotograma);
const tUltimoMas = segundoDe(toques[3]?.fotograma ?? toques[0].fotograma);
const tGuardar = segundoDe(toques[toques.length - 1].fotograma);

type Plano = {
  id: string;
  seg: number;
  desdeSeg: number;
  desde?: any;
  hasta?: any;
  toques?: Marca[];
  cerco?: { x: number; y: number; ancho: number; alto: number; desde: number; dura: number };
  aSangre?: { x: number; y: number; z: number };
};

/** Duraciones de 1,3 a 2,6 s, y alternando escala de plano. */
const PLANOS: Plano[] = [
  {
    id: 'presentacion',
    seg: 2.1,
    desdeSeg: 0,
    desde: { z: 0.62, y: 5, giroY: -13, giroX: 4 },
    hasta: { z: 0.76, y: 0, giroY: -6, giroX: 1.5 },
  },
  {
    id: 'entrar',
    seg: 1.3,
    desdeSeg: Math.max(0, t0 - 1.1),
    desde: { z: 0.76, giroY: -6, giroX: 1.5 },
    hasta: { ...hacia(horas.x, horas.y, 1.7), giroY: -2 },
  },
  // A sangre: el contador ocupando todo el cuadro mientras sube.
  {
    id: 'las-horas',
    seg: 2.6,
    desdeSeg: Math.max(0, t0 - 0.35),
    aSangre: { x: 0.5, y: horas.y, z: 1.75 },
    toques: toques.slice(0, 4),
    cerco: { x: 0.5, y: horas.y, ancho: 0.86, alto: 0.048, desde: 6, dura: 64 },
  },
  {
    id: 'salir-a-guardar',
    seg: 1.5,
    desdeSeg: tUltimoMas,
    desde: { ...hacia(horas.x, horas.y, 1.9), giroY: 1 },
    hasta: { ...hacia(guardar.x, guardar.y, 1.55), giroY: 0 },
  },
  {
    id: 'guardar',
    seg: 1.9,
    desdeSeg: Math.max(0, tGuardar - 0.4),
    desde: { ...hacia(guardar.x, guardar.y, 1.55), giroY: 0 },
    hasta: { ...hacia(guardar.x, guardar.y, 1.72), giroY: 2 },
    toques: [toques[toques.length - 1]],
  },
  {
    id: 'salida',
    seg: 2.4,
    desdeSeg: tGuardar + 0.35,
    desde: { ...hacia(guardar.x, guardar.y, 1.72), giroY: 2 },
    hasta: { z: 0.74, x: 0, y: 0, giroY: 8, giroX: -2 },
  },
];

const Fondo: React.FC = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 350], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 80% at ${47 + p * 7}% ${9 + p * 9}%, ${color.acentoOscuro} 0%, ${color.fondo} 56%, #060b15 100%)`,
      }}
    />
  );
};

export const Prueba: React.FC = () => {
  let desde = 0;

  return (
    <AbsoluteFill style={{ fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <Fondo />

      {PLANOS.map((plano) => {
        const inicio = desde;
        const dur = Math.round(plano.seg * 30);
        desde += dur;

        const dedos = (plano.toques ?? []).map((t, i) => (
          <Dedo
            key={i}
            x={t.x}
            y={t.y}
            en={Math.round((segundoDe(t.fotograma) - plano.desdeSeg) * 30)}
            escala={plano.aSangre ? plano.aSangre.z * 0.55 : 1}
          />
        ));

        return (
          <Sequence key={plano.id} from={inicio} durationInFrames={dur} name={plano.id}>
            {plano.aSangre ? (
              <ASangre desdeSeg={plano.desdeSeg} {...plano.aSangre}>
                {dedos}
                {plano.cerco && <Cerco {...plano.cerco} />}
              </ASangre>
            ) : (
              <Camara desde={plano.desde} hasta={plano.hasta} duracion={dur} curva={curvas.camara}>
                <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Telefono giroY={plano.hasta?.giroY ?? 0}>
                    <Grabacion desdeSeg={plano.desdeSeg} />
                    {dedos}
                  </Telefono>
                </AbsoluteFill>
              </Camara>
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const PRUEBA_DURACION = PLANOS.reduce((t, p) => t + Math.round(p.seg * 30), 0);
