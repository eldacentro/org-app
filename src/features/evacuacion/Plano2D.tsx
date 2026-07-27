import { memo } from 'react';
import { Box } from '@mui/material';
import {
  COLORES,
  EXTINTORES_GEO,
  PILARES,
  PUESTOS,
  SALIDAS,
  SALON_OUTLINE,
  PAREDES_INTERNAS,
  SALA_B_WALL,
} from './data';
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

const MURO = '#CBD5E1';
const TENUE = '#64748B';

/** Todo lo que no depende de la selección: se dibuja una vez y no se repinta. */
const PlanoBase = memo(function PlanoBase() {
  return (
    <>
      <polygon
        points={SALON_OUTLINE.map((pt) => pt.join(',')).join(' ')}
        fill="#FFFFFF"
        stroke="#94A3B8"
        strokeWidth="0.8"
      />

      {PAREDES_INTERNAS.map((pared, idx) => (
        <rect
          key={`wall-${idx}`}
          x={pared.x}
          y={pared.y}
          width={pared.w}
          height={pared.h}
          fill="#F8FAFC"
          stroke={MURO}
          strokeWidth="0.6"
        />
      ))}

      <polyline
        points={SALA_B_WALL.map((pt) => pt.join(',')).join(' ')}
        fill="none"
        stroke={MURO}
        strokeWidth="0.8"
      />

      {/* Puertas interiores */}
      <path d="M 56.5 34.07 A 5 5 0 0 1 51.5 34.07" fill="none" stroke={TENUE} strokeWidth="0.5" />
      <line x1="56.5" y1="34.07" x2="51.5" y2="34.07" stroke={TENUE} strokeWidth="0.8" />
      <path d="M 61.29 40.52 A 6 6 0 0 1 55.29 46.52" fill="none" stroke={TENUE} strokeWidth="0.5" />
      <line x1="61.29" y1="40.52" x2="55.29" y2="46.52" stroke={TENUE} strokeWidth="0.8" />

      {/* Plataforma */}
      <polygon
        points="157.18,30.72 157.18,0.0 180.0,0.0 180.0,37.36 162.66,37.36"
        fill="#F1F5F9"
        stroke="#E2E8F0"
        strokeWidth="0.8"
      />
      <text
        x="168"
        y="18"
        textAnchor="middle"
        fontSize="4"
        fontWeight="700"
        fill="#94A3B8"
        transform="rotate(90 168,18)"
      >
        PLATAFORMA
      </text>

      {PILARES.map((pilar) => (
        <rect
          key={pilar.id}
          x={pilar.x}
          y={pilar.y}
          width={pilar.w}
          height={pilar.h}
          fill="#475569"
          rx="0.3"
        />
      ))}

      {/* Rótulos de las dependencias */}
      <text x="8" y="25" textAnchor="middle" fontSize="3" fill={TENUE} transform="rotate(-90 8,25)" fontWeight="500">Pasillo</text>
      <text x="21" y="8" textAnchor="middle" fontSize="2.5" fill={TENUE}>Mujeres</text>
      <text x="28" y="8" textAnchor="middle" fontSize="2.5" fill={TENUE}>Minusv.</text>
      <text x="41" y="8" textAnchor="middle" fontSize="2.5" fill={TENUE}>Hombres</text>
    </>
  );
});

const Plano2D = ({ seleccion, onSelect }: Props) => {
  const activar = (nueva: Seleccion) => onSelect(nueva);

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
      <svg
        viewBox="-7 -6 194 92"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
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
    </Box>
  );
};

export default Plano2D;
