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
import { congIDState, fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { displaySnackNotification } from '@services/states/app';
import {
  SpeakerDinnerType,
  SpeakerInvitationType,
} from '@definition/speaker_invitation';
import {
  buscarInvitacion,
  guardarCena,
  leerCena,
} from '@services/firebase/speaker_invitations';

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
  const congId = useAtomValue(congIDState);
  const persons = useAtomValue(personsActiveState);
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
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
    [persons, fullnameOption]
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

      const laCena = await leerCena(congId, dato.token);

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

      {respuesta?.comentario ? (
        <Typography className="body-small-regular" color="var(--ink-2)">
          «{respuesta.comentario}»
        </Typography>
      ) : null}

      {/* La familia que le acoge: solo si de verdad se queda a cenar. */}
      {respuesta?.asistira && respuesta.cena && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
    </Box>
  );
};

export default PanelInvitacion;
