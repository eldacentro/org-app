import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Camara, curvas } from './camara';
import { color } from './marca';
import marcas from '../tomas/informe/marcas.json';

/**
 * PRUEBA REAL: el informe de predicación, de principio a fin.
 *
 * Lo que lleva, y que antes no estaba:
 *
 * - **Cortes secos.** Nada se atenúa antes de moverse. La continuidad la da
 *   que cada plano arranca donde acabó el anterior, no un fundido — un fundido
 *   antes de cada movimiento se lee como pereza.
 * - **La pantalla remuestreada al tiempo REAL.** El screencast emite cuando la
 *   página repinta, a ráfagas; aquí se busca el fotograma que tocaba en cada
 *   instante en vez de pasarlos a ritmo fijo.
 * - **Planos cerrados que apuntan a un elemento.** La cámara encuadra el botón
 *   «Sumar» porque `grabar.mjs` apuntó dónde estaba al pulsarlo. Si mañana ese
 *   botón se mueve, el encuadre se recoloca solo.
 * - **El dedo**, en la coordenada exacta del toque y en el fotograma exacto.
 */

const ANCHO_TEL = 402 * 2.07;
const ALTO_TEL = 874 * 2.07;

const TIEMPOS: number[] = (marcas as any).tiempos;
const TOTAL: number = (marcas as any).fotogramas;

type Marca = { tipo: string; nombre?: string; fotograma: number; x: number; y: number };
const MARCAS: Marca[] = (marcas as any).marcas;

const elemento = (nombre: string) => MARCAS.find((m) => m.tipo === 'elemento' && m.nombre === nombre);
const toques = MARCAS.filter((m) => m.tipo === 'toque');

/** Segundo de la toma → índice de fotograma grabado. */
const fotogramaEn = (segundo: number) => {
  let i = 0;
  while (i < TIEMPOS.length - 1 && TIEMPOS[i + 1] <= segundo) i++;
  return Math.min(TOTAL - 1, i);
};

/** El segundo en que ocurrió un toque, según su índice de fotograma. */
const segundoDe = (fotograma: number) => TIEMPOS[Math.min(fotograma, TIEMPOS.length - 1)] ?? 0;

/** La pantalla, reproducida al ritmo real de lo grabado. */
const Pantalla: React.FC<{ desdeSeg: number; velocidad?: number }> = ({
  desdeSeg,
  velocidad = 1,
}) => {
  const frame = useCurrentFrame();
  const i = fotogramaEn(desdeSeg + (frame / 30) * velocidad);

  return (
    <Img
      src={staticFile(`tomas/informe/${String(i).padStart(4, '0')}.jpg`)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
};

/**
 * El dedo.
 *
 * Un punto y un anillo que se expande, no un cursor de ratón grabado: nadie
 * usa un móvil con ratón, y verlo rompe la ilusión al instante. Aparece un pelo
 * ANTES del toque y el anillo sale al soltarlo, que es el orden real.
 */
const Dedo: React.FC<{ x: number; y: number; enFrame: number }> = ({ x, y, enFrame }) => {
  const frame = useCurrentFrame();
  const t = frame - enFrame;

  if (t < -8 || t > 26) return null;

  const entrada = interpolate(t, [-8, 0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const salida = interpolate(t, [14, 26], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const presion = interpolate(t, [0, 4, 10], [1, 0.82, 1], { extrapolateRight: 'clamp' });
  const onda = interpolate(t, [2, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: 'translate(-50%, -50%)',
        opacity: entrada * salida,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 150,
          height: 150,
          marginLeft: -75,
          marginTop: -75,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.85)',
          transform: `scale(${0.28 + onda * 1})`,
          opacity: (1 - onda) * 0.9,
        }}
      />
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.34)',
          border: '2.5px solid rgba(255,255,255,0.92)',
          transform: `scale(${presion})`,
          boxShadow: '0 6px 26px rgba(0,0,0,0.35)',
        }}
      />
    </div>
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
      borderRadius: 78,
      padding: 11,
      transformStyle: 'preserve-3d',
      background:
        'linear-gradient(148deg, #7c8899 0%, #2a3140 26%, #1b2029 55%, #454e60 82%, #8b98aa 100%)',
      boxShadow:
        '0 4px 10px rgba(0,0,0,0.4), 0 40px 90px rgba(0,0,0,0.55), 0 90px 180px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.35)',
    }}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 68,
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
          background: `linear-gradient(${112 - giroY * 3}deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 22%, rgba(255,255,255,0) 46%)`,
        }}
      />
    </div>
  </div>
);

