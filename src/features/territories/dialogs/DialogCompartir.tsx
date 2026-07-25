import { useCallback, useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconClose } from '@components/icons';
import IconButton from '@components/icon_button';
import { displaySnackNotification } from '@services/states/app';
import {
  congIDState,
  congMasterKeyState,
  congNameState,
  shortDateFormatState,
  userLocalUIDState,
} from '@states/settings';
import {
  territoryLocationsState,
  territoryTagsState,
  territoryZonesState,
} from '@states/territories';
import { Territory, TerritoryAssignment } from '@definition/territories';
import { TerritoryShare } from '@definition/territory_shares';
import {
  createShare,
  fetchSharesForAssignment,
  recoverShareKey,
  revokeShare,
} from '@services/firebase/territory_shares';
import {
  buildShareUrl,
  buildSharePayload,
} from '@services/app/territory_share';
import { formatTerritoryDate, territoryLabel } from '@services/app/territories';
import { usePersonName } from '@features/territories/usePersonName';

/**
 * Crear y gestionar enlaces públicos de un territorio.
 *
 * El enlace deja de funcionar solo cuando se entrega el territorio — de eso se
 * encarga la regla de Firestore, no este diálogo. Aquí solo se crea, se copia y,
 * si hace falta, se anula a mano.
 */
const DialogCompartir = ({
  open,
  onClose,
  territory,
  assignment,
}: {
  open: boolean;
  onClose: VoidFunction;
  territory: Territory;
  assignment: TerritoryAssignment;
}) => {
  const congId = useAtomValue(congIDState);
  const congName = useAtomValue(congNameState);
  const masterKey = useAtomValue(congMasterKeyState);
  const currentUid = useAtomValue(userLocalUIDState);
  const dateFormat = useAtomValue(shortDateFormatState);
  const zones = useAtomValue(territoryZonesState);
  const tags = useAtomValue(territoryTagsState);
  const locations = useAtomValue(territoryLocationsState);
  const resolveName = usePersonName();

  const [shares, setShares] = useState<TerritoryShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const activeShares = shares.filter((s) => !s.revoked);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setShares(await fetchSharesForAssignment(congId, assignment.id));
    } catch (error) {
      console.error('No se pudieron cargar los enlaces', error);
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, [congId, assignment.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  /** La clave no se guarda en claro: se recompone al vuelo desde la envuelta. */
  const urlFor = (share: TerritoryShare): string =>
    buildShareUrl(
      window.location.origin,
      congId,
      share.token,
      recoverShareKey(share, masterKey)
    );

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      displaySnackNotification({
        header: 'Enlace copiado',
        message: 'Ya puedes pegarlo donde quieras enviarlo.',
        severity: 'success',
      });
    } catch {
      // Safari en iOS bloquea el portapapeles fuera de un gesto directo.
      window.prompt('Copia el enlace:', url);
    }
  };

  const handleCreate = async () => {
    setWorking(true);

    try {
      const payload = buildSharePayload({
        territory,
        zones,
        tags,
        locations,
        congName,
        now: new Date().toISOString(),
      });

      const { token, keyB64 } = await createShare({
        congId,
        assignmentId: assignment.id,
        territoryId: territory.id,
        payload,
        masterKey,
        createdBy: currentUid,
      });

      await copyUrl(buildShareUrl(window.location.origin, congId, token, keyB64));
      await load();
    } catch (error) {
      displaySnackNotification({
        header: 'No se pudo crear el enlace',
        message: (error as Error)?.message ?? 'Inténtalo de nuevo.',
        severity: 'error',
      });
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async (share: TerritoryShare) => {
    setWorking(true);

    try {
      await revokeShare(congId, share.token);
      await load();
      displaySnackNotification({
        header: 'Enlace anulado',
        message: 'Quien lo tuviera ya no podrá abrirlo.',
        severity: 'success',
      });
    } catch (error) {
      displaySnackNotification({
        header: 'No se pudo anular',
        message: (error as Error)?.message ?? 'Inténtalo de nuevo.',
        severity: 'error',
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={working ? undefined : onClose}
      PaperProps={{ style: { maxWidth: '520px', width: '100%' } }}
    >
      <Stack spacing="16px">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography className="h2">Compartir territorio</Typography>
          <IconButton onClick={onClose} disabled={working}>
            <IconClose color="var(--grey-400)" />
          </IconButton>
        </Stack>

        <Typography className="body-regular" color="var(--grey-400)">
          Genera un enlace para que alguien sin cuenta —por ejemplo el
          superintendente de circuito— pueda ver{' '}
          <strong>{territoryLabel(territory)}</strong>.
        </Typography>

        <Box
          sx={{
            padding: '12px',
            borderRadius: 'var(--radius-l)',
            backgroundColor: 'var(--orange-light)',
            border: '1px solid var(--orange-dark)',
          }}
        >
          <Typography className="body-small-regular">
            Cualquiera que reciba el enlace verá el territorio con sus notas y
            direcciones. Deja de funcionar solo cuando se entregue el territorio.
          </Typography>
        </Box>

        {loading && (
          <Typography className="body-regular" color="var(--grey-400)">
            Cargando enlaces…
          </Typography>
        )}

        {!loading && activeShares.length === 0 && (
          <Button variant="main" onClick={handleCreate} disabled={working}>
            {working ? 'Creando…' : 'Crear enlace y copiarlo'}
          </Button>
        )}

        {!loading &&
          activeShares.map((share) => (
            <Box
              key={share.token}
              sx={{
                border: '1px solid var(--accent-200)',
                borderRadius: 'var(--radius-l)',
                padding: '12px',
              }}
            >
              <Stack spacing="10px">
                <Typography className="body-small-regular" color="var(--grey-400)">
                  Creado el {formatTerritoryDate(share.createdAt, dateFormat)} por{' '}
                  {resolveName(share.createdBy)}
                </Typography>

                <Stack direction="row" spacing="8px" flexWrap="wrap" useFlexGap>
                  <Button
                    variant="secondary"
                    disabled={working}
                    onClick={() => copyUrl(urlFor(share))}
                  >
                    Copiar enlace
                  </Button>

                  {typeof navigator.share === 'function' && (
                    <Button
                      variant="secondary"
                      disabled={working}
                      onClick={() =>
                        navigator
                          .share({
                            title: territoryLabel(territory),
                            url: urlFor(share),
                          })
                          .catch(() => undefined)
                      }
                    >
                      Compartir
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    color="red"
                    disabled={working}
                    onClick={() => handleRevoke(share)}
                  >
                    Anular
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ))}
      </Stack>
    </Dialog>
  );
};

export default DialogCompartir;
