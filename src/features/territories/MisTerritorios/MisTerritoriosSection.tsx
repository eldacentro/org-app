import { useMemo, useState } from 'react';
import { Box, Stack, IconButton } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import Badge from '@components/badge';
import InfoTip from '@components/info_tip';
import { IconClose } from '@components/icons';
import { TerritoryCard, MetaItem } from '@features/territories/ui';
import { congIDState, userLocalUIDState } from '@states/settings';
import { fieldGroupsState } from '@states/field_service_groups';
import { markNoticeRead } from '@services/firebase/territories';
import { displaySnackNotification } from '@services/states/app';
import {
  myTerritoryAssignmentsState,
  myUnreadNoticesState,
  territoriesState,
  territoryOpenAssignmentsState,
  territoryZonesState,
  territorySettingsState,
  territoriesLoadingState,
} from '@states/territories';
import { Territory, TerritoryAssignment } from '@definition/territories';
import {
  formatTerritoryDate,
  getZoneColor,
  getZoneName,
  isOverdue,
  computeDueAt,
} from '@services/app/territories';
import { usePersonName } from '@features/territories/usePersonName';
import TerritoryThumbnail from '@features/territories/TerritoryThumbnail';

type Props = {
  onView: (territory: Territory) => void;
  onEntregar: (assignment: TerritoryAssignment) => void;
};

/** Insignia "Campaña" — antes solo se mostraba en la lista personal; los
 *  compañeros de grupo (publishersCanSeeGroup) veían una asignación de
 *  campaña como si fuera normal, sin poder distinguirla.
 *
 *  Es el `Badge` compartido de la app, no una caja a medida: la de antes
 *  tenía su propio `fontSize: 0.75rem` y `fontWeight: 600` sueltos, así que
 *  no encajaba con ninguna otra etiqueta de la aplicación. */
const CampanaBadge = () => <Badge size="small" color="accent" text="Campaña" />;

