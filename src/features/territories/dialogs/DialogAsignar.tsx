import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Box, Stack, TextField as MuiTextField } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { personsActiveState } from '@states/persons';
import { buildPersonFullname, escapeHTML } from '@utils/common';
import { displaySnackNotification } from '@services/states/app';
import {
  congIDState,
  congMasterKeyState,
  fullnameOptionState,
  userLocalUIDState,
} from '@states/settings';
import { usePersonName } from '@features/territories/usePersonName';
import {
  territoriesState,
  territoryAssignedIdsState,
  territoryAssignmentsState,
  territorySettingsState,
  territoryZonesState,
} from '@states/territories';
import { Territory, TerritoryAssignment } from '@definition/territories';
import { saveAssignment, atenderRequest, saveNotice } from '@services/firebase/territories';
import { apiSendTerritoryPush } from '@services/api/territories';
import { sendEmailNotification } from '@services/firebase/email';
import {
  computeDueAt,
  getZoneName,
  territoryLabel,
} from '@services/app/territories';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Territorio fijo. Si es null y `open`, se muestra un selector de territorio. */
  territory?: Territory | null;
  /** Modo masivo: asigna varios territorios a la vez al mismo publicador
   *  (selección múltiple desde la pestaña "Territorios"). Si se pasa esto,
   *  `territory` se ignora y el selector de territorio se oculta. */
  bulkTerritories?: Territory[];
  /** Preselecciona publicador (al asignar desde una solicitud). */
  defaultPersonUid?: string;
  /** Si se asigna desde una solicitud, se marca como atendida. */
  requestId?: string;
  isCampaign?: boolean;
  campaignId?: string;
};

