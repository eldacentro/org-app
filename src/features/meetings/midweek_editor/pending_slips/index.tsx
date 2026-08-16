import { useState } from 'react';
import { Box, Collapse, Stack } from '@mui/material';
import { PendingSlip } from '@services/app/pending_s89';
import { IconCheck, IconExpand } from '@components/icons';
import ActionPill from '@components/action_pill';
import Badge from '@components/badge';
import Typography from '@components/typography';
import DialogEnvio from './DialogEnvio';
import usePendingSlips from './usePendingSlips';

/**
 * Las hojitas que quedan por repartir, de esta semana en adelante.
 *
 * Va en la página de edición y no en Programas semanales a propósito: esto es
 * trabajo de quien reparte, no programa que consultar.
 *
 * Empieza plegado y enseña solo el número. Repartiendo a dos meses vista la
 * lista puede tener veinte filas, y veinte filas encima del editor esconderían
 * lo que se viene a hacer aquí. El número es lo que hay que ver todos los
 * días; el detalle, solo cuando te pones a ello.
 *
 * ── Los dos números ──────────────────────────────────────────────────────
 *
 * El titular es «por enviar», que es lo único que se puede hacer ahora mismo.
 * Las que ya salieron y esperan respuesta van debajo, en gris: son trabajo del
 * hermano, no de quien reparte. Antes había un solo número y las dos cosas
 * estaban mezcladas, así que había que acordarse de memoria de a quién ya se le
 * había mandado — que es exactamente cómo se manda dos veces, o ninguna.
 */
