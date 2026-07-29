import { ReactNode } from 'react';
import { Box } from '@mui/material';
import Typography from '@components/typography';

/**
 * El nombre de quien tiene una asignación, en Programas semanales.
 *
 * SOLO CONTORNO, del color de la parte —turquesa en Tesoros, ámbar en Seamos
 * mejores maestros, rojo en Nuestra vida cristiana— con un relleno casi
 * inexistente (4 %). La versión con fondo tintado y borde marcado parecía un
 * campo de formulario, que en esta app es lo que significa una caja rellena; y
 * en un programa hay entre quince y veinticinco nombres, así que cualquier
 * cosa repetida veinte veces se convierte en la textura de la página. Un
 * contorno fino agrupa el nombre sin pesar.
 *
 * Ni icono, ni barra a la izquierda, ni salto al pasar el ratón por encima:
 * eso último sugería que se podía pulsar, y no se puede.
 *
 * Cuando la asignación es tuya manda el azul de marca sobre el color de la
 * parte: es la única señal que tiene que saltar a la vista.
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
  /** Color de la parte del programa. Pinta el contorno. */
  color?: string;
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
  color = 'var(--brand)',
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
      sx={{
        minWidth: 0,
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        borderRadius: 'var(--radius-l)',
        border: isMe
          ? '1.5px solid var(--brand)'
          : `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: isMe
          ? 'var(--brand-tint)'
          : `color-mix(in srgb, ${color} 4%, transparent)`,
        padding: '8px 14px',
      }}
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
