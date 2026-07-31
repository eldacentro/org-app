import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useConfirm } from '@components/confirm_dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import Badge from '@components/badge';
import FilterChip from '@components/filter_chip';
import { TerritoryCard } from '@features/territories/ui';
import { congIDState, shortDateFormatState } from '@states/settings';
import {
  territoriesState,
  territoryAssignmentsState,
  territorySharesState,
  territorySharesStatusState,
} from '@states/territories';
import { Territory } from '@definition/territories';
import { TerritoryShare } from '@definition/territory_shares';
import { isShareLive, revokeShare } from '@services/firebase/territory_shares';
import { formatTerritoryDate, territoryLabel } from '@services/app/territories';
import { displaySnackNotification } from '@services/states/app';
import { usePersonName } from '@features/territories/usePersonName';

/** "el mapa y las notas", "el mapa", "las direcciones de No visitar"… */
const describeIncludes = (inc?: TerritoryShare['includes']): string => {
  if (!inc) return 'el territorio';
  const parts: string[] = [];
  if (inc.mapa) parts.push('el mapa');
  if (inc.imagen) parts.push('la imagen');
  if (inc.notas) parts.push('las notas');
  if (inc.noVisitar) parts.push('las direcciones de "No visitar"');
  if (parts.length === 0) return 'nada';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
};

type Filter = 'live' | 'all';

/**
 * Todos los enlaces públicos de la congregación en un solo sitio.
 *
 * Antes solo se podían ver abriendo el territorio concreto, así que nadie
 * sabía cuántos enlaces había vivos ni podía repasarlos. Aquí se ven todos,
 * con qué comparte cada uno y cuándo caduca, y se pueden anular de golpe.
 */