/**
 * Encuadre que centra un punto de la PANTALLA en el cuadro.
 *
 * `x` e `y` van en tanto por uno de la pantalla del móvil. Esto los convierte
 * en el desplazamiento de cámara que hace falta para dejar ese punto en el
 * centro con el acercamiento pedido. Es lo que separa un plano cerrado de un
 * zoom: se acerca A ALGO.
 */
const haciaElemento = (x: number, y: number, z: number) => ({
  z,
  x: -(x - 0.5) * (ANCHO_TEL / 1440) * 100 * z,
  y: -(y - 0.5) * (ALTO_TEL / 2560) * 100 * z,
});

const sumar = elemento('horas')!;
const guardar = elemento('guardar')!;

const primerToque = toques[0];
const ultimoSumar = toques[3] ?? toques[toques.length - 1];
const toqueGuardar = toques[toques.length - 1];

/** Los planos. Duraciones cortas y variadas: 1,4 a 2,8 segundos. */
const PLANOS = [
  {
    id: 'presentacion',
    seg: 2.2,
    desdeSeg: 0,
    desde: { z: 0.66, y: 5, giroY: -13, giroX: 4 },
    hasta: { z: 0.8, y: 0, giroY: -6, giroX: 1.5 },
  },
  {
    id: 'entrar-al-gesto',
    seg: 1.5,
    desdeSeg: segundoDe(primerToque.fotograma) - 0.3,
    desde: { z: 0.8, giroY: -6, giroX: 1.5 },
    hasta: { ...haciaElemento(sumar.x, sumar.y, 1.85), giroY: -2 },
  },
  {
    id: 'el-toque',
    seg: 2.8,
    desdeSeg: segundoDe(primerToque.fotograma) - 0.3,
    desde: { ...haciaElemento(sumar.x, sumar.y, 1.85), giroY: -2 },
    hasta: { ...haciaElemento(sumar.x, sumar.y, 2.05), giroY: 1 },
    toques: toques.slice(0, 4),
  },
  {
    id: 'a-guardar',
    seg: 1.4,
    desdeSeg: segundoDe(ultimoSumar.fotograma),
    desde: { ...haciaElemento(sumar.x, sumar.y, 2.05), giroY: 1 },
    hasta: { ...haciaElemento(guardar.x, guardar.y, 1.9), giroY: 0 },
  },
  {
    id: 'guardar',
    seg: 1.9,
    desdeSeg: segundoDe(toqueGuardar.fotograma) - 0.35,
    desde: { ...haciaElemento(guardar.x, guardar.y, 1.9), giroY: 0 },
    hasta: { ...haciaElemento(guardar.x, guardar.y, 2.0), giroY: 2 },
    toques: [toqueGuardar],
  },
  {
    id: 'salida',
    seg: 2.4,
    desdeSeg: segundoDe(toqueGuardar.fotograma) + 0.3,
    desde: { ...haciaElemento(guardar.x, guardar.y, 2.0), giroY: 2 },
    hasta: { z: 0.78, x: 0, y: 0, giroY: 8, giroX: -2 },
  },
];

const Fondo: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 370], [0, 1], { extrapolateRight: 'clamp' });

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

        const base = segundoDe((plano as any).toques?.[0]?.fotograma ?? 0);

        return (
          // Corte seco: sin fundido. Cada plano empieza donde acabó el otro.
          <Sequence key={plano.id} from={inicio} durationInFrames={dur} name={plano.id}>
            <Camara desde={plano.desde} hasta={plano.hasta} duracion={dur} curva={curvas.camara}>
              <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Telefono giroY={plano.hasta.giroY ?? 0}>
                  <Pantalla desdeSeg={plano.desdeSeg} />

                  {(plano as any).toques?.map((t: Marca, i: number) => (
                    <Dedo
                      key={i}
                      x={t.x}
                      y={t.y}
                      enFrame={Math.round((segundoDe(t.fotograma) - plano.desdeSeg) * 30)}
                    />
                  ))}
                </Telefono>
              </AbsoluteFill>
            </Camara>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const PRUEBA_DURACION = PLANOS.reduce((t, p) => t + Math.round(p.seg * 30), 0);
