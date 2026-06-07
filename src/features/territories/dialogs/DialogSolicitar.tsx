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
import { territoryPendingRequestsState } from '@states/territories';
import { apiSendTerritoryPush } from '@services/api/territories';
import { sendEmailNotification } from '@services/firebase/email';
import { getTerritoryManagersUids } from '../utils/managers';
import { usePersonName } from '@features/territories/usePersonName';
import { displaySnackNotification } from '@services/states/app';
import { escapeHTML } from '@utils/common';

type Props = { open: boolean; onClose: () => void };

/** Diálogo para que un publicador solicite un territorio (con nota opcional). */
const DialogSolicitar = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const uid = useAtomValue(userLocalUIDState);
  const responsabilidades = useAtomValue(responsabilidadesState);
  const persons = useAtomValue(personsState);
  const pendingRequests = useAtomValue(territoryPendingRequestsState);
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

      const targets = getTerritoryManagersUids(responsabilidades!);
      if (targets.length > 0) {
        await apiSendTerritoryPush(
          targets,
          'Solicitud de territorio',
          `${resolveName(uid)} ha solicitado un territorio.${nota.trim() ? ' Incluye una nota.' : ''}`
        ).catch((err) => console.error('Failed to send push', err));

        const targetEmails = targets
          .map(targetUid => persons.find(p => p.person_uid === targetUid)?.person_data?.email?.value)
          .filter(email => !!email) as string[];

        if (targetEmails.length > 0) {
          const applicantName = resolveName(uid);
          const notaHTML = nota.trim() ? `<p><strong>Nota:</strong> ${escapeHTML(nota.trim())}</p>` : '';
          try {
            await Promise.all(
              targetEmails.map(email =>
                sendEmailNotification(
                  email,
                  `Nueva solicitud de territorio: ${escapeHTML(applicantName)}`,
                  `<p>El publicador <strong>${escapeHTML(applicantName)}</strong> ha solicitado un territorio nuevo.</p>
                   ${notaHTML}
                   <div style="text-align: center; margin-top: 30px;">
                     <a href="https://app.eldacentro.com/congregation/territories" class="btn">Abrir aplicación</a>
                   </div>`
                )
              )
            );
          } catch (err) {
            console.error('Failed to send email', err);
          }
        }
      }

      setEnviado(true);
      setTimeout(() => {
        displaySnackNotification({ header: '¡Listo!', message: 'Solicitud enviada correctamente', severity: 'success' });
        onClose();
      }, 1200);
    } catch (error) {
      console.error(error);
      displaySnackNotification({ header: 'Error', message: (error as Error).message || 'Ocurrió un error inesperado', severity: 'error' });
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

        {pendingRequests.some(r => r.personUid === uid) ? (
          <Typography variant="body1" sx={{ color: 'var(--red-main)', py: 2, textAlign: 'center', fontWeight: 500 }}>
            Ya tienes una solicitud de territorio pendiente. Por favor, espera a que los responsables la atiendan.
          </Typography>
        ) : enviado ? (
          <Typography variant="body1" sx={{ color: 'var(--green-main)', py: 2 }}>
            ✓ Solicitud enviada.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: 'var(--ink)', mb: 0.5, fontSize: '0.85rem' }}>
              Nota (opcional)
            </Typography>
            <TextField
              placeholder="Escribe tu nota aquí..."
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
