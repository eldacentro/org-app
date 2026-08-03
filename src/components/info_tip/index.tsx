import React from 'react';
import { Box } from '@mui/material';
import Typography from '@components/typography';
import { IconCheckCircle, IconError, IconInfo } from '@components/icons';
import { InfoTipProps } from './types';

// 'blue' es el nombre histórico de este tono — se conserva como alias de
// 'info' para no romper a quien ya lo usaba (congregation_create, etc.).
const resolveColor = (color: InfoTipProps['color']) =>
  color === 'blue' ? 'info' : color;

// Icono por defecto por severidad, solo si el llamador no pasa el suyo. No
// hay uno para 'warning' (no existe un icono de aviso en el set — @components/icons);
// en ese caso se muestra sin icono en vez de forzar uno semánticamente incorrecto.
const DEFAULT_ICONS: Partial<Record<string, React.ReactElement>> = {
  info: <IconInfo />,
  success: <IconCheckCircle />,
  error: <IconError />,
};

const InfoTip: React.FC<InfoTipProps> = ({
  isBig,
  text,
  title,
  icon,
  color,
  sx,
  children,
}) => {
  const resolvedColor = resolveColor(color);

  const getColorStyle = () => {
    const result = {
      border: '',
      background: '',
      text: '',
      title: '',
    };

    if (resolvedColor === 'white') {
      result.border = '1px solid var(--accent-300)';
      result.background = 'var(--white)';
      result.text = 'var(--grey-400)';
      result.title = isBig ? 'var(--black)' : '';
    } else if (resolvedColor === 'info') {
      result.border = '1px dashed var(--accent-300)';
      result.background = 'var(--accent-150)';
      result.text = 'var(--accent-400)';
      result.title = isBig ? 'var(--accent-400)' : '';
    } else if (resolvedColor === 'success') {
      result.border = '1px solid var(--green-secondary)';
      result.background = 'var(--green-secondary)';
      result.text = 'var(--green-main)';
      result.title = isBig ? 'var(--green-main)' : '';
    } else if (resolvedColor === 'warning') {
      result.border = '1px solid var(--orange-secondary)';
      result.background = 'var(--orange-secondary)';
      result.text = 'var(--orange-dark)';
      result.title = isBig ? 'var(--orange-dark)' : '';
    } else if (resolvedColor === 'error') {
      result.border = '1px solid var(--red-secondary)';
      result.background = 'var(--red-secondary)';
      result.text = 'var(--red-dark)';
      result.title = isBig ? 'var(--red-dark)' : '';
    }

    return result;
  };

  const style = getColorStyle();
  const resolvedIcon = icon ?? DEFAULT_ICONS[resolvedColor ?? ''];

  return (
    <Box
      sx={{
        padding: '16px',
        borderRadius: 'var(--shape-md)',
        border: style.border,
        bgcolor: style.background,
        ...sx,
      }}
    >
      {isBig && (
        <Typography
          className="h2"
          sx={{
            color: style.title,
            marginBottom: '12px',
          }}
        >
          {title}
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          '& svg': {
            '& g, & path': {
              fill: style.text,
            },
          },
        }}
      >
        {resolvedIcon}

        {/*
          Con `text` esto es un párrafo, que es lo que es. Con `children` NO
          puede serlo: quien pasa hijos mete dentro una fila con un botón —un
          `div`—, y un `div` dentro de un `<p>` hace que el navegador CIERRE el
          párrafo por su cuenta y saque el contenido fuera. Se veía en la
          consola («cannot be a descendant of <p>») y rompía la fila del aviso
          de publicación.

          Un `span` aguanta cualquier hijo sin reordenar nada, y los estilos de
          `body-regular` y el color se conservan igual.
        */}
        <Typography
          className="body-regular"
          component={text ? 'p' : 'span'}
          sx={{ color: style.text, ...(text ? {} : { width: '100%' }) }}
        >
          {text || children}
        </Typography>
      </Box>
    </Box>
  );
};

export default InfoTip;
