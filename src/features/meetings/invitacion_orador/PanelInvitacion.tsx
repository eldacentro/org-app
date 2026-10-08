import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Badge from '@components/badge';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { IconCheckCircle, IconError } from '@components/icons';
import { fieldGroupsState } from '@states/field_service_groups';
import { useAppTranslation } from '@hooks/index';
import { nombreDeGrupo } from './nombreGrupo';
import { grupoDeLaSemana } from '@services/app/rotacion_cenas';
import { congIDState } from '@states/settings';
import { displaySnackNotification } from '@services/states/app';
import {
  SpeakerDinnerRotationType,
  SpeakerDinnerType,
  SpeakerInvitationType,
} from '@definition/speaker_invitation';
import {
  anotarRespuesta,
  borrarRespuesta,
  buscarInvitacion,
  guardarCena,
  guardarRotacionCenas,
  leerCena,
  leerRotacionCenas,
  listarInvitaciones,
} from '@services/firebase/speaker_invitations';
import DialogRotacionCenas from './DialogRotacionCenas';

/**
 * LO QUE PASA CON LA INVITACIÓN DE ESTE ORADOR, en la propia semana.
 *
 * Reúne las tres cosas que antes se perseguían por correo y de memoria: si ha
 * contestado, si se queda a cenar y con quién cena. Mientras no se haya
 * generado la carta no hay nada que enseñar, y entonces no se enseña nada: una
 * caja vacía en cada semana sin invitar sería ruido en toda la pantalla.
 */
