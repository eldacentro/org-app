import { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { congIDState, congMasterKeyState } from '@states/settings';
import { territoriesState } from '@states/territories';
import { TerritoryAssignment } from '@definition/territories';
import { saveAssignment, saveTerritory } from '@services/firebase/territories';
import { responsabilidadesState } from '@states/responsabilidades';
import { apiSendTerritoryPush } from '@services/api/territories';
import { getTerritoryManagersUids } from '../utils/managers';
import { usePersonName } from '@features/territories/usePersonName';
import { territoryLabel } from '@services/app/territories';

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
      await saveAssignment(
        congId,
        {
          ...assignment,
          returnedAt: now,
          status,
          notas: nota.trim() || undefined,
          updatedAt: now,
        },
        key
      );

      if (status === 'trabajado') {
        const territory = territories.find((t) => t.id === assignment.territoryId);
        if (territory) {
          await saveTerritory(
            congId,
            { ...territory, lastWorkedAt: now, updatedAt: now },
            key
          );
        }
      } else {
        // Generar solicitud si lo devuelve sin trabajar (opcional según el flujo original, pero sí enviar el push)
        const targets = getTerritoryManagersUids(responsabilidades!);
        const territory = territories.find((t) => t.id === assignment.territoryId);
        if (targets.length > 0) {
          const tLabel = territory ? territoryLabel(territory) : 'Un territorio';
          await apiSendTerritoryPush(
            targets,
            'Territorio devuelto sin trabajar',
            `${resolveName(assignment.personUid)} devolvió ${tLabel} sin trabajar.${nota.trim() ? ' Hay una nota.' : ''}`
          ).catch((err) => console.error('Failed to send push', err));
        }
      }
      onClose();
    } catch (e) {
      console.error(e);
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
