import { useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import accentSurface from '@components/accent_surface';
import Autocomplete from '@components/autocomplete';

/** Un publicador en el desplegable: lo que se guarda y lo que se lee. */
type PersonaOpcion = { uid: string; label: string };
import TextField from '@components/textfield';
import { personsActiveState } from '@states/persons';
import { buildPersonFullname, escapeHTML } from '@utils/common';
import { displaySnackNotification } from '@services/states/app';
import {
  COFullnameState,
  COLastnameState,
  COSpouseNameState,
  congIDState,
  congMasterKeyState,
  fullnameOptionState,
  userLocalUIDState,
} from '@states/settings';
import {
  CO_SPOUSE_UID,
  CO_UID,
  buildCoSpouseFullname,
  isCircuitOverseerUid,
} from '@utils/circuit_overseer';
import { usePersonName } from '@features/territories/usePersonName';
import SelectorTerritorio from './SelectorTerritorio';
import Checkbox from '@components/checkbox';
import {
  territoriesState,
  territoryZonesState,
  territoryAssignmentsState,
  territoriesLoadingState,
  territoryCampaignsState,
  territoryPendingRequestsState,
  territorySettingsState,
} from '@states/territories';
import { Territory, TerritoryAssignment } from '@definition/territories';
import {
  atenderRequest,
  saveAssignmentAndAttendRequest,
  saveAssignmentTransactional,
  saveNotice,
} from '@services/firebase/territories';
import { apiSendTerritoryPush } from '@services/api/territories';
import { sendEmailNotification } from '@services/firebase/email';
import {
  dueAtDeAsignacion,
  isCampaignRunning,
  territoryLabel,
  getZoneName,
  isInCooldown,
  formatTerritoryDate,
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
  /** Zona que pidió el solicitante, si dijo alguna. */
  preferredZoneId?: string;
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
  preferredZoneId,
}: Props) => {
  const isBulk = (bulkTerritories?.length ?? 0) > 0;
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const currentUid = useAtomValue(userLocalUIDState);
  const persons = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const coFullname = useAtomValue(COFullnameState);
  const coLastname = useAtomValue(COLastnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);
  const settings = useAtomValue(territorySettingsState);
  const territories = useAtomValue(territoriesState);
  const zonas = useAtomValue(territoryZonesState);
  const campaigns = useAtomValue(territoryCampaignsState);

  /**
   * La campaña que manda en esta asignación.
   *
   * Primero la que venga dicha (se entra desde una solicitud marcada de
   * campaña, o desde la propia pestaña Campañas). Y si no viene ninguna, la
   * que esté EN MARCHA hoy: durante una campaña se reparten los territorios
   * de la campaña, así que ofrecer los 130 sería ofrecer lo que no se va a
   * dar. Esto además arregla las solicitudes viejas —las que se enviaron
   * antes de que existiera el "Para: Campaña"— que no traen campaña escrita y
   * llegaban aquí sin filtrar nada.
   *
   * Con ella el selector se abre mostrando solo los territorios que la
   * campaña incluye, con un "Todos" al lado para salirse.
   */
  const campanaDeLaAsignacion =
    (campaignId ? campaigns.find((c) => c.id === campaignId) : undefined) ??
    campaigns.find(
      (c) =>
        c.estado !== 'pasada' && isCampaignRunning(c.fechaInicio, c.fechaFin)
    );

  /**
   * ¿Esta asignación cuenta como de campaña, y de cuál?
   *
   * Lo dice el territorio que se acabe eligiendo, no el sitio desde el que se
   * abrió el diálogo: si estamos en campaña y se da uno de los suyos, va
   * marcado como de campaña —que es lo que pone la "(C)" en el S-13—; si el
   * responsable se sale a "Todos" y da uno corriente, se registra corriente.
   *
   * Las dos cosas salen JUNTAS de aquí a propósito. Separadas se podían
   * separar de verdad, y una asignación marcada de campaña pero sin id de
   * campaña no la cerraría nadie al finalizarla: `closeCampaign` busca por
   * `campaignId`, así que se quedaría abierta para siempre luciendo una "(C)"
   * que ya no significa nada.
   */
  const marcaDeCampana = (
    territoryId: string | null | undefined
  ): { isCampaign: boolean; campaignId: string | undefined } => {
    const id = campanaDeLaAsignacion?.id ?? campaignId;
    const es =
      isCampaign ||
      Boolean(
        territoryId && campanaDeLaAsignacion?.territoryIds.includes(territoryId)
      );

    return es && id
      ? { isCampaign: true, campaignId: id }
      : { isCampaign: false, campaignId: undefined };
  };
  const resolveName = usePersonName();
  const allAssignments = useAtomValue(territoryAssignmentsState);
  const pendingRequests = useAtomValue(territoryPendingRequestsState);
  const cargandoTerritorios = useAtomValue(territoriesLoadingState);
  const [atenderSolicitud, setAtenderSolicitud] = useState(true);

  const personOptions = useMemo(() => {
    const real = persons.map((p) => ({
      uid: p.person_uid,
      label: buildPersonFullname(
        p.person_data.person_lastname.value,
        p.person_data.person_firstname.value,
        fullnameOption
      ),
    }));

    // El superintendente y su esposa se ofrecen aunque no estén en Personas
    // (a propósito: meterlos ahí los arrastraría a informes, reuniones y
    // estadísticas). Van los primeros y con su cargo, para que se distingan
    // de un hermano de la congregación. Ver `@utils/circuit_overseer`.
    const synthetic: { uid: string; label: string }[] = [];

    if (coFullname.trim().length > 0) {
      synthetic.push({
        uid: CO_UID,
        label: `${coFullname} · Superintendente de circuito`,
      });

      const spouse = buildCoSpouseFullname(
        coSpouseName,
        coLastname,
        fullnameOption
      );

      if (spouse.length > 0) {
        synthetic.push({
          uid: CO_SPOUSE_UID,
          label: `${spouse} · Esposa del superintendente`,
        });
      }
    }

    return [...synthetic, ...real];
  }, [persons, fullnameOption, coFullname, coLastname, coSpouseName]);

  const [personUid, setPersonUid] = useState<string | null>(null);
  /**
   * Los territorios que se van a dar. Casi siempre es uno, pero a veces un
   * hermano pide dos —o el responsable ve que le vienen bien dos de zonas
   * distintas— y antes eso eran dos vueltas enteras por este diálogo.
   */
  const [territoryIds, setTerritoryIds] = useState<string[]>([]);
  /** El selector está abierto para añadir otro más. */
  const [anadiendo, setAnadiendo] = useState(false);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPersonUid(defaultPersonUid ?? null);
      setTerritoryIds(territory ? [territory.id] : []);
      setAnadiendo(false);
      setNota('');
      setAtenderSolicitud(true);
    }
  }, [open, defaultPersonUid, territory]);

  if (!open) return null;

  /** Los elegidos, en objetos y en el orden en que se fueron eligiendo. */
  const elegidos = territory
    ? [territory]
    : (territoryIds
        .map((id) => territories.find((t) => t.id === id))
        .filter(Boolean) as Territory[]);

  const effectiveTerritory = elegidos[0] ?? null;

  /**
   * Solicitud pendiente que esta asignación deja atendida.
   *
   * `requestId` solo llega cuando se entra desde el botón «Asignar
   * territorio» de la propia solicitud. Pero lo habitual es lo otro: el
   * responsable ve la solicitud, se va a la cuadrícula de Territorios, elige
   * uno bueno y lo asigna desde ahí. Así la solicitud se quedaba pendiente
   * para siempre — el publicador no podía volver a pedir («ya tienes una
   * solicitud pendiente»), el puntito del engranaje no se apagaba nunca, y
   * otro responsable podía darle un SEGUNDO territorio creyendo que nadie
   * la había atendido. Si la persona a la que se asigna tiene una pendiente,
   * se cierra con la misma asignación.
   */
  const solicitudPendiente =
    pendingRequests.find((r) => r.personUid === personUid) ?? null;

  const requestIdEfectivo = requestId
    ? requestId
    : atenderSolicitud
      ? solicitudPendiente?.id
      : undefined;

  /** Asigna varios territorios a la vez al mismo publicador. Los que ya
   *  tengan una asignación abierta se omiten (igual que en el flujo de
   *  borrado masivo de la pestaña Territorios) en vez de bloquear todo el
   *  lote por uno solo. */
  const handleAsignarBulk = async (lista: Territory[]) => {
    if (!personUid || lista.length === 0) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const candidates = lista.filter(
        (t) =>
          !allAssignments.some((a) => a.territoryId === t.id && !a.returnedAt)
      );

      if (candidates.length === 0) {
        displaySnackNotification({
          header: 'Error',
          message: 'Todos los territorios seleccionados ya están asignados.',
          severity: 'error',
        });
        return;
      }

      // Cada territorio se asigna en su propia transacción (candado
      // openAssignmentId) — así, si otro responsable asignó alguno de estos
      // territorios justo antes (carrera real, no solo el chequeo previo
      // contra el snapshot local), esa transacción falla y el territorio se
      // cuenta como omitido de verdad, en vez de crear una asignación
      // duplicada.
      const results = await Promise.allSettled(
        candidates.map((t) =>
          saveAssignmentTransactional(
            congId,
            {
              id: crypto.randomUUID(),
              territoryId: t.id,
              personUid,
              assignedAt: now,
              dueAt: dueAtDeAsignacion(
                { assignedAt: now, ...marcaDeCampana(t.id) },
                campaigns,
                settings.daysUntilOverdue
              ),
              returnedAt: null,
              status: 'asignado',
              ...marcaDeCampana(t.id),
              notas: nota.trim() || undefined,
              assignedBy: currentUid || undefined,
              updatedAt: now,
            },
            masterKey ?? ''
          ).then(() => t)
        )
      );

      const toAssign = results
        .filter(
          (r): r is PromiseFulfilledResult<Territory> =>
            r.status === 'fulfilled'
        )
        .map((r) => r.value);
      const skipped =
        lista.length -
        candidates.length +
        results.filter((r) => r.status === 'rejected').length;

      if (toAssign.length === 0) {
        displaySnackNotification({
          header: 'Error',
          message:
            'No se pudo asignar ningún territorio: todos estaban ya ocupados o hubo un error al guardar.',
          severity: 'error',
        });
        return;
      }

      // Igual que en la asignación individual: si esta persona tenía una
      // solicitud pendiente, darle territorios la deja atendida. Aquí va
      // suelta y no dentro de la transacción porque son varias asignaciones
      // independientes; si falla, lo peor que pasa es que la solicitud siga
      // pendiente, que es exactamente el estado de antes.
      if (requestIdEfectivo) {
        await atenderRequest(congId, requestIdEfectivo, currentUid).catch(
          (err) =>
            console.error('No se pudo marcar la solicitud como atendida', err)
        );
      }

      let notificationFailed = false;

      // El superintendente y su esposa no tienen cuenta ni dispositivo: no hay
      // a quién avisar, así que se salta el aviso in-app, el push y el correo.
      if (personUid !== currentUid && !isCircuitOverseerUid(personUid)) {
        const labelsList = toAssign.map((t) => territoryLabel(t)).join(', ');
        const mensaje =
          toAssign.length === 1
            ? `Se te ha asignado 1 territorio: ${labelsList}.`
            : `Se te han asignado ${toAssign.length} territorios: ${labelsList}.`;

        await saveNotice(congId, {
          id: crypto.randomUUID(),
          personUid,
          title:
            toAssign.length === 1
              ? 'Nuevo territorio asignado'
              : 'Nuevos territorios asignados',
          mensaje,
          // Con varios territorios se apunta al PRIMERO. Sin `territoryId` el
          // aviso se quedaba sin botón "Ver territorio" y, al no ser
          // marcable como leído, se acumulaba en la campana para siempre sin
          // forma de quitarlo; además lucía el icono de otro módulo.
          territoryId: toAssign[0]?.id,
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
                 <a href="https://eldacentro.com/congregation/territories" class="btn">Ver territorios</a>
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
          message:
            'No se pudo enviar el aviso por correo o notificación push. Los territorios ya quedaron asignados, pero conviene avisar al publicador por otra vía.',
          severity: 'error',
        });
      } else {
        displaySnackNotification({
          header: '¡Listo!',
          message:
            skipped > 0
              ? `${toAssign.length} territorios asignados. ${skipped} se omitieron (ya estaban asignados o hubo un error al guardar).`
              : `${toAssign.length} territorios asignados correctamente.`,
          severity: 'success',
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

  const handleAsignar = async () => {
    if (isBulk) return handleAsignarBulk(bulkTerritories!);
    // Dos o más elegidos a mano van por el mismo camino que la selección
    // múltiple de la cuadrícula: cada uno en su transacción, un solo aviso.
    if (elegidos.length > 1) return handleAsignarBulk(elegidos);
    if (!personUid || !effectiveTerritory) return;
    // Comprobar si hay alguna asignación abierta (campaña O regular) para este territorio
    const hasOpenAssignment = allAssignments.some(
      (a) => a.territoryId === effectiveTerritory.id && !a.returnedAt
    );
    if (hasOpenAssignment) {
      displaySnackNotification({
        header: 'Error',
        message: 'Este territorio ya está asignado',
        severity: 'error',
      });
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
        dueAt: dueAtDeAsignacion(
          { assignedAt: now, ...marcaDeCampana(effectiveTerritory.id) },
          campaigns,
          settings.daysUntilOverdue
        ),
        // Explicit null (not omitted) so a future where('returnedAt','==',null)
        // query can find open assignments — Firestore equality filters don't
        // match documents where the field is simply absent.
        returnedAt: null,
        status: 'asignado',
        ...marcaDeCampana(effectiveTerritory.id),
        notas: nota.trim() || undefined,
        assignedBy: currentUid || undefined,
        updatedAt: now,
      };
      // Si viene de una solicitud, se guarda la asignación y se marca la
      // solicitud como atendida en un único batch atómico — antes eran dos
      // escrituras sueltas, y si la conexión se cortaba entre medias la
      // solicitud quedaba "pendiente" para siempre aunque el territorio ya
      // se había asignado.
      if (requestIdEfectivo) {
        await saveAssignmentAndAttendRequest(
          congId,
          assignment,
          masterKey ?? '',
          requestIdEfectivo,
          currentUid
        );
      } else {
        await saveAssignmentTransactional(congId, assignment, masterKey ?? '');
      }

      // Si le estamos asignando a una persona y no somos nosotros mismos, enviarle una notificación
      // El aviso in-app (Notice) sí queda registrado siempre dentro de la app;
      // push y email son solo un "extra" — si fallan, la asignación ya se
      // guardó correctamente, pero el responsable debe saber que puede que
      // el publicador no se entere por esa vía y conviene avisarle a mano.
      let notificationFailed = false;

      // Ver nota en el modo masivo: los centinelas del superintendente no
      // tienen destinatario real al que notificar.
      if (
        personUid &&
        personUid !== currentUid &&
        !isCircuitOverseerUid(personUid) &&
        effectiveTerritory
      ) {
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
          `Se te ha asignado el territorio ${territoryLabel(effectiveTerritory)}.`,
          effectiveTerritory.id
        ).catch((err) => {
          console.error('Failed to send push', err);
          notificationFailed = true;
        });

        // Notificación por Correo
        const assignedPerson = persons.find((p) => p.person_uid === personUid);
        const targetEmail = assignedPerson?.person_data?.email?.value;
        if (targetEmail) {
          try {
            await sendEmailNotification(
              targetEmail,
              `Nuevo territorio asignado: ${territoryLabel(effectiveTerritory)}`,
              `<p>Hola <strong>${escapeHTML(resolveName(personUid))}</strong>,</p>
               <p>Se te ha asignado el territorio <strong>${escapeHTML(territoryLabel(effectiveTerritory))}</strong>.</p>
               <div style="text-align: center; margin-top: 30px;">
                 <a href="https://eldacentro.com/congregation/territories?view=${effectiveTerritory.id}" class="btn">Ver territorio</a>
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
          message:
            'No se pudo enviar el aviso por correo o notificación push. El territorio ya quedó asignado, pero conviene avisar al publicador por otra vía.',
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

  const selectedPerson = personOptions.find((o) => o.uid === personUid) ?? null;
  return (
    <Dialog
      open={open}
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
        <Typography className="h2" sx={{ mb: 2, color: 'var(--ink)' }}>
          {isBulk
            ? `Asignar ${bulkTerritories!.length} territorios`
            : `Asignar territorio${campanaDeLaAsignacion ? ' (campaña)' : ''}`}
        </Typography>

        <Stack spacing={2}>
          {isBulk ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 'var(--shape-md)',
                backgroundColor: 'var(--accent-100)',
                maxHeight: 140,
                overflowY: 'auto',
              }}
            >
              <Typography
                className="body-small-regular"
                sx={{ color: 'var(--ink)' }}
              >
                {bulkTerritories!.map((t) => territoryLabel(t)).join(', ')}
              </Typography>
            </Box>
          ) : territory ? (
            // También con la zona delante: se entra aquí desde la ficha de un
            // territorio, pero lo que se lee tiene que decir lo mismo en todas
            // partes.
            <Typography className="body-small-regular" color="var(--ink-2)">
              {getZoneName(territory.zoneId, zonas)} {territoryLabel(territory)}
            </Typography>
          ) : (
            <Box>
              <Typography
                className="body-small-regular"
                sx={{ color: 'var(--ink-2)', mb: 0.75 }}
              >
                {elegidos.length > 1 ? 'Territorios' : 'Territorio'}
              </Typography>

              {/* Los elegidos, con su zona delante: un "20" a secas no dice
                  cuál es, porque hay un 20 en cada zona. */}
              <Stack spacing={1}>
                {elegidos.map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: '12px 14px',
                      borderRadius: 'var(--shape-md)',
                      border: '1px solid var(--accent-200)',
                      backgroundColor: 'var(--accent-100)',
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        className="body-regular-semibold"
                        sx={{ color: 'var(--ink)' }}
                      >
                        {getZoneName(t.zoneId, zonas)} {territoryLabel(t)}
                      </Typography>
                      <Typography
                        className="label-small-regular"
                        sx={{ color: 'var(--ink-2)' }}
                      >
                        {isInCooldown(t, settings.daysUntilReassignable ?? 30)
                          ? 'En descanso · '
                          : ''}
                        {t.lastWorkedAt
                          ? `Trabajado el ${formatTerritoryDate(t.lastWorkedAt, settings.dateFormat)}`
                          : 'Nunca trabajado'}
                      </Typography>
                    </Box>
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      onClick={() =>
                        setTerritoryIds((prev) =>
                          prev.filter((id) => id !== t.id)
                        )
                      }
                    >
                      Quitar
                    </Button>
                  </Box>
                ))}
              </Stack>

              {/* A veces piden dos, o el responsable ve que le vienen bien dos
                  de zonas distintas. Antes eso era pasar dos veces por todo
                  este diálogo. */}
              {elegidos.length > 0 && !anadiendo && (
                <Button
                  variant="secondary"
                  disableAutoStretch
                  onClick={() => setAnadiendo(true)}
                  sx={{ mt: 1 }}
                >
                  Añadir otro territorio
                </Button>
              )}

              {(elegidos.length === 0 || anadiendo) && (
                <Box sx={{ mt: elegidos.length > 0 ? 1.5 : 0 }}>
                  <SelectorTerritorio
                    onChange={(id) => {
                      setTerritoryIds((prev) => [...prev, id]);
                      setAnadiendo(false);
                    }}
                    excluir={territoryIds}
                    cargando={cargandoTerritorios}
                    campaignTerritoryIds={campanaDeLaAsignacion?.territoryIds}
                    campaignName={campanaDeLaAsignacion?.nombre}
                    zonaInicial={preferredZoneId}
                  />
                  {anadiendo && (
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      onClick={() => setAnadiendo(false)}
                      sx={{ mt: 1 }}
                    >
                      Cancelar
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}

          <Autocomplete
            options={personOptions}
            value={selectedPerson}
            onChange={(_, v) => setPersonUid((v as PersonaOpcion)?.uid ?? null)}
            getOptionLabel={(o: PersonaOpcion) => o.label}
            isOptionEqualToValue={(o: PersonaOpcion, v: PersonaOpcion) =>
              o.uid === v.uid
            }
            size="small"
            label="Publicador"
          />
          <TextField
            label="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            multiline
            minRows={2}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          justifyContent="flex-end"
          sx={{ mt: 3, flexWrap: 'wrap' }}
        >
          <Button
            variant="tertiary"
            disableAutoStretch
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="main"
            disableAutoStretch
            onClick={handleAsignar}
            disabled={saving || !personUid || (!isBulk && !effectiveTerritory)}
          >
            {isBulk
              ? `Asignar ${bulkTerritories!.length}`
              : elegidos.length > 1
                ? `Asignar ${elegidos.length}`
                : 'Asignar'}
          </Button>

          {/* Solicitud pendiente de esta persona.
              Se avisa ANTES de asignar y no con un diálogo después: enterarse
              de un efecto secundario cuando ya ha ocurrido desconcierta, y
              así además se puede desmarcar si se prefiere dejarla abierta
              (por ejemplo, si se le da un territorio pero seguía queriendo
              otro distinto). Va marcado por defecto, que es lo que se quiere
              casi siempre. */}
          {solicitudPendiente && !requestId && (
            <Box
              sx={{
                padding: '12px 14px',
                borderRadius: 'var(--shape-md)',
                backgroundColor: 'var(--accent-100)',
                ...(accentSurface('var(--accent-main)', {
                  tint: false,
                }) as object),
              }}
            >
              <Typography
                className="body-small-regular"
                sx={{ color: 'var(--ink)' }}
              >
                {resolveName(solicitudPendiente.personUid)} tiene una solicitud
                de territorio pendiente.
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Checkbox
                  checked={atenderSolicitud}
                  onChange={() => setAtenderSolicitud((v) => !v)}
                  label="Darla por atendida al asignar"
                />
              </Box>
            </Box>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogAsignar;