const PanelInvitacion = ({
  weekOf,
  speakerUid,
  speakerEmail,
  onEnviarCorreo,
}: {
  weekOf: string;
  speakerUid?: string;
  /** Si no lo tiene en el catálogo, no se ofrece mandárselo. */
  speakerEmail?: string;
  onEnviarCorreo?: () => Promise<void>;
}) => {
  const { t } = useAppTranslation();

  const congId = useAtomValue(congIDState);
  const grupos = useAtomValue(fieldGroupsState);

  const [invitacion, setInvitacion] = useState<SpeakerInvitationType | null>(
    null
  );
  const [cena, setCena] = useState<SpeakerDinnerType | null>(null);
  const [editando, setEditando] = useState(false);
  const [historial, setHistorial] = useState<SpeakerInvitationType[]>([]);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [rotacion, setRotacion] = useState<SpeakerDinnerRotationType | null>(
    null
  );
  const [abrirRotacion, setAbrirRotacion] = useState(false);
  const [anotando, setAnotando] = useState(false);

  /**
   * A qué grupo le toca acoger esta semana.
   *
   * El turno lo gasta la CENA, no el calendario: si el orador no se queda, ese
   * grupo sigue teniendo turno. Por eso hace falta el historial entero y no
   * vale el motor de Limpieza — ver `services/app/rotacion_cenas`.
   */
  const grupoQueToca = useMemo(
    () =>
      grupoDeLaSemana(weekOf, {
        invitaciones: historial,
        rotacion,
        grupos,
      }),
    [weekOf, historial, rotacion, grupos]
  );

  const nombreGrupo = useMemo(() => {
    if (!grupoQueToca) return '';

    return nombreDeGrupo(
      grupos.find((g) => g.group_id === grupoQueToca),
      t
    );
  }, [grupoQueToca, grupos, t]);

  const cargar = useCallback(async () => {
    if (!congId || !speakerUid) {
      setInvitacion(null);
      setCena(null);
      return;
    }

    try {
      const dato = await buscarInvitacion(congId, weekOf, speakerUid);

      setInvitacion(dato);

      if (!dato) {
        setCena(null);
        return;
      }

      const [laCena, laRotacion, todas] = await Promise.all([
        leerCena(congId, dato.token),
        leerRotacionCenas(congId),
        listarInvitaciones(congId),
      ]);

      setRotacion(laRotacion);
      setHistorial(todas);

      setCena(laCena);
      setNotas(laCena?.notas ?? '');
    } catch (error) {
      console.error('No se pudo leer la invitación del orador', error);
    }
  }, [congId, weekOf, speakerUid]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!invitacion || guardando) return;

    setGuardando(true);

    try {
      await guardarCena(congId, invitacion.token, { notas: notas.trim() });

      await cargar();
      setEditando(false);

      displaySnackNotification({
        header: 'Hecho',
        message: 'Nota guardada.',
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: 'No se ha podido guardar',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setGuardando(false);
    }
  };

  // Sin invitación y sin correo al que mandarla no hay nada que hacer aquí.
  /**
   * Anotar la respuesta por él.
   *
   * Casi siempre contestará por WhatsApp o por teléfono. Si lo único que se
   * pudiera registrar fuera lo que él escribe en el enlace, el panel enseñaría
   * «sin contestar» en semanas ya resueltas, y entonces no sirve de nada.
   */
  const anotar = async (datos: {
    asistira: boolean;
    cena: boolean;
    comensales: number;
  }) => {
    if (!invitacion || anotando) return;

    setAnotando(true);

    try {
      await anotarRespuesta(congId, invitacion.token, {
        ...datos,
        comentario: invitacion.respuesta?.comentario ?? '',
      });

      await cargar();
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: 'No se ha podido guardar',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setAnotando(false);
    }
  };

  /** Deja la semana como si nadie hubiera contestado. */
  const olvidar = async () => {
    if (!invitacion || anotando) return;

    setAnotando(true);

    try {
      await borrarRespuesta(congId, invitacion.token);
      await cargar();
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: 'No se ha podido guardar',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setAnotando(false);
    }
  };

  if (!invitacion && !(speakerEmail && onEnviarCorreo)) return null;

  const respuesta = invitacion?.respuesta;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-l)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--accent-100)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: '8px' }}>
        {!invitacion && (
          <Badge size="small" color="grey" text="Todavía sin invitar" />
        )}
        {invitacion && !respuesta && (
          <Badge size="small" color="grey" text="Invitación sin contestar" />
        )}
        {respuesta && !respuesta.asistira && (
          <Badge size="small" color="red" filled text="No podrá venir" />
        )}
        {respuesta?.asistira && (
          <Badge
            size="small"
            color="green"
            text={
              respuesta.cena
                ? `Confirmado · cena para ${respuesta.comensales}`
                : 'Confirmado · sin cena'
            }
          />
        )}
      </Stack>

      {speakerEmail && onEnviarCorreo ? (
        <Box>
          <Button
            variant="secondary"
            disableAutoStretch
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              try {
                await onEnviarCorreo();
                await cargar();
              } finally {
                setEnviando(false);
              }
            }}
          >
            {enviando
              ? 'Enviando…'
              : invitacion
                ? 'Volver a enviar por correo'
                : 'Enviar invitación por correo'}
          </Button>
        </Box>
      ) : null}

      {/* Lo contesta él por el enlace, o lo anotas tú si te lo dice por otro
          lado. Las dos cosas escriben en el mismo sitio. */}
      {invitacion ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: '8px' }}>
          <Button
            variant={respuesta?.asistira ? 'main' : 'secondary'}
            disableAutoStretch
            disabled={anotando}
            onClick={() =>
              anotar({
                asistira: true,
                cena: respuesta?.cena ?? false,
                comensales: respuesta?.comensales ?? 0,
              })
            }
          >
            Viene
          </Button>
          <Button
            variant={
              respuesta && !respuesta.asistira ? 'main' : 'secondary'
            }
            disableAutoStretch
            disabled={anotando}
            onClick={() => anotar({ asistira: false, cena: false, comensales: 0 })}
          >
            No viene
          </Button>
          {respuesta ? (
            <Button
              variant="tertiary"
              disableAutoStretch
              disabled={anotando}
              onClick={olvidar}
            >
              Todavía no se sabe
            </Button>
          ) : null}
          {respuesta?.asistira ? (
            <Button
              variant={respuesta.cena ? 'main' : 'secondary'}
              disableAutoStretch
              disabled={anotando}
              onClick={() =>
                anotar({
                  asistira: true,
                  cena: !respuesta.cena,
                  comensales: respuesta.cena ? 0 : respuesta.comensales || 2,
                })
              }
            >
              {respuesta.cena ? 'Quita la cena' : 'Se queda a cenar'}
            </Button>
          ) : null}
        </Stack>
      ) : null}

      {respuesta?.comentario ? (
        <Typography className="body-small-regular" color="var(--ink-2)">
          «{respuesta.comentario}»
        </Typography>
      ) : null}

      {/* La familia que le acoge: solo si de verdad se queda a cenar. */}
      {respuesta?.asistira && respuesta.cena && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* A quién le toca esta semana, y por dónde se cambia la rotación. */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <Typography className="label-small-regular" color="var(--ink-3)">
              {grupoQueToca
                ? `Esta semana le toca a ${nombreGrupo}`
                : 'No hay rotación de cenas puesta'}
            </Typography>
            <Button
              variant="small"
              disableAutoStretch
              onClick={() => setAbrirRotacion(true)}
            >
              {grupoQueToca ? 'Rotación' : 'Poner rotación'}
            </Button>
          </Box>

          {/* La nota de la cena. A quién se le encarga es el GRUPO, de arriba:
              dentro del grupo ya se organizan ellos, que es como se hace. */}
          {!editando && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <Typography className="label-small-regular" color="var(--ink-3)">
                {cena?.notas || 'Sin notas'}
              </Typography>
              <Button
                variant="small"
                disableAutoStretch
                onClick={() => setEditando(true)}
              >
                {cena?.notas ? 'Cambiar nota' : 'Añadir nota'}
              </Button>
            </Box>
          )}

          {editando && (
            <>
              <TextField
                label="Notas (opcional)"
                placeholder="La hora, alergias, quién le lleva…"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="tertiary"
                  disableAutoStretch
                  onClick={() => setEditando(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="main"
                  disableAutoStretch
                  disabled={guardando}
                  onClick={guardar}
                >
                  Guardar
                </Button>
              </Stack>
            </>
          )}
        </Box>
      )}
      <DialogRotacionCenas
        open={abrirRotacion}
        rotacion={rotacion}
        guardando={guardando}
        onClose={() => setAbrirRotacion(false)}
        onGuardar={async (datos) => {
          setGuardando(true);

          try {
            await guardarRotacionCenas(congId, datos);
            await cargar();
            setAbrirRotacion(false);

            displaySnackNotification({
              header: 'Hecho',
              message: 'Rotación de cenas guardada.',
              severity: 'success',
              icon: <IconCheckCircle color="var(--card)" />,
            });
          } catch (error) {
            console.error(error);

            displaySnackNotification({
              header: 'No se ha podido guardar',
              message: 'Comprueba tu conexión e inténtalo de nuevo.',
              severity: 'error',
              icon: <IconError color="var(--card)" />,
            });
          } finally {
            setGuardando(false);
          }
        }}
      />
    </Box>
  );
};

export default PanelInvitacion;
