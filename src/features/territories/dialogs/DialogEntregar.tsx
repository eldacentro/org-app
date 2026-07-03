import { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { congIDState, congMasterKeyState } from '@states/settings';
import { territoriesState, territorySettingsState } from '@states/territories';
import { TerritoryAssignment } from '@definition/territories';
import { finalizeAssignmentBatch, saveNotice } from '@services/firebase/territories';
import { responsabilidadesState } from '@states/responsabilidades';
import { apiSendTerritoryPush } from '@services/api/territories';
import { getTerritoryManagersUids } from '../utils/managers';
import { usePersonName } from '@features/territories/usePersonName';
import { territoryLabel } from '@services/app/territories';
import { displaySnackNotification } from '@services/states/app';

type Props = {
  assignment: TerritoryAssignment | null;
  onClose: () => void;
};

/**
 * Diálogo de entrega de territorio: Entregar (trabajado), Devolver sin trabajar,
 * o Cancelar. Permite añadir una nota. Al entregar como trabajado se actualiza
 * también `lastWorkedAt` del territorio.
 */
const DialogEntregar = ({ assignment, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const territories = useAtomValue(territoriesState);
  const responsabilidades = useAtomValue(responsabilidadesState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (assignment) setNota(assignment.notas ?? '');
  }, [assignment]);

  if (!assignment) return null;

  const finalizar = async (status: 'trabajado' | 'no_trabajado') => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const key = masterKey ?? '';
      const territory = territories.find((t) => t.id === assignment.territoryId) ?? null;

      // Un único batch garantiza que la asignación y lastWorkedAt se actualizan
      // de forma atómica — sin riesgo de inconsistencia si falla la red entre writes.
      await finalizeAssignmentBatch(
        congId,
        {
          ...assignment,
          returnedAt: now,
          status,
          notas: nota.trim() || undefined,
          updatedAt: now,
        },
        territory,
        key
      );

      // Si avisar a los responsables falla, la entrega ya quedó registrada
      // igual — pero quien la hizo debe saber que puede que no se entere
      // nadie todavía, para poder avisar a mano si es algo urgente.
      let notifyManagersFailed = false;

      if (status === 'no_trabajado') {
        // Generar solicitud si lo devuelve sin trabajar (opcional según el flujo original, pero sí enviar el push)
        let targets: string[] = [];
        if (settings?.managers && settings.managers.length > 0) {
          targets = settings.managers.map((m) => m.uid);
        } else if (responsabilidades) {
          targets = getTerritoryManagersUids(responsabilidades);
        }

        if (targets.length > 0) {
          const tLabel = territory ? territoryLabel(territory) : 'Un territorio';
          const msg = `${resolveName(assignment.personUid)} devolvió ${tLabel} sin trabajar.${nota.trim() ? ' Hay una nota.' : ''}`;

          try {
            await Promise.all(
              targets.map((targetUid) =>
                saveNotice(congId, {
                  id: crypto.randomUUID(),
                  personUid: targetUid,
                  title: 'Territorio devuelto',
                  mensaje: msg,
                  sentBy: assignment.personUid,
                  createdAt: now,
                })
              )
            );
          } catch (err) {
            console.error('Failed to save notice', err);
            notifyManagersFailed = true;
          }

          await apiSendTerritoryPush(
            targets,
            'Territorio devuelto sin trabajar',
            msg
          ).catch((err) => {
            console.error('Failed to send push', err);
            notifyManagersFailed = true;
          });
        }
      }
      onClose();

      if (notifyManagersFailed) {
        displaySnackNotification({
          header: 'Territorio devuelto',
          message: 'No se pudo avisar a los responsables. La devolución ya quedó registrada, pero conviene avisarles por otra vía.',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error(error);
      displaySnackNotification({ header: 'Error', message: (error as Error).message || 'Ocurrió un error inesperado', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!assignment}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        style: {
          maxWidth: '460px',
          width: '100%',
          borderRadius: 'var(--r-md)',
          backgroundColor: 'var(--card)',
          padding: '10px',
        },
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" className="h2" sx={{ mb: 1, color: 'var(--ink)' }}>
          Entregar territorio
        </Typography>
        <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 2 }}>
          Indica si el territorio fue trabajado o si lo devuelves sin trabajar.
          Puedes añadir una nota opcional.
        </Typography>

        <TextField
          label="Nota (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          multiline
          minRows={2}
        />

        <Stack spacing={1.5} sx={{ mt: 3 }}>
          <Button
            variant="main"
            onClick={() => finalizar('trabajado')}
            disabled={saving}
          >
            Entregar (trabajado)
          </Button>
          <Button
            variant="tertiary"
            onClick={() => finalizar('no_trabajado')}
            disabled={saving}
          >
            Devolver sin trabajar
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogEntregar;
