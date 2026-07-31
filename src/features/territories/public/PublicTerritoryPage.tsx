import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Stack } from '@mui/material';
import { MultiPolygon, Polygon } from 'geojson';
import Button from '@components/button';
import Typography from '@components/typography';
import { TagChip, ViviendasTag } from '@features/territories/ui';
import TerritoryMap from '@features/territories/map/TerritoryMap';
import SegmentedControl from '@components/segmented_control';
import { TerritorySharePayload } from '@definition/territory_shares';
import { fetchPublicShare } from '@services/firebase/territory_shares';
import { SHARE_KEY_LENGTH } from '@services/encryption/share';
import { ParsedShareLink, parseShareHash } from '@services/app/territory_share';
import { FORCED_UI_LANG, LANGUAGE_LIST } from '@constants/index';

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
    body: 'Puede que haya caducado, que se haya entregado el territorio o que se haya anulado el enlace. Pide uno nuevo si todavía lo necesitas.',
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

      // Con el contenido ya descifrado en memoria, la clave sobra en la
      // barra de direcciones. Se borra del hash para que no aparezca en una
      // captura de pantalla ni acabe sincronizada en el historial del
      // navegador del invitado. `replaceState` no recarga ni añade entrada
      // al historial, y `link.current` conserva lo necesario para reintentar.
      try {
        // Se quita SOLO la clave (?k=), conservando `#/t/{congId}/{token}`.
        // Borrando el hash entero, una recarga o un "tirar para refrescar"
        // dejaba de coincidir con la rama pública de main.tsx y al invitado
        // se le montaba la aplicación completa: base de datos local, service
        // worker y una pantalla de acceso de una app en la que no tiene
        // cuenta, sin forma de volver al territorio. Ahora recargar muestra
        // "Enlace incompleto", que es lo correcto y le dice qué hacer.
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}#/t/${parsed.congId}/${parsed.token}`
        );
      } catch {
        // Si el navegador no lo permite, no es motivo para romper la página.
      }

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
        <Typography className="h4" color="var(--ink-2)">
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
            color="var(--ink-2)"
            sx={{ textAlign: 'center' }}
          >
            {body}
          </Typography>
          {(state.kind === 'offline' || state.kind === 'unknown') && (
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
      border: '1px solid var(--line)',
      borderRadius: 'var(--shape-sm)',
      padding: '16px',
    }}
  >
    {children}
  </Box>
);

/**
 * Idioma con el que se escribe la fecha para el invitado.
 *
 * Aquí no hay sesión ni ajustes de congregación, así que antes se dejaba al
 * navegador (`undefined`). Pero la app está BLOQUEADA a un idioma con
 * `FORCED_UI_LANG` precisamente porque la detección por navegador dejaba a
 * algunos dispositivos en inglés; esta ruta se saltaba ese bloqueo y el
 * enlace salía con «22 July 2026» en medio de una página en español.
 *
 * Si algún día se quita el bloqueo (`FORCED_UI_LANG = null`), esto vuelve a
 * ser `undefined` y manda el navegador, como antes.
 */
const LOCALE_FECHA = LANGUAGE_LIST.find(
  (idioma) => idioma.threeLettersCode === FORCED_UI_LANG
)?.locale;

/** Fecha legible para el invitado. */
const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString(LOCALE_FECHA, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
};

