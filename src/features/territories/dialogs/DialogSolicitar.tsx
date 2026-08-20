import { useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { congIDState, userLocalUIDState } from '@states/settings';
import { deleteRequest, saveRequest } from '@services/firebase/territories';
import { responsabilidadesState } from '@states/responsabilidades';
import { personsState } from '@states/persons';
import {
  territoryCampaignsState,
  territoryPendingRequestsState,
  territorySettingsState,
  territoryZonesSortedState,
} from '@states/territories';
import { TagChip } from '@features/territories/ui';
import FilterChip from '@components/filter_chip';
import {
  formatTerritoryDate,
  isCampaignRunning,
} from '@services/app/territories';
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
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const campaigns = useAtomValue(territoryCampaignsState);
  const zonas = useAtomValue(territoryZonesSortedState);

  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  /** Campaña elegida, o null para "territorio normal". */
  const [campaignId, setCampaignId] = useState<string | null>(null);
  /** Zona preferida, o null para "cualquiera". */
  const [zoneId, setZoneId] = useState<string | null>(null);

  /**
   * Las campañas que todavía no han terminado, la que antes empiece primero.
   * Una campaña 'pasada' no se ofrece: pedir para algo que ya acabó no
   * significa nada.
   */
  const campanasAbiertas = useMemo(
    () =>
      campaigns
        .filter((c) => c.estado !== 'pasada')
        .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
    [campaigns]
  );

  const campanaElegida = campanasAbiertas.find((c) => c.id === campaignId);

  useEffect(() => {
    if (!open) return;
    setNota('');

    setZoneId(null);

    // Con una campaña abierta, viene marcada: es lo que se pide casi siempre
    // mientras dura. La que todavía no ha empezado también, pero diciéndolo
    // debajo ("todavía no ha empezado") — si lo que quiere es un territorio
    // corriente para estos días de en medio, lo desmarca de un toque.
    setCampaignId(campanasAbiertas[0]?.id ?? null);
  }, [open, campanasAbiertas]);

  /** La solicitud pendiente de quien está mirando, si tiene alguna. */
  const miSolicitud = pendingRequests.find((r) => r.personUid === uid);

  const handleRetirar = async () => {
    if (!miSolicitud) return;
    setSaving(true);
    try {
      await deleteRequest(congId, miSolicitud.id);
      onClose();
      displaySnackNotification({
        header: 'Solicitud retirada',
        message:
          'Ya no consta ninguna solicitud tuya. Puedes volver a pedir un territorio cuando quieras.',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);
      displaySnackNotification({
        header: 'No se pudo retirar',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSolicitar = async () => {
    // Sin `uid` la cuenta no está enlazada con su ficha de Persona. Antes
    // esto era un `return` mudo: el botón respondía visualmente y no pasaba
    // absolutamente nada, indefinidamente, sin ninguna pista del motivo.
    if (!uid) {
      displaySnackNotification({
        header: 'No se puede enviar la solicitud',
        message:
          'Tu cuenta todavía no está enlazada con tu ficha de publicador. Pídele a un responsable que la vincule.',
        severity: 'error',
      });
      return;
    }
    setSaving(true);
    try {
      await saveRequest(congId, {
        id: crypto.randomUUID(),
        personUid: uid,
        nota: nota.trim() || undefined,
        campaignId: campaignId ?? undefined,
        zoneId: zoneId ?? undefined,
        createdAt: new Date().toISOString(),
      });

      // Si settings.managers está disponible, lo usamos (resuelve el problema de los publicadores sin acceso a responsabilidades/persons)
      let targets: string[] = [];
      let targetEmails: string[] = [];

      if (settings?.managers && settings.managers.length > 0) {
        targets = settings.managers.map((m) => m.uid);
        targetEmails = settings.managers.map((m) => m.email).filter(Boolean);
      } else if (responsabilidades) {
        targets = getTerritoryManagersUids(responsabilidades);
        targetEmails = targets
          .map(
            (targetUid) =>
              persons.find((p) => p.person_uid === targetUid)?.person_data
                ?.email?.value
          )
          .filter((email) => !!email) as string[];
      }

      // Si el aviso a los responsables falla, la solicitud ya quedó
      // guardada igual (y seguirá viéndose dentro de la app) — pero quien la
      // mandó debe saber que puede tardar más en que alguien se entere.
      let notifyFailed = false;

      if (targets.length > 0) {
        const applicantName = resolveName(uid);
        const notaHTML = nota.trim()
          ? `<p><strong>Nota:</strong> ${escapeHTML(nota.trim())}</p>`
          : '';

        // No se crea un TerritoryNotice aquí a propósito: el propio
        // TerritoryRequest ya alimenta, vía suscripción en tiempo real, la
        // notificación accionable con botón "Asignar territorio" (ver
        // useTerritoryRequestsNotifications + TerritoryAccessRequest). Crear
        // también un Notice generaba un segundo aviso duplicado para lo
        // mismo, que además no se quitaba al actuar sobre el primero.
        await apiSendTerritoryPush(
          targets,
          'Solicitud de territorio',
          `${applicantName} ha solicitado un territorio.${nota.trim() ? ' Incluye una nota.' : ''}`
        ).catch((err) => {
          console.error('Failed to send push', err);
          notifyFailed = true;
        });

        if (targetEmails.length > 0) {
          try {
            await Promise.all(
              targetEmails.map((email) =>
                sendEmailNotification(
                  email,
                  `Nueva solicitud de territorio: ${escapeHTML(applicantName)}`,
                  `<p>El publicador <strong>${escapeHTML(applicantName)}</strong> ha solicitado un territorio nuevo.</p>
                   ${notaHTML}
                   <div style="text-align: center; margin-top: 30px;">
                     <a href="https://eldacentro.com/congregation/territories" class="btn">Abrir aplicación</a>
                   </div>`
                )
              )
            );
          } catch (err) {
            console.error('Failed to send email', err);
            notifyFailed = true;
          }
        }
      }

      onClose();
      displaySnackNotification(
        notifyFailed
          ? {
              header: 'Solicitud enviada',
              message:
                'No se pudo avisar a los responsables por correo o notificación push. Tu solicitud ya quedó registrada, pero puede tardar más en que la vean.',
              severity: 'error',
            }
          : targets.length === 0
            ? {
                // No había a quién avisar (p. ej. ningún responsable ha
                // abierto Territorios desde el último cambio de
                // departamento). Antes se decía "enviada correctamente" y el
                // hermano esperaba días a un aviso que nunca salió.
                header: 'Solicitud registrada',
                message:
                  'No hay ningún responsable de territorios configurado, así que no se ha podido avisar a nadie. Tu solicitud queda guardada; coméntaselo a un responsable.',
                severity: 'error',
              }
            : {
                header: '¡Listo!',
                message: 'Solicitud enviada correctamente',
                severity: 'success',
              }
      );
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
        <Typography className="h2" sx={{ mb: 1, color: 'var(--ink)' }}>
          Solicitar territorio
        </Typography>
        <Typography
          className="body-small-regular"
          color="var(--ink-2)"
          sx={{ mb: 2 }}
        >
          Tu solicitud llegará a los responsables del departamento de
          Territorios. Si prefieres algo más —casas bajas, con ascensores, uno
          pequeño…— escríbelo en la nota.
        </Typography>

        {miSolicitud ? (
          // Antes esto era solo un aviso sin salida: quien pedía un territorio
          // por error, o lo conseguía hablando con un responsable en el salón,
          // se quedaba con la solicitud pendiente PARA SIEMPRE. No podía
          // volver a pedir ("ya tienes una pendiente") y a los responsables
          // les quedaba en la lista sin que nadie tuviera que hacer nada.
          <>
            <Typography
              className="body-regular"
              sx={{ color: 'var(--ink)', py: 1, textAlign: 'center' }}
            >
              Ya tienes una solicitud de territorio pendiente. Los responsables
              la verán en cuanto puedan.
            </Typography>
            <Typography
              className="body-small-regular"
              sx={{ color: 'var(--ink-2)', textAlign: 'center', mb: 1 }}
            >
              Si ya no la necesitas —porque te han dado un territorio o porque
              la enviaste sin querer— puedes retirarla.
            </Typography>
            <Stack
              direction="row"
              spacing={1.5}
              justifyContent="flex-end"
              sx={{ mt: 2 }}
            >
              <Button variant="tertiary" onClick={onClose} disabled={saving}>
                Cerrar
              </Button>
              <Button
                variant="secondary"
                color="red"
                onClick={handleRetirar}
                disabled={saving}
              >
                {saving ? 'Retirando…' : 'Retirar solicitud'}
              </Button>
            </Stack>
          </>
        ) : (
          <>
            {/* ¿Para la campaña o normal? Solo aparece si hay alguna campaña
                sin terminar — el resto del año esto no existe.

                Se pregunta en vez de deducirlo de la fecha porque no es lo
                mismo: puede haber una campaña creada que empieza dentro de
                quince días, y en esos quince días lo que se pide es un
                territorio corriente. */}
            {campanasAbiertas.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  className="label-small-semibold"
                  color="var(--ink-3)"
                  sx={{ display: 'block', mb: 0.75 }}
                >
                  Para
                </Typography>
                {/* La campaña PRIMERO: mientras dura es lo que se pide casi
                    siempre, y es lo que viene marcado.

                    Con una sola campaña abierta el chip dice "Campaña" a
                    secas — el nombre entero no cabe bien y además está
                    escrito justo debajo, con sus fechas. Con dos o más sí
                    hace falta el nombre para poder distinguirlas. */}
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: '6px' }}>
                  {campanasAbiertas.map((c) => (
                    <FilterChip
                      key={c.id}
                      label={
                        campanasAbiertas.length === 1 ? 'Campaña' : c.nombre
                      }
                      selected={campaignId === c.id}
                      onClick={() => setCampaignId(c.id)}
                    />
                  ))}
                  <FilterChip
                    label="Predicación normal"
                    selected={campaignId === null}
                    onClick={() => setCampaignId(null)}
                  />
                </Stack>

                {/* Las fechas de la campaña elegida, y si todavía no ha
                    empezado se dice — que es justo el caso en el que a lo
                    mejor no la quiere. */}
                {campanaElegida && (
                  <Typography
                    className="label-small-regular"
                    color="var(--ink-2)"
                    sx={{ display: 'block', mt: 0.75 }}
                  >
                    Del{' '}
                    {formatTerritoryDate(
                      campanaElegida.fechaInicio,
                      settings.dateFormat
                    )}{' '}
                    al{' '}
                    {formatTerritoryDate(
                      campanaElegida.fechaFin,
                      settings.dateFormat
                    )}
                    {!isCampaignRunning(
                      campanaElegida.fechaInicio,
                      campanaElegida.fechaFin
                    ) && ' · todavía no ha empezado'}
                  </Typography>
                )}
              </Box>
            )}

            {/* La zona que prefiere. Es una PREFERENCIA, no una condición: el
                responsable la ve y el selector se le abre por ahí, pero puede
                darle otra. Va siempre, haya campaña o no — "de Salinas, que me
                pilla al lado" es de lo más común que se escribía a mano en la
                nota.

                Con el color de cada zona, que es como se reconocen en todo el
                módulo: la cápsula de las tarjetas, el mapa, las cabeceras.
                "Cualquiera" lleva punto gris — es una opción más, no la
                ausencia de opción. */}
            {zonas.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  className="label-small-semibold"
                  color="var(--ink-3)"
                  sx={{ display: 'block', mb: 0.75 }}
                >
                  Zona
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: '6px' }}>
                  <TagChip
                    label="Cualquiera"
                    color="var(--ink-3)"
                    selected={zoneId === null}
                    onClick={() => setZoneId(null)}
                  />
                  {zonas.map((z) => (
                    <TagChip
                      key={z.id}
                      label={z.nombre}
                      color={z.color}
                      selected={zoneId === z.id}
                      onClick={() => setZoneId(z.id)}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Typography
              className="label-small-semibold"
              color="var(--ink-3)"
              sx={{ display: 'block', mb: 0.5 }}
            >
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
              <Button
                variant="main"
                onClick={handleSolicitar}
                disabled={saving}
              >
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
