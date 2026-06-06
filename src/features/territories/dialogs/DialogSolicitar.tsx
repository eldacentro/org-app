import { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { congIDState, userLocalUIDState } from '@states/settings';
import { saveRequest } from '@services/firebase/territories';
import { responsabilidadesState } from '@states/responsabilidades';
import { personsState } from '@states/persons';
import { apiSendTerritoryPush } from '@services/api/territories';
import { getTerritoryManagersUids } from '../utils/managers';
import { usePersonName } from '@features/territories/usePersonName';

type Props = { open: boolean; onClose: () => void };

/** Diálogo para que un publicador solicite un territorio (con nota opcional). */
const DialogSolicitar = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const uid = useAtomValue(userLocalUIDState);
  const responsabilidades = useAtomValue(responsabilidadesState);
  const persons = useAtomValue(personsState);
  const resolveName = usePersonName();

  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (open) {
      setNota('');
      setEnviado(false);
    }
  }, [open]);

  const handleSolicitar = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await saveRequest(congId, {
        id: crypto.randomUUID(),
        personUid: uid,
        nota: nota.trim() || undefined,
        createdAt: new Date().toISOString(),
      });

      const targets = getTerritoryManagersUids(responsabilidades!, persons);
      if (targets.length > 0) {
        await apiSendTerritoryPush(
          targets,
          'Solicitud de territorio',
          `${resolveName(uid)} ha solicitado un territorio.${nota.trim() ? ' Incluye una nota.' : ''}`
        ).catch((err) => console.error('Failed to send push', err));
      }

      setEnviado(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
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
          Solicitar territorio
        </Typography>
        <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 2 }}>
          Tu solicitud llegará a los responsables del departamento de Territorios.
          Si prefieres algún tipo de territorio (rural, con escaleras…), indícalo
          en la nota.
        </Typography>

        {enviado ? (
          <Typography variant="body1" sx={{ color: 'var(--green-main)', py: 2 }}>
            ✓ Solicitud enviada.
          </Typography>
        ) : (
          <>
            <TextField
              label="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              multiline
              minRows={2}
            />
            <Stack
              direction="row"
              spacing={1.5}
              justifyContent="flex-end"
              sx={{ mt: 3 }}
            >
              <Button variant="tertiary" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="main" onClick={handleSolicitar} disabled={saving}>
                Solicitar
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Dialog>
  );
};

export default DialogSolicitar;
