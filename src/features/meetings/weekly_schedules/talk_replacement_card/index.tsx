import { ReactNode, useState } from 'react';
import { Box, Collapse } from '@mui/material';
import { PublicTalkReplacementCongregation } from '@definition/schedules';
import { IconInfo } from '@components/icons';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';

/**
 * Lo que sustituye al discurso público, con su portada.
 *
 * Se enseña como una ficha y no como una fila más de «etiqueta: valor» porque
 * no es un dato del programa: es lo que va a pasar en la reunión, y quien lo
 * mira quiere reconocerlo de un vistazo — la portada hace ese trabajo mejor que
 * el título.
 *
 * La descripción va detrás de una «i» a propósito: es un párrafo entero y en la
 * tarjeta empujaría todo lo demás fuera de la pantalla. Quien la quiera, la
 * abre.
 */
const TalkReplacementCard = ({
  replacement,
  mostrarSustitucion = true,
  timing,
}: {
  replacement: NonNullable<PublicTalkReplacementCongregation['value']>;
  /**
   * La hora a la que empieza, si la vista la tiene.
   *
   * Va DENTRO de la tarjeta y no encima porque encima se quedaba sola sobre la
   * portada, sin nada a lo que pegarse. Aquí se pone a la izquierda del título,
   * que es donde va la hora en todas las demás partes del programa.
   */
  timing?: ReactNode;
  /**
   * Escribir «En lugar del discurso público» debajo del título.
   *
   * Hace falta donde esto sustituye a una fila que decía «Discurso público» y no
   * queda nada que lo diga —la pestaña de la visita—, y sobra donde la propia
   * banda de la sección ya lo pone en grande, que es la reunión de fin de
   * semana: allí se leía «DISCURSO PÚBLICO» y justo debajo «en lugar del
   * discurso público», lo mismo dos veces.
   */
  mostrarSustitucion?: boolean;
}) => {
  const [abierta, setAbierta] = useState(false);

  const hayDescripcion = (replacement.description ?? '').trim().length > 0;

  return (
    // Sin fondo, sin borde y sin sombra A PROPÓSITO: los dos sitios donde se usa
    // esto ya están dentro de una tarjeta, y un recuadro idéntico dentro de otro
    // es el doble anidado que el sistema de diseño prohíbe (§8). La portada
    // redondeada y el texto debajo agrupan de sobra sin pintar un marco.
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {replacement.image && (
        <Box
          component="img"
          src={replacement.image}
          alt=""
          loading="lazy"
          sx={{
            width: '100%',
            display: 'block',
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            // La redondea ella misma: ya no hay contenedor con `overflow:
            // hidden` que se la recorte.
            borderRadius: 'var(--shape-md)',
          }}
        />
      )}

      <Box
        sx={{
          padding: '8px 2px 0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        {timing}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {replacement.series_name && (
            <Typography
              className="label-small-semibold"
              color="var(--weekend-meeting)"
              sx={{ letterSpacing: '0.04em' }}
            >
              {replacement.series_name.toUpperCase()}
            </Typography>
          )}

          <Typography className="h4">{replacement.title}</Typography>

          <Typography className="label-small-regular" color="var(--ink-3)">
            {[
              mostrarSustitucion && 'En lugar del discurso público',
              replacement.duration,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Box>

        {hayDescripcion && (
          <IconButton
            onClick={() => setAbierta((previo) => !previo)}
            aria-label={abierta ? 'Ocultar de qué va' : 'Ver de qué va'}
            sx={{ flexShrink: 0, padding: '4px' }}
          >
            <IconInfo width={20} height={20} color="var(--accent-main)" />
          </IconButton>
        )}
      </Box>

      <Collapse in={abierta} unmountOnExit>
        <Typography
          className="body-small-regular"
          color="var(--ink-2)"
          sx={{ padding: '6px 2px 0' }}
        >
          {replacement.description}
        </Typography>
      </Collapse>
    </Box>
  );
};

export default TalkReplacementCard;