const PendingSlips = () => {
  const { pending, porSemana, enSemana, porEnviar, esperando } =
    usePendingSlips();

  const [open, setOpen] = useState(false);

  /**
   * La cola: una FOTO de las que quedaban por enviar al empezar, más por dónde
   * se va.
   *
   * Es una foto a propósito. Al mandar una hojita cambia el programa, y con una
   * lista viva la fila de debajo subiría bajo el dedo justo entre un hermano y
   * el siguiente. Con la foto, el orden es el que había al empezar y «siguiente»
   * significa siempre lo mismo; lo que se marque desde otro dispositivo mientras
   * tanto se verá al volver a la lista.
   */
  const [cola, setCola] = useState<typeof porEnviar>([]);
  const [indice, setIndice] = useState(0);

  const todoConfirmado = pending.length === 0;
  const quedanPorEnviar = porEnviar.length;

  const actual = cola[indice] ?? null;

  // "Parte 4 · 1-7 de septiembre": lo que ya dice la fila de la lista, para que
  // la hoja de envío no lo vuelva a calcular por su cuenta.
  const detalle = actual ? `${actual.part} · ${actual.weekLabel}` : '';

  const empezarCola = (desde?: PendingSlip) => {
    const posicion = desde
      ? porEnviar.findIndex(
          (slip) =>
            slip.weekOf === desde.weekOf && slip.assignment === desde.assignment
        )
      : 0;

    setCola(porEnviar);
    setIndice(posicion === -1 ? 0 : posicion);
  };

  const cerrarCola = () => {
    setCola([]);
    setIndice(0);
  };

  const siguiente = () => {
    // La última cierra la cola en vez de dejar un diálogo vacío. Volver a la
    // lista al terminar es la señal de que se acabó.
    if (indice + 1 >= cola.length) {
      cerrarCola();
      return;
    }

    setIndice((valor) => valor + 1);
  };

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
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
        }}
      >
        <Box
          component={todoConfirmado ? 'div' : 'button'}
          type={todoConfirmado ? undefined : 'button'}
          aria-expanded={todoConfirmado ? undefined : open}
          onClick={() => !todoConfirmado && setOpen((value) => !value)}
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: 0,
            cursor: todoConfirmado ? 'default' : 'pointer',
            userSelect: 'none',
            appearance: 'none',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            '&:focus-visible': {
              outline: '2px solid var(--accent-main)',
              outlineOffset: '4px',
              borderRadius: 'var(--shape-sm)',
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
              backgroundColor:
                todoConfirmado || quedanPorEnviar === 0
                  ? 'var(--green-secondary)'
                  : 'var(--orange-secondary)',
            }}
          >
            {todoConfirmado || quedanPorEnviar === 0 ? (
              <IconCheck width={16} height={16} color="var(--green-main)" />
            ) : (
              <Typography
                className="body-small-semibold"
                color="var(--orange-dark)"
              >
                {quedanPorEnviar}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography className="body-regular" color="var(--ink)">
              {todoConfirmado
                ? 'Todas las hojitas están confirmadas'
                : quedanPorEnviar === 0
                  ? 'Todas enviadas'
                  : quedanPorEnviar === 1
                    ? 'Queda 1 hojita por enviar'
                    : `Quedan ${quedanPorEnviar} hojitas por enviar`}
            </Typography>

            {/* Lo segundo: las que ya salieron y esperan contestación. No es
              trabajo pendiente de quien reparte, así que va en gris y debajo. */}
            {!todoConfirmado && esperando.length > 0 && (
              <Typography className="label-small-regular" color="var(--ink-2)">
                {esperando.length === 1
                  ? 'y 1 esperando respuesta'
                  : `y ${esperando.length} esperando respuesta`}
              </Typography>
            )}

            {/* Lo de la semana abierta, que es lo que se puede hacer ahora
              mismo. Solo aparece si hay una semana elegida; el total de
              arriba sigue siendo el titular. */}
            {enSemana !== null && !todoConfirmado && (
              <Typography
                className="label-small-regular"
                color={
                  enSemana.length === 0 ? 'var(--green-main)' : 'var(--ink-3)'
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
              color="var(--ink-2)"
              sx={{
                flexShrink: 0,
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform var(--motion-medium) var(--ease-spring)',
              }}
            />
          )}
        </Box>

        {/* Empezar la ronda sin desplegar nada: el trabajo de verdad no es
            mandar una hojita, son quince seguidas. `tinted` porque es una
            acción DENTRO de una tarjeta (DESIGN_SYSTEM §6.2). */}
        {quedanPorEnviar > 0 && (
          <ActionPill
            variant="tinted"
            label="Empezar"
            onClick={() => empezarCola()}
            sx={{ flexShrink: 0 }}
          />
        )}
      </Box>

      <Collapse in={open && !todoConfirmado} timeout="auto" unmountOnExit>
        <Stack sx={{ borderTop: '1px solid var(--line)' }}>
          {porSemana.map((grupo) => (
            <Box key={grupo.weekOf}>
              <Typography
                className="label-small-semibold"
                color="var(--ink-2)"
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
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '8px 16px',
                    // El ayudante va sangrado bajo el estudiante al que
                    // acompaña: la lista se lee «esta parte, y quien le ayuda».
                    paddingLeft: slip.papel === 'ayudante' ? '32px' : '16px',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      className="body-small-semibold"
                      color="var(--ink)"
                    >
                      {slip.name}
                    </Typography>

                    <Typography
                      className="label-small-regular"
                      color={
                        slip.telefono === null
                          ? 'var(--orange-dark)'
                          : 'var(--ink-2)'
                      }
                    >
                      {[
                        slip.papel === 'ayudante' ? 'ayudante' : null,
                        slip.part,
                        slip.auxClass ? 'sala auxiliar' : null,
                        // Se dice AQUÍ, con la lista delante, y no al pulsar:
                        // así se ve de un vistazo a quién hay que buscarle el
                        // número antes de ponerse.
                        slip.telefono === null ? 'sin teléfono' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </Box>

                  {slip.sent ? (
                    <Badge
                      text="Enviada"
                      color="green"
                      size="small"
                      filled={false}
                      sx={{ flexShrink: 0 }}
                    />
                  ) : (
                    // `outline` porque se repite en cada fila: rellenas serían
                    // un muro de color (DESIGN_SYSTEM §6.2).
                    <ActionPill
                      variant="outline"
                      label={slip.telefono ? 'Enviar' : 'Compartir'}
                      onClick={() => empezarCola(slip)}
                    />
                  )}
                </Box>
              ))}
            </Box>
          ))}
        </Stack>
      </Collapse>

      <DialogEnvio
        slip={actual}
        detalle={detalle}
        restantes={Math.max(cola.length - indice - 1, 0)}
        onClose={cerrarCola}
        onEnviada={siguiente}
        onSaltar={siguiente}
      />
    </Box>
  );
};

export default PendingSlips;
