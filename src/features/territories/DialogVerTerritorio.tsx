import { useMemo, useState, forwardRef } from 'react';
import { Box, Stack, Dialog as MUIDialog, Slide, IconButton } from '@mui/material';
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
} from '@states/territories';
import {
  congIDState,
  congMasterKeyState,
  userLocalUIDState,
} from '@states/settings';
import {
  uploadTerritoryImage,
  saveTerritory,
} from '@services/firebase/territories';
import { getZoneColor, getZoneName, territoryLabel } from '@services/app/territories';
import { useBreakpoints } from '@hooks/index';

type Props = {
  territory: Territory | null;
  onClose: () => void;
  canManage?: boolean;
  /** Vista del publicador (muestra ubicación en vivo). */
  showLiveLocation?: boolean;
  onEntregar?: (assignment: TerritoryAssignment) => void;
  onAsignar?: (territory: Territory) => void;
  onEdit?: () => void;
};

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const SegmentedControl = ({ tabs, active, onChange }: { tabs: string[], active: number, onChange: (idx: number) => void }) => (
  <Box sx={{ display: 'flex', backgroundColor: 'var(--bg-hover)', borderRadius: '100px', p: 0.5, width: '100%' }}>
    {tabs.map((t, i) => (
      <Box
        key={t}
        onClick={() => onChange(i)}
        sx={{
          flex: 1, textAlign: 'center', py: 1, borderRadius: '100px',
          backgroundColor: active === i ? 'var(--white)' : 'transparent',
          boxShadow: active === i ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
          color: active === i ? '#111827' : 'var(--ink-2)',
          fontWeight: active === i ? 600 : 500,
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {t}
      </Box>
    ))}
  </Box>
);

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
  const [tab, setTab] = useState(0); // 0: Mapa, 1: Imagen, 2: Direcciones
  const [editingTags, setEditingTags] = useState(false);
  const [uploading, setUploading] = useState(false);

  const zones = useAtomValue(territoryZonesState);
  const allTags = useAtomValue(territoryTagsState);
  const openAssignments = useAtomValue(territoryOpenAssignmentsState);
  const congID = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const localUID = useAtomValue(userLocalUIDState);

  const relevantAssignment = useMemo(() => {
    if (!territory) return null;
    return openAssignments.find((a) => a.territoryId === territory.id);
  }, [territory, openAssignments]);

  if (!territory) return null;

  const color = getZoneColor(territory.zoneId, zones);

  const handleUploadImage = async (file?: File) => {
    if (!file || !territory) return;
    setUploading(true);
    try {
      const url = await uploadTerritoryImage(congID, masterKey, territory.id, file);
      await saveTerritory(congID, masterKey, { ...territory, imageURL: url }, localUID);
    } catch (error) {
      console.error(error);
      alert('Error subiendo imagen. Verifica tu conexión.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleTag = async (tagId: string) => {
    if (!territory) return;
    const current = territory.tags || [];
    const updated = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    await saveTerritory(congID, masterKey, { ...territory, tags: updated }, localUID);
  };

  return (
    <MUIDialog
      fullScreen={tabletDown}
      open={!!territory}
      onClose={onClose}
      TransitionComponent={tabletDown ? Transition : undefined}
      PaperProps={{
        style: tabletDown ? {
          backgroundColor: '#f5f5f5', // Fondo del contenedor en fullScreen
        } : {
          maxWidth: '720px',
          width: '100%',
          borderRadius: '24px', // Borde suave estilo Apple para desktop
          backgroundColor: 'var(--white)',
          margin: '16px',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* BOTÓN FLOTANTE CERRAR EN MÓVIL */}
        {tabletDown && (
          <IconButton 
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1100,
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              '&:hover': { backgroundColor: 'white' },
            }}
          >
            <IconClose color="var(--ink)" />
          </IconButton>
        )}

        {/* HEADER INMERSIVO (Mapa o Imagen) */}
        <Box sx={{ 
          width: '100%', 
          height: tabletDown ? '45vh' : 380, 
          position: 'relative', 
          backgroundColor: '#f5f5f5',
          flexShrink: 0
        }}>
          {tab === 0 && territory.geometry ? (
            <TerritoryMap
              geometry={territory.geometry}
              color={color}
              showLiveLocation={showLiveLocation}
              height="100%"
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#e5e5e5' }}>
              {territory.imageURL ? (
                <PhotoProvider maskOpacity={0.8}>
                  <PhotoView src={territory.imageURL}>
                    <img
                      src={territory.imageURL}
                      alt={territoryLabel(territory)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        cursor: 'zoom-in',
                      }}
                    />
                  </PhotoView>
                </PhotoProvider>
              ) : (
                <Typography variant="body2" color="var(--ink-2)">Este territorio no tiene imagen.</Typography>
              )}
            </Box>
          )}

          {/* TARJETA DE METADATOS FLOTANTE (SÓLO EN ESCRITORIO) */}
          {!tabletDown && (
            <Box sx={{ 
              position: 'absolute', 
              top: 16, left: 16, 
              zIndex: 1000, 
              pointerEvents: 'none',
              maxWidth: 'calc(100% - 80px)' 
            }}>
              <Box sx={{
                pointerEvents: 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '16px',
                p: 2,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid rgba(255,255,255,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, mb: 0.5 }}>
                  {territoryLabel(territory)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--ink-2)', fontWeight: 500, mb: 1 }}>
                  {getZoneName(territory.zoneId, zones)}
                </Typography>

                <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {(territory.tags || []).map((tagId) => {
                    const tag = allTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Box
                        key={tag.id}
                        sx={{
                          px: 1.2,
                          py: 0.3,
                          borderRadius: '12px',
                          backgroundColor: `${tag.color}20`, // 20% opacity
                          color: tag.color,
                          border: `1px solid ${tag.color}40`,
                          fontWeight: 600,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '11px' }}>{tag.nombre}</Typography>
                      </Box>
                    );
                  })}
                  {canManage && (
                    <Box
                      onClick={() => setEditingTags(!editingTags)}
                      sx={{ 
                        width: 24, height: 24, borderRadius: '12px', 
                        backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'background 0.2s',
                        '&:hover': { backgroundColor: 'var(--line)' }
                      }}
                    >
                      <IconEdit width={14} height={14} />
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>
          )}
        </Box>

        {/* CONTENIDO INFERIOR (HOJA BLANCA) */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: 'var(--white)',
          borderRadius: tabletDown ? '24px 24px 0 0' : 0,
          marginTop: tabletDown ? '-24px' : 0,
          zIndex: 1050,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: tabletDown ? '0 -4px 20px rgba(0,0,0,0.08)' : 'none',
        }}>
          
          <Box sx={{ p: { mobile: 2.5, tablet: 3 }, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            {/* TÍTULO Y ETIQUETAS EN MÓVIL (TIPO AIRBNB) */}
            {tabletDown && (
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1, mb: 0.5 }}>
                  {territoryLabel(territory)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--ink-2)', fontWeight: 500, mb: 1.5, display: 'block' }}>
                  {getZoneName(territory.zoneId, zones)}
                </Typography>

                <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {(territory.tags || []).map((tagId) => {
                    const tag = allTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Box
                        key={tag.id}
                        sx={{
                          px: 1.2,
                          py: 0.3,
                          borderRadius: '12px',
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`,
                          fontWeight: 600,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '11px' }}>{tag.nombre}</Typography>
                      </Box>
                    );
                  })}
                  {canManage && (
                    <Box
                      onClick={() => setEditingTags(!editingTags)}
                      sx={{ 
                        width: 28, height: 28, borderRadius: '14px', 
                        backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'background 0.2s',
                        '&:active': { backgroundColor: 'var(--line)' }
                      }}
                    >
                      <IconEdit width={16} height={16} />
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            <SegmentedControl 
              tabs={['Mapa', 'Imagen', 'Direcciones']} 
              active={tab} 
              onChange={setTab} 
            />

            {/* ÁREA DE EDICIÓN DE ETIQUETAS */}
            {editingTags && canManage && (
              <Box sx={{ p: 2, backgroundColor: 'var(--bg-hover)', borderRadius: '16px' }}>
                <Typography variant="caption" sx={{ mb: 1.5, display: 'block', fontWeight: 600, color: 'var(--ink)' }}>
                  Editar Etiquetas:
                </Typography>
                {allTags.length === 0 ? (
                  <Typography variant="caption" color="var(--ink-2)">No hay etiquetas creadas.</Typography>
                ) : (
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {allTags.map((tag) => {
                      const active = (territory.tags || []).includes(tag.id);
                      return (
                        <Box
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.id)}
                          sx={{
                            px: 1.5, py: 0.5, borderRadius: '12px',
                            border: `1px solid ${tag.color}`,
                            backgroundColor: active ? tag.color : 'transparent',
                            color: active ? '#fff' : tag.color,
                            cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                            transition: 'all 0.1s ease',
                            '&:active': { transform: 'scale(0.95)' }
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

            {/* CONTENIDO DINÁMICO */}
            <Box sx={{ minHeight: 100, flex: 1 }}>
              {tab === 0 && territory.notas && (
                <Box sx={{ p: 2, backgroundColor: '#FFFBEA', borderRadius: '12px', border: '1px solid #FDE68A' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#B45309', mb: 0.5, display: 'block' }}>
                    NOTAS DEL TERRITORIO
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#92400E' }}>
                    {territory.notas}
                  </Typography>
                </Box>
              )}

              {tab === 1 && canManage && (
                <Button variant="tertiary" disableAutoStretch disabled={uploading}>
                  <label style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {uploading ? 'Subiendo…' : territory.imageURL ? 'Cambiar imagen' : 'Subir imagen (PNG/JPG)'}
                    <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => handleUploadImage(e.target.files?.[0])} />
                  </label>
                </Button>
              )}

              {tab === 2 && (
                <DireccionesTab territoryId={territory.id} canManage={canManage} />
              )}
            </Box>

          </Box>

          {/* ACCIONES INFERIORES FIJAS AL FONDO */}
          <Box sx={{ 
            p: 2, 
            pb: tabletDown ? 'calc(16px + env(safe-area-inset-bottom))' : 2,
            borderTop: '1px solid var(--line)', 
            backgroundColor: 'var(--white)',
          }}>
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Box>
                {canManage && onEdit && (
                  <Button variant="tertiary" onClick={onEdit} sx={{ color: 'var(--ink-2)' }}>
                    Editar
                  </Button>
                )}
              </Box>
              <Stack direction="row" spacing={1.5}>
                {!tabletDown && (
                  <Button variant="tertiary" onClick={onClose}>
                    Cerrar
                  </Button>
                )}
                {relevantAssignment && onEntregar && (
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
            </Stack>
          </Box>

        </Box>
      </Box>
    </MUIDialog>
  );
};

export default DialogVerTerritorio;
