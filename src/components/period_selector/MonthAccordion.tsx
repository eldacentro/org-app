import { ReactNode, useState } from 'react';
import { Box, Collapse } from '@mui/material';
import MonthRow from './MonthRow';

/**
 * LA LISTA DE MESES DE UN SELECTOR DE SEMANAS, Y CADA MES DENTRO.
 *
 * `MonthRow` ya unificó el DIBUJO de la fila del mes, pero el andamio de
 * alrededor seguía escrito dos veces —en el panel de Reuniones y en el de
 * Departamentos— y palabra por palabra: la misma raya entre meses menos en el
 * último, el mismo acordeón de "solo un mes abierto a la vez", el mismo
 * `Collapse` y el mismo hueco de 4px entre semanas. Dos copias de un
 * comportamiento es como empiezan a separarse dos pantallas que deberían ser
 * iguales.
 *
 * Lo que NO se comparte es de dónde salen las semanas, y es a propósito: el
 * panel de Reuniones las saca del material de JW.org ya sincronizado —quitando
 * la del Memorial, distinto según sea entre semana o fin de semana, y añadiendo
 * un año de semanas futuras para poder apalabrar oradores—, mientras que el de
 * Departamentos las genera del calendario, todos los lunes de dos años. Son dos
 * ideas distintas de qué es "una semana", no dos versiones de la misma.
 */

export type MonthAccordionItem = {
  /** Clave estable del mes ("2026/08"). */
  value: string;
  /** El nombre del mes, sin año. */
  label: string;
  /** Lo que se pinta al desplegarlo: las filas de semana. */
  weeks: ReactNode;
  /** Algo a la derecha de la fila del mes (la marca de "mes completo"). */
  trailing?: ReactNode;
};

const MonthAccordion = ({
  months,
  onWeekPicked,
}: {
  months: MonthAccordionItem[];
  /**
   * Se llama al elegir una semana. El panel de Departamentos lo usa en pantalla
   * estrecha para cerrar el mes al elegir; en escritorio no se pasa y el mes se
   * queda abierto.
   */
  onWeekPicked?: () => void;
}) => {
  const [abierto, setAbierto] = useState('');

  return (
    <Box
      sx={{
        '& > .MuiBox-root': { borderBottom: '1px solid var(--line)' },
        '& > .MuiBox-root:last-child': { borderBottom: 'none' },
      }}
    >
      {months.map((month) => {
        const expanded = abierto === month.value;

        return (
          <Box key={month.value}>
            <MonthRow
              label={month.label}
              expanded={expanded}
              onToggle={() => setAbierto(expanded ? '' : month.value)}
              trailing={month.trailing}
            />

            <Collapse
              in={expanded}
              timeout="auto"
              unmountOnExit
              // Misma curva que el panel de periodo: entra frenando, sale
              // acelerando. Sin muelle, que aquí lo que se anima es la altura.
              easing={{
                enter: 'var(--ease-emphasized)',
                exit: 'var(--ease-emphasized-out)',
              }}
            >
              <Box
                onClick={onWeekPicked ? () => setAbierto('') : undefined}
                sx={{
                  pb: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {month.weeks}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
};

export default MonthAccordion;
