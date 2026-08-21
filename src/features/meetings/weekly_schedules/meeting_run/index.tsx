import { useState } from 'react';
import { Box } from '@mui/material';
import {
  IconArrowBack,
  IconEdit,
  IconPlay,
  IconRefresh,
} from '@components/icons';
import Button from '@components/button';
import IconButton from '@components/icon_button';
import { useConfirm } from '@components/confirm_dialog';
import Typography from '@components/typography';
import useMidweekRun from './useMidweekRun';
import MeetingRunSummary from './run_summary';
import NoteDialog from './note_dialog';

/** Segundos a «m:ss», siempre en positivo. */
const reloj = (segundos: number) => {
  const total = Math.abs(Math.round(segundos));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Seguir la reunión: la barra que se queda abajo mientras dura.
 *
 * Está pegada con `sticky` y no con `fixed` a propósito. La barra de acciones de
 * la aplicación tuvo que acabar anclándose por arriba y congelando la altura de
 * la ventana porque en el iPhone instalado como aplicación, cualquier cosa
 * anclada con `fixed`/`bottom` se mueve sola: WebKit sigue calculando si tiene
 * que enseñar u ocultar la barra de Safari aunque ahí no haya ninguna. Una caja
 * `sticky` no sufre eso, porque no se saca del flujo de la página.
 */
const MeetingRunBar = ({
  week,
  dataView,
}: {
  week: string;
  dataView: string;
}) => {
  const {
    disponible,
    esAnciano,
    esPresidente,
    soloLectura,
    quienLaLleva,
    enHorario,
    run,
    parts,
    info,
    parteActual,
    transcurrido,
    restante,
    esperando,
    presentando,
    horaInicio,
    desfase,
    empezar,
    siguiente,
    atras,
    reiniciar,
    empezarParte,
    tomarControl,
    anotar,
    descartar,
  } = useMidweekRun({ week, dataView });

  const { confirm, ConfirmDialogNode } = useConfirm();

  const [notaAbierta, setNotaAbierta] = useState(false);
  const [notaDe, setNotaDe] = useState<string | null>(null);

  // Un publicador no ve barra ninguna. Lo suyo son los relojitos del programa,
  // que se pintan solos desde `PartTiming` con lo que publica quien la lleva.
  if (!disponible || !esAnciano) return null;

  // Sin nada empezado, solo se ofrece el día de la reunión y a su hora.
  if (!run) {
    if (!enHorario) return null;

    return (
      <Box
        sx={{
          position: 'sticky',
          bottom: 'calc(var(--bottom-bar-space, 0px) + 12px)',
          zIndex: 5,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={empezar}
          className="active-press"
          sx={{
            pointerEvents: 'auto',
            appearance: 'none',
            font: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            cursor: 'pointer',
            borderRadius: 'var(--shape-full)',
            border: '1px solid var(--accent-200)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <IconPlay width={18} height={18} color="var(--accent-main)" />
          <Typography
            className="label-small-semibold"
            color="var(--accent-main)"
          >
            {esPresidente ? 'Empezar presidencia' : 'Seguir la reunión'}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (run.finishedAt) {
    const parteNota = parts.find((part) => part.key === notaDe);

    return (
      <>
        <MeetingRunSummary
          run={run}
          parts={parts}
          info={info}
          onReopen={atras}
          onDiscard={descartar}
          onNote={setNotaDe}
          soloLectura={soloLectura}
        />

        {/* Terminada la reunión también se puede apuntar: es cuando de verdad
            hay tiempo de escribir, y todavía te acuerdas. */}
        {parteNota && !soloLectura && (
          <NoteDialog
            open
            label={info[parteNota.key]?.label ?? 'Esta parte'}
            person={info[parteNota.key]?.person}
            value={run.notes?.[parteNota.key]}
            onClose={() => setNotaDe(null)}
            onSave={(texto) => {
              anotar(parteNota.key, texto);
              setNotaDe(null);
            }}
          />
        )}
      </>
    );
  }

  const pasado = !!parteActual && restante < 0;
  const previsto = parteActual ? parteActual.seconds : 0;
  const avance =
    presentando || previsto === 0 ? 0 : Math.min(1, transcurrido / previsto);

  const actual = parteActual ? info[parteActual.key] : undefined;

  /**
   * De qué parte se apunta la nota.
   *
   * Mientras se presenta la siguiente, de la que ACABA de terminar: es
   * justamente cuando quien preside quiere apuntar algo del estudiante que se
   * baja de la plataforma, y cuando está dando el consejo. Con la parte en
   * marcha, de esa.
   */
  const parteNotable =
    presentando && run.index > 0 ? parts[run.index - 1] : parteActual;

  const notaActual = parteNotable ? run.notes?.[parteNotable.key] : undefined;

  const tieneNota = (notaActual?.length ?? 0) > 0;

  // Corto a propósito: en un móvil esta línea comparte sitio con el nombre de
  // quien tiene la parte, y «La reunión va 2 minutos por delante» se partía en
  // tres renglones.
  //
  // Pulsado antes de la hora, todavía no hay desfase que contar: lo único útil
  // que se puede decir es a qué hora arranca.
  // «va 1 min antes» no se entendía: ¿antes de qué? Retraso y adelanto sí se
  // entienden solos, y son las palabras que ya usa cualquiera hablando de una
  // reunión.
  const estado = esperando
    ? `empieza a las ${horaInicio}`
    : desfase === 0
      ? 'en hora'
      : desfase > 0
        ? `${desfase} min de retraso`
        : `${-desfase} min de adelanto`;

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 'calc(var(--bottom-bar-space, 0px) + 12px)',
        zIndex: 5,
      }}
    >
      {/* Presentando y en marcha tienen que distinguirse de un vistazo, no
          leyendo: de pie en la plataforma no se lee. Presentando, la tarjeta va
          teñida de azul y con el borde de acento; en marcha es blanca como el
          resto de la página. */}
      <Box
        sx={{
          borderRadius: 'var(--shape-lg)',
          border: `1px solid ${presentando ? 'var(--accent-350)' : 'var(--line)'}`,
          backgroundColor: presentando ? 'var(--accent-100)' : 'var(--card)',
          boxShadow: 'var(--shadow-md)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          transition:
            'background-color var(--motion-medium) var(--ease-standard), border-color var(--motion-medium) var(--ease-standard)',
        }}
      >
        {/* Cuánto lleva la parte que está sonando. Se pone naranja al pasarse,
            que es el único momento en que hay que hacer algo. */}
        <Box
          sx={{
            height: '3px',
            borderRadius: 'var(--shape-full)',
            backgroundColor: presentando ? 'transparent' : 'var(--grey-200)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${Math.round(avance * 100)}%`,
              borderRadius: 'var(--shape-full)',
              backgroundColor: pasado
                ? 'var(--orange-main)'
                : 'var(--accent-main)',
              transition: 'width var(--motion-medium) linear',
            }}
          />
        </Box>

        {/* El qué arriba y el quién debajo, cada uno en su línea.
            La barra está pegada abajo, así que un título largo la hace crecer
            hacia ARRIBA: no empuja nada ni tapa el botón. Dos renglones como
            mucho — a partir de ahí es leer, no mirar de reojo. */}
        {presentando && (
          <Typography
            className="label-small-semibold"
            color="var(--accent-dark)"
            sx={{ letterSpacing: '0.06em', marginBottom: '-6px' }}
          >
            PRESENTANDO
          </Typography>
        )}

        <Typography
          className="body-small-semibold"
          sx={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {actual?.label ?? 'Reunión en marcha'}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            marginTop: '-4px',
          }}
        >
          <Typography
            className="label-small-regular"
            color="var(--ink-3)"
            sx={{
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {actual?.person}
          </Typography>

          <Typography
            className="label-small-semibold"
            color={desfase > 0 ? 'var(--orange-dark)' : 'var(--ink-3)'}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {estado}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mientras se presenta, el reloj cuenta la presentación —apagado,
              porque ese tiempo no se le apunta a nadie— y arranca de cero al
              darle a «Empezar». Sí cuenta para el retraso de la reunión, que es
              lo que dice la línea de arriba. */}
          <Typography
            className="h2"
            color={
              presentando
                ? 'var(--ink-3)'
                : pasado
                  ? 'var(--orange-main)'
                  : 'var(--ink)'
            }
            sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
          >
            {presentando
              ? reloj(transcurrido)
              : pasado
                ? `+${reloj(restante)}`
                : reloj(restante)}
          </Typography>

          <Box sx={{ flex: 1, minWidth: 0 }} />

          {/* La lleva otro: aquí no hay nada que pulsar, solo hace falta saber
              quién es para no ponerse dos a llevarla. */}
          {soloLectura && (
            <Typography
              className="label-small-regular"
              color="var(--ink-3)"
              sx={{
                flexShrink: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {quienLaLleva ? `La lleva ${quienLaLleva}` : 'La lleva otro'}
            </Typography>
          )}

          {/* Poner a cero esta parte: se pulsa «Siguiente» antes de que el
              hermano llegue al micrófono más veces de las que uno cree. */}
          {!soloLectura && !presentando && (
            <IconButton
              onClick={reiniciar}
              aria-label="Poner a cero el reloj de esta parte"
              sx={{ flexShrink: 0, padding: '6px' }}
            >
              <IconRefresh width={20} height={20} color="var(--ink-3)" />
            </IconButton>
          )}

          {/* En la primera parte no hay a dónde volver, así que la flecha
              deshace lo único que se ha hecho: haberla empezado. Sin esto, un
              toque sin querer obligaba a recorrer el programa entero para
              quitarse la barra de encima. */}
          {!soloLectura && (
            <IconButton
              onClick={run.index > 0 ? atras : descartar}
              aria-label={
                run.index > 0
                  ? 'Volver a la parte anterior'
                  : 'Dejar de seguir la reunión'
              }
              sx={{ flexShrink: 0, padding: '6px' }}
            >
              <IconArrowBack width={20} height={20} color="var(--ink-3)" />
            </IconButton>
          )}

          {/* Apuntar algo de la parte que está sonando. Al lado del reloj y no
              escondido en la lista: si hay que buscarlo, no se usa. */}
          {!soloLectura && (
            <IconButton
              onClick={() => setNotaAbierta(true)}
              aria-label="Apuntar algo de esta parte"
              sx={{
                flexShrink: 0,
                padding: '6px',
                backgroundColor: tieneNota ? 'var(--accent-200)' : undefined,
              }}
            >
              <IconEdit
                width={20}
                height={20}
                color={tieneNota ? 'var(--accent-dark)' : 'var(--ink-3)'}
              />
            </IconButton>
          )}

          {!soloLectura && (
            <Button
              variant="main"
              onClick={presentando ? empezarParte : siguiente}
              disableAutoStretch
              sx={{ flexShrink: 0, padding: '8px 14px', marginLeft: '2px' }}
            >
              {presentando ? 'Empezar' : 'Siguiente'}
            </Button>
          )}

          {/* Si al que la lleva se le queda el móvil sin batería, sin esto la
              reunión se queda congelada para toda la congregación. */}
          {soloLectura && (
            <Button
              variant="tertiary"
              disableAutoStretch
              sx={{ flexShrink: 0, padding: '6px 12px' }}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Tomar el control',
                  message: `A partir de ahora la llevarías tú y ${quienLaLleva || 'quien la lleva ahora'} pasaría a solo mirar. Se conserva todo lo que va apuntado.`,
                  confirmLabel: 'Tomar el control',
                });

                if (ok) tomarControl();
              }}
            >
              Tomar el control
            </Button>
          )}
        </Box>

        {parteNotable && !soloLectura && (
          <NoteDialog
            open={notaAbierta}
            label={info[parteNotable.key]?.label ?? 'Esta parte'}
            person={info[parteNotable.key]?.person}
            value={notaActual}
            onClose={() => setNotaAbierta(false)}
            onSave={(texto) => {
              anotar(parteNotable.key, texto);
              setNotaAbierta(false);
            }}
          />
        )}

        {ConfirmDialogNode}
      </Box>
    </Box>
  );
};

export default MeetingRunBar;
