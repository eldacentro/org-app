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
    enHorario,
    run,
    parts,
    info,
    parteActual,
    transcurrido,
    restante,
    esperando,
    horaInicio,
    desfase,
    empezar,
    siguiente,
    atras,
    reiniciar,
    anotar,
    descartar,
  } = useMidweekRun({ week, dataView });

  const [notaAbierta, setNotaAbierta] = useState(false);
  const [notaDe, setNotaDe] = useState<string | null>(null);

  if (!disponible) return null;

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
            Seguir la reunión
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
        />

        {/* Terminada la reunión también se puede apuntar: es cuando de verdad
            hay tiempo de escribir, y todavía te acuerdas. */}
        {parteNota && (
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
  const previsto = parteActual ? parteActual.minutes * 60 : 0;
  const avance = previsto > 0 ? Math.min(1, transcurrido / previsto) : 0;

  const actual = parteActual ? info[parteActual.key] : undefined;

  const tieneNota =
    !!parteActual && (run.notes?.[parteActual.key]?.length ?? 0) > 0;

  // Corto a propósito: en un móvil esta línea comparte sitio con el nombre de
  // quien tiene la parte, y «La reunión va 2 minutos por delante» se partía en
  // tres renglones.
  //
  // Pulsado antes de la hora, todavía no hay desfase que contar: lo único útil
  // que se puede decir es a qué hora arranca.
  const estado = esperando
    ? `empieza a las ${horaInicio}`
    : desfase === 0
      ? 'va en hora'
      : desfase > 0
        ? `va ${desfase} min tarde`
        : `va ${-desfase} min antes`;

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 'calc(var(--bottom-bar-space, 0px) + 12px)',
        zIndex: 5,
      }}
    >
      <Box
        sx={{
          borderRadius: 'var(--shape-lg)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--card)',
          boxShadow: 'var(--shadow-md)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Cuánto lleva la parte que está sonando. Se pone naranja al pasarse,
            que es el único momento en que hay que hacer algo. */}
        <Box
          sx={{
            height: '3px',
            borderRadius: 'var(--shape-full)',
            backgroundColor: 'var(--grey-200)',
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
          <Typography
            className="h2"
            color={pasado ? 'var(--orange-main)' : 'var(--ink)'}
            sx={{ flex: 1, minWidth: 0, fontVariantNumeric: 'tabular-nums' }}
          >
            {pasado ? `+${reloj(restante)}` : reloj(restante)}
          </Typography>

          {/* Poner a cero esta parte: se pulsa «Siguiente» antes de que el
              hermano llegue al micrófono más veces de las que uno cree. */}
          <IconButton
            onClick={reiniciar}
            aria-label="Poner a cero el reloj de esta parte"
            sx={{ flexShrink: 0, padding: '6px' }}
          >
            <IconRefresh width={20} height={20} color="var(--ink-3)" />
          </IconButton>

          {/* En la primera parte no hay a dónde volver, así que la flecha
              deshace lo único que se ha hecho: haberla empezado. Sin esto, un
              toque sin querer obligaba a recorrer el programa entero para
              quitarse la barra de encima. */}
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

          {/* Apuntar algo de la parte que está sonando. Al lado del reloj y no
              escondido en la lista: si hay que buscarlo, no se usa. */}
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

          <Button
            variant="main"
            onClick={siguiente}
            disableAutoStretch
            sx={{ flexShrink: 0, padding: '8px 16px', marginLeft: '4px' }}
          >
            Siguiente
          </Button>
        </Box>

        {parteActual && (
          <NoteDialog
            open={notaAbierta}
            label={actual?.label ?? 'Esta parte'}
            person={actual?.person}
            value={run.notes?.[parteActual.key]}
            onClose={() => setNotaAbierta(false)}
            onSave={(texto) => {
              anotar(parteActual.key, texto);
              setNotaAbierta(false);
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default MeetingRunBar;
