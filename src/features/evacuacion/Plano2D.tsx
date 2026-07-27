import { memo, PointerEvent, useCallback, useRef, useState, WheelEvent } from 'react';
import { Box } from '@mui/material';
import Typography from '@components/typography';
import { IconAdd } from '@components/icons';
import { COLORES, EXTINTORES_GEO, PUESTOS, SALIDAS } from './data';
import { PLANO_BASE_SVG, PLANO_TRANSFORM } from './plano_base';
import { BLOQUES_ASIENTOS } from './asientos';
import { Seleccion } from './DetalleSeleccion';

/**
 * Plano del Salón del Reino.
 *
 * Dos cosas gobiernan este archivo:
 *
 * 1. RENDIMIENTO. La versión anterior iba a trompicones en muchos móviles, y
 *    no era por el tamaño: era por los efectos. Un `filter` de sombra SVG
 *    aplicado a CADA UNO de los asientos, otro a las paredes, un
 *    `feGaussianBlur` sobre las flechas y una animación de `stroke-dashoffset`
 *    infinita que repinta sin parar aunque nadie mire. Aquí no hay ni un
 *    filtro ni una animación: sombras y brillos se dan por perdidos a cambio
 *    de que el plano se abra al instante en un teléfono viejo, que es cuando
 *    de verdad hace falta.
 *
 * 2. TODO SE PUEDE TOCAR. Antes solo respondían las dos zonas. Ahora responde
 *    cada puesto, cada salida, cada extintor y cada bloque de asientos, y cada
 *    uno cuenta lo que el plan dice de él.
 *
 * El dibujo que no cambia va en un componente memoizado aparte: seleccionar
 * algo no vuelve a dibujar las paredes ni los asientos del salón entero.
 */

type Props = {
  seleccion: Seleccion;
  onSelect: (seleccion: Seleccion) => void;
};

const TENUE = '#64748B';
// Los pictogramas de los aseos van en un gris más claro que el trazo del
// plano: identifican la sala, no compiten con ella. A tamaño completo se
// comían el dibujo del propio aseo.
const SUAVE = '#A9B4C4';

/**
 * Pictograma de aseo, dibujado en las coordenadas del plano.
 *
 * La figura clásica de señalización: cabeza redonda y cuerpo — falda para el
 * de mujeres, tronco y piernas para el de hombres. Dibujarla a mano en vez de
 * traer un icono del catálogo permite que escale con el plano y no dependa de
 * ninguna fuente ni traducción.
 */
const Pictograma = ({
  tipo,
  x,
  y,
}: {
  tipo: 'mujeres' | 'hombres' | 'adaptado';
  x: number;
  y: number;
}) => {
  if (tipo === 'adaptado') {
    return (
      <g
        transform={`translate(${x}, ${y}) scale(0.58)`}
        fill={SUAVE}
        aria-hidden
      >
        <circle cx="-0.3" cy="-2.7" r="0.95" />
        {/* Tronco y brazo hacia el aro, y la rueda: la silueta de siempre. */}
        <path
          d="M-0.9,-1.5 L0.1,-1.5 L0.1,0.9 L2,0.9 L2,1.9 L-0.9,1.9 Z"
          />
        <circle
          cx="0.35"
          cy="2.1"
          r="2"
          fill="none"
          stroke={SUAVE}
          strokeWidth="0.55"
        />
        <path d="M2.1,3.2 L3.4,3.2 L3.4,4.1 L1.9,4.1 Z" />
      </g>
    );
  }

  return (
    <g
      transform={`translate(${x}, ${y}) scale(0.58)`}
      fill={SUAVE}
      aria-hidden
    >
      <circle cx="0" cy="-2.6" r="1.05" />
      {tipo === 'mujeres' ? (
        <>
          <path d="M0,-1.3 L2,2.5 L-2,2.5 Z" />
          <rect x="-1.15" y="2.5" width="0.75" height="1.7" rx="0.3" />
          <rect x="0.4" y="2.5" width="0.75" height="1.7" rx="0.3" />
        </>
      ) : (
        <>
          <rect x="-1.35" y="-1.3" width="2.7" height="3.3" rx="0.55" />
          <rect x="-1.25" y="2" width="0.95" height="2.2" rx="0.35" />
          <rect x="0.3" y="2" width="0.95" height="2.2" rx="0.35" />
        </>
      )}
    </g>
  );
};

