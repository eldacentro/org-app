import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconClose } from '@components/icons';
import IconButton from '@components/icon_button';
import SwitchWithLabel from '@components/switch_with_label';
import FilterChip from '@components/filter_chip';
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
import {
  DEFAULT_SHARE_DAYS,
  DEFAULT_SHARE_INCLUDES,
  SHARE_DURATIONS,
  TerritoryShare,
  TerritoryShareIncludes,
} from '@definition/territory_shares';
import {
  createShare,
  fetchSharesForTerritory,
  isShareLive,
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
/** "el mapa y las notas", "el mapa", "las direcciones de No visitar"… */
const describeIncludes = (inc?: TerritoryShareIncludes): string => {
  if (!inc) return 'el territorio';
  const parts: string[] = [];
  if (inc.mapa) parts.push('el mapa');
  if (inc.notas) parts.push('las notas');
  if (inc.noVisitar) parts.push('las direcciones de "No visitar"');
  if (parts.length === 0) return 'nada';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
};

const DialogCompartir = ({
  open,
  onClose,
  territory,
  assignment,
}: {
  open: boolean;
  onClose: VoidFunction;
  territory: Territory;
  /** Asignación abierta, si la hay. Cuando falta (territorio libre), el
   *  enlace solo lo limitan la caducidad y la revocación — es el caso de un
   *  responsable que quiere mandar un territorio por WhatsApp a alguien sin
   *  cuenta. */
  assignment?: TerritoryAssignment | null;
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
  const [includes, setIncludes] = useState<TerritoryShareIncludes>(DEFAULT_SHARE_INCLUDES);
  const [days, setDays] = useState<number>(DEFAULT_SHARE_DAYS);

  // "Activo" = lo mismo que comprueba la regla de seguridad: ni anulado, ni
  // caducado, y con SU asignación todavía abierta si va atado a una.
  //
  // Ojo con el "su": hay que comparar contra la asignación DEL ENLACE, no
  // contra la que el territorio tenga ahora. Un territorio se comparte a A,
  // se entrega y se reasigna a B: el enlace viejo de A seguiría contando
  // como activo (porque la asignación de B sí está abierta), el formulario
  // no se pintaría —solo aparece cuando no hay ninguno activo— y no se
  // podría crear el enlace para B. Encima, "Copiar enlace" mandaría una URL
  // que el servidor rechaza.
  const activeShares = shares.filter((s) =>
    isShareLive(
      s,
      Boolean(assignment) &&
        s.assignmentId === assignment?.id &&
        !assignment?.returnedAt
    )
  );

  /** Las notas y las direcciones van cifradas con la contraseña de la
   *  congregación: sin ella no se pueden incluir (saldrían ilegibles), así
   *  que ni se ofrecen. */
  const canShareEncrypted = Boolean(masterKey);

  /** Al menos una sección REAL marcada: un enlace vacío no tendría sentido. */
  const hasAnySection =
    includes.mapa ||
    (canShareEncrypted && (includes.notas || includes.noVisitar));

  /** Fecha exacta de caducidad, para decirla en vez de "en 30 días". */
  const expiryDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }, [days]);
  const expiryPreview = formatTerritoryDate(expiryDate.toISOString(), dateFormat);

  const load = useCallback(async () => {
    setLoading(true);

    setLoadFailed(false);

    try {
      setShares(await fetchSharesForTerritory(congId, territory.id));
    } catch (error) {
      console.error('No se pudieron cargar los enlaces', error);
      setShares([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [congId, territory.id]);

  useEffect(() => {
    if (!open) return;
    setIncludes(DEFAULT_SHARE_INCLUDES);
    setDays(DEFAULT_SHARE_DAYS);
    load();
  }, [open, load]);

  /** La clave no se guarda en claro: se recompone al vuelo desde la envuelta.
   *  Devuelve null si este dispositivo no tiene la clave de la congregación
   *  con la que se envolvió — antes lanzaba una excepción SÍNCRONA dentro del
   *  onClick, que React no captura, así que el botón simplemente no hacía
   *  nada y el usuario lo pulsaba una y otra vez sin ninguna explicación. */
  const urlFor = async (share: TerritoryShare): Promise<string | null> => {
    try {
      if (!share.hasWrappedKey) throw new Error('SIN_CLAVE_GUARDADA');
      return buildShareUrl(
        window.location.origin,
        congId,
        share.token,
        await recoverShareKey(congId, share.token, masterKey)
      );
    } catch (error) {
      const reason = (error as Error)?.message;
      console.error('No se pudo recomponer la clave del enlace', error);
      displaySnackNotification({
        header: 'No se puede volver a copiar este enlace',
        message:
          reason === 'SIN_CLAVE_GUARDADA'
            ? 'Este enlace solo se podía copiar al crearlo. Anúlalo y crea uno nuevo para tener una URL que puedas reenviar.'
            : 'Lo creó otro dispositivo con la clave de la congregación, y este no la tiene. Anúlalo y crea uno nuevo desde aquí.',
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
        includes,
        expiresAt: expiryDate.toISOString(),
        tiedToAssignment: Boolean(assignment),
      });

      // Se guarda lo que el payload lleva DE VERDAD, no lo que se marcó: sin
      // clave de congregación las notas y las direcciones se omiten, y la
      // pestaña "Enlaces" habría afirmado que se compartieron datos de
      // vecinos que en realidad no salieron (o al revés). Esa lista existe
      // para poder auditar; tiene que decir la verdad.
      const effectiveIncludes = {
        mapa: includes.mapa,
        notas: Boolean(payload.notas),
        noVisitar: payload.locations.length > 0,
      };

      const { token, keyB64 } = await withTimeout(
        createShare({
          congId,
          assignmentId: assignment?.id ?? null,
          territoryId: territory.id,
          payload,
          includes: effectiveIncludes,
          days,
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
            <IconClose color="var(--ink-2)" width={20} height={20} />
          </IconButton>
        </Stack>

        <Typography className="body-small-regular" sx={{ color: 'var(--ink-2)' }}>
          Crea un enlace para enviar{' '}
          <strong>{territoryLabel(territory)}</strong> por WhatsApp o correo. Quien
          lo reciba no necesita cuenta ni instalar nada.
        </Typography>

        {loading && (
          <Typography className="body-regular" color="var(--ink-2)">
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
          <Stack spacing="16px">
            {/* ── Qué compartir ─────────────────────────────────────────── */}
            <Box>
              <Typography className="label-small-semibold" sx={{ color: 'var(--ink-2)', mb: '8px' }}>
                Qué se va a ver
              </Typography>
              <Stack spacing="4px">
                <SwitchWithLabel
                  label="Mapa del territorio"
                  helper="El plano, las etiquetas y el número de viviendas."
                  checked={includes.mapa}
                  onChange={(v) => setIncludes((prev) => ({ ...prev, mapa: v }))}
                />
                <SwitchWithLabel
                  label="Notas del territorio"
                  helper={
                    canShareEncrypted
                      ? 'Las indicaciones que escriben los responsables.'
                      : 'Solo un anciano puede compartir esto.'
                  }
                  checked={includes.notas}
                  readOnly={!canShareEncrypted}
                  onChange={(v) => setIncludes((prev) => ({ ...prev, notas: v }))}
                />
                <SwitchWithLabel
                  label={'Direcciones de "No visitar"'}
                  helper={
                    canShareEncrypted
                      ? 'Son datos de vecinos. Compártelas solo si de verdad hacen falta.'
                      : 'Solo un anciano puede compartir esto.'
                  }
                  checked={includes.noVisitar}
                  readOnly={!canShareEncrypted}
                  onChange={(v) => setIncludes((prev) => ({ ...prev, noVisitar: v }))}
                />
              </Stack>
            </Box>

            {/* ── Cuánto tiempo ─────────────────────────────────────────── */}
            <Box>
              <Typography className="label-small-semibold" sx={{ color: 'var(--ink-2)', mb: '8px' }}>
                Cuánto tiempo estará disponible
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {SHARE_DURATIONS.map((d) => (
                  <FilterChip
                    key={d.days}
                    label={d.label}
                    selected={days === d.days}
                    onClick={() => setDays(d.days)}
                  />
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                padding: '12px',
                borderRadius: 'var(--radius-l)',
                backgroundColor: 'var(--accent-100)',
                border: '1px solid var(--line)',
              }}
            >
              <Typography className="body-small-regular" sx={{ color: 'var(--ink-2)' }}>
                El enlace caducará el <strong>{expiryPreview}</strong>.
                {assignment
                  ? ' Y si el territorio se entrega antes de esa fecha, dejará de funcionar en ese mismo momento.'
                  : ' Este territorio no está asignado a nadie, así que solo lo limita esa fecha.'}{' '}
                Puedes anularlo cuando quieras desde aquí.
              </Typography>
            </Box>

            {!canShareEncrypted && (
              <Box
                sx={{
                  padding: '12px',
                  borderRadius: 'var(--radius-l)',
                  backgroundColor: 'var(--orange-secondary)',
                  border: '1px solid var(--orange-dark)',
                }}
              >
                <Typography className="body-small-regular" sx={{ color: 'var(--orange-dark)' }}>
                  El enlace se copiará al crearlo y no se podrá volver a copiar
                  desde aquí, así que pégalo donde vayas a enviarlo antes de
                  cerrar. Si lo pierdes, tendrás que anularlo y crear otro.
                </Typography>
              </Box>
            )}

            {/* El motivo va ENCIMA del botón: debajo quedaba fuera de la
                pantalla en el móvil, así que el botón parecía roto sin más. */}
            {!hasAnySection && (
              <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)' }}>
                Marca al menos una cosa para poder crear el enlace.
              </Typography>
            )}
            <Button
              variant="main"
              onClick={handleCreate}
              disabled={working || !hasAnySection}
            >
              {working ? 'Creando…' : 'Crear enlace y copiarlo'}
            </Button>
          </Stack>
        )}

        {!loading && !loadFailed && activeShares.length > 0 && (
          <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)' }}>
            Solo puede haber un enlace activo por territorio. Para cambiar qué
            se ve o cuánto dura, anula este y crea otro.
          </Typography>
        )}

        {!loading && !loadFailed &&
          activeShares.map((share) => (
            <Box
              key={share.token}
              sx={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-l)',
                padding: '12px',
              }}
            >
              <Stack spacing="10px">
                <Stack spacing="4px">
                  <Typography className="body-regular-semibold" sx={{ color: 'var(--ink)' }}>
                    Caduca el {formatTerritoryDate(share.expiresAt.toDate().toISOString(), dateFormat)}
                  </Typography>
                  <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)' }}>
                    Se ve: {describeIncludes(share.includes)}
                  </Typography>
                  <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)' }}>
                    Creado el {formatTerritoryDate(share.createdAt, dateFormat)} por{' '}
                    {resolveName(share.createdBy)}
                    {share.assignmentId
                      ? ' · deja de funcionar al entregar el territorio'
                      : ' · no atado a ninguna asignación'}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing="8px" flexWrap="wrap" useFlexGap>
                  <Button
                    variant="secondary"
                    disableAutoStretch
                    disabled={working}
                    onClick={async () => {
                      const url = await urlFor(share);
                      if (url) copyUrl(url);
                    }}
                  >
                    Copiar enlace
                  </Button>

                  {typeof navigator.share === 'function' && (
                    <Button
                      variant="secondary"
                      disableAutoStretch
                      disabled={working}
                      onClick={async () => {
                        const url = await urlFor(share);
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
                    disableAutoStretch
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
