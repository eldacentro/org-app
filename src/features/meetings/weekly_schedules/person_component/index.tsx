import { Box } from '@mui/material';
import { PersonComponentProps } from './index.types';
import usePersonComponent from './usePersonComponent';
import Typography from '@components/typography';

const PersonComponent = (props: PersonComponentProps) => {
  const { personData } = usePersonComponent(props);
  const accentColor = props.color || 'var(--brand)';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        width: '100%',
        minHeight: '44px',
        padding: '6px 0px',
      }}
    >
      {/* Nada de `fontSize`/`fontWeight` en `sx`: las clases de tipografía son
          globales y ganan a emotion, así que aquí no hacían nada. El tamaño lo
          pone la clase. */}
      {props.label && (
        <Typography
          className="body-small-semibold"
          color="var(--grey-500)"
          sx={{ flexShrink: 0, minWidth: '95px' }}
        >
          {props.label}
        </Typography>
      )}

      {/* La caja se tiñe del color de la parte en la que está —turquesa en
          Tesoros, ámbar en Seamos mejores maestros, rojo en Nuestra vida
          cristiana—, pero a muy baja opacidad: con doce nombres en una semana,
          un tinte fuerte convierte la página en un bloque de color. Ya no
          lleva el icono de persona ni la barra de la izquierda; el color de la
          parte ya lo dice todo, y el nombre se lee mejor sin nada delante.

          Sin tooltip: repetía al pasar por encima el mismo nombre que ya está
          escrito ahí. Si el nombre no cabe, se parte en dos líneas. */}
      {personData?.name ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: 'var(--radius-l)',
            border: personData.active
              ? '1.5px solid var(--brand)'
              : `1px solid color-mix(in srgb, ${accentColor} 18%, transparent)`,
            backgroundColor: personData.active
              ? 'var(--brand-tint)'
              : `color-mix(in srgb, ${accentColor} 7%, transparent)`,
            padding: '9px 14px',
            flex: 1,
            overflow: 'hidden',
            cursor: 'default',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              justifyContent: 'center',
            }}
          >
            <Typography
              className="body-regular-semibold"
              sx={{
                minWidth: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: personData.active ? 'var(--brand-deep)' : 'var(--ink)',
                wordBreak: 'break-word',
              }}
            >
              {personData.name}
            </Typography>
            {props.showCongregation && personData.congregation && (
              <Typography
                className="label-small-regular"
                sx={{
                  color: personData.active ? 'var(--brand)' : 'var(--ink-2)',
                  mt: '2px',
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {personData.congregation}
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        /* Un hueco por asignar era una caja de borde discontinuo con una raya
           dentro. En una semana a medio repartir, esas cajas gritaban más que
           los nombres ya puestos. Ahora es texto y ya. */
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0',
            flex: 1,
            minHeight: '38px',
          }}
        >
          <Typography className="body-small-regular" color="var(--grey-350)">
            Sin asignar
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PersonComponent;
