import { displaySnackNotification } from '@services/states/app';
import { useEffect, useMemo, useRef, useState, forwardRef, type ReactElement, type Ref } from 'react';
import { useConfirm } from '@components/confirm_dialog';
import {
  Box,
  Stack,
  Dialog as MUIDialog,
  Slide,
  IconButton,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useAtomValue } from 'jotai';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconEdit, IconClose } from '@components/icons';
import TerritoryMap from './map/TerritoryMap';
import DireccionesTab from './DireccionesTab';
import SegmentedControl from '@components/segmented_control';
import { Territory, TerritoryAssignment } from '@definition/territories';
import {
  territoryZonesState,
  territoryTagsState,
  territoryOpenAssignmentsState,
  territorySettingsState,
  territoriesState,
} from '@states/territories';
import {
  congIDState,
  congMasterKeyState,
} from '@states/settings';
import {
  uploadTerritoryImage,
  deleteTerritoryImage,
  saveTerritory,
} from '@services/firebase/territories';
import { getZoneColor, getZoneName, territoryLabel } from '@services/app/territories';
import { useBreakpoints } from '@hooks/index';

type Props = {
  territory: Territory | null;
  onClose: () => void;
  canManage?: boolean;
  showLiveLocation?: boolean;
  onEntregar?: (assignment: TerritoryAssignment) => void;
  onAsignar?: (territory: Territory) => void;
  onEdit?: () => void;
};

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Reset de estilos nativos de <button> — varios controles aquí usaban un
// Box con onClick (invisible para lectores de pantalla y sin soporte de
// teclado); ahora son botones reales con este reset para conservar el
// aspecto visual exacto.
const buttonReset = {
  appearance: 'none',
  border: 'none',
  background: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  textAlign: 'inherit',
  '&:focus-visible': {
    outline: '2px solid var(--accent-main)',
    outlineOffset: '2px',
  },
} as const;

// Oculta visualmente un control sin sacarlo del árbol de accesibilidad ni
// del orden de tabulación (a diferencia del atributo `hidden`).
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

// ─── Chip de estado animado ──────────────────────────────────────────────────
const StatusChip = ({ open, color }: { open: boolean; color: string }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      px: '10px',
      py: '4px',
      borderRadius: '20px',
      backgroundColor: open ? 'rgba(var(--orange-main-base), 0.13)' : `${color}18`,
      border: `1px solid ${open ? 'rgba(var(--orange-main-base), 0.3)' : color + '35'}`,
    }}
  >
    <Box
      sx={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: open ? 'var(--orange-main)' : color,
        ...(open && {
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { boxShadow: `0 0 0 0 rgba(var(--orange-main-base), 0.4)` },
            '50%': { boxShadow: `0 0 0 4px rgba(var(--orange-main-base), 0)` },
          },
        }),
      }}
    />
    <Typography
      component="span"
      sx={{
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1,
        color: open ? 'var(--orange-dark)' : color,
        letterSpacing: '-0.1px',
      }}
    >
      {open ? 'Asignado' : 'Libre'}
    </Typography>
  </Box>
);

// ─── Botón de acción principal (grande, pill) ─────────────────────────────
const ActionButton = ({
  label,
  onClick,
  color,
  variant = 'primary',
  disabled = false,
  disabledReason,
}: {
  label: string;
  onClick: () => void;
  color?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Si está deshabilitado, motivo mostrado debajo — para no dejar al
   *  usuario sin explicación de por qué no puede pulsarlo. */
  disabledReason?: string;
}) => (
  <Box>
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      title={disabled ? disabledReason : undefined}
      sx={{
        ...buttonReset,
        width: '100%',
        py: '15px',
        borderRadius: 'var(--radius-xxl)',
        textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontWeight: 700,
        fontSize: '16px',
        letterSpacing: '-0.2px',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease',
        '&:active': disabled ? undefined : { transform: 'scale(0.97)', opacity: 0.85 },
        ...(variant === 'primary'
          ? {
              background: color
                ? `linear-gradient(135deg, ${color}ee 0%, ${color}bb 100%)`
                : 'linear-gradient(135deg, var(--accent-main) 0%, var(--brand) 100%)',
              color: 'var(--always-white)',
              boxShadow: color
                ? `0 4px 16px ${color}50`
                : '0 4px 16px rgba(var(--accent-main-rgb, 59,130,246), 0.35)',
            }
          : {
              backgroundColor: 'rgba(0,0,0,0.05)',
              color: 'var(--ink-2)',
              fontSize: '14px',
              fontWeight: 500,
              py: '11px',
            }),
      }}
    >
      {label}
    </Box>
    {disabled && disabledReason && (
      <Typography
        className="label-small-regular"
        sx={{
          color: 'var(--ink-2)',
          textAlign: 'center',
          mt: '6px',
        }}
      >
        {disabledReason}
      </Typography>
    )}
  </Box>
);

