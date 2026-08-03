import { Box } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import Typography from '@components/typography';

type LastModifiedInfoProps = {
  updatedAt: string;
  lastModifiedBy: string;
};

/**
 * «Última actualización» — y quién ve cuánto.
 *
 * A un anciano o a un administrador le sirve el dato entero: la hora exacta y
 * el nombre de quien lo tocó es lo que permite ir y preguntarle. Al resto de la
 * congregación eso no le resuelve nada, y de paso señala a un hermano por su
 * nombre cada vez que alguien abre la página.
 *
 * Fuera de ese círculo se queda solo la FECHA, que es lo único que contesta a
 * la pregunta que se hace todo el mundo: ¿esto está al día?
 */
const LastModifiedInfo = ({
  updatedAt,
  lastModifiedBy,
}: LastModifiedInfoProps) => {
  const { t } = useAppTranslation();

  const { isElder } = useCurrentUser();

  // Antes hacía falta el nombre para pintar la línea. Ya no: sin nombre sigue
  // habiendo fecha, y la fecha es justo lo que le importa a quien no es
  // anciano.
  if (!updatedAt) return null;

  const date = new Date(updatedAt);

  const conDetalle = isElder && lastModifiedBy;

  const texto = conDetalle
    ? `${date.toLocaleString()} (${lastModifiedBy})`
    : date.toLocaleDateString();

  return (
    <Box sx={{ mt: 1, mb: 1, opacity: 0.7 }}>
      <Typography className="label-small-regular" color="var(--grey-400)">
        {`${t('tr_lastUpdate', 'Última actualización')}: ${texto}`}
      </Typography>
    </Box>
  );
};

export default LastModifiedInfo;