/** Todo lo que no depende de la selección: se dibuja una vez y no se repinta. */
const PlanoBase = memo(function PlanoBase() {
  return (
    <>
      {/* Fondo del salón, para que el dibujo no quede sobre el color de la
          página en las zonas sin relleno. */}
      <rect x="-1" y="-1" width="182" height="80.65" fill="#FFFFFF" rx="0.5" />

      {/* El plano original, con su transformación a las coordenadas del plan.
          Va como marcado en bruto porque es un dibujo cerrado que no cambia. */}
      {/* Cada elemento trae SU grosor (muro grueso, tabique medio, mobiliario
          fino): esa es la jerarquía del plano. El grupo solo fija que el trazo
          no engorde al ampliar. */}
      <g
        transform={PLANO_TRANSFORM}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ vectorEffect: 'non-scaling-stroke' }}
        dangerouslySetInnerHTML={{ __html: PLANO_BASE_SVG }}
      />

      {/* Los tres aseos, con pictograma en vez de rótulo.
          El texto se solapaba con el dibujo, obligaba a escribirlo en vertical
          para que cupiera y solo se leía ampliando. Un pictograma se entiende
          de un vistazo, ocupa lo mismo a cualquier escala y no hay que
          traducirlo. Se dibujan aquí y no con un icono del catálogo porque
          tienen que vivir dentro del plano, en sus coordenadas.

          De izquierda a derecha, tal y como está el salón: mujeres (los dos
          inodoros de la izquierda), el adaptado —el del cuartito de la
          limpieza dentro— y hombres. La franja estrecha que los une es el
          pasillo de acceso a los tres, no un aseo: por eso no lleva nada. */}
      <Pictograma tipo="mujeres" x={7} y={9} />
      <Pictograma tipo="adaptado" x={18.5} y={9} />
      <Pictograma tipo="hombres" x={40} y={9} />

      <text x="52" y="46" textAnchor="middle" fontSize="3.2" fill={TENUE} fontWeight="700">Sala B</text>
      <text x="168" y="18" textAnchor="middle" fontSize="4" fontWeight="700" fill="#94A3B8" transform="rotate(90 168,18)">PLATAFORMA</text>
    </>
  );
});

/** Encuadre completo del plano. */
const VISTA_COMPLETA = { x: -7, y: -6, w: 194, h: 92 };
const ZOOM_MAX = 6;

