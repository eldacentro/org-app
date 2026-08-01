import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Camara, curvas } from './camara';
import { color } from './marca';

/**
 * PLANO DE REFERENCIA.
 *
 * Un solo plano, hecho como debe hacerse, para decidir el lenguaje antes de
 * montar ocho vídeos con él. Lleva las cuatro cosas que separan esto de un
 * pase de diapositivas:
 *
 * 1. La pantalla está VIVA: son fotogramas de la aplicación funcionando de
 *    verdad, capturados con `grabar.mjs`. No una foto.
 * 2. La cámara se mueve en un espacio 3D: se acerca y gira un poco, así que
 *    la perspectiva cambia. No es un `scale`.
 * 3. Los materiales responden al giro: el reflejo del cristal se desplaza al
 *    contrario que la cara, y la sombra se abre al acercarse.
 * 4. El desenfoque de movimiento se añade al renderizar (ver README).
 *
 * Sin un solo rótulo: lo cuenta la voz, y lo que se ve tiene que bastar.
 */

const FPS_TOMA = 60;

/** La pantalla: una secuencia de fotogramas, no una imagen quieta. */
const Pantalla: React.FC<{ toma: string; total: number; desde?: number }> = ({
  toma,
  total,
  desde = 0,
}) => {
  const frame = useCurrentFrame();
  const i = Math.min(total - 1, desde + Math.floor((frame / 30) * FPS_TOMA));

  return (
    <Img
      src={staticFile(`tomas/${toma}/${String(i).padStart(4, '0')}.jpg`)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
};

/**
 * El teléfono.
 *
 * El marco lleva tres capas —canto, bisel y cristal— porque un solo relleno
 * plano es exactamente lo que hace que un render parezca una plantilla. El
 * reflejo del cristal se mueve al CONTRARIO que la cara: es lo que vende que
 * hay un vidrio delante y no un dibujo.
 */
const Telefono: React.FC<{ children: React.ReactNode; giroY?: number }> = ({
  children,
  giroY = 0,
}) => {
  const ANCHO = 402 * 1.55;
  const ALTO = 874 * 1.55;

  return (
    <div
      style={{
        width: ANCHO,
        height: ALTO,
        borderRadius: 78,
        padding: 11,
        transformStyle: 'preserve-3d',
        background:
          'linear-gradient(148deg, #7c8899 0%, #2a3140 26%, #1b2029 55%, #454e60 82%, #8b98aa 100%)',
        boxShadow: [
          '0 4px 10px rgba(0,0,0,0.4)',
          '0 40px 90px rgba(0,0,0,0.55)',
          '0 90px 180px rgba(0,0,0,0.45)',
          'inset 0 1px 1px rgba(255,255,255,0.35)',
        ].join(', '),
        position: 'relative',
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

        {/* El reflejo. Se desplaza al contrario que el giro. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(${112 - giroY * 3}deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0) 46%)`,
            transform: `translateX(${-giroY * 8}px)`,
          }}
        />
      </div>
    </div>
  );
};

/** Un plano: encuadre de entrada, de salida y cuánto dura. */
type Plano = {
  id: string;
  seg: number;
  desde: Parameters<typeof Camara>[0]['desde'];
  hasta: Parameters<typeof Camara>[0]['hasta'];
  /** Fotograma de la toma por el que entra este plano. */
  entra: number;
};

/**
 * El ritmo. Planos de entre 1,2 y 2,8 segundos, alternando: uno que empuja,
 * uno que respira. Mis planos de antes duraban seis segundos y medio, y eso
 * ya no es motion, es una diapositiva con música.
 */
const PLANOS: Plano[] = [
  {
    id: 'entrada',
    seg: 2.4,
    entra: 0,
    desde: { z: 0.72, y: 6, giroY: -14, giroX: 5 },
    hasta: { z: 0.92, y: 0, giroY: -5, giroX: 2 },
  },
  {
    id: 'acercar',
    seg: 1.6,
    entra: 40,
    desde: { z: 0.92, giroY: -5, giroX: 2 },
    hasta: { z: 1.7, y: 14, giroY: -2, giroX: 0 },
  },
  {
    id: 'detalle',
    seg: 2.2,
    entra: 96,
    desde: { z: 1.7, y: 14, giroY: -2 },
    hasta: { z: 2.15, y: 2, giroY: 1 },
  },
  {
    id: 'salir',
    seg: 2.6,
    entra: 168,
    desde: { z: 2.15, y: 2, giroY: 1 },
    hasta: { z: 0.86, y: 0, giroY: 7, giroX: -2 },
  },
];

const Fondo: React.FC = () => {
  const frame = useCurrentFrame();
  // El fondo se mueve MENOS que el teléfono: eso es el paralaje, y es lo que
  // da sensación de profundidad sin que nadie sepa señalarlo.
  const p = interpolate(frame, [0, 270], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 80% at ${48 + p * 6}% ${10 + p * 8}%, ${color.acentoOscuro} 0%, ${color.fondo} 58%, #070d18 100%)`,
      }}
    />
  );
};

export const Hero: React.FC = () => {
  let desde = 0;

  return (
    <AbsoluteFill style={{ fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <Fondo />

      {PLANOS.map((plano) => {
        const inicio = desde;
        const dur = Math.round(plano.seg * 30);
        desde += dur;

        return (
          <Sequence key={plano.id} from={inicio} durationInFrames={dur} name={plano.id}>
            <Corte duracion={dur}>
              <Camara desde={plano.desde} hasta={plano.hasta} duracion={dur}>
                <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Telefono giroY={plano.hasta.giroY ?? 0}>
                    <Pantalla toma="inicio" total={234} desde={plano.entra} />
                  </Telefono>
                </AbsoluteFill>
              </Camara>
            </Corte>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * El corte entre planos: seis fotogramas, no medio segundo.
 *
 * Un fundido largo se lee como duda. Aquí solo hace falta que el corte no
 * golpee; la continuidad la da que la cámara sale de donde entró la anterior.
 */
const Corte: React.FC<{ duracion: number; children: React.ReactNode }> = ({
  duracion,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6, duracion - 6, duracion], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const HERO_DURACION = PLANOS.reduce((t, p) => t + Math.round(p.seg * 30), 0);
