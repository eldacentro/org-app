import { useEffect, useState } from 'react';
import { Box, Stack, IconButton } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { IconClose } from '@components/icons';
import { congIDState, congMasterKeyState } from '@states/settings';
import { territoriesState, territorySettingsState } from '@states/territories';
import { TerritoryAssignment } from '@definition/territories';
import {
  finalizeAssignmentBatch,
  saveNotice,
} from '@services/firebase/territories';
import { responsabilidadesState } from '@states/responsabilidades';
import { apiSendTerritoryPush } from '@services/api/territories';
import { getTerritoryManagersUids } from '../utils/managers';
import { usePersonName } from '@features/territories/usePersonName';
import { useIsTerritoryManager } from '@features/territories/useIsTerritoryManager';
import { territoryLabel, isStillEncrypted } from '@services/app/territories';
import { displaySnackNotification } from '@services/states/app';
import { userLocalUIDState } from '@states/settings';

type Props = {
  assignment: TerritoryAssignment | null;
  /** Cierra sin guardar nada (X, tecla Esc) — el territorio sigue como estaba. */
  onClose: () => void;
  /** Se llama tras registrar la entrega/devolución con éxito — distinto de
   *  `onClose` para que quien abrió este diálogo desde la vista de detalle
   *  del territorio pueda decidir cerrar también esa vista solo cuando de
   *  verdad hubo un cambio, no cuando el usuario cancela. */
  onSuccess: () => void;
};

/**
 * Diálogo de entrega de territorio: Entregar (trabajado) o Devolver sin
 * trabajar. Permite añadir una nota. Al entregar como trabajado se actualiza
 * también `lastWorkedAt` del territorio.
 */
const DialogEntregar = ({ assignment, onClose, onSuccess }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const territories = useAtomValue(territoriesState);
  const responsabilidades = useAtomValue(responsabilidadesState);
  const settings = useAtomValue(territorySettingsState);
  const currentUid = useAtomValue(userLocalUIDState);
  const canManage = useIsTerritoryManager();
  const resolveName = usePersonName();

  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // No cargar una nota que este dispositivo no puede descifrar: al
    // guardar se cifraría por segunda vez y quedaría ilegible.
    if (assignment)
      setNota(
        isStillEncrypted(assignment.notas) ? '' : (assignment.notas ?? '')
      );
  }, [assignment]);

  if (!assignment) return null;

  const finalizar = async (status: 'trabajado' | 'no_trabajado') => {
    if (saving) return;

    // Última comprobación de permiso antes de escribir. Los botones que
    // llevan aquí ya la hacen, pero se repite en el punto de guardado por
    // dos motivos reales: (1) los ajustes se inicializan con los valores
    // por defecto (publishersCanReturn = true) hasta que llega el primer
    // snapshot, así que durante ese instante — o si esa suscripción falla —
    // los botones salen activos aunque la congregación lo tenga desactivado;
    // (2) un publicador nunca debe poder cerrar la asignación de otro.
    const isMine = Boolean(currentUid && assignment.personUid === currentUid);
    if (!canManage && (!settings.publishersCanReturn || !isMine)) {
      displaySnackNotification({
        header: 'No se puede entregar',
        message: !isMine
          ? 'Este territorio lo tiene asignado otro publicador.'
          : 'Solo un responsable puede marcar este territorio como entregado.',
        severity: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const key = masterKey ?? '';
      const territory =
        territories.find((t) => t.id === assignment.territoryId) ?? null;

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
          const tLabel = territory
            ? territoryLabel(territory)
            : 'Un territorio';
          const msg = `${resolveName(assignment.personUid)} devolvió ${tLabel} sin trabajar.${nota.trim() ? ' Hay una nota.' : ''}`;

          try {
            await Promise.all(
              targets.map((targetUid) =>
                saveNotice(congId, {
                  id: crypto.randomUUID(),
                  personUid: targetUid,
                  title: 'Territorio devuelto',
                  mensaje: msg,
                  // Sin esto el responsable recibía el aviso pero sin botón
                  // para ir al territorio (ver useTerritoryAssignedNotifications).
                  territoryId: assignment.territoryId,
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
            msg,
            assignment.territoryId
          ).catch((err) => {
            console.error('Failed to send push', err);
            notifyManagersFailed = true;
          });
        }
      }
      onSuccess();

      if (notifyManagersFailed) {
        displaySnackNotification({
          header: 'Territorio devuelto',
          message:
            'No se pudo avisar a los responsables. La devolución ya quedó registrada, pero conviene avisarles por otra vía.',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: 'Error',
        message: (error as Error).message || 'Ocurrió un error inesperado',
        severity: 'error',
      });
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
          borderRadius: 'var(--shape-xl)',
          backgroundColor: 'var(--card)',
          padding: '10px',
        },
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            Entregar territorio
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            sx={{
              width: 32,
              height: 32,
              mt: '-4px',
              mr: '-4px',
              color: 'var(--ink-2)',
              '&:hover': { backgroundColor: 'var(--accent-100)' },
            }}
          >
            <IconClose width={15} height={15} />
          </IconButton>
        </Stack>
        <Typography
          className="body-small-regular"
          color="var(--ink-2)"
          sx={{ mb: 2 }}
        >
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

        {/* Mismo estilo (variant="main") en los dos — solo cambia el color
            semántico — para que ninguno se vea como una opción "secundaria"
            frente a la otra: ambos son desenlaces igual de válidos. */}
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          <Button
            variant="main"
            onClick={() => finalizar('trabajado')}
            disabled={saving}
          >
            Entregar (trabajado)
          </Button>
          <Button
            variant="main"
            color="orange"
            onClick={() => finalizar('no_trabajado')}
            disabled={saving}
          >
            Devolver sin trabajar
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogEntregar;
