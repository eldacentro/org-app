import { useState } from 'react';
import { Box, Collapse } from '@mui/material';
import { CircuitVisitType } from '@definition/circuit_visit';
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
const ReplacementCard = ({
  replacement,
}: {
  replacement: NonNullable<CircuitVisitType['public_talk_replacement']>;
}) => {
  const [abierta, setAbierta] = useState(false);

  const hayDescripcion = (replacement.description ?? '').trim().length > 0;

  return (
    <Box
      sx={{
        borderRadius: 'var(--shape-md)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--card)',
        overflow: 'hidden',
      }}
    >
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
          }}
        />
      )}

      <Box
        sx={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
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
            {['En lugar del discurso público', replacement.duration]
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
          sx={{ padding: '0 14px 14px' }}
        >
          {replacement.description}
        </Typography>
      </Collapse>
    </Box>
  );
};

export default ReplacementCard;
