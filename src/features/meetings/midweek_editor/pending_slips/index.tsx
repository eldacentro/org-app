import { useState } from 'react';
import { Box, Collapse, Stack } from '@mui/material';
import { IconCheck, IconExpand } from '@components/icons';
import Typography from '@components/typography';
import usePendingSlips from './usePendingSlips';

/**
 * Las hojitas que quedan por entregar, de esta semana en adelante.
 *
 * Va en la página de edición y no en Programas semanales a propósito: esto es
 * trabajo de quien reparte, no programa que consultar.
 *
 * Empieza plegado y enseña solo el número. Repartiendo a dos meses vista la
 * lista puede tener veinte filas, y veinte filas encima del editor esconderían
 * lo que se viene a hacer aquí. El número es lo que hay que ver todos los
 * días; el detalle, solo cuando te pones a ello.
 */
const PendingSlips = () => {
  const { pending, porSemana, enSemana } = usePendingSlips();

  const [open, setOpen] = useState(false);

  const todoConfirmado = pending.length === 0;

  return (
    <Box
      sx={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--shape-md)',
        backgroundColor: 'var(--card)',
        overflow: 'hidden',
      }}
    >
      {/* Y con el teclado: era un `Box` con `onClick`, o sea que el aviso se
          abría con el ratón y no había forma de abrirlo tabulando. Cuando no
          queda ninguna hojita pendiente no despliega nada, así que ahí deja de
          ser un botón en vez de ser uno que no hace nada. */}
      <Box
        component={todoConfirmado ? 'div' : 'button'}
        type={todoConfirmado ? undefined : 'button'}
        aria-expanded={todoConfirmado ? undefined : open}
        onClick={() => !todoConfirmado && setOpen((value) => !value)}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          cursor: todoConfirmado ? 'default' : 'pointer',
          userSelect: 'none',
          appearance: 'none',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '-3px',
            borderRadius: 'var(--shape-md)',
          },
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: '28px',
            height: '28px',
            borderRadius: 'var(--shape-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: todoConfirmado
              ? 'var(--green-secondary)'
              : 'var(--orange-secondary)',
          }}
        >
          {todoConfirmado ? (
            <IconCheck width={16} height={16} color="var(--green-main)" />
          ) : (
            <Typography
              className="body-small-semibold"
              color="var(--orange-dark)"
            >
              {pending.length}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography className="body-regular" color="var(--ink)">
            {todoConfirmado
              ? 'Todas las hojitas están confirmadas'
              : pending.length === 1
                ? 'Queda 1 hojita por confirmar'
                : `Quedan ${pending.length} hojitas por confirmar`}
          </Typography>

          {/* Lo de la semana abierta, que es lo que se puede hacer ahora
              mismo. Solo aparece si hay una semana elegida; el total de
              arriba sigue siendo el titular. */}
          {enSemana !== null && !todoConfirmado && (
            <Typography
              className="label-small-regular"
              color={
                enSemana.length === 0 ? 'var(--green-main)' : 'var(--grey-400)'
              }
            >
              {enSemana.length === 0
                ? 'En la semana abierta no queda ninguna'
                : enSemana.length === 1
                  ? 'En la semana abierta queda 1'
                  : `En la semana abierta quedan ${enSemana.length}`}
            </Typography>
          )}
        </Box>

        {!todoConfirmado && (
          <IconExpand
            color="var(--grey-400)"
            sx={{
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition:
                'transform var(--motion-medium) var(--ease-emphasized)',
            }}
          />
        )}
      </Box>

      <Collapse in={open && !todoConfirmado} timeout="auto" unmountOnExit>
        <Stack sx={{ borderTop: '1px solid var(--line)' }}>
          {porSemana.map((grupo) => (
            <Box key={grupo.weekOf}>
              <Typography
                className="label-small-semibold"
                color="var(--grey-400)"
                sx={{
                  display: 'block',
                  padding: '8px 16px 4px',
                  backgroundColor: 'var(--accent-100)',
                }}
              >
                {grupo.weekLabel}
              </Typography>

              {grupo.slips.map((slip) => (
                <Box
                  key={slip.assignment}
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '8px 16px',
                  }}
                >
                  <Typography
                    className="body-small-semibold"
                    color="var(--ink)"
                  >
                    {slip.name}
                  </Typography>

                  <Typography
                    className="body-small-regular"
                    color="var(--ink-2)"
                    sx={{ flexShrink: 0, textAlign: 'right' }}
                  >
                    {slip.part}
                    {slip.auxClass ? ' · clase auxiliar' : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};

export default PendingSlips;