const Plano2D = ({ seleccion, onSelect }: Props) => {
  // Zoom y desplazamiento. Se hace moviendo el viewBox del SVG en vez de con
  // transformaciones CSS: el dibujo se rasteriza a la escala nueva, así que
  // ampliar deja los textos y las líneas NÍTIDOS en vez de pixelados, y no
  // cuesta nada — es el mismo dibujo, recortado.
  const [vista, setVista] = useState(VISTA_COMPLETA);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const movido = useRef(false);

  const zoomActual = VISTA_COMPLETA.w / vista.w;

  /** Amplía o reduce manteniendo fijo un punto (el del dedo o el centro). */
  const zoom = useCallback((factor: number, foco?: { x: number; y: number }) => {
    setVista((actual) => {
      const nuevoAncho = Math.min(
        VISTA_COMPLETA.w,
        Math.max(VISTA_COMPLETA.w / ZOOM_MAX, actual.w / factor)
      );
      const escala = nuevoAncho / actual.w;
      const nuevoAlto = actual.h * escala;

      const fx = foco?.x ?? actual.x + actual.w / 2;
      const fy = foco?.y ?? actual.y + actual.h / 2;

      // Sin dejar que el plano se escape de la vista.
      const x = Math.min(
        Math.max(fx - (fx - actual.x) * escala, VISTA_COMPLETA.x),
        VISTA_COMPLETA.x + VISTA_COMPLETA.w - nuevoAncho
      );
      const y = Math.min(
        Math.max(fy - (fy - actual.y) * escala, VISTA_COMPLETA.y),
        VISTA_COMPLETA.y + VISTA_COMPLETA.h - nuevoAlto
      );

      return { x, y, w: nuevoAncho, h: nuevoAlto };
    });
  }, []);

  /** Coordenadas del plano bajo un punto de la pantalla. */
  const aPlano = (clientX: number, clientY: number) => {
    const caja = svgRef.current?.getBoundingClientRect();
    if (!caja) return null;

    return {
      x: vista.x + ((clientX - caja.left) / caja.width) * vista.w,
      y: vista.y + ((clientY - caja.top) / caja.height) * vista.h,
    };
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const foco = aPlano(event.clientX, event.clientY);
    zoom(event.deltaY < 0 ? 1.2 : 1 / 1.2, foco ?? undefined);
  };

  const onPointerDown = (event: PointerEvent) => {
    movido.current = false;
    arrastre.current = { x: event.clientX, y: event.clientY, vx: vista.x, vy: vista.y };
  };

  const onPointerMove = (event: PointerEvent) => {
    const inicio = arrastre.current;
    const caja = svgRef.current?.getBoundingClientRect();
    if (!inicio || !caja) return;

    const dx = ((event.clientX - inicio.x) / caja.width) * vista.w;
    const dy = ((event.clientY - inicio.y) / caja.height) * vista.h;

    // Un temblor de dos píxeles no es arrastrar: si no, tocar un extintor
    // con el dedo se comería la selección.
    if (Math.abs(event.clientX - inicio.x) > 3 || Math.abs(event.clientY - inicio.y) > 3) {
      movido.current = true;
    }
    if (!movido.current) return;

    setVista((actual) => ({
      ...actual,
      x: Math.min(
        Math.max(inicio.vx - dx, VISTA_COMPLETA.x),
        VISTA_COMPLETA.x + VISTA_COMPLETA.w - actual.w
      ),
      y: Math.min(
        Math.max(inicio.vy - dy, VISTA_COMPLETA.y),
        VISTA_COMPLETA.y + VISTA_COMPLETA.h - actual.h
      ),
    }));
  };

  const soltar = () => {
    arrastre.current = null;
  };

  const activar = (nueva: Seleccion) => {
    // Al terminar un arrastre no se selecciona nada: se estaba moviendo el
    // plano, no señalando.
    if (movido.current) return;
    onSelect(nueva);
  };

  const teclado = (nueva: Seleccion) => (event: { key: string }) => {
    if (event.key === 'Enter' || event.key === ' ') activar(nueva);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        backgroundColor: COLORES.fondo2D,
        border: '1px solid var(--line)',
      }}
    >
      <style>
        {`
          /* El navegador pinta un aro azul enorme alrededor de un <g> con
             tabIndex en cuanto se pulsa. Se quita el de ratón y se conserva
             uno discreto para quien navega con el teclado. */
          .evac-hit:focus { outline: none; }
          .evac-hit:focus-visible { outline: 2px solid var(--accent-main); outline-offset: 2px; }
        `}
      </style>

      <svg
        ref={svgRef}
        viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={soltar}
        onPointerLeave={soltar}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor: zoomActual > 1 ? 'grab' : 'default',
        }}
      >
        <PlanoBase />

        {/* Bloques de asientos: se tocan enteros, no asiento a asiento */}
        {BLOQUES_ASIENTOS.map((bloque) => {
          const sel: Seleccion = { tipo: 'bloque', bloqueId: bloque.id };
          const activo =
            seleccion?.tipo === 'bloque' && seleccion.bloqueId === bloque.id;

          return (
            <g
              key={bloque.id}
              className="evac-hit"
              role="button"
              tabIndex={0}
              aria-label={`${bloque.nombre}, ${bloque.asientos.length} asientos`}
              style={{ cursor: 'pointer' }}
              onClick={() => activar(sel)}
              onKeyDown={teclado(sel)}
            >
              {bloque.asientos.map(([x, y], idx) => (
                <rect
                  key={idx}
                  x={x - 1.4}
                  y={y - 1.2}
                  width="2.8"
                  height="2.4"
                  rx="0.6"
                  fill={activo ? bloque.color : '#E2E8F0'}
                  fillOpacity={activo ? 0.55 : 1}
                  stroke={activo ? bloque.color : '#CBD5E1'}
                  strokeWidth="0.3"
                />
              ))}
            </g>
          );
        })}

        {/* Salidas */}
        {SALIDAS.map((salida) => {
          const sel: Seleccion = { tipo: 'salida', salidaId: salida.id };
          const activa =
            seleccion?.tipo === 'salida' && seleccion.salidaId === salida.id;
          const color = salida.esEmergencia ? COLORES.ruta : COLORES.zonaA;
          const fuera = salida.x === 0 ? -1 : 1;

          return (
            <g
              key={salida.id}
              className="evac-hit"
              role="button"
              tabIndex={0}
              aria-label={`${salida.nombre}, ${salida.calle}`}
              style={{ cursor: 'pointer' }}
              onClick={() => activar(sel)}
              onKeyDown={teclado(sel)}
            >
              {/* Zona tocable generosa: en un móvil, un dedo no acierta una línea */}
              <rect
                x={salida.x + (fuera < 0 ? -6 : -1)}
                y={salida.y - 6}
                width="7"
                height="12"
                fill="transparent"
              />
              <line
                x1={salida.x}
                y1={salida.y - 4}
                x2={salida.x}
                y2={salida.y + 4}
                stroke={color}
                strokeWidth={activa ? 2.4 : 1.6}
                strokeLinecap="round"
              />
              <path
                d={`M ${salida.x + fuera * 1.5} ${salida.y} L ${salida.x + fuera * 4.5} ${salida.y}`}
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d={`M ${salida.x + fuera * 5.6} ${salida.y} l ${-fuera * 1.8} -1.4 l 0 2.8 Z`}
                fill={color}
              />
            </g>
          );
        })}

        {/* Puestos de los equipos de evacuación */}
        {PUESTOS.map((puesto) => {
          const sel: Seleccion = {
            tipo: 'puesto',
            equipoId: puesto.equipoId,
            posicion: puesto.posicion,
          };
          const activo =
            seleccion?.tipo === 'puesto' &&
            seleccion.posicion === puesto.posicion;
          const color =
            puesto.equipoId === 'evacuacion-a' ? COLORES.zonaA : COLORES.zonaB;

          return (
            <g
              key={puesto.posicion}
              className="evac-hit"
              role="button"
              tabIndex={0}
              aria-label={`Puesto ${puesto.posicion}`}
              style={{ cursor: 'pointer' }}
              onClick={() => activar(sel)}
              onKeyDown={teclado(sel)}
            >
              <circle
                cx={puesto.x}
                cy={puesto.y}
                r={activo ? 4.2 : 3.4}
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="0.7"
              />
              <text
                x={puesto.x}
                y={puesto.y + 1.1}
                textAnchor="middle"
                fontSize="3"
                fontWeight="800"
                fill="#FFFFFF"
              >
                {puesto.posicion}
              </text>
            </g>
          );
        })}

        {/* Extintores */}
        {EXTINTORES_GEO.map((ext) => {
          const sel: Seleccion = { tipo: 'extintor', id: ext.id };
          const activo =
            seleccion?.tipo === 'extintor' && seleccion.id === ext.id;

          return (
            <g
              key={ext.id}
              className="evac-hit"
              role="button"
              tabIndex={0}
              aria-label={`Extintor ${ext.id}`}
              style={{ cursor: 'pointer' }}
              onClick={() => activar(sel)}
              onKeyDown={teclado(sel)}
            >
              <circle cx={ext.x} cy={ext.y} r="4" fill="transparent" />
              <circle
                cx={ext.x}
                cy={ext.y}
                r={activo ? 2.6 : 2}
                fill={COLORES.extintor}
                stroke="#FFFFFF"
                strokeWidth="0.5"
              />
              <text
                x={ext.x}
                y={ext.y + 0.8}
                textAnchor="middle"
                fontSize="2.2"
                fontWeight="800"
                fill="#FFFFFF"
              >
                {ext.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Controles de zoom. En un móvil el salón entero cabe en 300 px de
          ancho: sin poder acercarse, los rótulos y los números no se leen. */}
      <Box
        sx={{
          position: 'absolute',
          left: '10px',
          bottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '3px',
          borderRadius: 'var(--radius-max)',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--small-card-shadow)',
          '& > button': {
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-max)',
            border: 'none',
            appearance: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-2)',
            transition: 'background-color 0.15s, color 0.15s',
            '&:hover': { backgroundColor: 'var(--accent-150)', color: 'var(--ink)' },
            '&:disabled': { opacity: 0.35, cursor: 'default' },
          },
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label="Alejar"
          disabled={zoomActual <= 1.01}
          onClick={() => zoom(1 / 1.5)}
        >
          <Box sx={{ width: 13, height: 1.5, borderRadius: 1, backgroundColor: 'currentColor' }} />
        </Box>

        <Box
          component="button"
          type="button"
          aria-label="Ver el plano entero"
          disabled={zoomActual <= 1.01}
          onClick={() => setVista(VISTA_COMPLETA)}
          sx={{ minWidth: '40px' }}
        >
          <Typography className="label-small-semibold" color="inherit">
            {Math.round(zoomActual * 100)}%
          </Typography>
        </Box>

        <Box
          component="button"
          type="button"
          aria-label="Acercar"
          disabled={zoomActual >= ZOOM_MAX - 0.01}
          onClick={() => zoom(1.5)}
        >
          <IconAdd color="currentColor" width={16} height={16} />
        </Box>
      </Box>
    </Box>
  );
};

export default Plano2D;