/** Sección "Mis territorios": territorios actualmente asignados al usuario. */
const MisTerritoriosSection = ({ onView, onEntregar }: Props) => {
  const myAssignments = useAtomValue(myTerritoryAssignmentsState);
  const loading = useAtomValue(territoriesLoadingState);
  const openAssignments = useAtomValue(territoryOpenAssignmentsState);
  const notices = useAtomValue(myUnreadNoticesState);
  const territories = useAtomValue(territoriesState);
  const zones = useAtomValue(territoryZonesState);
  const settings = useAtomValue(territorySettingsState);
  const congId = useAtomValue(congIDState);
  const uid = useAtomValue(userLocalUIDState);
  const fieldGroups = useAtomValue(fieldGroupsState);
  const resolveName = usePersonName();

  // Ocultar de inmediato el aviso al descartarlo, sin esperar a que el
  // cambio de `leido` en Firestore se propague de vuelta al estado local.
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(new Set());

  const visibleNotices = useMemo(
    () => notices.filter((n) => !dismissedNoticeIds.has(n.id)),
    [notices, dismissedNoticeIds]
  );

  const handleDismissNotice = (noticeId: string) => {
    setDismissedNoticeIds((prev) => new Set(prev).add(noticeId));
    markNoticeRead(congId, noticeId).catch((err) => {
      console.error(err);
      // Sin esto, al fallar el aviso simplemente no desaparecía y
      // quien hizo clic en la X no tenía forma de saber por qué.
      displaySnackNotification({
        header: 'Error',
        message: 'No se pudo descartar el aviso. Inténtalo de nuevo.',
        severity: 'error',
      });
      setDismissedNoticeIds((prev) => {
        const next = new Set(prev);
        next.delete(noticeId);
        return next;
      });
    });
  };

  const rows = useMemo(
    () =>
      myAssignments
        .map((a) => ({
          assignment: a,
          territory: territories.find((t) => t.id === a.territoryId),
        }))
        .filter((r): r is { assignment: TerritoryAssignment; territory: Territory } =>
          Boolean(r.territory)
        ),
    [myAssignments, territories]
  );

  /** Asignaciones abiertas de los compañeros del mismo grupo de predicación. */
  const groupRows = useMemo(() => {
    if (!settings.publishersCanSeeGroup || !uid) return [];

    const myGroup = fieldGroups.find((g) =>
      g.group_data.members.some((m) => m.person_uid === uid)
    );
    if (!myGroup) return [];

    const memberUids = myGroup.group_data.members
      .map((m) => m.person_uid)
      .filter((id) => id !== uid);

    return openAssignments
      .filter((a) => memberUids.includes(a.personUid))
      .map((a) => ({
        assignment: a,
        territory: territories.find((t) => t.id === a.territoryId),
      }))
      .filter(
        (r): r is { assignment: TerritoryAssignment; territory: Territory } =>
          Boolean(r.territory)
      );
  }, [settings.publishersCanSeeGroup, uid, fieldGroups, openAssignments, territories]);

  const noticesBanner = visibleNotices.length > 0 && (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {visibleNotices.map((n) => {
        // Antes el aviso solo se podía descartar — si de verdad trataba de
        // uno de mis territorios (ej. "territorio atrasado"), había que
        // bajar a buscarlo en la lista para poder entregarlo. Con este botón
        // se puede hacer directo desde el propio aviso. Incluye las de
        // campaña: entregar individualmente un territorio de campaña es un
        // caso válido (queda registrado con SU fecha de entrega); el cierre
        // de la campaña solo auto-entrega las que sigan abiertas.
        const matchingRow = rows.find((r) => r.territory.id === n.territoryId);
        return (
          <Box key={n.id} sx={{ position: 'relative' }}>
            <InfoTip
              color="warning"
              isBig={false}
              text={n.mensaje}
              sx={{ pr: 5 }}
            />
            <IconButton
              onClick={() => handleDismissNotice(n.id)}
              size="small"
              sx={{ position: 'absolute', top: 8, right: 8 }}
              aria-label="Descartar aviso"
            >
              <IconClose color="var(--ink-2)" width={16} height={16} />
            </IconButton>
            {/* El botón iba SUELTO debajo del aviso, con `variant="small"` —
                que se pinta sin fondo ni borde. Fuera de la caja del aviso y
                sin nada que lo dibujara, se leía como una línea de texto
                perdida entre el aviso y la lista, no como algo que se pulsa.
                Va dentro del aviso y con la forma de un botón de verdad. */}
            {matchingRow && (
              <Box sx={{ mt: '-4px', mb: '12px', pl: '16px' }}>
                <Button
                  variant="tertiary"
                  disableAutoStretch
                  onClick={() => onEntregar(matchingRow.assignment)}
                  disabled={!settings.publishersCanReturn}
                >
                  Entregar territorio
                </Button>
                {!settings.publishersCanReturn && (
                  <Typography className="label-small-regular" color="var(--ink-2)" sx={{ display: 'block', mt: 0.5 }}>
                    Solo un responsable puede marcar este territorio como entregado.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );

  // ── Territorios del grupo de predicación ─────────────────────────────
  // Se define aquí arriba (y no dentro del return final) porque también
  // debe verse cuando uno NO tiene ningún territorio propio — que es
  // justo cuando más sentido tiene mirar qué lleva el grupo. Antes el
  // return temprano de abajo se lo comía por completo.
  const groupSection = groupRows.length > 0 && (
    <Box sx={{ mt: 3 }}>
      <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
        Territorios del grupo ({groupRows.length})
      </Typography>
      <Stack spacing={1.5}>
        {groupRows.map(({ assignment, territory }) => {
          const color = getZoneColor(territory.zoneId, zones);
          return (
            // Es de un compañero, no mío: se distingue con el borde
            // discontinuo de `muted`. Antes se bajaba la opacidad al 85%, que
            // apaga por igual el texto y lo deja por debajo del contraste
            // mínimo — la diferencia se nota mejor en el trazo que en la
            // legibilidad.
            <TerritoryCard key={assignment.id} accent={color} muted>
              <Stack
                direction={{ mobile: 'column', tablet600: 'row' }}
                alignItems={{ mobile: 'stretch', tablet600: 'center' }}
                spacing={1.5}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Typography className="body-regular-semibold" color="var(--ink)">
                      {getZoneName(territory.zoneId, zones)} {territory.numero}
                    </Typography>
                    {assignment.isCampaign && <CampanaBadge />}
                  </Stack>
                  <Typography className="body-small-regular" color="var(--ink-2)">
                    {resolveName(assignment.personUid)} · desde el{' '}
                    {formatTerritoryDate(assignment.assignedAt, settings.dateFormat)}
                  </Typography>
                </Box>
                <Button variant="tertiary" disableAutoStretch onClick={() => onView(territory)}>
                  Ver
                </Button>
              </Stack>
            </TerritoryCard>
          );
        })}
      </Stack>
    </Box>
  );

  if (rows.length === 0) {
    return (
      <Box>
        <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
          Mis territorios
        </Typography>
        {noticesBanner}
        <Typography className="body-small-regular" color="var(--ink-2)">
          {loading
            ? 'Cargando tus territorios…'
            : 'No tienes territorios asignados ahora mismo. Puedes solicitar uno.'}
        </Typography>
        {groupSection}
      </Box>
    );
  }

  return (
    <Box>
      <Typography className="h2" sx={{ color: 'var(--ink)', mb: 1 }}>
        Mis territorios ({rows.length})
      </Typography>
      {noticesBanner}
      <Stack spacing={1.5}>
        {rows.map(({ assignment, territory }) => {
          const overdue = isOverdue(assignment.assignedAt, settings.daysUntilOverdue);
          const color = getZoneColor(territory.zoneId, zones);
          return (
            <TerritoryCard key={assignment.id} accent={color}>
              {/* Una sola fila: identidad, datos y acciones. Antes las
                  acciones colgaban DEBAJO de todo a lo ancho de la tarjeta,
                  así que en un portátil quedaban dos botones pequeños
                  pegados al margen izquierdo y ochocientos píxeles de vacío
                  a su derecha. Aquí se van al extremo contrario en cuanto
                  hay sitio, y solo bajan cuando de verdad no cabe. */}
              <Stack
                direction={{ mobile: 'column', tablet600: 'row' }}
                alignItems={{ mobile: 'stretch', tablet600: 'center' }}
                spacing={2}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  <TerritoryThumbnail geometry={territory.geometry} color={color} />

                  <Box sx={{ minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                    >
                      {/* El nombre propio del territorio ya no se cose al
                          título con un guion largo: "Elda - Urbano 3 —
                          Barrio de las Trescientas y pico viviendas" era una
                          línea de sesenta caracteres con dos separadores
                          distintos. El número identifica, el nombre describe;
                          son dos niveles y ahora se ven como dos. */}
                      <Typography className="body-regular-semibold" color="var(--ink)">
                        {getZoneName(territory.zoneId, zones)} {territory.numero}
                      </Typography>
                      {assignment.isCampaign && <CampanaBadge />}
                      {overdue && <Badge size="small" color="red" text="Atrasado" />}
                    </Stack>

                    {territory.nombre && (
                      <Typography className="body-small-regular" color="var(--ink-2)">
                        {territory.nombre}
                      </Typography>
                    )}

                    {/* Antes iba todo corrido ("Asignado: … / Vence: …") con
                        el rótulo pesando lo mismo que el dato. */}
                    <Stack direction="row" spacing={3} sx={{ mt: '8px' }}>
                      <MetaItem
                        label="Asignado"
                        value={formatTerritoryDate(assignment.assignedAt, settings.dateFormat)}
                      />
                      <MetaItem
                        label="Vence"
                        tone={overdue ? 'danger' : undefined}
                        value={formatTerritoryDate(
                          assignment.dueAt ||
                            computeDueAt(assignment.assignedAt, settings.daysUntilOverdue),
                          settings.dateFormat
                        )}
                      />
                    </Stack>
                  </Box>
                </Stack>

                {/* "Ver territorio" es el principal: es el que más se usa,
                    con diferencia — "Entregar" es una acción puntual. */}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexShrink: 0, alignItems: 'center' }}
                >
                  <Button variant="main" disableAutoStretch onClick={() => onView(territory)}>
                    Ver territorio
                  </Button>
                  {/* Antes este botón simplemente desaparecía si la opción
                      estaba desactivada, sin explicar por qué — ahora se ve
                      pero deshabilitado, con el motivo. */}
                  <Button
                    variant="tertiary"
                    disableAutoStretch
                    onClick={() => onEntregar(assignment)}
                    disabled={!settings.publishersCanReturn}
                  >
                    Entregar
                  </Button>
                </Stack>
              </Stack>

              {!settings.publishersCanReturn && (
                <Typography
                  className="label-small-regular"
                  color="var(--ink-2)"
                  sx={{ display: 'block', mt: 1 }}
                >
                  Solo un responsable puede marcar este territorio como entregado.
                </Typography>
              )}
            </TerritoryCard>
          );
        })}
      </Stack>

      {groupSection}
    </Box>
  );
};

export default MisTerritoriosSection;