const EnlacesTab = ({ onView }: { onView: (t: Territory) => void }) => {
  const congId = useAtomValue(congIDState);
  const shares = useAtomValue(territorySharesState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const sharesStatus = useAtomValue(territorySharesStatusState);
  const dateFormat = useAtomValue(shortDateFormatState);
  const resolveName = usePersonName();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [filter, setFilter] = useState<Filter>('live');
  const [working, setWorking] = useState<string | null>(null);

  const rows = useMemo(() => {
    const openIds = new Set(
      assignments.filter((a) => !a.returnedAt).map((a) => a.id)
    );

    return shares
      .map((share) => {
        const territory = territories.find((t) => t.id === share.territoryId);
        const live = isShareLive(
          share,
          share.assignmentId ? openIds.has(share.assignmentId) : false
        );
        return { share, territory, live };
      })
      .filter((r) => (filter === 'live' ? r.live : true))
      .sort((a, b) => {
        // Vivos primero, y dentro de cada grupo el que caduca antes.
        if (a.live !== b.live) return a.live ? -1 : 1;
        const ta = a.share.expiresAt?.toDate?.()?.getTime() ?? 0;
        const tb = b.share.expiresAt?.toDate?.()?.getTime() ?? 0;
        return ta - tb;
      });
  }, [shares, territories, assignments, filter]);

  const liveCount = useMemo(() => {
    const openIds = new Set(
      assignments.filter((a) => !a.returnedAt).map((a) => a.id)
    );
    return shares.filter((s) =>
      isShareLive(s, s.assignmentId ? openIds.has(s.assignmentId) : false)
    ).length;
  }, [shares, assignments]);

  const handleRevoke = async (share: TerritoryShare, label: string) => {
    const ok = await confirm({
      title: 'Anular enlace',
      message: `Quien ya tenga el enlace de ${label} dejará de poder abrirlo. No se puede deshacer.`,
      confirmLabel: 'Anular',
      destructive: true,
    });
    if (!ok) return;

    setWorking(share.token);
    try {
      await revokeShare(congId, share.token);
      displaySnackNotification({
        header: 'Enlace anulado',
        message: 'Quien lo tuviera ya no podrá abrirlo.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        header: 'No se pudo anular',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        severity: 'error',
      });
    } finally {
      setWorking(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ConfirmDialogNode}

      <Typography className="body-small-regular" sx={{ color: 'var(--ink-2)' }}>
        Enlaces públicos creados desde la ficha de cada territorio. Quien los
        recibe no necesita cuenta, así que conviene repasarlos de vez en cuando.
      </Typography>

      <Stack direction="row" spacing={1}>
        <FilterChip
          label={`Activos (${liveCount})`}
          selected={filter === 'live'}
          onClick={() => setFilter('live')}
        />
        <FilterChip
          label="Todos"
          selected={filter === 'all'}
          onClick={() => setFilter('all')}
        />
      </Stack>

      {/* Un fallo de la escucha NO es "no hay enlaces": podría haber enlaces
          vivos que nadie podría anular desde aquí. */}
      {sharesStatus === 'error' && (
        <Typography
          className="body-small-regular"
          sx={{ color: 'var(--red-main)' }}
        >
          No se han podido cargar los enlaces. Comprueba tu conexión y vuelve a
          entrar en esta pestaña.
        </Typography>
      )}

      {sharesStatus !== 'error' && rows.length === 0 && (
        <Typography
          className="body-small-regular"
          sx={{ color: 'var(--ink-2)' }}
        >
          {sharesStatus === 'loading'
            ? 'Cargando enlaces…'
            : filter === 'live'
              ? 'No hay ningún enlace activo ahora mismo.'
              : 'Todavía no se ha creado ningún enlace.'}
        </Typography>
      )}

      <Stack spacing={1.5}>
        {rows.map(({ share, territory, live }) => {
          const label = territory
            ? territoryLabel(territory)
            : 'Territorio borrado';
          // El motivo por el que un enlace ya no vale es un DATO, no una
          // frase escondida en medio de tres renglones de texto gris. Antes
          // el estado se deducía leyendo "Anulado" / "Caducó el …" enterrado
          // entre la fecha de caducidad y la de creación.
          const caducado =
            share.expiresAt?.toDate?.() &&
            share.expiresAt.toDate() <= new Date();
          const estado = live
            ? { color: 'green' as const, texto: 'Activo' }
            : share.revoked
              ? { color: 'red' as const, texto: 'Anulado' }
              : caducado
                ? { color: 'grey' as const, texto: 'Caducado' }
                : { color: 'grey' as const, texto: 'Territorio entregado' };

          return (
            // Los caducados llevaban `opacity: 0.7`, que apaga el texto por
            // igual y lo baja del contraste mínimo. Se distinguen por la
            // etiqueta de estado y por el color de la cápsula.
            <TerritoryCard
              key={share.token}
              accent={live ? 'var(--green-main)' : 'var(--grey-400)'}
            >
              <Stack
                direction={{ mobile: 'column', tablet600: 'row' }}
                justifyContent="space-between"
                alignItems={{ mobile: 'stretch', tablet600: 'center' }}
                spacing={2}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ flexWrap: 'wrap', rowGap: '4px' }}
                  >
                    <Typography
                      className="body-regular-semibold"
                      color="var(--ink)"
                    >
                      {label}
                    </Typography>
                    <Badge
                      size="small"
                      color={estado.color}
                      text={estado.texto}
                    />
                  </Stack>

                  <Typography
                    className="label-small-regular"
                    color="var(--ink-2)"
                    sx={{ display: 'block', mt: '4px' }}
                  >
                    Se ve: {describeIncludes(share.includes)} ·{' '}
                    {share.assignmentId
                      ? 'atado a una asignación'
                      : 'sin asignación'}
                  </Typography>
                  <Typography
                    className="label-small-regular"
                    color="var(--ink-3)"
                    sx={{ display: 'block' }}
                  >
                    {live && share.expiresAt?.toDate?.()
                      ? `Caduca el ${formatTerritoryDate(
                          share.expiresAt.toDate().toISOString(),
                          dateFormat
                        )} · `
                      : !live && caducado
                        ? `Caducó el ${formatTerritoryDate(
                            share.expiresAt.toDate().toISOString(),
                            dateFormat
                          )} · `
                        : ''}
                    Creado el {formatTerritoryDate(share.createdAt, dateFormat)}{' '}
                    por {resolveName(share.createdBy)}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexShrink: 0, alignItems: 'center' }}
                >
                  {territory && (
                    <Button
                      variant="tertiary"
                      disableAutoStretch
                      onClick={() => onView(territory)}
                    >
                      Ver territorio
                    </Button>
                  )}
                  {live && (
                    <Button
                      variant="tertiary"
                      color="red"
                      disableAutoStretch
                      disabled={working === share.token}
                      onClick={() => handleRevoke(share, label)}
                    >
                      {working === share.token ? 'Anulando…' : 'Anular'}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </TerritoryCard>
          );
        })}
      </Stack>
    </Box>
  );
};

export default EnlacesTab;
