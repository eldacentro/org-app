import { Box } from '@mui/material';
import { PersonComponentProps } from './index.types';
import usePersonComponent from './usePersonComponent';
import AssigneeName from '../assignee_name';
import Typography from '@components/typography';

/**
 * Una fila "puesto: quién". La etiqueta a la izquierda en gris pequeño, el
 * nombre a la derecha en tinta. Nada más — el porqué está en `AssigneeName`.
 *
 * `props.color` (el color de la parte del programa) ya no pinta nada aquí: se
 * quedó sin uso al quitar el recuadro del nombre. Sigue en las props porque lo
 * pasan una veintena de llamadas y limpiarlas es un cambio aparte.
 */
const PersonComponent = (props: PersonComponentProps) => {
  const { personData } = usePersonComponent(props);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '16px',
        width: '100%',
        padding: '6px 0px',
      }}
    >
      {/* Nada de `fontSize`/`fontWeight` en `sx`: las clases de tipografía son
          globales y ganan a emotion, así que aquí no hacían nada. El tamaño lo
          pone la clase. */}
      {props.label && (
        <Typography
          className="label-small-regular"
          color="var(--grey-400)"
          sx={{ flexShrink: 0, minWidth: '95px' }}
        >
          {props.label}
        </Typography>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AssigneeName
          name={personData?.name}
          isMe={personData?.active}
          congregation={
            props.showCongregation ? personData?.congregation : undefined
          }
        />
      </Box>
    </Box>
  );
};

export default PersonComponent;
