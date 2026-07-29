import { ReactNode } from 'react';
import { Box } from '@mui/material';
import Typography from '@components/typography';

/**
 * El nombre de quien tiene una asignación, en Programas semanales.
 *
 * Es TEXTO Y YA: ni recuadro, ni contorno, ni fondo, ni icono. Se probaron las
 * dos versiones intermedias —fondo tintado, y luego solo contorno del color de
 * la parte— y las dos sobran: en un programa hay entre quince y veinticinco
 * nombres, así que cualquier cosa repetida veinte veces deja de ser un detalle
 * y se convierte en la textura de la página. De qué parte es lo dicen ya la
 * posición y la cabecera de la sección.
 *
 * Tampoco hay salto al pasar el ratón por encima: sugería que se podía pulsar,
 * y no se puede.
 *
 * El único color es el azul de marca cuando la asignación es tuya. Es el único
 * que tiene que significar algo, así que no compite con ningún otro.
 *
 * Existe porque este trozo estaba copiado A MANO en cuatro sitios
 * —`person_component`, Departamentos, Exhibidores y Salidas de predicación—
 * con los mismos veinte valores repetidos. Un cambio de diseño solo llegaba a
 * las pestañas que uno se acordara de tocar.
 */

type AssigneeNameProps = {
  /** Sin nombre se enseña `emptyText`. */
  name?: string;
  /** La asignación es de quien está mirando. */
  isMe?: boolean;
  /** Congregación del orador visitante, debajo del nombre. */
  congregation?: string;
  /** Qué poner cuando el puesto está por repartir. */
  emptyText?: string;
  /** Va pegado al nombre (la etiqueta "Resp." de Exhibidores). */
  trailing?: ReactNode;
  /** Recortar a una línea en vez de partir en dos (listas estrechas). */
  singleLine?: boolean;
};

const AssigneeName = ({
  name,
  isMe,
  congregation,
  emptyText = 'Sin asignar',
  trailing,
  singleLine,
}: AssigneeNameProps) => {
  if (!name) {
    return (
      <Typography className="body-regular" color="var(--grey-350)">
        {emptyText}
      </Typography>
    );
  }

  const recorte = singleLine
    ? {
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }
    : {
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
        wordBreak: 'break-word' as const,
      };

  return (
    <Box
      sx={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '8px' }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          className="body-regular-semibold"
          sx={{
            minWidth: 0,
            color: isMe ? 'var(--brand-deep)' : 'var(--ink)',
            ...recorte,
          }}
        >
          {name}
        </Typography>

        {congregation && (
          <Typography
            className="label-small-regular"
            sx={{
              color: isMe ? 'var(--brand)' : 'var(--ink-2)',
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {congregation}
          </Typography>
        )}
      </Box>

      {trailing}
    </Box>
  );
};

export default AssigneeName;
