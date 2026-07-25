import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { MultiPolygon, Polygon } from 'geojson';
import Button from '@components/button';
import Typography from '@components/typography';
import TerritoryMap from '@features/territories/map/TerritoryMap';
import { TerritorySharePayload } from '@definition/territory_shares';
import { fetchPublicShare } from '@services/firebase/territory_shares';
import { SHARE_KEY_LENGTH } from '@services/encryption/share';
import {
  ParsedShareLink,
  parseShareHash,
} from '@services/app/territory_share';

/**
 * Página que ve quien abre un enlace compartido de territorio SIN tener cuenta.
 *
 * Se monta fuera de toda la app (ver la bifurcación en `main.tsx`): sin base de
 * datos local, sin sincronización, sin service worker y sin sesión. Lo único
 * que hace es leer un documento de Firestore, descifrarlo con la clave que
 * viene en el fragmento de la URL y pintarlo.
 */

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; payload: TerritorySharePayload }
  | { status: 'error'; kind: 'link' | 'gone' | 'offline' | 'unknown' };

const MESSAGES: Record<
  Extract<LoadState, { status: 'error' }>['kind'],
  { title: string; body: string }
> = {
  link: {
    title: 'Enlace incompleto',
    body: 'Parece que el enlace se cortó al enviarlo. Pide que te lo vuelvan a mandar, copiándolo entero.',
  },
  gone: {
    title: 'Este enlace ya no está activo',
    body: 'El territorio se ha entregado o el enlace se ha anulado. Pide uno nuevo si aún lo necesitas.',
  },
  offline: {
    title: 'Sin conexión',
    body: 'No se ha podido cargar el territorio. Comprueba tu conexión e inténtalo de nuevo.',
  },
  unknown: {
    title: 'No se ha podido abrir el enlace',
    body: 'Ha ocurrido un problema al cargar el territorio. Vuelve a intentarlo en un momento.',
  },
};

const PublicTerritoryPage = () => {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const link = useRef<ParsedShareLink>(parseShareHash(window.location.hash));
  // React 18 en modo estricto monta dos veces en desarrollo; sin esta guarda
  // se lanzarían dos lecturas al servidor por cada apertura.
  const started = useRef(false);

  const load = useCallback(async () => {
    const parsed = link.current;

    if (!parsed || parsed.keyB64.length !== SHARE_KEY_LENGTH) {
      setState({ status: 'error', kind: 'link' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const payload = await fetchPublicShare(
        parsed.congId,
        parsed.token,
        parsed.keyB64
      );

      setState({ status: 'ready', payload });
    } catch (error) {
      const code = (error as { code?: string; message?: string })?.code ?? '';
      const message = (error as Error)?.message ?? '';

      // La regla de seguridad deniega la lectura en cuanto la asignación se
      // cierra o el enlace se anula: para el visitante eso es "ya no vale".
      if (code === 'permission-denied' || message === 'not-found') {
        setState({ status: 'error', kind: 'gone' });
        return;
      }

      if (code === 'unavailable') {
        setState({ status: 'error', kind: 'offline' });
        return;
      }

      // Si el documento sí se leyó pero no descifra, lo más probable es que la
      // clave llegara cortada.
      setState({
        status: 'error',
        kind: /decrypt|operation-specific|Formato/i.test(message)
          ? 'link'
          : 'unknown',
      });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <Centered>
        <Typography className="h4" color="var(--grey-400)">
          Cargando territorio…
        </Typography>
      </Centered>
    );
  }

  if (state.status === 'error') {
    const { title, body } = MESSAGES[state.kind];

    return (
      <Centered>
        <Stack spacing="12px" alignItems="center" sx={{ maxWidth: '420px' }}>
          <Typography className="h2" sx={{ textAlign: 'center' }}>
            {title}
          </Typography>
          <Typography
            className="body-regular"
            color="var(--grey-400)"
            sx={{ textAlign: 'center' }}
          >
            {body}
          </Typography>
          {state.kind === 'offline' && (
            <Button variant="main" onClick={load} sx={{ marginTop: '8px' }}>
              Reintentar
            </Button>
          )}
        </Stack>
      </Centered>
    );
  }

  return <PublicTerritoryView payload={state.payload} />;
};

const Centered = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'var(--accent-100)',
    }}
  >
    {children}
  </Box>
);

