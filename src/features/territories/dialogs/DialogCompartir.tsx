import { useCallback, useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconClose } from '@components/icons';
import IconButton from '@components/icon_button';
import { useConfirm } from '@components/confirm_dialog';
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
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [shares, setShares] = useState<TerritoryShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  /** La carga FALLÓ (distinto de "no hay ninguno"). Sin esta distinción, un
   *  error de red pintaba "no hay enlaces" y el responsable creaba uno
   *  nuevo: el anterior seguía vivo, funcionando y ya sin aparecer en la
   *  lista, así que no había forma de anularlo. */
  const [loadFailed, setLoadFailed] = useState(false);

  const activeShares = shares.filter((s) => !s.revoked);

  const load = useCallback(async () => {
    setLoading(true);

    setLoadFailed(false);

    try {
      setShares(await fetchSharesForAssignment(congId, assignment.id));
    } catch (error) {
      console.error('No se pudieron cargar los enlaces', error);
      setShares([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [congId, assignment.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  /** La clave no se guarda en claro: se recompone al vuelo desde la envuelta.
   *  Devuelve null si este dispositivo no tiene la clave de la congregación
   *  con la que se envolvió — antes lanzaba una excepción SÍNCRONA dentro del
   *  onClick, que React no captura, así que el botón simplemente no hacía
   *  nada y el usuario lo pulsaba una y otra vez sin ninguna explicación. */
  const urlFor = (share: TerritoryShare): string | null => {
    try {
      return buildShareUrl(
        window.location.origin,
        congId,
        share.token,
        recoverShareKey(share, masterKey)
      );
    } catch (error) {
      console.error('No se pudo recomponer la clave del enlace', error);
      displaySnackNotification({
        header: 'No se puede recuperar este enlace',
        message:
          'Lo creó otro dispositivo y este no tiene la clave de la congregación. Anúlalo y crea uno nuevo desde aquí.',
        severity: 'error',
      });
      return null;
    }
  };

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

  /**
   * Firestore está configurado con caché persistente, así que una escritura
   * se guarda en local al instante pero su promesa NO se resuelve hasta que
   * el servidor la confirma. Sin cobertura eso dejaba el diálogo colgado
   * para siempre: botón en "Creando…", X deshabilitada y cierre por Escape
   * o fondo desactivado — sin más salida que recargar la app. Se le pone un
   * tope y se informa de que quedó pendiente de sincronizar.
   */
  const withTimeout = <T,>(promise: Promise<T>, ms = 12000): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error('SIN_CONFIRMACION_DEL_SERVIDOR')),
          ms
        )
      ),
    ]);

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

      const { token, keyB64 } = await withTimeout(
        createShare({
          congId,
          assignmentId: assignment.id,
          territoryId: territory.id,
          payload,
          masterKey,
          createdBy: currentUid,
        })
      );

      await copyUrl(buildShareUrl(window.location.origin, congId, token, keyB64));
      await load();
    } catch (error) {
      const timedOut = (error as Error)?.message === 'SIN_CONFIRMACION_DEL_SERVIDOR';
      displaySnackNotification({
        header: 'No se pudo crear el enlace',
        message: timedOut
          ? 'No hay conexión con el servidor. El enlace no funcionará hasta que se sincronice, así que no lo envíes todavía.'
          : ((error as Error)?.message ?? 'Inténtalo de nuevo.'),
        severity: 'error',
      });
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async (share: TerritoryShare) => {
    // Anular es irreversible: hay que volver a crear el enlace y reenviarlo.
    // Estaba a un solo toque, con el mismo tamaño y en la misma fila que
    // "Copiar enlace".
    const ok = await confirm({
      title: 'Anular enlace',
      message:
        'Quien ya tenga este enlace dejará de poder abrirlo. No se puede deshacer: habría que crear uno nuevo y volver a enviarlo.',
      confirmLabel: 'Anular',
      destructive: true,
    });
    if (!ok) return;

    setWorking(true);

    try {
      await withTimeout(revokeShare(congId, share.token));
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
      // Al pasar PaperProps se SUSTITUYE por completo el del componente, y
      // con él se perdía `backgroundColor: var(--card)`: MUI caía a su blanco
      // por defecto, así que en los temas oscuros el diálogo quedaba con
      // fondo blanco y el texto (var(--black), que ahí es casi blanco)
      // prácticamente ilegible. Se replican los valores del componente.
      PaperProps={{
        style: {
          maxWidth: '520px',
          width: '100%',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--card)',
        },
      }}
    >
      {ConfirmDialogNode}
      <Stack spacing="16px">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography className="h2" sx={{ color: 'var(--ink)' }}>
            Compartir territorio
          </Typography>
          <IconButton onClick={onClose} disabled={working} aria-label="Cerrar">
            <IconClose color="var(--ink-2)" width={15} height={15} />
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
            backgroundColor: 'var(--orange-secondary)',
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

        {/* Si la carga FALLÓ no se puede afirmar que no haya enlaces: puede
            haber uno vivo que no se ha podido leer. Ofrecer "Crear" aquí
            generaría un duplicado imposible de anular desde la interfaz. */}
        {!loading && loadFailed && (
          <Stack spacing="8px">
            <Typography className="body-small-regular" sx={{ color: 'var(--red-main)' }}>
              No se han podido cargar los enlaces de este territorio. Puede que
              ya exista uno activo, así que no se ofrece crear otro.
            </Typography>
            <Button variant="secondary" onClick={load} disableAutoStretch>
              Reintentar
            </Button>
          </Stack>
        )}

        {!loading && !loadFailed && activeShares.length === 0 && (
          <Button variant="main" onClick={handleCreate} disabled={working}>
            {working ? 'Creando…' : 'Crear enlace y copiarlo'}
          </Button>
        )}

        {!loading && !loadFailed &&
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
                    onClick={() => {
                      const url = urlFor(share);
                      if (url) copyUrl(url);
                    }}
                  >
                    Copiar enlace
                  </Button>

                  {typeof navigator.share === 'function' && (
                    <Button
                      variant="secondary"
                      disabled={working}
                      onClick={() => {
                        const url = urlFor(share);
                        if (!url) return;
                        navigator
                          .share({ title: territoryLabel(territory), url })
                          .catch(() => undefined);
                      }}
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