const PublicTerritoryView = ({
  payload,
}: {
  payload: TerritorySharePayload;
}) => {
  const geometry = (payload.geometry ?? null) as Polygon | MultiPolygon | null;
  const [tab, setTab] = useState(0);

  /** Solo se ofrecen las secciones que este enlace trae de verdad. Quien
   *  comparte elige qué incluir, así que un enlace puede ser solo el mapa,
   *  solo la tarjeta, o cualquier combinación. */
  const secciones = useMemo(() => {
    const out: { key: 'mapa' | 'imagen' | 'info'; label: string }[] = [];
    if (geometry) out.push({ key: 'mapa', label: 'Mapa' });
    if (payload.imageURL) out.push({ key: 'imagen', label: 'Imagen' });
    if (
      payload.numeroViviendas !== undefined ||
      payload.notas ||
      payload.tags.length > 0 ||
      payload.locations.length > 0
    ) {
      out.push({ key: 'info', label: 'Info' });
    }
    return out;
  }, [geometry, payload]);

  const activa = secciones[tab]?.key ?? secciones[0]?.key;

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
        {/* La misma cabecera que la vista de dentro: el número grande, y
            debajo la zona con su punto de color y la chapa de viviendas. Aquí
            la zona iba como texto corriente y las viviendas estaban perdidas
            dentro de la pestaña "Info", que es justo lo que la vista de dentro
            evita a propósito. */}
        <Stack spacing="6px">
          <Typography className="body-small-semibold" color="var(--ink-2)">
            {payload.congName}
          </Typography>
          <Typography className="h1">{payload.label}</Typography>

          <Stack
            direction="row"
            spacing="10px"
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Stack direction="row" spacing="6px" alignItems="center">
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: 'var(--shape-full)',
                  backgroundColor: payload.zoneColor,
                  boxShadow: `0 0 0 2.5px color-mix(in srgb, ${payload.zoneColor} 15%, transparent)`,
                  flexShrink: 0,
                }}
              />
              <Typography className="label-small-medium" color="var(--ink-2)">
                {payload.zoneName}
              </Typography>
            </Stack>

            {payload.numeroViviendas !== undefined && (
              <ViviendasTag count={payload.numeroViviendas} />
            )}
          </Stack>
        </Stack>

        {/* Un enlace puede quedarse sin nada que enseñar: territorio sin
            plano ni imagen, o creado por alguien que no podía compartir las
            notas. Antes la página se quedaba con el título y el pie, y el
            invitado no sabía si el enlace estaba roto. */}
        {secciones.length === 0 && (
          <Card>
            <Typography className="body-regular" color="var(--ink-2)">
              Este territorio todavía no tiene mapa ni imagen que mostrar.
              Pídele a quien te lo envió que lo revise.
            </Typography>
          </Card>
        )}

        {/* Pestañas solo cuando hay más de una cosa que enseñar. Con una
            sola, un selector de una pestaña es ruido. Mismo patrón que la
            vista de territorio dentro de la app. */}
        {secciones.length > 1 && (
          <SegmentedControl
            ariaLabel="Vistas del territorio"
            tabs={secciones.map((s) => s.label)}
            active={tab}
            onChange={setTab}
          />
        )}

        {activa === 'mapa' && geometry && (
          <>
            <Box
              sx={{
                borderRadius: 'var(--shape-sm)',
                overflow: 'hidden',
                border: '1px solid var(--line)',
              }}
            >
              {/* Sin `showLiveLocation`: aquí la ubicación NO se enciende
                  sola. Pedirla nada más abrir un enlace que llega por
                  mensajería es justo lo que hace desconfiar.
                  La enciende quien quiera, con el botón de «Mi ubicación» del
                  propio mapa — que antes no servía de nada en esta página,
                  porque la ubicación solo se activaba desde fuera y el botón
                  se quedaba atenuado esperando una posición que no iba a
                  llegar nunca. */}
              <TerritoryMap
                geometry={geometry}
                color={payload.zoneColor}
                height={420}
              />
            </Box>
          </>
        )}

        {activa === 'imagen' && payload.imageURL && (
          <Box
            component="img"
            src={payload.imageURL}
            alt={`Tarjeta del territorio ${payload.label}`}
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: 'var(--shape-sm)',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--card)',
              display: 'block',
            }}
          />
        )}

        {activa === 'info' && (
          <Card>
            <Stack spacing="10px">
              <Typography className="h4">Información</Typography>

              {/* El MISMO chip que dentro de la app, con el color de cada
                  etiqueta. Aquí estaban dibujadas a mano, todas del mismo gris
                  azulado, así que el enlace perdía justo lo que distingue a una
                  etiqueta de otra. */}
              {payload.tags.length > 0 && (
                <Box>
                  <Typography
                    className="label-small-semibold"
                    color="var(--ink-3)"
                    sx={{ display: 'block', mb: '8px' }}
                  >
                    Etiquetas
                  </Typography>
                  <Stack
                    direction="row"
                    spacing="6px"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {payload.tags.map((tag) => (
                      <TagChip
                        key={tag.nombre}
                        label={tag.nombre}
                        color={tag.color ?? 'var(--accent-main)'}
                        selected
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* El mismo bloque ámbar que dentro de la app: una nota de
                  territorio es un aviso, y aquí se leía como texto corrido. */}
              {payload.notas && (
                <Box
                  sx={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(var(--orange-main-base), 0.1)',
                    borderRadius: 'var(--shape-md)',
                    border: '1px solid rgba(var(--orange-main-base), 0.3)',
                  }}
                >
                  <Typography
                    className="label-small-semibold"
                    color="var(--orange-dark)"
                    sx={{ display: 'block', mb: '4px' }}
                  >
                    Notas
                  </Typography>
                  <Typography
                    className="body-small-regular"
                    sx={{
                      color: 'var(--orange-dark)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {payload.notas}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Card>
        )}

        {activa === 'info' && payload.locations.length > 0 && (
          <Card>
            <Stack spacing="10px">
              <Typography className="h4">No visitar</Typography>
              <Typography className="body-small-regular" color="var(--ink-2)">
                No llames en estas direcciones.
              </Typography>
              <Stack spacing="8px">
                {payload.locations.map((location, index) => (
                  <Box
                    key={`${location.direccion}-${index}`}
                    sx={{
                      padding: '10px 12px',
                      borderRadius: 'var(--shape-sm)',
                      backgroundColor: 'var(--red-secondary)',
                      border: '1px solid var(--red-main)',
                    }}
                  >
                    <Typography className="body-regular-semibold">
                      {location.direccion}
                    </Typography>
                    {location.nota && (
                      <Typography
                        className="body-small-regular"
                        color="var(--ink-2)"
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
          color="var(--ink-2)"
          sx={{ textAlign: 'center', paddingBottom: '8px' }}
        >
          Enlace compartido por {payload.congName}.
          {payload.expiresAt
            ? ` Válido hasta el ${formatDate(payload.expiresAt)}.`
            : ''}
          {payload.tiedToAssignment
            ? ' Si el territorio se entrega antes, dejará de funcionar en ese momento.'
            : ''}
        </Typography>
      </Stack>
    </Box>
  );
};

export default PublicTerritoryPage;