const Card = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      backgroundColor: 'var(--white)',
      border: '1px solid var(--accent-200)',
      borderRadius: 'var(--radius-l)',
      padding: '16px',
    }}
  >
    {children}
  </Box>
);

const PublicTerritoryView = ({
  payload,
}: {
  payload: TerritorySharePayload;
}) => {
  const geometry = (payload.geometry ?? null) as Polygon | MultiPolygon | null;

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: 'var(--accent-100)',
        padding: { mobile: '16px', tablet: '24px' },
      }}
    >
      <Stack
        spacing="16px"
        sx={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}
      >
        <Stack spacing="2px">
          <Typography className="body-small-semibold" color="var(--grey-400)">
            {payload.congName}
          </Typography>
          <Typography className="h1">{payload.label}</Typography>
          <Typography className="body-regular" color="var(--grey-400)">
            {payload.zoneName}
          </Typography>
        </Stack>

        {geometry && (
          <Box
            sx={{
              borderRadius: 'var(--radius-l)',
              overflow: 'hidden',
              border: '1px solid var(--accent-200)',
            }}
          >
            <TerritoryMap
              geometry={geometry}
              color={payload.zoneColor}
              height={420}
              showLiveLocation={true}
            />
          </Box>
        )}

        {payload.imageURL && (
          <Card>
            <Stack spacing="10px">
              <Typography className="h4">Imagen del territorio</Typography>
              <Box
                component="img"
                src={payload.imageURL}
                alt={`Territorio ${payload.label}`}
                sx={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 'var(--radius-m)',
                  display: 'block',
                }}
              />
            </Stack>
          </Card>
        )}

        {(payload.numeroViviendas !== undefined ||
          payload.notas ||
          payload.tags.length > 0) && (
          <Card>
            <Stack spacing="10px">
              <Typography className="h4">Información</Typography>

              {payload.numeroViviendas !== undefined && (
                <Typography className="body-regular">
                  {payload.numeroViviendas} viviendas
                </Typography>
              )}

              {payload.tags.length > 0 && (
                <Stack direction="row" spacing="6px" flexWrap="wrap" useFlexGap>
                  {payload.tags.map((tag) => (
                    <Box
                      key={tag.nombre}
                      sx={{
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-max)',
                        backgroundColor: 'var(--accent-150)',
                      }}
                    >
                      <Typography className="label-small-medium">
                        {tag.nombre}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}

              {payload.notas && (
                <Typography
                  className="body-regular"
                  color="var(--grey-400)"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {payload.notas}
                </Typography>
              )}
            </Stack>
          </Card>
        )}

        {payload.locations.length > 0 && (
          <Card>
            <Stack spacing="10px">
              <Typography className="h4">No visitar</Typography>
              <Typography className="body-small-regular" color="var(--grey-400)">
                No llames en estas direcciones.
              </Typography>
              <Stack spacing="8px">
                {payload.locations.map((location, index) => (
                  <Box
                    key={`${location.direccion}-${index}`}
                    sx={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-m)',
                      backgroundColor: 'var(--red-light)',
                      border: '1px solid var(--red-main)',
                    }}
                  >
                    <Typography className="body-regular-semibold">
                      {location.direccion}
                    </Typography>
                    {location.nota && (
                      <Typography
                        className="body-small-regular"
                        color="var(--grey-400)"
                      >
                        {location.nota}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Card>
        )}

        <Typography
          className="label-small-regular"
          color="var(--grey-350)"
          sx={{ textAlign: 'center', paddingBottom: '8px' }}
        >
          Enlace compartido por {payload.congName}. Deja de funcionar cuando se
          entrega el territorio.
        </Typography>
      </Stack>
    </Box>
  );
};

export default PublicTerritoryPage;
