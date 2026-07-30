import { styled } from '@mui/system';
import { Box } from '@mui/material';
import { styledRemoveProps } from '@utils/common';

export const DoubleFieldContainer = styled(Box, {
  shouldForwardProp: (prop) => styledRemoveProps(prop, ['laptopUp']),
})<{ laptopUp: boolean }>(({ laptopUp }) => ({
  display: 'flex',
  gap: '8px',
  flexDirection: laptopUp ? 'row' : 'column',
})) as unknown as typeof Box;

export const PrimaryFieldContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  gap: '8px',
  padding: '4px 2px',
}) as unknown as typeof Box;

export const SecondaryFieldContainer = styled(Box, {
  shouldForwardProp: (prop) => styledRemoveProps(prop, ['laptopUp']),
})<{ laptopUp: boolean }>(({ laptopUp }) => ({
  flex: 1,
  maxWidth: laptopUp ? '320px' : '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  alignSelf: 'self-start',
})) as unknown as typeof Box;

/**
 * Tarjeta SIN cabecera, con el mismo marco que `MeetingSection`.
 *
 * Es para la apertura de la reunión: presidente, canción y oración. Los tres
 * van juntos porque son lo mismo —quién dirige y con qué se empieza— y sueltos
 * entre la cabecera y "Tesoros de la Biblia" parecían tres cosas sin relación.
 *
 * No lleva título a propósito: no es una parte del programa, y ponerle nombre
 * sería inventarse una.
 */
export const PlainCard = styled(Box)({
  border: '1px solid var(--line)',
  borderRadius: 'var(--shape-md)',
  backgroundColor: 'var(--card)',
  boxShadow: 'var(--small-card-shadow)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}) as unknown as typeof Box;

/** Fondo/tinte de una fila cancelada (salida de predicación, exhibidor,
 *  mes suspendido) — antes duplicado como texto literal en 3+ sitios. */
export const CANCELLED_ROW_BG = 'rgba(var(--red-main-base), 0.1)';
