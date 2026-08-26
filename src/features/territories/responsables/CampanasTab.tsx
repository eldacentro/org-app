import { useMemo, useState } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import { Box, Stack, Collapse } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import Badge from '@components/badge';
import { IconDelete, IconExpand } from '@components/icons';
import {
  AbrirTerritorio,
  TagChip,
  TerritoryCard,
} from '@features/territories/ui';
import { congIDState } from '@states/settings';
import {
  territoriesState,
  territoryCampaignsState,
  territoryAssignmentsState,
  territoryZonesState,
  territoryTagsState,
} from '@states/territories';
import {
  Territory,
  TerritoryAssignment,
  TerritoryCampaign,
  TerritoryTag,
} from '@definition/territories';
import {
  addCampaignTerritories,
  removeCampaignTerritory,
  deleteCampaign,
  closeCampaign,
} from '@services/firebase/territories';
import {
  formatTerritoryDate,
  getZoneName,
  territoryLabel,
} from '@services/app/territories';
import { territorySettingsState } from '@states/territories';
import DialogCrearCampana from './DialogCrearCampana';
import DialogSeleccionarTerritorios from './DialogSeleccionarTerritorios';
import { displaySnackNotification } from '@services/states/app';
import { usePersonName } from '@features/territories/usePersonName';

/**
 * La barra de cómo va una campaña: lo que queda por dar, lo que está en
 * manos de alguien y lo que ya está entregado.
 *
 * Tres tramos y no un porcentaje: "60%" no dice de qué, y aquí lo que se
 * mira es si queda algo por repartir.
 */
const BarraCampana = ({
  sinAsignar,
  asignados,
  entregados,
}: {
  sinAsignar: number;
  asignados: number;
  entregados: number;
}) => {
  const total = sinAsignar + asignados + entregados;
  if (total === 0) return null;

  // En el mismo orden en que se leen los números de debajo. Una barra de
  // tramos no tiene un orden "correcto" como sí lo tiene una de progreso, y
  // que no coincida con su propia leyenda es lo único que la haría ilegible.
  const tramos = [
    { n: sinAsignar, color: 'var(--accent-main)' },
    { n: asignados, color: 'var(--orange-main)' },
    { n: entregados, color: 'var(--green-main)' },
  ].filter(({ n }) => n > 0);

  return (
    <Box
      aria-hidden
      sx={{
        display: 'flex',
        gap: '2px',
        height: 6,
        borderRadius: 'var(--shape-full)',
        overflow: 'hidden',
      }}
    >
      {tramos.map(({ n, color }, i) => (
        <Box
          key={i}
          sx={{
            flexGrow: n,
            backgroundColor: color,
            borderRadius: 'var(--shape-full)',
          }}
        />
      ))}
    </Box>
  );
};

/** Un número con su punto de color y su palabra. */
const Leyenda = ({
  color,
  n,
  texto,
}: {
  color: string;
  n: number;
  texto: string;
}) =>
  n === 0 ? null : (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Box
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: 'var(--shape-full)',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <Typography className="label-small-regular" color="var(--ink-2)">
        <strong style={{ color: 'var(--ink)' }}>{n}</strong> {texto}
      </Typography>
    </Stack>
  );

type Props = {
  onAsignarCampana: (territory: Territory, campaignId: string) => void;
  onView: (territory: Territory) => void;
};

const estadoColor: Record<string, string> = {
  activa: 'var(--green-main)',
  planificada: 'var(--accent-main)',
  pasada: 'var(--grey-400)',
};

/** El estado de la campaña, con la misma etiqueta que todo lo demás. Antes
 *  era una caja a medida que se pintaba mezclando el color con `1A` y `33`
 *  en hexadecimal — un truco que solo funciona si el color es un HEX
 *  literal, y `var(--ink-2)` no lo es: en las campañas pasadas el fondo
 *  salía transparente y el borde, invisible. */
const ESTADO_BADGE: Record<string, 'green' | 'accent' | 'grey'> = {
  activa: 'green',
  planificada: 'accent',
  pasada: 'grey',
};

const ESTADO_TEXTO: Record<string, string> = {
  activa: 'Activa',
  planificada: 'Planificada',
  pasada: 'Pasada',
};

