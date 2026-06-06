import { useEffect, useMemo, useRef, useState, forwardRef, type ReactElement, type Ref } from 'react';
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

// ─── Pill segmented control estilo iOS ──────────────────────────────────────
const SegmentedControl = ({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: number;
  onChange: (idx: number) => void;
}) => (
  <Box
    sx={{
      display: 'flex',
      backgroundColor: 'rgba(120,120,128,0.12)',
      borderRadius: '10px',
      p: '3px',
    }}
  >
    {tabs.map((t, i) => (
      <Box
        key={t}
        onClick={() => onChange(i)}
        sx={{
          flex: 1,
          textAlign: 'center',
          py: '6px',
          borderRadius: '8px',
          backgroundColor: active === i ? '#fff' : 'transparent',
          boxShadow:
            active === i
              ? '0 1px 3px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.05)'
              : 'none',
          color: active === i ? '#000' : 'rgba(60,60,67,0.6)',
          fontWeight: active === i ? 600 : 400,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          letterSpacing: '-0.1px',
        }}
      >
        {t}
      </Box>
    ))}
  </Box>
);

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
      backgroundColor: open ? 'rgba(251,146,60,0.13)' : `${color}18`,
      border: `1px solid ${open ? 'rgba(249,115,22,0.3)' : color + '35'}`,
    }}
  >
    <Box
      sx={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: open ? '#F97316' : color,
        ...(open && {
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { boxShadow: `0 0 0 0 rgba(249,115,22,0.4)` },
            '50%': { boxShadow: `0 0 0 4px rgba(249,115,22,0)` },
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
        color: open ? '#C2410C' : color,
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
}: {
  label: string;
  onClick: () => void;
  color?: string;
  variant?: 'primary' | 'secondary';
}) => (
  <Box
    onClick={onClick}
    sx={{
      width: '100%',
      py: '15px',
      borderRadius: '16px',
      textAlign: 'center',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: '16px',
      letterSpacing: '-0.2px',
      transition: 'transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease',
      '&:active': { transform: 'scale(0.97)', opacity: 0.85 },
      ...(variant === 'primary'
        ? {
            background: color
              ? `linear-gradient(135deg, ${color}ee 0%, ${color}bb 100%)`
              : 'linear-gradient(135deg, var(--accent-main) 0%, var(--brand) 100%)',
            color: '#fff',
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
  const { tabletDown } = useBreakpoints();
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
  }, [territory?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const relevantAssignment = useMemo(() => {
    if (!liveTerritory) return null;
    return openAssignments.find((a) => a.territoryId === liveTerritory.id);
  }, [liveTerritory, openAssignments]);

  if (!liveTerritory) return null;

  const color = getZoneColor(liveTerritory.zoneId, zones);
  const zoneName = getZoneName(liveTerritory.zoneId, zones);
  const label = territoryLabel(liveTerritory);
  const isOpen = Boolean(relevantAssignment);

  const handleUploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTerritoryImage(congID, liveTerritory.id, file);
      await saveTerritory(congID, { ...liveTerritory, imageURL: url }, masterKey ?? '');
    } catch (e) {
      console.error(e);
      alert('Error subiendo imagen. Verifica tu conexión.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;
    setUploading(true);
    try {
      await deleteTerritoryImage(congID, liveTerritory.id);
      await saveTerritory(congID, { ...liveTerritory, imageURL: '' }, masterKey ?? '');
    } catch (e) {
      console.error(e);
      alert('Error eliminando la imagen. Verifica tu conexión.');
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
  // tab 0 (Mapa):      sheet corto → mapa muy visible sobre el sheet
  // tab 1 (Imagen):    sheet alto → la imagen se muestra DENTRO del sheet
  // tab 2 (Direcciones): sheet medio
  const SHEET_HEIGHTS = ['44vh', '90vh', '72vh'];
  const sheetHeight = SHEET_HEIGHTS[tab];

  // ── LAYOUT MÓVIL ───────────────────────────────────────────────────────────
  const mobileContent = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
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
          onClick={onClose}
          sx={{
            width: 36,
            height: 36,
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
          <IconClose color="#fff" width={14} height={14} />
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
              borderRadius: '2px',
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
                  onClick={() => setEditingTags(!editingTags)}
                  sx={{
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
                <Typography sx={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  No hay etiquetas creadas.
                </Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {allTags.map((tag) => {
                    const active = (liveTerritory.tags || []).includes(tag.id);
                    return (
                      <Box
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        sx={{
                          px: '12px',
                          py: '5px',
                          borderRadius: '20px',
                          border: `1.5px solid ${tag.color}`,
                          backgroundColor: active ? tag.color : 'transparent',
                          color: active ? '#fff' : tag.color,
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
                    backgroundColor: '#FFFBEA',
                    borderRadius: '14px',
                    border: '1px solid #FDE68A',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: '#B45309',
                      mb: '6px',
                      display: 'block',
                    }}
                  >
                    Notas
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: '#92400E', lineHeight: 1.5 }}>
                    {liveTerritory.notas}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  sx={{
                    fontSize: 13,
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
                        borderRadius: '16px',
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
                    borderRadius: '16px',
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
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-2)' }}>
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
                          borderRadius: '12px',
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
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        hidden
                        disabled={uploading}
                        onChange={(e) => handleUploadImage(e.target.files?.[0])}
                      />
                    </label>
                  </Box>
                  {liveTerritory.imageURL && (
                    <Box
                      onClick={uploading ? undefined : handleDeleteImage}
                      sx={{
                        width: 'auto',
                        px: 2,
                        py: '11px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        fontWeight: 600,
                        fontSize: 14,
                        textAlign: 'center',
                        cursor: uploading ? 'default' : 'pointer',
                        transition: 'background 0.15s ease',
                        '&:active': { backgroundColor: uploading ? undefined : 'rgba(239, 68, 68, 0.2)' },
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
                  sx={{ width: 32, height: 32, color: 'var(--ink-2)', '&:hover': { backgroundColor: 'var(--bg-hover)' } }}
                >
                  <IconEdit width={15} height={15} />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ width: 32, height: 32, color: 'var(--ink-2)', '&:hover': { backgroundColor: 'var(--bg-hover)' } }}
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
                  onClick={() => setEditingTags(!editingTags)}
                  sx={{
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
            <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: '12px' }}>
              {allTags.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  No hay etiquetas creadas.
                </Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {allTags.map((tag) => {
                  const active = (liveTerritory.tags || []).includes(tag.id);
                  return (
                    <Box
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      sx={{
                        px: '12px',
                        py: '5px',
                        borderRadius: '20px',
                        border: `1.5px solid ${tag.color}`,
                        backgroundColor: active ? tag.color : 'transparent',
                        color: active ? '#fff' : tag.color,
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
                <Box sx={{ p: 2, backgroundColor: '#FFFBEA', borderRadius: '12px', border: '1px solid #FDE68A', mb: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: '#B45309',
                      fontSize: '11px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      mb: '6px',
                      display: 'block',
                    }}
                  >
                    Notas internas
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#92400E' }}>
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
                        borderRadius: '12px',
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
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-hover)',
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
                  <Button variant="tertiary" disableAutoStretch disabled={uploading} sx={{ flex: 1 }}>
                    <label style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {uploading ? 'Subiendo…' : liveTerritory.imageURL ? 'Cambiar imagen' : 'Subir imagen (PNG/JPG)'}
                      <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => handleUploadImage(e.target.files?.[0])} />
                    </label>
                  </Button>
                  {liveTerritory.imageURL && (
                    <Button variant="tertiary" disableAutoStretch disabled={uploading} onClick={handleDeleteImage} sx={{ color: '#EF4444', '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.08)' } }}>
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
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button variant="tertiary" onClick={onClose}>Cerrar</Button>
            {relevantAssignment && onEntregar && (canManage || settings.publishersCanReturn) && (
              <Button variant="main" onClick={() => onEntregar(relevantAssignment)}>
                Entregar
              </Button>
            )}
            {canManage && !relevantAssignment && onAsignar && (
              <Button variant="main" onClick={() => onAsignar(territory)}>
                Asignar
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <MUIDialog
      fullScreen={tabletDown}
      open={!!territory}
      onClose={onClose}
      TransitionComponent={tabletDown ? Transition : undefined}
      PaperProps={{
        sx: tabletDown
          ? {
              backgroundColor: '#1a1a2e',
              overflow: 'hidden',
              // Quitar sombra y bordes del Paper para que el diseño propio tome el control
              boxShadow: 'none',
            }
          : {
              maxWidth: '860px',
              width: 'calc(100% - 32px)',
              borderRadius: '24px',
              overflow: 'hidden',
              backgroundColor: 'transparent',
              boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.06)',
            },
      }}
    >
      {tabletDown ? mobileContent : desktopContent}
    </MUIDialog>
  );
};

export default DialogVerTerritorio;
