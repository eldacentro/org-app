import { IconButton } from '@mui/material';
import { IconDragHandle } from '@components/icons';
import { DragHandleProps } from './index.types';

/**
 * El asa para reordenar una lista. UNA sola forma en toda la app.
 *
 * ── Por qué un asa y no la fila entera ───────────────────────────────────
 *
 * Arrastrar la fila entera se pelea con el dedo: en el móvil, esa misma lista
 * casi siempre hace scroll, y el gesto de "empujar hacia abajo para ver más" y
 * el de "mover esta fila hacia abajo" son idénticos. Con un asa, el dedo
 * arrastra SOLO si empieza sobre ella (`handle=".scrollable-icon"` en el
 * `ReactSortable` de fuera) y el resto de la fila sigue haciendo scroll.
 *
 * ── Y por qué además responde a las flechas ──────────────────────────────
 *
 * Arrastrar no existe para quien usa el teclado. Antes había dos maneras de
 * reordenar en la app —arrastrar en Grupos de predicación, flechas arriba/abajo
 * en Documentos y Responsabilidades— y al unificar en arrastrar se perdía la
 * única vía de teclado que había.
 *
 * Así que el asa es un BOTÓN de verdad: se enfoca con el tabulador y, enfocada,
 * ↑ y ↓ mueven la fila. Una sola cosa en pantalla, las dos formas de usarla.
 * Es además el patrón que recomienda la guía de accesibilidad para listas
 * ordenables, y no cuesta un control extra.
 */
const DragHandle = ({ etiqueta, onSubir, onBajar, sx }: DragHandleProps) => {
  return (
    <IconButton
      // La clase la lee sortablejs desde el `handle` del ReactSortable padre.
      className="scrollable-icon"
      aria-label={`Reordenar ${etiqueta}. Usa las flechas arriba y abajo para moverlo.`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onSubir?.();
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onBajar?.();
        }
      }}
      sx={{
        // `grab` y no `pointer`: dice que esto se arrastra, no que se pulsa.
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        touchAction: 'none',
        flex: '0 0 auto',
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '-2px',
        },
        ...sx,
      }}
    >
      <IconDragHandle color="var(--ink-3)" />
    </IconButton>
  );
};

export default DragHandle;