const DialogAsignar = ({
  open,
  onClose,
  territory = null,
  bulkTerritories,
  defaultPersonUid,
  requestId,
  isCampaign = false,
  campaignId,
}: Props) => {
  const isBulk = (bulkTerritories?.length ?? 0) > 0;
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const currentUid = useAtomValue(userLocalUIDState);
  const persons = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const settings = useAtomValue(territorySettingsState);
  const territories = useAtomValue(territoriesState);
  const resolveName = usePersonName();
  const assignedIds = useAtomValue(territoryAssignedIdsState);
  const allAssignments = useAtomValue(territoryAssignmentsState);
  const zones = useAtomValue(territoryZonesState);

  const personOptions = useMemo(
    () =>
      persons.map((p) => ({
        uid: p.person_uid,
        label: buildPersonFullname(
          p.person_data.person_lastname.value,
          p.person_data.person_firstname.value,
          fullnameOption
        ),
      })),
    [persons, fullnameOption]
  );

  // Territorios libres (no asignados) para el selector, los asignados al final.
  const territoryOptions = useMemo(
    () =>
      [...territories]
        .sort((a, b) => {
          const aa = assignedIds.has(a.id) ? 1 : 0;
          const bb = assignedIds.has(b.id) ? 1 : 0;
          if (aa !== bb) return aa - bb;
          return a.numero.localeCompare(b.numero, undefined, { numeric: true });
        })
        .map((t) => ({
          id: t.id,
          label: `${territoryLabel(t)} · ${getZoneName(t.zoneId, zones)}${
            assignedIds.has(t.id) ? ' (asignado)' : ''
          }`,
        })),
    [territories, assignedIds, zones]
  );

  const [personUid, setPersonUid] = useState<string | null>(null);
  const [territoryId, setTerritoryId] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPersonUid(defaultPersonUid ?? null);
      setTerritoryId(territory?.id ?? null);
      setNota('');
    }
  }, [open, defaultPersonUid, territory]);

  if (!open) return null;

  const effectiveTerritory =
    territory ?? territories.find((t) => t.id === territoryId) ?? null;

  /** Asigna varios territorios a la vez al mismo publicador. Los que ya
   *  tengan una asignación abierta se omiten (igual que en el flujo de
   *  borrado masivo de la pestaña Territorios) en vez de bloquear todo el
   *  lote por uno solo. */
  const handleAsignarBulk = async () => {
    if (!personUid || !bulkTerritories || bulkTerritories.length === 0) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const toAssign = bulkTerritories.filter(
        (t) =>
          !allAssignments.some((a) => a.territoryId === t.id && !a.returnedAt)
      );
      const skipped = bulkTerritories.length - toAssign.length;

      if (toAssign.length === 0) {
        displaySnackNotification({
          header: 'Error',
          message: 'Todos los territorios seleccionados ya están asignados.',
          severity: 'error',
        });
        return;
      }

      await Promise.all(
        toAssign.map((t) =>
          saveAssignment(
            congId,
            {
              id: crypto.randomUUID(),
              territoryId: t.id,
              personUid,
              assignedAt: now,
              dueAt: computeDueAt(now, settings.daysUntilExpiration),
              returnedAt: null,
              status: 'asignado',
              isCampaign,
              campaignId,
              notas: nota.trim() || undefined,
              assignedBy: currentUid || undefined,
              updatedAt: now,
            },
            masterKey ?? ''
          )
        )
      );

      let notificationFailed = false;

      if (personUid !== currentUid) {
        const labelsList = toAssign.map((t) => territoryLabel(t)).join(', ');
        const mensaje = `Se te han asignado ${toAssign.length} territorios: ${labelsList}.`;

        await saveNotice(congId, {
          id: crypto.randomUUID(),
          personUid,
          title: 'Nuevos territorios asignados',
          mensaje,
          sentBy: currentUid,
          createdAt: now,
        });

        await apiSendTerritoryPush(
          [personUid],
          'Nuevos territorios asignados',
          mensaje
        ).catch((err) => {
          console.error('Failed to send push', err);
          notificationFailed = true;
        });

        const assignedPerson = persons.find((p) => p.person_uid === personUid);
        const targetEmail = assignedPerson?.person_data?.email?.value;
        if (targetEmail) {
          try {
            await sendEmailNotification(
              targetEmail,
              `Nuevos territorios asignados (${toAssign.length})`,
              `<p>Hola <strong>${escapeHTML(resolveName(personUid))}</strong>,</p>
               <p>Se te han asignado <strong>${toAssign.length} territorios</strong>: ${escapeHTML(labelsList)}.</p>
               <div style="text-align: center; margin-top: 30px;">
                 <a href="https://eldacentro.com/congregation/territories" class="btn">Ver Territorios</a>
               </div>`
            );
          } catch (err) {
            console.error('Failed to send email', err);
            notificationFailed = true;
          }
        }
      }

      onClose();

      if (notificationFailed) {
        displaySnackNotification({
          header: `${toAssign.length} territorios asignados`,
          message: 'No se pudo enviar el aviso por correo o notificación push. Los territorios ya quedaron asignados, pero conviene avisar al publicador por otra vía.',
          severity: 'error',
        });
      } else {
        displaySnackNotification({
          header: '¡Listo!',
          message:
            skipped > 0
              ? `${toAssign.length} territorios asignados. ${skipped} se omitieron porque ya estaban asignados.`
              : `${toAssign.length} territorios asignados correctamente.`,
          severity: 'success',
        });
      }
    } catch (error) {
      console.error(error);
      displaySnackNotification({ header: 'Error', message: (error as Error).message || 'Ocurrió un error inesperado', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAsignar = async () => {
    if (isBulk) return handleAsignarBulk();
    if (!personUid || !effectiveTerritory) return;
    // Comprobar si hay alguna asignación abierta (campaña O regular) para este territorio
    const hasOpenAssignment = allAssignments.some(
      (a) => a.territoryId === effectiveTerritory.id && !a.returnedAt
    );
    if (hasOpenAssignment) {
      displaySnackNotification({ header: 'Error', message: 'Este territorio ya está asignado', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const assignment: TerritoryAssignment = {
        id: crypto.randomUUID(),
        territoryId: effectiveTerritory.id,
        personUid,
        assignedAt: now,
        dueAt: computeDueAt(now, settings.daysUntilExpiration),
        // Explicit null (not omitted) so a future where('returnedAt','==',null)
        // query can find open assignments — Firestore equality filters don't
        // match documents where the field is simply absent.
        returnedAt: null,
        status: 'asignado',
        isCampaign,
        campaignId,
        notas: nota.trim() || undefined,
        assignedBy: currentUid || undefined,
        updatedAt: now,
      };
      await saveAssignment(congId, assignment, masterKey ?? '');
      if (requestId) await atenderRequest(congId, requestId, currentUid);

      // Si le estamos asignando a una persona y no somos nosotros mismos, enviarle una notificación
      // El aviso in-app (Notice) sí queda registrado siempre dentro de la app;
      // push y email son solo un "extra" — si fallan, la asignación ya se
      // guardó correctamente, pero el responsable debe saber que puede que
      // el publicador no se entere por esa vía y conviene avisarle a mano.
      let notificationFailed = false;

      if (personUid && personUid !== currentUid && effectiveTerritory) {
        // Notificación in-app (Notice)
        await saveNotice(congId, {
          id: crypto.randomUUID(),
          personUid: personUid,
          title: 'Nuevo territorio asignado',
          mensaje: `Se te ha asignado el territorio ${territoryLabel(effectiveTerritory)}.`,
          territoryId: effectiveTerritory.id,
          sentBy: currentUid,
          createdAt: now,
        });

        // Notificación Push
        await apiSendTerritoryPush(
          [personUid],
          'Nuevo territorio asignado',
          `Se te ha asignado el territorio ${territoryLabel(effectiveTerritory)}.`
        ).catch((err) => {
          console.error('Failed to send push', err);
          notificationFailed = true;
        });

        // Notificación por Correo
        const assignedPerson = persons.find(p => p.person_uid === personUid);
        const targetEmail = assignedPerson?.person_data?.email?.value;
        if (targetEmail) {
          try {
            await sendEmailNotification(
              targetEmail,
              `Nuevo territorio asignado: ${territoryLabel(effectiveTerritory)}`,
              `<p>Hola <strong>${escapeHTML(resolveName(personUid))}</strong>,</p>
               <p>Se te ha asignado el territorio <strong>${escapeHTML(territoryLabel(effectiveTerritory))}</strong>.</p>
               <div style="text-align: center; margin-top: 30px;">
                 <a href="https://eldacentro.com/congregation/territories?view=${effectiveTerritory.id}" class="btn">Ver Territorio</a>
               </div>`
            );
          } catch (err) {
            console.error('Failed to send email', err);
            notificationFailed = true;
          }
        }
      }

      onClose();

      if (notificationFailed) {
        displaySnackNotification({
          header: 'Territorio asignado',
          message: 'No se pudo enviar el aviso por correo o notificación push. El territorio ya quedó asignado, pero conviene avisar al publicador por otra vía.',
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

  const selectedPerson = personOptions.find((o) => o.uid === personUid) ?? null;
  const selectedTerritory =
    territoryOptions.find((o) => o.id === territoryId) ?? null;

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
        <Typography variant="h6" className="h2" sx={{ mb: 2, color: 'var(--ink)' }}>
          {isBulk
            ? `Asignar ${bulkTerritories!.length} territorios`
            : `Asignar territorio${isCampaign ? ' (campaña)' : ''}`}
        </Typography>

        <Stack spacing={2}>
          {isBulk ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                backgroundColor: 'var(--accent-100)',
                maxHeight: 140,
                overflowY: 'auto',
              }}
            >
              <Typography variant="body2" sx={{ color: 'var(--ink)' }}>
                {bulkTerritories!.map((t) => territoryLabel(t)).join(', ')}
              </Typography>
            </Box>
          ) : territory ? (
            <Typography variant="body2" color="var(--ink-2)">
              {territoryLabel(territory)}
            </Typography>
          ) : (
            <Autocomplete
              options={territoryOptions}
              value={selectedTerritory}
              onChange={(_, v) => setTerritoryId(v?.id ?? null)}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <MuiTextField {...params} label="Territorio" size="small" />
              )}
            />
          )}

          <Autocomplete
            options={personOptions}
            value={selectedPerson}
            onChange={(_, v) => setPersonUid(v?.uid ?? null)}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.uid === v.uid}
            renderInput={(params) => (
              <MuiTextField {...params} label="Publicador" size="small" />
            )}
          />
          <TextField
            label="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            multiline
            minRows={2}
          />
        </Stack>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button variant="tertiary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="main"
            onClick={handleAsignar}
            disabled={saving || !personUid || (!isBulk && !effectiveTerritory)}
          >
            {isBulk ? `Asignar ${bulkTerritories!.length}` : 'Asignar'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogAsignar;
