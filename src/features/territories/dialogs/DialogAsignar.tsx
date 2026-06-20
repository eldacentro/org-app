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
  defaultPersonUid,
  requestId,
  isCampaign = false,
  campaignId,
}: Props) => {
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

  const handleAsignar = async () => {
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
        ).catch((err) => console.error('Failed to send push', err));

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
                 <a href="https://app.eldacentro.com/congregation/territories?view=${effectiveTerritory.id}" class="btn">Ver Territorio</a>
               </div>`
            );
          } catch (err) {
            console.error('Failed to send email', err);
          }
        }
      }

      onClose();
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
          Asignar territorio{isCampaign ? ' (campaña)' : ''}
        </Typography>

        <Stack spacing={2}>
          {territory ? (
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
            disabled={saving || !personUid || !effectiveTerritory}
          >
            Asignar
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogAsignar;