// ─── Componente principal ────────────────────────────────────────────────────
const DialogVerTerritorio = ({
  territory,
  onClose,
  canManage = false,
  showLiveLocation,
  onEntregar,
  onAsignar,
  onEdit,
}: Props) => {
  // Antes usaba `tabletDown` (breakpoint 'tablet' = 480px), así que en
  // tablets (480-768px) se mostraba el diálogo de escritorio en vez del
  // mapa a pantalla completa. Con `laptopDown` (768px) la vista de mapa
  // a pantalla completa cubre también las tablets, no solo el móvil.
  const { laptopDown: tabletDown } = useBreakpoints();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [tab, setTab] = useState(0);
  const [editingTags, setEditingTags] = useState(false);
  const [uploading, setUploading] = useState(false);

  const zones = useAtomValue(territoryZonesState);
  const allTags = useAtomValue(territoryTagsState);
  const openAssignments = useAtomValue(territoryOpenAssignmentsState);
  const territories = useAtomValue(territoriesState);
  
  // LIVE TERRITORY: El prop 'territory' puede ser un snapshot estático (ej. del state de índice).
  // Buscamos el objeto vivo en jotai para que los cambios (como subir imagen) se reflejen al instante.
  const liveTerritory = useMemo(() => {
    return territories.find((t) => t.id === territory?.id) || territory;
  }, [territories, territory]);

  const congID = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const settings = useAtomValue(territorySettingsState);

  // Refs para leer en el efecto sin incluirlos como dependencias
  // (queremos resetear el tab al abrir un territorio, no cuando cambia la config)
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const tabletDownRef = useRef(tabletDown);
  tabletDownRef.current = tabletDown;

  // Reestablece el tab por defecto cada vez que se abre un territorio diferente
  useEffect(() => {
    if (!territory?.id) return;
    const s = settingsRef.current;
    const mobile = tabletDownRef.current;
    const defaultTab = mobile
      ? s.expandMap    ? 0
      : s.expandImage  ? 1
      : s.expandLocations ? 2
      : 0
      : s.expandInfo   ? 0
      : s.expandImage  ? 1
      : s.expandLocations ? 2
      : 0;
    setTab(defaultTab);
    setEditingTags(false);
  }, [territory?.id]);

  // Solo asignaciones normales — igual que TerritoriesOverviewMap. Las de
  // campaña se gestionan aparte (pestaña Campañas) y mostrarlas aquí podía
  // hacer que un territorio en campaña apareciera como "Asignado" a un
  // publicador distinto, o que "Entregar" actuara sobre la asignación
  // equivocada si el territorio tenía ambas a la vez.
  const relevantAssignment = useMemo(() => {
    if (!liveTerritory) return null;
    return openAssignments.find(
      (a) => a.territoryId === liveTerritory.id && !a.isCampaign
    );
  }, [liveTerritory, openAssignments]);

  if (!liveTerritory) return null;

  const color = getZoneColor(liveTerritory.zoneId, zones);
  const zoneName = getZoneName(liveTerritory.zoneId, zones);
  const label = territoryLabel(liveTerritory);
  const isOpen = Boolean(relevantAssignment);

  const handleNavigate = () => {
    if (!liveTerritory.geometry) return;
    const geo = liveTerritory.geometry;
    let coords: number[][] = [];
    if (geo.type === 'Polygon') {
      coords = geo.coordinates[0];
    } else if (geo.type === 'MultiPolygon') {
      coords = geo.coordinates[0][0];
    }
    if (!coords || coords.length === 0) return;
    let lngSum = 0;
    let latSum = 0;
    coords.forEach(([lng, lat]) => {
      lngSum += lng;
      latSum += lat;
    });
    const lat = latSum / coords.length;
    const lng = lngSum / coords.length;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleUploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTerritoryImage(congID, liveTerritory.id, file);
      await saveTerritory(congID, { ...liveTerritory, imageURL: url }, masterKey ?? '');
    } catch (e) {
      console.error(e);
      displaySnackNotification({
        header: 'Error',
        message: 'Error subiendo imagen. Verifica tu conexión.',
        severity: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    const ok = await confirm({
      message: '¿Eliminar la imagen de este territorio? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    setUploading(true);
    try {
      await deleteTerritoryImage(congID, liveTerritory.id);
      // Usar undefined para que stripUndefined elimine el campo de Firestore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imageURL: _removed, ...territoryWithoutImage } = liveTerritory;
      await saveTerritory(congID, { ...territoryWithoutImage }, masterKey ?? '');
    } catch (e) {
      console.error(e);
      displaySnackNotification({
        header: 'Error',
        message: 'Error eliminando la imagen. Verifica tu conexión.',
        severity: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleTag = async (tagId: string) => {
    const current = liveTerritory.tags || [];
    const updated = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    await saveTerritory(congID, { ...liveTerritory, tags: updated }, masterKey ?? '');
  };

  // ── Alturas del sheet por tab ──────────────────────────────────────────────
  // tab 0 (Mapa):      sheet corto → mapa muy visible sobre el sheet. Más
  //                    corto aún si no hay notas que mostrar (si no, queda
  //                    un hueco vacío bajo el aviso de una sola línea).
  // tab 1 (Imagen):    sheet alto → la imagen se muestra DENTRO del sheet
  // tab 2 (Direcciones): sheet medio
  const mapTabHeight = liveTerritory.notas ? '44vh' : '30vh';
  const SHEET_HEIGHTS = [mapTabHeight, '90vh', '72vh'];
  const sheetHeight = SHEET_HEIGHTS[tab];

  // En vh para animar (consistente con SHEET_HEIGHTS) y en px para pasarle a
  // Leaflet el espacio que debe reservar abajo al encuadrar/centrar el mapa.
  const sheetHeightVh = parseFloat(sheetHeight);
  const sheetHeightPx =
    typeof window !== 'undefined'
      ? Math.round((sheetHeightVh / 100) * window.innerHeight)
      : 0;

  // ── LAYOUT MÓVIL ───────────────────────────────────────────────────────────
  const mobileContent = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--white)',
      }}
    >
      {/* MAPA: cubre el 100% del fondo SIEMPRE */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}
      >
        <TerritoryMap
          geometry={liveTerritory.geometry}
          color={color}
          showLiveLocation={showLiveLocation}
          height="100%"
          borderRadius={0}
          bottomInset={sheetHeightPx}
          onNavigate={handleNavigate}
        />
      </Box>

      {/* BOTÓN CERRAR flotante — izquierda para no chocar con los
          controles del mapa (satélite / zoom) que están en la derecha */}
      <Box
        sx={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 16,
          zIndex: 1200,  // Encima de controles del mapa (z:1000) y del sheet (z:100)
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            ...buttonReset,
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.1s ease, background 0.15s ease',
            '&:active': { transform: 'scale(0.88)' },
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
          }}
        >
          <IconClose color="var(--always-white)" width={16} height={16} />
        </Box>
      </Box>

      {/* BOTTOM SHEET flotante */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: sheetHeight,
          zIndex: 100,
          transition: 'height 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--white)',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Accent de color de zona */}
        <Box
          sx={{
            flexShrink: 0,
            height: '4px',
            borderRadius: '28px 28px 0 0',
            background: `linear-gradient(to right, ${color} 0%, ${color}80 60%, transparent 100%)`,
          }}
        />

        {/* Drag handle pill */}
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            pt: '10px',
            pb: '6px',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'rgba(0,0,0,0.13)',
            }}
          />
        </Box>

        {/* IDENTITY BLOCK */}
        <Box sx={{ flexShrink: 0, px: 3, pb: '12px' }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Número del territorio */}
              <Typography
                sx={{
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.8px',
                  lineHeight: 1.1,
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: '6px',
                }}
              >
                {label}
              </Typography>

              {/* Zona + estado */}
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={0.75}>
                <Stack direction="row" alignItems="center" spacing={'5px'}>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      backgroundColor: color,
                      boxShadow: `0 0 0 2.5px ${color}25`,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)' }}
                  >
                    {zoneName}
                  </Typography>
                </Stack>
                <StatusChip open={isOpen} color={color} />
              </Stack>
            </Box>

            {/* Tags dots + edit button */}
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: '2px', flexShrink: 0 }}>
              {(liveTerritory.tags || []).slice(0, 4).map((tagId) => {
                const tag = allTags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <Box
                    key={tag.id}
                    title={tag.nombre}
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      backgroundColor: tag.color,
                    }}
                  />
                );
              })}
              {canManage && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setEditingTags(!editingTags)}
                  aria-label="Editar etiquetas"
                  aria-expanded={editingTags}
                  sx={{
                    ...buttonReset,
                    ml: 0.5,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: editingTags ? `${color}15` : 'rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: editingTags ? color : 'var(--ink-2)',
                    transition: 'all 0.15s ease',
                    '&:active': { transform: 'scale(0.88)' },
                  }}
                >
                  <IconEdit width={13} height={13} />
                </Box>
              )}
            </Stack>
          </Stack>

          {/* Editor de etiquetas (expandible) */}
          {editingTags && canManage && (
            <Box
              sx={{
                mt: 1.5,
                p: '12px',
                backgroundColor: 'rgba(0,0,0,0.04)',
                borderRadius: '14px',
              }}
            >
              {allTags.length === 0 ? (
                <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)' }}>
                  No hay etiquetas creadas.
                </Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {allTags.map((tag) => {
                    const active = (liveTerritory.tags || []).includes(tag.id);
                    return (
                      <Box
                        component="button"
                        type="button"
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        aria-pressed={active}
                        sx={{
                          ...buttonReset,
                          px: '12px',
                          py: '5px',
                          borderRadius: '20px',
                          border: `1.5px solid ${tag.color}`,
                          backgroundColor: active ? tag.color : 'transparent',
                          color: active ? 'var(--always-white)' : tag.color,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '12px',
                          transition: 'all 0.12s ease',
                          '&:active': { transform: 'scale(0.93)' },
                        }}
                      >
                        {tag.nombre}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          )}
        </Box>

        {/* SEGMENTED CONTROL */}
        <Box sx={{ flexShrink: 0, px: 3, pb: '14px' }}>
          <SegmentedControl
            tabs={['Mapa', 'Imagen', 'Direcciones']}
            active={tab}
            onChange={(i) => {
              setTab(i);
              setEditingTags(false);
            }}
          />
        </Box>

        {/* CONTENIDO DINÁMICO (scrollable) */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 3,
            pt: '4px',
            // Ocultar scrollbar pero mantener scroll
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {/* TAB 0: Mapa — notas del territorio */}
          {tab === 0 && (
            <Box>
              {liveTerritory.notas ? (
                <Box
                  sx={{
                    p: '14px 16px',
                    backgroundColor: 'rgba(var(--orange-main-base), 0.1)',
                    borderRadius: '14px',
                    border: '1px solid rgba(var(--orange-main-base), 0.3)',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: 'var(--orange-dark)',
                      mb: '6px',
                      display: 'block',
                    }}
                  >
                    Notas
                  </Typography>
                  <Typography className="body-small-regular" sx={{ color: 'var(--orange-dark)', lineHeight: 1.5 }}>
                    {liveTerritory.notas}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  className="body-small-regular"
                  sx={{
                    color: 'rgba(0,0,0,0.35)',
                    textAlign: 'center',
                    py: 1,
                  }}
                >
                  El mapa está detrás. Úsalo para navegar el territorio.
                </Typography>
              )}
            </Box>
          )}

          {/* TAB 1: Imagen */}
          {tab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {liveTerritory.imageURL ? (
                <PhotoProvider maskOpacity={0.92}>
                  <PhotoView src={liveTerritory.imageURL}>
                    <Box
                      component="img"
                      src={liveTerritory.imageURL}
                      alt={label}
                      sx={{
                        width: '100%',
                        borderRadius: 'var(--radius-xxl)',
                        cursor: 'zoom-in',
                        display: 'block',
                        // Limitar altura para que no sea interminable en scroll
                        maxHeight: '56vh',
                        objectFit: 'contain',
                        backgroundColor: 'rgba(0,0,0,0.03)',
                      }}
                    />
                  </PhotoView>
                </PhotoProvider>
              ) : (
                <Box
                  sx={{
                    height: 200,
                    borderRadius: 'var(--radius-xxl)',
                    border: '1.5px dashed rgba(0,0,0,0.12)',
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 32 }}>🗺️</Typography>
                  <Typography className="body-small-regular" sx={{ color: 'var(--ink-2)' }}>
                    Sin imagen adjunta
                  </Typography>
                </Box>
              )}

              {/* Controles de imagen para responsables */}
              {canManage && (
                <Stack direction="row" spacing={1.5}>
                  <Box sx={{ flex: 1 }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Box
                        sx={{
                          width: '100%',
                          py: '11px',
                          borderRadius: 'var(--radius-xl)',
                          border: `1.5px solid ${color}`,
                          color: color,
                          fontWeight: 600,
                          fontSize: 14,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          '&:active': { backgroundColor: `${color}10` },
                        }}
                      >
                        {uploading
                          ? 'Subiendo…'
                          : liveTerritory.imageURL
                          ? 'Cambiar imagen'
                          : 'Subir imagen (PNG/JPG)'}
                      </Box>
                      {/* `hidden` saca el input del orden de tabulación —
                          nadie podía llegar aquí con teclado. Se oculta
                          visualmente en su lugar, así sigue siendo
                          enfocable y activable con Enter/Espacio. */}
                      <Box
                        component="input"
                        type="file"
                        accept="image/png,image/jpeg"
                        disabled={uploading}
                        onChange={(e) => handleUploadImage(e.target.files?.[0])}
                        sx={visuallyHidden}
                      />
                    </label>
                  </Box>
                  {liveTerritory.imageURL && (
                    <Box
                      component="button"
                      type="button"
                      disabled={uploading}
                      onClick={handleDeleteImage}
                      aria-label="Borrar imagen del territorio"
                      sx={{
                        ...buttonReset,
                        width: 'auto',
                        px: 2,
                        py: '11px',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'rgba(var(--red-main-base), 0.1)',
                        color: 'var(--red-main)',
                        fontWeight: 600,
                        fontSize: 14,
                        textAlign: 'center',
                        cursor: uploading ? 'default' : 'pointer',
                        transition: 'background 0.15s ease',
                        '&:active': { backgroundColor: uploading ? undefined : 'rgba(var(--red-main-base), 0.2)' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Borrar
                    </Box>
                  )}
                </Stack>
              )}
            </Box>
          )}

          {/* TAB 2: Direcciones */}
          {tab === 2 && (
            <DireccionesTab territoryId={liveTerritory.id} canManage={canManage} />
          )}
        </Box>

        {/* BARRA DE ACCIONES */}
        <Box
          sx={{
            flexShrink: 0,
            px: 3,
            pt: '12px',
            pb: 'max(20px, env(safe-area-inset-bottom))',
            borderTop: '0.5px solid rgba(0,0,0,0.07)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {relevantAssignment && onEntregar && (canManage || settings.publishersCanReturn) && (
            <ActionButton
              label="Entregar territorio"
              onClick={() => onEntregar(relevantAssignment)}
              color={color}
              variant="primary"
            />
          )}
          {/* Antes este botón solo desaparecía sin explicar nada cuando un
              publicador no podía entregar por sí mismo. */}
          {relevantAssignment && onEntregar && !canManage && !settings.publishersCanReturn && (
            <ActionButton
              label="Entregar territorio"
              onClick={() => {}}
              disabled
              disabledReason="Solo un responsable puede marcar este territorio como entregado"
            />
          )}
          {canManage && !relevantAssignment && onAsignar && (
            <ActionButton
              label="Asignar territorio"
              onClick={() => onAsignar(liveTerritory)}
              color={color}
              variant="primary"
            />
          )}
          {canManage && onEdit && (
            <ActionButton
              label="Editar"
              onClick={onEdit}
              variant="secondary"
            />
          )}
        </Box>
      </Box>
    </Box>
  );

  // ── LAYOUT ESCRITORIO (2 columnas) ─────────────────────────────────────────
  const desktopContent = (
    <Box sx={{ display: 'flex', width: '100%', height: '100%', minHeight: 540 }}>
      {/* Columna izquierda: MAPA */}
      <Box
        sx={{
          width: '57%',
          flexShrink: 0,
          position: 'relative',
          backgroundColor: '#1a1a2e',
          borderRadius: '24px 0 0 24px',
          overflow: 'hidden',
        }}
      >
        <TerritoryMap
          geometry={liveTerritory.geometry}
          color={color}
          showLiveLocation={showLiveLocation}
          height="100%"
          onNavigate={handleNavigate}
        />

        {/* Ficha de identidad glass en mapa */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 18,
            left: 16,
            right: 16,
            zIndex: 900,
            backgroundColor: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '20px',
            p: '14px 18px',
            border: '0.5px solid rgba(255,255,255,0.65)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography
                sx={{
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#111',
                  letterSpacing: '-0.4px',
                  lineHeight: 1.15,
                }}
              >
                {label}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={'6px'} sx={{ mt: '4px' }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: color,
                  }}
                />
                <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.5)' }}>
                  {zoneName}
                </Typography>
              </Stack>
            </Box>
            <StatusChip open={isOpen} color={color} />
          </Stack>
        </Box>
      </Box>

      {/* Columna derecha: INFO */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--white)',
          borderRadius: '0 24px 24px 0',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            pt: 2.5,
            pb: 2,
            borderBottom: '0.5px solid rgba(0,0,0,0.07)',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={'8px'}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: color,
                  boxShadow: `0 0 0 3px ${color}22`,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                {label}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {canManage && onEdit && (
                <IconButton
                  size="small"
                  onClick={onEdit}
                  aria-label="Editar territorio"
                  sx={{ width: 32, height: 32, color: 'var(--ink-2)', '&:hover': { backgroundColor: 'var(--accent-100)' } }}
                >
                  <IconEdit width={15} height={15} />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Cerrar"
                sx={{ width: 32, height: 32, color: 'var(--ink-2)', '&:hover': { backgroundColor: 'var(--accent-100)' } }}
              >
                <IconClose width={15} height={15} />
              </IconButton>
            </Stack>
          </Stack>

          {/* Tags */}
          {(liveTerritory.tags || []).length > 0 || canManage ? (
            <Stack direction="row" alignItems="center" sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.5 }}>
              {(liveTerritory.tags || []).map((tagId) => {
                const tag = allTags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <Box
                    key={tag.id}
                    sx={{
                      px: '10px',
                      py: '3px',
                      borderRadius: '20px',
                      backgroundColor: `${tag.color}15`,
                      border: `1px solid ${tag.color}35`,
                      color: tag.color,
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {tag.nombre}
                  </Box>
                );
              })}
              {canManage && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setEditingTags(!editingTags)}
                  aria-label="Editar etiquetas"
                  aria-expanded={editingTags}
                  sx={{
                    ...buttonReset,
                    px: '10px',
                    py: '3px',
                    borderRadius: '20px',
                    backgroundColor: editingTags ? `${color}12` : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${editingTags ? color + '45' : 'rgba(0,0,0,0.1)'}`,
                    color: editingTags ? color : 'var(--ink-2)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  + Etiquetas
                </Box>
              )}
            </Stack>
          ) : null}

          {editingTags && canManage && (
            <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 'var(--radius-xl)' }}>
              {allTags.length === 0 ? (
                <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)' }}>
                  No hay etiquetas creadas.
                </Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {allTags.map((tag) => {
                  const active = (liveTerritory.tags || []).includes(tag.id);
                  return (
                    <Box
                      component="button"
                      type="button"
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      aria-pressed={active}
                      sx={{
                        ...buttonReset,
                        px: '12px',
                        py: '5px',
                        borderRadius: '20px',
                        border: `1.5px solid ${tag.color}`,
                        backgroundColor: active ? tag.color : 'transparent',
                        color: active ? 'var(--always-white)' : tag.color,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px',
                        transition: 'all 0.12s ease',
                        '&:hover': { opacity: 0.85 },
                      }}
                    >
                      {tag.nombre}
                    </Box>
                  );
                })}
                </Stack>
              )}
            </Box>
          )}
        </Box>

        {/* Tabs */}
        <Box sx={{ px: 3, py: 1.5, flexShrink: 0 }}>
          <SegmentedControl
            tabs={['Info', 'Imagen', 'Direcciones']}
            active={tab}
            onChange={(i) => { setTab(i); setEditingTags(false); }}
          />
        </Box>

        {/* Contenido scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 1 }}>
          {tab === 0 && (
            <Box>
              {liveTerritory.notas ? (
                <Box sx={{ p: 2, backgroundColor: 'rgba(var(--orange-main-base), 0.1)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(var(--orange-main-base), 0.3)', mb: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: 'var(--orange-dark)',
                      fontSize: '11px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      mb: '6px',
                      display: 'block',
                    }}
                  >
                    Notas internas
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--orange-dark)' }}>
                    {liveTerritory.notas}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 2 }}>
                  Sin notas adicionales.
                </Typography>
              )}
            </Box>
          )}

          {tab === 1 && (
            <Box>
              {liveTerritory.imageURL ? (
                <PhotoProvider maskOpacity={0.9}>
                  <PhotoView src={liveTerritory.imageURL}>
                    <Box
                      component="img"
                      src={liveTerritory.imageURL}
                      alt={label}
                      sx={{
                        width: '100%',
                        borderRadius: 'var(--radius-xl)',
                        cursor: 'zoom-in',
                        boxShadow: 'var(--small-card-shadow)',
                        mb: 1.5,
                      }}
                    />
                  </PhotoView>
                </PhotoProvider>
              ) : (
                <Box
                  sx={{
                    height: 160,
                    borderRadius: 'var(--radius-xl)',
                    backgroundColor: 'var(--accent-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed var(--line)',
                    mb: 1.5,
                  }}
                >
                  <Typography variant="body2" color="var(--ink-2)">Sin imagen</Typography>
                </Box>
              )}
              {canManage && (
                <Stack direction="row" spacing={1.5}>
                  <Box sx={{ flex: 1 }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Box
                        sx={{
                          ...buttonReset,
                          width: '100%',
                          py: '7px',
                          borderRadius: 'var(--r-md, 12px)',
                          border: '1.5px solid var(--accent-main)',
                          color: 'var(--accent-main)',
                          fontWeight: 600,
                          fontSize: 14,
                          textAlign: 'center',
                          cursor: uploading ? 'default' : 'pointer',
                          opacity: uploading ? 0.6 : 1,
                          transition: 'background 0.15s ease',
                          '&:active': uploading ? undefined : { backgroundColor: 'var(--accent-100)' },
                        }}
                      >
                        {uploading ? 'Subiendo…' : liveTerritory.imageURL ? 'Cambiar imagen' : 'Subir imagen (PNG/JPG)'}
                      </Box>
                      <Box
                        component="input"
                        type="file"
                        accept="image/png,image/jpeg"
                        disabled={uploading}
                        onChange={(e) => { handleUploadImage(e.target.files?.[0]); e.target.value = ''; }}
                        sx={visuallyHidden}
                      />
                    </label>
                  </Box>
                  {liveTerritory.imageURL && (
                    <Button variant="tertiary" disableAutoStretch disabled={uploading} onClick={handleDeleteImage} sx={{ color: 'var(--red-main)', '&:hover': { backgroundColor: 'rgba(var(--red-main-base), 0.08)' } }}>
                      Borrar
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          )}

          {tab === 2 && (
            <DireccionesTab territoryId={liveTerritory.id} canManage={canManage} />
          )}
        </Box>

        {/* Acciones inferiores */}
        <Box sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '0.5px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} justifyContent="flex-end">
            {relevantAssignment && onEntregar && !canManage && !settings.publishersCanReturn && (
              <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)' }}>
                Solo un responsable puede marcar este territorio como entregado.
              </Typography>
            )}
            <Button variant="tertiary" onClick={onClose}>Cerrar</Button>
            {relevantAssignment && onEntregar && (
              <Button
                variant="main"
                onClick={() => onEntregar(relevantAssignment)}
                disabled={!canManage && !settings.publishersCanReturn}
              >
                Entregar
              </Button>
            )}
            {canManage && !relevantAssignment && onAsignar && (
              <Button variant="main" onClick={() => onAsignar(liveTerritory)}>
                Asignar
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {ConfirmDialogNode}
      <MUIDialog
        fullScreen={tabletDown}
        open={!!territory}
        onClose={onClose}
      TransitionComponent={tabletDown ? Transition : undefined}
      PaperProps={{
        sx: tabletDown
          ? {
              backgroundColor: 'var(--white)',
              overflow: 'hidden',
              // Quitar sombra y bordes del Paper para que el diseño propio tome el control
              boxShadow: 'none',
              borderRadius: 0,
              margin: 0,
            }
          : {
              maxWidth: '860px',
              width: 'calc(100% - 32px)',
              borderRadius: '24px',
              overflow: 'hidden',
              backgroundColor: 'transparent',
              boxShadow: 'var(--pop-up-shadow), 0 0 0 0.5px rgba(0,0,0,0.06)',
            },
      }}
    >
        {tabletDown ? mobileContent : desktopContent}
      </MUIDialog>
    </>
  );
};

export default DialogVerTerritorio;