const CampanasTab = ({ onAsignarCampana, onView }: Props) => {
  const congId = useAtomValue(congIDState);
  const campaigns = useAtomValue(territoryCampaignsState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const zones = useAtomValue(territoryZonesState);
  const tags = useAtomValue(territoryTagsState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const [openCrear, setOpenCrear] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  /** Qué campaña tiene abierto el detalle por zonas. */
  const [desglose, setDesglose] = useState<string | null>(null);
  const [selectingFor, setSelectingFor] = useState<TerritoryCampaign | null>(
    null
  );
  const { confirm, ConfirmDialogNode } = useConfirm();

  // Para cada territorio, determinamos su estado actual para mostrarlo
  // en el diálogo al elegir territorios para una campaña.
  const territoryStatusMap = useMemo(() => {
    const map = new Map<
      string,
      { status: 'assigned' | 'free' | 'never'; date: string | null }
    >();
    for (const t of territories) {
      const isOpen = assignments.some(
        (a) => a.territoryId === t.id && !a.returnedAt
      );
      if (isOpen) {
        map.set(t.id, { status: 'assigned', date: null });
      } else if (t.lastWorkedAt) {
        map.set(t.id, { status: 'free', date: t.lastWorkedAt });
      } else {
        map.set(t.id, { status: 'never', date: null });
      }
    }
    return map;
  }, [territories, assignments]);

  // El cierre (manual o automático al pasar fechaFin) vive centralizado en
  // services/firebase/territories.ts — el auto-cierre en sí corre en
  // useTerritories.tsx, para cualquier responsable con la app abierta, no
  // solo si tiene esta pestaña abierta. Aquí solo se usa para el botón
  // "Finalizar" manual.

  const sorted = useMemo(() => {
    const order = { activa: 0, planificada: 1, pasada: 2 } as const;
    return [...campaigns].sort(
      (a, b) =>
        order[a.estado] - order[b.estado] ||
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
    );
  }, [campaigns]);

  const handleAddTerritories = async (
    c: TerritoryCampaign,
    territoryIds: string[]
  ) => {
    const newIds = territoryIds.filter((id) => !c.territoryIds.includes(id));
    if (newIds.length === 0) return;
    try {
      await addCampaignTerritories(congId, c.id, newIds);
      displaySnackNotification({
        severity: 'success',
        header: 'Territorios añadidos',
        message:
          newIds.length === 1
            ? `1 territorio añadido a "${c.nombre}".`
            : `${newIds.length} territorios añadidos a "${c.nombre}".`,
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudieron añadir los territorios a la campaña.',
      });
    }
  };

  const handleRemoveTerritory = async (
    c: TerritoryCampaign,
    territoryId: string
  ) => {
    // Si el territorio está asignado dentro de esta campaña, quitarlo de la
    // lista lo dejaría asignado pero fuera de la campaña: nadie lo vería
    // aquí y el cierre de la campaña ya no lo devolvería. Hay que avisar.
    const openHere = assignments.some(
      (a) =>
        a.campaignId === c.id && a.territoryId === territoryId && !a.returnedAt
    );
    if (openHere) {
      const t = territories.find((x) => x.id === territoryId);
      const ok = await confirm({
        title: 'Quitar territorio asignado',
        message: `${t ? territoryLabel(t) : 'Este territorio'} está asignado ahora mismo dentro de esta campaña. Si lo quitas, seguirá asignado pero ya no se devolverá al finalizar la campaña: tendrás que entregarlo a mano desde "Asignaciones". ¿Quitarlo igualmente?`,
        confirmLabel: 'Quitar',
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await removeCampaignTerritory(congId, c.id, territoryId);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo quitar el territorio de la campaña.',
      });
    }
  };

  const handleFinalizeCampaign = async (c: TerritoryCampaign) => {
    const ok = await confirm({
      title: 'Finalizar campaña',
      message: `¿Finalizar la campaña "${c.nombre}"? Se devolverán todos los territorios abiertos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Finalizar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await closeCampaign(congId, c);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo finalizar la campaña.',
      });
    }
  };

  const handleDelete = async (c: TerritoryCampaign) => {
    const ok = await confirm({
      title: 'Borrar campaña',
      message: `¿Borrar la campaña "${c.nombre}"? Esto también borra sus registros de asignación del S-13. No se debe hacer sin permiso del superintendente de servicio.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCampaign(congId, c.id, territories);
      displaySnackNotification({
        severity: 'success',
        header: 'Campaña eliminada',
        message: `La campaña "${c.nombre}" ha sido eliminada.`,
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error',
        message: 'No se pudo eliminar la campaña.',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ConfirmDialogNode}
      <Box>
        <Button
          variant="main"
          onClick={() => setOpenCrear(true)}
          disableAutoStretch
        >
          Crear campaña
        </Button>
      </Box>

      {sorted.length === 0 && (
        <Typography className="body-small-regular" color="var(--ink-2)">
          No hay campañas. Crea una para empezar.
        </Typography>
      )}

      {sorted.map((c) => {
        const campTerritories = c.territoryIds
          .map((id) => territories.find((t) => t.id === id))
          .filter((t): t is Territory => Boolean(t));
        /**
         * En qué anda cada territorio DE ESTA campaña: sin repartir, en manos
         * de alguien, o ya entregado aquí.
         *
         * Con el número de territorios a secas no se sabe lo único que se
         * pregunta a mitad de campaña: cuántos quedan por dar. Y un territorio
         * ya entregado NO es "libre": está hecho, no hay que volver a darlo.
         */
        const estadoDe = (t: Territory) => {
          const suyas = assignments.filter(
            (a) => a.campaignId === c.id && a.territoryId === t.id
          );
          if (suyas.some((a) => !a.returnedAt)) return 'asignado' as const;
          if (suyas.length > 0) return 'entregado' as const;
          return 'sinAsignar' as const;
        };

        const cuenta = (lista: Territory[]) => ({
          sinAsignar: lista.filter((t) => estadoDe(t) === 'sinAsignar').length,
          asignados: lista.filter((t) => estadoDe(t) === 'asignado').length,
          entregados: lista.filter((t) => estadoDe(t) === 'entregado').length,
        });

        const total = cuenta(campTerritories);

        // Lo mismo por zona, para quien quiera abrirlo: es lo que dice si la
        // campaña va bien repartida o si hay una zona entera parada.
        const porZona = zones
          .map((zone) => ({
            zone,
            lista: campTerritories.filter((t) => t.zoneId === zone.id),
          }))
          .filter(({ lista }) => lista.length > 0)
          .map(({ zone, lista }) => ({ zone, ...cuenta(lista) }));
        const isOpen = expanded === c.id;
        const addable = territories.filter(
          (t) => !c.territoryIds.includes(t.id)
        );

        return (
          <TerritoryCard key={c.id} accent={estadoColor[c.estado]}>
            <Stack
              direction={{ mobile: 'column', tablet600: 'row' }}
              alignItems={{ mobile: 'stretch', tablet600: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
            >
              {/* Ancho fijo, no "el que pida el contenido": si no, al
                  desplegar el detalle por zonas —que es más ancho que la
                  fila de números— la columna crecía y la barra de la campaña
                  se estiraba con ella. Una barra que cambia de largo al
                  abrirla parece que también cambian los números. */}
              <Box sx={{ minWidth: 0, flex: 1, width: '100%' }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.5, flexWrap: 'wrap', rowGap: '4px' }}
                >
                  <Typography
                    className="body-regular-semibold"
                    color="var(--ink)"
                  >
                    {c.nombre}
                  </Typography>
                  <Badge
                    size="small"
                    color={ESTADO_BADGE[c.estado]}
                    text={ESTADO_TEXTO[c.estado] ?? c.estado}
                  />
                </Stack>
                <Typography
                  className="label-small-regular"
                  color="var(--ink-2)"
                >
                  {formatTerritoryDate(c.fechaInicio, settings.dateFormat)} →{' '}
                  {formatTerritoryDate(c.fechaFin, settings.dateFormat)} ·{' '}
                  <span style={{ color: 'var(--ink)' }}>
                    {c.territoryIds.length === 1
                      ? '1 territorio'
                      : `${c.territoryIds.length} territorios`}
                  </span>
                </Typography>

                {/* De cuántos va cada zona, sin abrir la campaña. Es lo que
                    se mira para saber si está bien repartida —y si falta
                    meter de alguna— sin tener que contar a mano una lista de
                    treinta. */}
                {/* Cómo va la campaña, de un vistazo y sin abrirla: la barra
                    y tres números. Antes solo salía de cuántos iba cada zona,
                    que dice si está bien repartida pero no si queda algo por
                    dar —que es lo que se pregunta a mitad de campaña. */}
                {campTerritories.length > 0 && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setDesglose(desglose === c.id ? null : c.id)}
                    aria-expanded={desglose === c.id}
                    aria-label={
                      desglose === c.id
                        ? 'Ocultar el detalle por zonas'
                        : 'Ver el detalle por zonas'
                    }
                    className="active-press"
                    sx={{
                      appearance: 'none',
                      font: 'inherit',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      padding: '6px 8px',
                      margin: '2px -8px 0',
                      width: 'calc(100% + 16px)',
                      cursor: 'pointer',
                      borderRadius: 'var(--shape-sm)',
                      '&:hover': { backgroundColor: 'var(--state-hover)' },
                      '&:focus-visible': {
                        outline: '2px solid var(--accent-main)',
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <BarraCampana {...total} />
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ flexWrap: 'wrap', rowGap: '2px', mt: '6px' }}
                    >
                      <Leyenda
                        color="var(--accent-main)"
                        n={total.sinAsignar}
                        texto="sin asignar"
                      />
                      <Leyenda
                        color="var(--orange-main)"
                        n={total.asignados}
                        texto={total.asignados === 1 ? 'asignado' : 'asignados'}
                      />
                      <Leyenda
                        color="var(--green-main)"
                        n={total.entregados}
                        texto={
                          total.entregados === 1 ? 'entregado' : 'entregados'
                        }
                      />
                      <IconExpand
                        color="var(--ink-3)"
                        width={18}
                        height={18}
                        sx={{
                          transition:
                            'transform var(--motion-fast) var(--ease-standard)',
                          transform:
                            desglose === c.id
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                        }}
                      />
                    </Stack>
                  </Box>
                )}

                {desglose === c.id && porZona.length > 0 && (
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    {porZona.map((z) => (
                      <Stack
                        key={z.zone.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ flexWrap: 'wrap', rowGap: '2px' }}
                      >
                        <TagChip label={z.zone.nombre} color={z.zone.color} />
                        <Typography
                          className="label-small-regular"
                          color="var(--ink-2)"
                        >
                          {/* Solo lo que no es cero: "0 entregados" ocupa
                              sitio y no dice nada. */}
                          {[
                            z.sinAsignar > 0 && `${z.sinAsignar} sin asignar`,
                            z.asignados > 0 &&
                              `${z.asignados} ${z.asignados === 1 ? 'asignado' : 'asignados'}`,
                            z.entregados > 0 &&
                              `${z.entregados} ${z.entregados === 1 ? 'entregado' : 'entregados'}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="small"
                  disableAutoStretch
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  {isOpen ? 'Cerrar' : 'Gestionar'}
                </Button>
                {/* También para las 'planificada': una campaña creada por
                    adelantado puede necesitar cerrarse antes de tiempo, y
                    antes el botón solo salía en las 'activa'. */}
                {c.estado !== 'pasada' && (
                  <Button
                    variant="small"
                    color="orange"
                    disableAutoStretch
                    onClick={() => handleFinalizeCampaign(c)}
                  >
                    Finalizar
                  </Button>
                )}
                <Button
                  variant="small"
                  disableAutoStretch
                  onClick={() => handleDelete(c)}
                  ariaLabel="Borrar campaña"
                >
                  <IconDelete color="var(--red-main)" width={20} height={20} />
                </Button>
              </Stack>
            </Stack>

            <Collapse in={isOpen}>
              <Box sx={{ mt: 2 }}>
                {c.estado !== 'pasada' && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      onClick={() => setSelectingFor(c)}
                      disabled={addable.length === 0}
                    >
                      Añadir territorios
                    </Button>
                  </Box>
                )}

                <Stack spacing={1}>
                  {campTerritories.length === 0 ? (
                    <Typography
                      className="label-small-regular"
                      color="var(--ink-2)"
                    >
                      Sin territorios en la campaña.
                    </Typography>
                  ) : (
                    campTerritories.map((t) => {
                      // Antes se usaba Territory.lastWorkedAt para mostrar la
                      // fecha de entrega — pero ese campo es del territorio
                      // (no de esta campaña en concreto) y no se actualiza si
                      // se devuelve "sin trabajar", así que una entrega
                      // individual dentro de la campaña podía no verse aquí
                      // en absoluto. Se busca en su lugar la asignación de
                      // ESTA campaña para ESTE territorio directamente.
                      const campaignAssignments = assignments
                        .filter(
                          (a) => a.campaignId === c.id && a.territoryId === t.id
                        )
                        .sort(
                          (x, y) =>
                            new Date(y.assignedAt).getTime() -
                            new Date(x.assignedAt).getTime()
                        );
                      const latest: TerritoryAssignment | undefined =
                        campaignAssignments[0];
                      const open = Boolean(latest && !latest.returnedAt);
                      // Las etiquetas dicen de un vistazo si el territorio es
                      // grande o pequeño. Aquí hacen la misma falta que en la
                      // pestaña de Territorios: esta lista es desde donde se
                      // reparte la campaña.
                      const misEtiquetas = (t.tags ?? [])
                        .map((id) => tags.find((tag) => tag.id === id))
                        .filter(Boolean) as TerritoryTag[];
                      return (
                        <Stack
                          key={t.id}
                          direction={{ mobile: 'column', tablet600: 'row' }}
                          alignItems={{
                            mobile: 'flex-start',
                            tablet600: 'center',
                          }}
                          justifyContent="space-between"
                          spacing={1}
                          sx={{
                            p: 1.5,
                            borderRadius: 'var(--shape-sm)',
                            border: '1px solid var(--line)',
                            backgroundColor: open
                              ? 'var(--orange-secondary)'
                              : 'transparent',
                          }}
                        >
                          <AbrirTerritorio
                            label={`${getZoneName(t.zoneId, zones)} ${territoryLabel(t)}`}
                            onClick={() => onView(t)}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.5}
                              sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                            >
                              <Typography
                                className="body-small-regular"
                                sx={{ color: 'var(--ink)', fontWeight: 500 }}
                              >
                                {/* Con la zona delante. Un "1" a secas no dice
                                    nada cuando hay un 1 en cada una de las tres
                                    zonas, y esta lista las mezcla. */}
                                {getZoneName(t.zoneId, zones)}{' '}
                                {territoryLabel(t)}
                              </Typography>
                              {misEtiquetas.map((tag) => (
                                <TagChip
                                  key={tag.id}
                                  label={tag.nombre}
                                  color={tag.color}
                                />
                              ))}
                            </Stack>
                            <Typography
                              className="label-small-regular"
                              sx={{
                                display: 'block',
                                color: open
                                  ? 'var(--orange-dark)'
                                  : 'var(--ink-2)',
                              }}
                            >
                              {/* "Asignado (campaña)" a secas obligaba a irse
                                  al historial para saber quién lo tiene. */}
                              {open
                                ? `Asignado (campaña) a ${resolveName(latest!.personUid)}`
                                : latest?.returnedAt
                                  ? `Entregado el ${formatTerritoryDate(latest.returnedAt, settings.dateFormat)} (${
                                      latest.status === 'trabajado'
                                        ? 'trabajado'
                                        : 'sin trabajar'
                                    })`
                                  : 'Sin asignar en esta campaña'}
                            </Typography>
                          </AbrirTerritorio>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ flexWrap: 'wrap' }}
                          >
                            {c.estado !== 'pasada' && !open && (
                              <Button
                                variant="small"
                                disableAutoStretch
                                onClick={() => onAsignarCampana(t, c.id)}
                              >
                                Asignar
                              </Button>
                            )}
                            {c.estado !== 'pasada' && (
                              <Button
                                variant="small"
                                color="orange"
                                disableAutoStretch
                                onClick={() => handleRemoveTerritory(c, t.id)}
                              >
                                Quitar
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      );
                    })
                  )}
                </Stack>
              </Box>
            </Collapse>
          </TerritoryCard>
        );
      })}

      <DialogCrearCampana
        open={openCrear}
        onClose={() => setOpenCrear(false)}
      />

      <DialogSeleccionarTerritorios
        open={!!selectingFor}
        onClose={() => setSelectingFor(null)}
        territories={
          selectingFor
            ? territories.filter(
                (t) => !selectingFor.territoryIds.includes(t.id)
              )
            : []
        }
        zones={zones}
        territoryStatusMap={territoryStatusMap}
        dateFormat={settings.dateFormat}
        onConfirm={(ids) => {
          if (selectingFor) handleAddTerritories(selectingFor, ids);
        }}
      />
    </Box>
  );
};

export default CampanasTab;
