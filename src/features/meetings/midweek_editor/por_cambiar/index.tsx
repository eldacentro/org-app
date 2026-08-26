import { useState } from 'react';
import { Box, Collapse, Stack } from '@mui/material';
import { IconExpand, IconRefreshSchedule } from '@components/icons';
import Typography from '@components/typography';
import usePorCambiar from './usePorCambiar';

/**
 * Las partes que hay que cambiar, de esta semana en adelante.
 *
 * Va aquí, en la página de edición, y no en Programas semanales: esto es
 * trabajo de quien reparte, no programa que consultar. Mismo sitio y mismo
 * dibujo que la tira de hojitas pendientes de al lado, para que se lean como lo
 * que son —dos listas de lo que queda por hacer— y no como dos inventos
 * distintos.
 *
 * Empieza plegada y enseña solo el número, por lo mismo que aquella: el número
 * es lo que hay que ver todos los días, el detalle solo cuando te pones.
 *
 * Y no sale cuando no hay nada. Una tira que dice «0 por cambiar» ocupa una
 * línea todos los días del año para no decir nada.
 */
const PorCambiar = () => {
  const { partes } = usePorCambiar();

  const [abierta, setAbierta] = useState(false);

  if (partes.length === 0) return null;

  return (
    <Box
      sx={{
        borderRadius: 'var(--shape-md)',
        border: '1px solid var(--orange-main)',
        backgroundColor: 'var(--orange-light)',
        padding: '10px 14px',
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={abierta}
        onClick={() => setAbierta((valor) => !valor)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setAbierta((valor) => !valor);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <IconRefreshSchedule color="var(--orange-dark)" />

        <Typography
          className="body-regular"
          color="var(--orange-dark)"
          sx={{ flex: 1 }}
        >
          {partes.length === 1
            ? 'Hay 1 asignación por cambiar'
            : `Hay ${partes.length} asignaciones por cambiar`}
        </Typography>

        <IconExpand
          color="var(--orange-dark)"
          sx={{
            transform: abierta ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-medium) var(--ease-standard)',
          }}
        />
      </Box>

      <Collapse in={abierta} unmountOnExit>
        <Stack spacing="10px" sx={{ paddingTop: '12px' }}>
          {partes.map((parte) => (
            <Box key={`${parte.weekOf}-${parte.assignment}`}>
              <Typography className="body-small-semibold" color="var(--ink)">
                {parte.nombre}
              </Typography>

              {/* Qué parte, qué semana y en qué sala: es lo que hace falta para
                  ir a arreglarlo sin tener que buscarlo. */}
              <Typography
                className="label-small-regular"
                color="var(--grey-400)"
              >
                {[
                  parte.parte,
                  parte.ayudante ? 'ayudante' : null,
                  parte.salaB ? 'Sala B' : null,
                  parte.semana,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>

              {/* Quién lo sabe. Sin esto, lo primero que se hace al ver una
                  fila es preguntarle al hermano algo que ya está hablado. */}
              {parte.by && (
                <Typography
                  className="label-small-regular"
                  color="var(--grey-350)"
                >
                  {`Lo marcó ${parte.by}`}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};

export default PorCambiar;
