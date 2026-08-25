import { useMemo, useState } from 'react';
import { Stack, Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import Autocomplete from '@components/autocomplete';
import { IconClose } from '@components/icons';
import IconButton from '@components/icon_button';
import { congIDState, fullnameOptionState } from '@states/settings';
import { personsActiveState } from '@states/persons';
import { buildPersonFullname } from '@utils/common';
import { Territory, TerritoryAssignment } from '@definition/territories';
import { updateAssignmentShares } from '@services/firebase/territories';
import { territoryLabel } from '@services/app/territories';
import { displaySnackNotification } from '@services/states/app';
import { usePersonName } from '../usePersonName';

/**
 * Prestarle el territorio a un hermano durante la salida.
 *
 * No es el enlace público: eso es para quien no tiene cuenta y hay que
 * mandarlo por WhatsApp. Esto es de dentro de la app — le aparece en Mis
 * territorios, debajo de los suyos, y se le cae solo al cabo de unas horas.
 *
 * Cuatro horas y sin más opciones a propósito: casi nadie sale más de una
 * mañana, y si se queda corto se vuelve a compartir, que es un toque. Un
 * selector de duración aquí sería una pregunta más que responder en la puerta
 * del Salón con el coche esperando.
 */
const HORAS = 4;

type PersonaOpcion = { uid: string; label: string };

type Props = {
  open: boolean;
  territory: Territory;
  assignment: TerritoryAssignment;
  onClose: () => void;
};

export const quedaTiempo = (hasta: string, ahora = new Date()): string => {
  const minutos = Math.round(
    (new Date(hasta).getTime() - ahora.getTime()) / 60000
  );
  if (minutos <= 0) return 'se acabó';
  if (minutos < 60) return `queda${minutos === 1 ? '' : 'n'} ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `quedan ${horas} h${resto > 0 ? ` ${resto} min` : ''}`;
};

const DialogPrestar = ({ open, territory, assignment, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const persons = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const resolveName = usePersonName();

  const [personUid, setPersonUid] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Los préstamos que siguen en hora. Los caducados no se enseñan ni se
  // vuelven a guardar: la lista se limpia sola en la primera escritura.
  const vigentes = useMemo(() => {
    const ahora = new Date().toISOString();
    return (assignment.compartidoCon ?? []).filter((p) => p.hasta > ahora);
  }, [assignment.compartidoCon]);

  const opciones = useMemo<PersonaOpcion[]>(
    () =>
      persons
        .filter((p) => p.person_uid !== assignment.personUid)
        .filter((p) => !vigentes.some((v) => v.personUid === p.person_uid))
        .map((p) => ({
          uid: p.person_uid,
          label: buildPersonFullname(
            p.person_data.person_lastname.value,
            p.person_data.person_firstname.value,
            fullnameOption
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [persons, assignment.personUid, vigentes, fullnameOption]
  );

  const elegido = opciones.find((o) => o.uid === personUid) ?? null;

  const guardar = async (lista: { personUid: string; hasta: string }[]) => {
    setGuardando(true);
    try {
      await updateAssignmentShares(congId, assignment.id, lista);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'No se ha podido guardar',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        severity: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  const compartir = async () => {
    if (!personUid) return;

    const hasta = new Date(Date.now() + HORAS * 3600000).toISOString();
    await guardar([...vigentes, { personUid, hasta }]);
    setPersonUid(null);
    displaySnackNotification({
      header: `${resolveName(personUid)} ya lo ve`,
      message: `Le sale en Mis territorios durante ${HORAS} horas.`,
      severity: 'success',
    });
  };

  const quitar = (uid: string) =>
    guardar(vigentes.filter((v) => v.personUid !== uid));

  return (
    <Dialog open={open} onClose={guardando ? undefined : onClose}>
      <Stack spacing={2} sx={{ width: '100%' }}>
        <Box>
          <Typography className="h2" color="var(--ink)">
            Compartir {territoryLabel(territory)}
          </Typography>
          <Typography
            className="body-small-regular"
            color="var(--ink-2)"
            sx={{ display: 'block', mt: '4px' }}
          >
            Para que otro hermano lo vea en su móvil durante la salida. Le sale
            en Mis territorios durante {HORAS} horas y luego se le quita solo.
            Sigue siendo tuyo: él no puede entregarlo ni cambiarlo.
          </Typography>
        </Box>

        {vigentes.length > 0 && (
          <Stack spacing={1}>
            {vigentes.map((prestamo) => (
              <Stack
                key={prestamo.personUid}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{
                  padding: '8px 8px 8px 14px',
                  borderRadius: 'var(--shape-md)',
                  border: '1px solid var(--line)',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography className="body-small-regular" color="var(--ink)">
                    {resolveName(prestamo.personUid)}
                  </Typography>
                  <Typography
                    className="label-small-regular"
                    color="var(--ink-2)"
                    sx={{ display: 'block' }}
                  >
                    Le {quedaTiempo(prestamo.hasta)}
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => quitar(prestamo.personUid)}
                  disabled={guardando}
                  size="small"
                  aria-label={`Dejar de compartir con ${resolveName(prestamo.personUid)}`}
                >
                  <IconClose color="var(--ink-2)" width={16} height={16} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}

        <Autocomplete
          options={opciones}
          value={elegido}
          onChange={(_, v) => setPersonUid((v as PersonaOpcion)?.uid ?? null)}
          getOptionLabel={(o: PersonaOpcion) => o.label}
          isOptionEqualToValue={(o: PersonaOpcion, v: PersonaOpcion) =>
            o.uid === v.uid
          }
          size="small"
          label="¿Con quién?"
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="secondary"
            disableAutoStretch
            onClick={onClose}
            disabled={guardando}
          >
            Cerrar
          </Button>
          <Button
            variant="main"
            disableAutoStretch
            onClick={compartir}
            disabled={guardando || !personUid}
          >
            Compartir {HORAS} horas
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
};

export default DialogPrestar;
