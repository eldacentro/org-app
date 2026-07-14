import { Box } from '@mui/material';
import { PickersLayout } from '@mui/x-date-pickers/PickersLayout';
import { PickersLayoutProps } from '@mui/x-date-pickers/PickersLayout';

/**
 * Envuelve el layout por defecto de MUI X solo para agregarle, en móvil, el
 * "asa" (la barrita gris arriba) que hace que se reconozca de inmediato como
 * una hoja que sube desde abajo — el mismo lenguaje visual que usan los
 * selectores de fecha nativos de iOS/Android. En escritorio no se muestra
 * (ahí sigue siendo un menú flotante junto al campo, no una hoja).
 */
const Layout = (props: PickersLayoutProps<Date>) => {
  return (
    <>
      <Box
        sx={{
          display: 'none',
          '@media (max-width:430px)': {
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0 2px',
          },
        }}
      >
        <Box
          sx={{
            width: '36px',
            height: '4px',
            borderRadius: 'var(--radius-max)',
            backgroundColor: 'var(--accent-200)',
          }}
        />
      </Box>
      <PickersLayout {...props} />
    </>
  );
};

export default Layout;
