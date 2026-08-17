import { useState } from 'react';
import { Box, Collapse, Stack } from '@mui/material';
import { PendingSlip } from '@services/app/pending_s89';
import { IconCheck, IconExpand, IconShare } from '@components/icons';
import ActionPill from '@components/action_pill';
import Typography from '@components/typography';
import { useConfirm } from '@components/confirm_dialog';
import AssignmentConfirmed from '@features/meetings/weekly_schedules/assignment_confirmed';
import { displaySnackNotification } from '@services/states/app';
import { fmtDiaLargo } from '@utils/nombres_fecha';
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
  /**
   * Las que se han saltado en esta ronda.
   *
   * Solo para poder decir al terminar cuántas quedaron sin mandar: saltar no
   * escribe nada en el programa, a propósito.
   */
  const [saltadas, setSaltadas] = useState<Set<string>>(new Set());

  const { confirm, ConfirmDialogNode } = useConfirm();

  const todoConfirmado = pending.length === 0;
  const quedanPorEnviar = porEnviar.length;

  const actual = cola[indice] ?? null;

  const clave = (slip: { weekOf: string; assignment: string }) =>
    `${slip.weekOf}|${slip.assignment}`;

  /**
   * Cuántas de esta ronda siguen SIN MANDAR, sin contar la de delante.
   *
   * Se cuenta contra la lista viva de pendientes, no contra la posición en la
   * cola. Antes era `cola.length - indice - 1`, y eso hacía que saltar a alguien
   * bajara el número: decía «quedan 4» cuando en realidad seguían quedando 5,
   * porque la saltada no se había mandado. El número tiene que decir lo que
   * queda por hacer, no por dónde vas.
   */
  const restantes = cola.filter(
    (slip) =>
      clave(slip) !== (actual ? clave(actual) : '') &&
      porEnviar.some((pendiente) => clave(pendiente) === clave(slip))
  ).length;

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
    setSaltadas(new Set());
  };

  /**
   * Volver a mandar una que ya salió, avisando antes.
   *
   * Se pregunta porque el hermano ya tiene su hojita: mandarla otra vez no
   * rompe nada, pero recibir dos veces lo mismo hace dudar de si la primera
   * valía. Y se dice QUIÉN la mandó, que es lo que de verdad se quiere saber —
   * si fue uno mismo y se le olvidó, o si otro ya se ocupó.
   */
  const reenviar = async (slip: (typeof pending)[number]) => {
    const quien = slip.sentBy ? `La mandó ${slip.sentBy}` : 'Ya se mandó';
    const cuando = slip.sentAt
      ? ` el ${fmtDiaLargo(slip.sentAt.slice(0, 10).replace(/-/g, '/'))}`
      : '';

    const seguro = await confirm({
      title: 'Esta hojita ya se mandó',
      message: `${quien} a ${slip.name}${cuando}. ¿Se la vuelves a mandar?`,
      confirmLabel: 'Volver a mandarla',
    });

    if (!seguro) return;

    // Una ronda de una sola: se está reenviando ESTA, no empezando el reparto.
    setCola([slip]);
    setIndice(0);
    setSaltadas(new Set());
  };

  const siguiente = (saltada = false) => {
    const estaClave = cola[indice] ? clave(cola[indice]) : null;

    if (saltada && estaClave) {
      // Saltar NO marca nada: la hojita sigue pendiente y sigue en la lista de
      // abajo. Lo único que hace es pasar a la siguiente para no cortar la
      // ronda por alguien a quien se le va a decir en persona.
      setSaltadas((valor) => new Set(valor).add(estaClave));
    }

    // La última cierra la cola en vez de dejar un diálogo vacío. Volver a la
    // lista al terminar es la señal de que se acabó.
    if (indice + 1 >= cola.length) {
      // La clave viaja como argumento porque `setSaltadas` de arriba todavía no
      // ha llegado al estado: leer `saltadas` aquí dejaría fuera justo la
      // última, que es la que se acaba de saltar.
      terminarCola(saltada ? estaClave : null);
      return;
    }

    setIndice((valor) => valor + 1);
  };

  /**
   * Cerrar la ronda diciendo qué se quedó sin mandar.
   *
   * Sin esto, saltar a tres hermanos y llegar al final se veía igual que
   * haberlos mandado a todos: la cola desaparecía y nada decía que quedaban
   * tres. Están en la lista, sí, pero hay que acordarse de mirarla.
   */
  const terminarCola = (ultimaSaltada: string | null) => {
    const todas = new Set(saltadas);

    if (ultimaSaltada) todas.add(ultimaSaltada);

    const saltadasEnRonda = cola.filter(
      (slip) =>
        todas.has(clave(slip)) &&
        porEnviar.some((pendiente) => clave(pendiente) === clave(slip))
    ).length;

    cerrarCola();

    if (saltadasEnRonda === 0) return;

    displaySnackNotification({
      header: 'Ronda terminada',
      message:
        saltadasEnRonda === 1
          ? 'Queda 1 hojita que te has saltado. Sigue en la lista, sin mandar.'
          : `Quedan ${saltadasEnRonda} hojitas que te has saltado. Siguen en la lista, sin mandar.`,
      severity: 'success',
    });
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
              trabajo pendiente de quien reparte, así que va en gris y debajo.
              La MISMA palabra que la fila —«por confirmar»— para que el número
              de arriba y el tic de abajo se lean como la misma cosa. */}
            {!todoConfirmado && esperando.length > 0 && (
              <Typography className="label-small-regular" color="var(--ink-2)">
                {esperando.length === 1
                  ? 'y 1 por confirmar'
                  : `y ${esperando.length} por confirmar`}
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
                  <Box sx={{ minWidth: 0, flex: 1 }}>
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
                        slip.telefono === null && !slip.sent
                          ? 'sin teléfono'
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </Box>

                  {slip.sent ? (
                    <Box
                      sx={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {/* Volver a mandarla es raro, así que va de icono y no
                          de botón con texto: lo que se hace a diario en esta
                          fila es marcar el tic. Sigue preguntando antes. */}
                      <Box
                        component="button"
                        type="button"
                        onClick={() => reenviar(slip)}
                        aria-label={`Volver a mandar la hojita de ${slip.name}`}
                        sx={{
                          display: 'flex',
                          appearance: 'none',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          // El dibujo mide 20, así que el área se estira sin
                          // mover nada (DESIGN_SYSTEM §2.5a). La fila no lleva
                          // `overflow`, así que aquí el `::after` sí llega.
                          position: 'relative',
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            inset: '-14px',
                          },
                          '&:focus-visible': {
                            outline: '2px solid var(--accent-main)',
                            outlineOffset: '4px',
                            borderRadius: 'var(--shape-full)',
                          },
                        }}
                      >
                        <IconShare
                          width={20}
                          height={20}
                          color="var(--ink-3)"
                        />
                      </Box>

                      {/* El MISMO tic que en el programa, con la misma función
                          detrás: marcarlo aquí es marcarlo allí. Lo que cambia
                          es la frase — aquí ya se sabe que la hojita salió, así
                          que lo útil es el estado en que se ha quedado.
                          En un ayudante no se dibuja solo: no confirma nada, y
                          `useAssignmentConfirmed` ya lo sabe. */}
                      <AssignmentConfirmed
                        week={slip.weekOf}
                        assignment={slip.assignment}
                        withLabel
                        textos={{
                          pendiente: 'Por confirmar',
                          confirmado: 'Confirmada',
                        }}
                        sx={{ marginTop: 0 }}
                      />
                    </Box>
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
        restantes={restantes}
        onClose={cerrarCola}
        onEnviada={() => siguiente()}
        onSaltar={() => siguiente(true)}
      />

      {ConfirmDialogNode}
    </Box>
  );
};

export default PendingSlips;
