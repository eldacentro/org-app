import { Box } from '@mui/material';
import { PlanEvacuacion } from '@definition/evacuacion';
import {
  COLORES,
  EXTINTORES_GEO,
  PILARES,
  ZONAS,
  SALON_OUTLINE,
  PAREDES_INTERNAS,
  SALA_B_WALL,
  ASIENTOS,
} from './data';
import DetalleSeleccion, { Seleccion } from './DetalleSeleccion';

type Props = {
  plan: PlanEvacuacion;
  seleccion: Seleccion;
  onSelect: (seleccion: Seleccion) => void;
};

const Plano2D = ({ plan, seleccion, onSelect }: Props) => {
  const zonaSeleccionada = (equipoId: string) =>
    seleccion?.tipo === 'zona' && seleccion.equipoId === equipoId;
  const extintorSeleccionado = (id: number) =>
    seleccion?.tipo === 'extintor' && seleccion.id === id;

  const renderSeat = (x: number, y: number, key: string, rotated = false) => {
    const w = 2.8;
    const h = 2.4;
    return (
      <rect
        key={key}
        x={x - (rotated ? h : w) / 2}
        y={y - (rotated ? w : h) / 2}
        width={rotated ? h : w}
        height={rotated ? w : h}
        rx="0.6"
        fill="#E2E8F0" // Slate 200
        stroke="#CBD5E1" // Slate 300
        strokeWidth="0.3"
        filter="url(#seat-shadow)"
      />
    );
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '24px',
        overflow: 'hidden',
        backgroundColor: COLORES.fondo2D,
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.02)',
      }}
    >
      <style>
        {`
          @keyframes evac-dash-2d {
            to { stroke-dashoffset: -12; }
          }
          .evac-arrow-2d {
            stroke-dasharray: 4 3;
            animation: evac-dash-2d 0.7s linear infinite;
          }
          .evac-zone-2d, .evac-ext-2d { cursor: pointer; transition: all 0.2s; }
          .evac-zone-2d:hover { stroke-width: 1.5px; }
          .evac-ext-2d:hover circle { stroke-width: 1px; }
        `}
      </style>

      <svg
        viewBox="-5 -5 190 88.65"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <marker
            id="evac-arrowhead"
            markerWidth="5"
            markerHeight="5"
            refX="3"
            refY="2.5"
            orient="auto"
          >
            <path d="M0,0 L5,2.5 L0,5 Z" fill={COLORES.ruta} />
          </marker>
          <filter id="wall-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.08" />
          </filter>
          <filter id="seat-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" floodColor="#000" floodOpacity="0.1" />
          </filter>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. CONTORNO EXTERIOR */}
        <polygon
          points={SALON_OUTLINE.map((pt) => pt.join(',')).join(' ')}
          fill="#FFFFFF"
          stroke="#94A3B8"
          strokeWidth="0.8"
          filter="url(#wall-shadow)"
        />

        {/* 2. PAREDES INTERNAS */}
        {PAREDES_INTERNAS.map((w, idx) => (
          <rect
            key={`wall-${idx}`}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="0.6"
          />
        ))}

        {/* Tabique de Sala B */}
        <polyline
          points={SALA_B_WALL.map((pt) => pt.join(',')).join(' ')}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="0.8"
        />

        {/* Puertas Internas */}
        {/* Sala B */}
        <path d="M 56.5 34.07 A 5 5 0 0 1 51.5 34.07" fill="none" stroke="#64748B" strokeWidth="0.5" />
        <line x1="56.5" y1="34.07" x2="51.5" y2="34.07" stroke="#64748B" strokeWidth="0.8" />
        
        {/* Lobby/Auditorio */}
        <path d="M 61.29 40.52 A 6 6 0 0 1 55.29 46.52" fill="none" stroke="#64748B" strokeWidth="0.5" />
        <line x1="61.29" y1="40.52" x2="55.29" y2="46.52" stroke="#64748B" strokeWidth="0.8" />

        {/* Textos de Salas */}
        <text x="8" y="25" textAnchor="middle" fontSize="3" fill="#64748B" transform="rotate(-90 8,25)" fontWeight="500">Pasillo</text>
        <text x="21" y="8" textAnchor="middle" fontSize="2.5" fill="#64748B">Mujeres</text>
        <text x="28" y="8" textAnchor="middle" fontSize="2.5" fill="#64748B">Minusv.</text>
        <text x="41" y="8" textAnchor="middle" fontSize="2.5" fill="#64748B">Hombres</text>
        <text x="55" y="15" textAnchor="middle" fontSize="3.5" fontWeight="700" fill="#475569">Sala B</text>

        {/* Zonas Interactivas */}
        {ZONAS.map((zona) => {
          const activa = zonaSeleccionada(zona.equipoId);
          return (
            <rect
              key={zona.id}
              className="evac-zone-2d"
              onClick={() => onSelect({ tipo: 'zona', equipoId: zona.equipoId })}
              x={zona.x}
              y={zona.y}
              width={zona.w}
              height={zona.h}
              rx="2"
              fill={zona.color}
              fillOpacity={activa ? 0.2 : 0.04}
              stroke={zona.color}
              strokeWidth={activa ? 1 : 0}
            />
          );
        })}

        {/* 3. ASIENTOS */}
        {ASIENTOS.map((seat, idx) => {
          const rotated = seat.y > 50 && seat.x > 135;
          return renderSeat(seat.x, seat.y, `seat-${idx}`, rotated);
        })}

        {/* 4. PLATAFORMA */}
        <polygon
          points="157.18,30.72 157.18,0.0 180.0,0.0 180.0,37.36 162.66,37.36"
          fill="#F8FAFC"
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

        {/* 5. PILARES */}
        {PILARES.map(p => (
          <rect key={p.id} x={p.x} y={p.y} width={p.w} height={p.h} fill="#475569" rx="0.3" filter="url(#seat-shadow)" />
        ))}

        {/* 6. PUERTAS PRINCIPALES */}
        {/* A3: Entrada Doble Abajo-Izquierda */}
        <path d="M 0 52.6 A 5 5 0 0 1 5 47.6" fill="none" stroke="#64748B" strokeWidth="0.5" />
        <line x1="0" y1="52.6" x2="5" y2="47.6" stroke="#64748B" strokeWidth="1" />
        <text x="-5" y="50" fontSize="3" fill="#0F172A" fontWeight="800">A3</text>

        {/* B3: Emergencia Abajo-Derecha */}
        <path d="M 180 50.15 A 6 6 0 0 0 174 56.15" fill="none" stroke={COLORES.ruta} strokeWidth="0.5" />
        <line x1="180" y1="50.15" x2="174" y2="56.15" stroke={COLORES.ruta} strokeWidth="1" />
        <text x="183" y="54" fontSize="3" fill={COLORES.ruta} fontWeight="800">B3</text>

        {/* 7. FLECHAS Y ETIQUETAS DE ZONA */}
        <text x="55" y="28" fontSize="3" fill={COLORES.zonaA} fontWeight="800">A1</text>
        <text x="88" y="25" fontSize="3" fill={COLORES.zonaB} fontWeight="800">B2</text>
        <path d="M 85 24.2 L 81 24.2 M 93 24.2 L 97 24.2" stroke={COLORES.ruta} strokeWidth="0.6" markerEnd="url(#evac-arrowhead)" />
        <text x="130" y="48" fontSize="3" fill={COLORES.zonaB} fontWeight="800">B1</text>
        <text x="8" y="14" fontSize="3" fill={COLORES.zonaA} fontWeight="800">A2</text>

        {/* Flechas Evacuación */}
        <g filter="url(#soft-glow)">
          <path
            className="evac-arrow-2d"
            d={`M 110 50 L 170 50 L 179.68 50.15`}
            fill="none"
            stroke={COLORES.ruta}
            strokeWidth="1.2"
            markerEnd="url(#evac-arrowhead)"
          />
          <path
            className="evac-arrow-2d"
            d={`M 75 42 L 20 42 L 5 42 L 0 52.6`}
            fill="none"
            stroke={COLORES.ruta}
            strokeWidth="1.2"
            markerEnd="url(#evac-arrowhead)"
          />
        </g>

        {/* 8. EXTINTORES */}
        {EXTINTORES_GEO.map((ext) => {
          const activo = extintorSeleccionado(ext.id);
          return (
            <g
              key={ext.id}
              className="evac-ext-2d"
              onClick={() => onSelect({ tipo: 'extintor', id: ext.id })}
            >
              <circle
                cx={ext.x}
                cy={ext.y}
                r={activo ? 2.5 : 1.8}
                fill={COLORES.extintor}
                stroke="#fff"
                strokeWidth={activo ? 0.6 : 0.4}
                filter="url(#seat-shadow)"
              />
              <text
                x={ext.x}
                y={ext.y + 0.8}
                textAnchor="middle"
                fontSize="2.2"
                fontWeight="800"
                fill="#fff"
              >
                {ext.esCO2 ? 'CO₂' : ext.id}
              </text>
            </g>
          );
        })}
      </svg>
      <DetalleSeleccion
        plan={plan}
        seleccion={seleccion}
        onClose={() => onSelect(null)}
      />
    </Box>
  );
};

export default Plano2D;
