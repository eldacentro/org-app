import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import AutoComplete from '@components/autocomplete';
import Badge from '@components/badge';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { IconCheckCircle, IconError } from '@components/icons';
import { personsActiveState } from '@states/persons';
import { fieldGroupsState } from '@states/field_service_groups';
import { useAppTranslation } from '@hooks/index';
import { nombreDeGrupo } from './nombreGrupo';
import { schedulesState } from '@states/schedules';
import { calcularGrupoReunion } from '@services/limpieza/calcularRotacion';
import { congIDState, fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
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
} from '@services/firebase/speaker_invitations';
import DialogRotacionCenas from './DialogRotacionCenas';

type Opcion = { id: string; etiqueta: string };

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
  const persons = useAtomValue(personsActiveState);
  const grupos = useAtomValue(fieldGroupsState);
  const schedules = useAtomValue(schedulesState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [invitacion, setInvitacion] = useState<SpeakerInvitationType | null>(
    null
  );
  const [cena, setCena] = useState<SpeakerDinnerType | null>(null);
  const [editando, setEditando] = useState(false);
  const [familia, setFamilia] = useState<Opcion | null>(null);
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
   * Se usa EL MISMO motor que la rotación de Limpieza: ya sabe saltarse las
   * semanas sin reunión y respetar un cambio puesto a mano. Un segundo motor
   * que hiciera casi lo mismo acabaría portándose distinto justo en los bordes
   * raros, que es donde duele.
   */
  const grupoQueToca = useMemo(() => {
    if (!rotacion?.fechaInicio) return null;

    return calcularGrupoReunion(
      {
        id: 'cenas',
        updatedAt: rotacion.updatedAt,
        fechaInicio: rotacion.fechaInicio,
        grupoInicio: rotacion.grupoInicio,
        gruposParticipantes: rotacion.gruposParticipantes,
        overrides: rotacion.overrides,
      },
      weekOf,
      'weekend',
      grupos,
      schedules
    );
  }, [rotacion, weekOf, grupos, schedules]);

  const nombreGrupo = useMemo(() => {
    if (!grupoQueToca) return '';

    return nombreDeGrupo(
      grupos.find((g) => g.group_id === grupoQueToca),
      t
    );
  }, [grupoQueToca, grupos, t]);

  /** Quién está en el grupo al que le toca, para ofrecerlo primero. */
  const delGrupo = useMemo(() => {
    if (!grupoQueToca) return new Set<string>();

    const grupo = grupos.find((g) => g.group_id === grupoQueToca);

    return new Set(
      (grupo?.group_data.members ?? []).map((m) => m.person_uid)
    );
  }, [grupoQueToca, grupos]);

  const opciones = useMemo(
    () =>
      persons
        .map((person) => ({
          id: person.person_uid,
          etiqueta: buildPersonFullname(
            person.person_data.person_lastname?.value ?? '',
            person.person_data.person_firstname?.value ?? '',
            fullnameOption
          ),
        }))
        // Primero quien está en el grupo al que le toca: es a quien se va a
        // elegir nueve de cada diez veces. Los demás siguen estando, porque
        // alguna semana se cambia y no hay por qué pelearse con la app.
        .sort((a, b) => {
          const ga = delGrupo.has(a.id) ? 0 : 1;
          const gb = delGrupo.has(b.id) ? 0 : 1;

          if (ga !== gb) return ga - gb;

          return a.etiqueta.localeCompare(b.etiqueta);
        }),
    [persons, fullnameOption, delGrupo]
  );

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

      const [laCena, laRotacion] = await Promise.all([
        leerCena(congId, dato.token),
        leerRotacionCenas(congId),
      ]);

      setRotacion(laRotacion);

      setCena(laCena);
      setFamilia(
        opciones.find((record) => record.id === laCena?.familiaUid) ?? null
      );
      setNotas(laCena?.notas ?? '');
    } catch (error) {
      console.error('No se pudo leer la invitación del orador', error);
    }
  }, [congId, weekOf, speakerUid, opciones]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!invitacion || guardando) return;

    setGuardando(true);

    try {
      await guardarCena(congId, invitacion.token, {
        familiaUid: familia?.id ?? '',
        notas: notas.trim(),
      });

      await cargar();
      setEditando(false);

      displaySnackNotification({
        header: 'Hecho',
        message: 'Anotado quién le acoge.',
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

  const nombreFamilia = cena?.familiaUid
    ? (opciones.find((record) => record.id === cena.familiaUid)?.etiqueta ??
      'Alguien que ya no está')
    : '';

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
              <Typography
                className="body-small-regular"
                color={nombreFamilia ? 'var(--ink)' : 'var(--orange-dark)'}
              >
                {nombreFamilia
                  ? `Cena en casa de ${nombreFamilia}`
                  : 'Todavía no hay familia que le acoja'}
              </Typography>
              <Button
                variant="small"
                disableAutoStretch
                onClick={() => setEditando(true)}
              >
                {nombreFamilia ? 'Cambiar' : 'Asignar familia'}
              </Button>
            </Box>
          )}

          {!editando && cena?.notas ? (
            <Typography className="label-small-regular" color="var(--ink-3)">
              {cena.notas}
            </Typography>
          ) : null}

          {editando && (
            <>
              <AutoComplete
                fullWidth
                label="Cena en casa de"
                options={opciones}
                value={familia}
                isOptionEqualToValue={(o: Opcion, v: Opcion) => o.id === v.id}
                getOptionLabel={(o: Opcion) => o.etiqueta}
                onChange={(_, value: Opcion | null) => setFamilia(value)}
              />
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
