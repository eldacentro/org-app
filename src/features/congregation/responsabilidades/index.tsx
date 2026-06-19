import { useState, useMemo, useEffect, ElementType } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAtomValue } from 'jotai';
import {
  IconAdd,
  IconGroups,
  IconAssignment,
  IconCongregation,
  IconReorder,
  IconUp,
  IconDown,
  IconEdit,
} from '@components/icons';
import { responsabilidadesState } from '@states/responsabilidades';
import { personsActiveState, eldersActiveState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import {
  ResponsabilidadesType,
  AncianoCargo,
  Departamento,
  DepartamentoSimple,
  DepartamentoExtended,
} from '@definition/responsabilidades';
import { CardContainer } from './shared_styles';
import useBreakpoints from '@hooks/useBreakpoints';
import Typography from '@components/typography';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Divider from '@components/divider';

import { PersonOption } from './components';
import DrawerEditCargo from './DrawerEditCargo';
import DrawerEditDepartamento from './DrawerEditDepartamento';

// ─── Hooks for person lists ──────────────────────────────────────────────────

const usePersonOptions = () => {
  const persons = useAtomValue(personsActiveState);
  const elders = useAtomValue(eldersActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const resolveName = (uid: string) => {
    const p = persons.find((x) => x.person_uid === uid);
    if (!p) return uid; // fallback: legacy name or unknown uid
    return buildPersonFullname(
      p.person_data.person_lastname.value,
      p.person_data.person_firstname.value,
      fullnameOption
    );
  };

  const ancianos: PersonOption[] = useMemo(
    () =>
      elders
        .map((p) => ({
          uid: p.person_uid,
          label: buildPersonFullname(
            p.person_data.person_lastname.value,
            p.person_data.person_firstname.value,
            fullnameOption
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [elders, fullnameOption]
  );

  const varones: PersonOption[] = useMemo(
    () =>
      persons
        .filter((p) => p.person_data.male?.value === true)
        .map((p) => ({
          uid: p.person_uid,
          label: buildPersonFullname(
            p.person_data.person_lastname.value,
            p.person_data.person_firstname.value,
            fullnameOption
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [persons, fullnameOption]
  );

  return { resolveName, ancianos, varones };
};

// ─── Section wrapper ─────────────────────────────────────────────────────────

const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: ElementType;
  title: string;
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mb: '12px' }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: 'var(--r-md)',
        backgroundColor: 'var(--accent-100)',
        border: '1px solid var(--accent-200)',
      }}
    >
      <Icon color="var(--accent-main)" width={24} height={24} />
    </Box>
    <Typography className="h2" color="var(--black)">
      {title}
    </Typography>
  </Box>
);

const FieldRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center', py: '4px' }}>
    <Typography
      className="body-small-semibold"
      color="var(--accent-dark)"
      sx={{ minWidth: 160 }}
    >
      {label}
    </Typography>
    <Typography className="body-regular" color="var(--black)" sx={{ fontWeight: 500 }}>
      {value}
    </Typography>
  </Box>
);

// ─── Read views ──────────────────────────────────────────────────────────────

const ReadCuerpoAncianos = ({
  uids,
  resolveName,
}: {
  uids: string[];
  resolveName: (u: string) => string;
}) => (
  <CardContainer>
    <SectionHeader icon={IconGroups} title="Cuerpo de Ancianos" />
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      {uids.map((uid) => (
        <Chip
          key={uid}
          label={resolveName(uid)}
          sx={{
            background: 'linear-gradient(135deg, var(--accent-100) 0%, var(--white) 100%)',
            color: 'var(--accent-dark)',
            fontFamily: 'Figtree, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            border: '1px solid var(--accent-200)',
            height: '36px',
            px: '4px',
            borderRadius: 'var(--r-md)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 'var(--shadow-sm)',
              borderColor: 'var(--accent-main)',
            },
          }}
        />
      ))}
      {uids.length === 0 && (
        <Typography color="var(--grey-400)" sx={{ fontStyle: 'italic' }}>
          No se han encontrado ancianos registrados.
        </Typography>
      )}
    </Box>
  </CardContainer>
);

const ReadCargos = ({
  cargos,
  resolveName,
}: {
  cargos: AncianoCargo[];
  resolveName: (u: string) => string;
}) => (
  <CardContainer>
    <SectionHeader icon={IconAssignment} title="Responsabilidades de Ancianos" />
    <Stack spacing="8px" divider={<Divider color="var(--accent-100)" />}>
      {cargos.map((item, i) => (
        <FieldRow
          key={i}
          label={item.cargo}
          value={resolveName(item.responsable)}
        />
      ))}
      {cargos.length === 0 && (
        <Typography color="var(--grey-400)" sx={{ fontStyle: 'italic' }}>
          Aún no se han definido cargos específicos.
        </Typography>
      )}
    </Stack>
  </CardContainer>
);

const ReadDepartamentos = ({
  departamentos,
  resolveName,
}: {
  departamentos: Departamento[];
  resolveName: (u: string) => string;
}) => (
  <Box>
    <SectionHeader icon={IconCongregation} title="Departamentos" />
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          mobile: '1fr',
          tablet: '1fr 1fr',
          laptop: '1fr 1fr 1fr',
        },
        gap: '20px',
      }}
    >
      {departamentos.map((dep) => (
        <Box
          key={dep.id}
          sx={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)',
              borderColor: 'var(--accent-main)',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              backgroundColor: 'var(--accent-main)',
            }
          }}
        >
          <Box sx={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography className="h3" color="var(--black)" sx={{ fontWeight: 700 }}>
                {dep.name}
              </Typography>
              <IconCongregation color="var(--accent-200)" width={24} height={24} />
            </Box>

            <Stack spacing="12px">
              <Box>
                <Typography className="label-small-medium" color="var(--grey-400)" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: '4px' }}>
                  Responsable
                </Typography>
                <Typography className="body-regular-semibold" color="var(--accent-dark)">
                  {resolveName(dep.responsable)}
                </Typography>
              </Box>

              {dep.auxiliar && (
                <Box>
                  <Typography className="label-small-medium" color="var(--grey-400)" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: '4px' }}>
                    Auxiliar
                  </Typography>
                  <Typography className="body-regular" color="var(--black)">
                    {resolveName(dep.auxiliar)}
                  </Typography>
                </Box>
              )}

              {dep.type === 'extended' &&
                (dep as DepartamentoExtended).members.length > 0 && (
                  <Box sx={{ mt: '4px' }}>
                    <Typography className="label-small-medium" color="var(--grey-400)" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: '8px' }}>
                      Equipo ({ (dep as DepartamentoExtended).members.length })
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(dep as DepartamentoExtended).members.map((uid) => (
                        <Chip
                          key={uid}
                          label={resolveName(uid)}
                          size="small"
                          sx={{
                            fontFamily: 'Figtree, sans-serif',
                            fontSize: '11px',
                            backgroundColor: 'var(--accent-100)',
                            color: 'var(--accent-dark)',
                            borderRadius: 'var(--r-sm)',
                            fontWeight: 500,
                            '&:hover': { backgroundColor: 'var(--accent-200)' }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
            </Stack>
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);

// ─── Edit Mode Summary Cards ──────────────────────────────────────────────────

const EditSummaryCard = ({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: 'var(--accent-main)',
        boxShadow: 'var(--shadow-sm)',
        backgroundColor: 'var(--accent-100)',
      },
    }}
  >
    <Box>
      <Typography className="body-regular-semibold" color="var(--black)">
        {title || '(Sin título)'}
      </Typography>
      <Typography className="body-small" color="var(--grey-400)">
        {subtitle || 'Sin asignar'}
      </Typography>
    </Box>
    <IconEdit color="var(--accent-main)" />
  </Box>
);

// ─── Reorder Dialog ──────────────────────────────────────────────────────────

const ReorderDialog = ({
  open,
  departamentos,
  onClose,
  onSave,
}: {
  open: boolean;
  departamentos: Departamento[];
  onClose: () => void;
  onSave: (v: Departamento[]) => void;
}) => {
  const [list, setList] = useState([...departamentos]);

  useEffect(() => {
    if (open) setList([...departamentos]);
  }, [open, departamentos]);

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...list];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setList(next);
  };

  const moveDown = (i: number) => {
    if (i === list.length - 1) return;
    const next = [...list];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setList(next);
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { maxWidth: '600px', width: '100%', p: '24px' } }}>
      <SectionHeader
        icon={IconReorder}
        title="Reordenar Departamentos"
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          my: '24px',
          maxHeight: '50vh',
          overflowY: 'auto',
          pr: '8px',
        }}
      >
        {list.map((dep, i) => (
          <Box
            key={dep.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: 'var(--accent-100)',
              border: '1px solid var(--accent-200)',
              borderRadius: 'var(--r-md)',
              transition: 'background-color 0.2s',
              '&:hover': {
                backgroundColor: 'var(--accent-150)',
              },
            }}
          >
            <Typography className="body-regular-semibold" sx={{ flex: 1 }} color="var(--black)">
              {dep.name || '(Sin nombre)'}
            </Typography>
            <Stack direction="row" spacing="4px">
              <IconButton
                size="small"
                onClick={() => moveUp(i)}
                disabled={i === 0}
                sx={{ border: '1px solid var(--line)', backgroundColor: 'var(--white)' }}
              >
                <IconUp />
              </IconButton>
              <IconButton
               size="small"
                onClick={() => moveDown(i)}
                disabled={i === list.length - 1}
                sx={{ border: '1px solid var(--line)', backgroundColor: 'var(--white)' }}
              >
                <IconDown />
              </IconButton>
            </Stack>
          </Box>
        ))}
      </Box>

      <Stack direction="row" spacing="12px" width="100%" justifyContent="flex-end">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button
          variant="main"
          onClick={() => {
            onSave(list);
            onClose();
          }}
        >
          Guardar nuevo orden
        </Button>
      </Stack>
    </Dialog>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

const ResponsabilidadesFeature = ({
  isEditing,
  draft,
  setDraft,
}: {
  isEditing: boolean;
  draft: ResponsabilidadesType | null;
  setDraft: (v: ResponsabilidadesType) => void;
}) => {
  const data = useAtomValue(responsabilidadesState);
  const { resolveName, ancianos, varones } = usePersonOptions();
  const { tablet600Down: mobile } = useBreakpoints();

  const [reorderOpen, setReorderOpen] = useState(false);
  
  // Drawer States
  const [editCargoIndex, setEditCargoIndex] = useState<number | null>(null);
  const [editDepIndex, setEditDepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isEditing && draft) {
      const currentUids = ancianos.map((a) => a.uid);
      const draftUids = draft.cuerpoAncianos || [];

      if (JSON.stringify(currentUids) !== JSON.stringify(draftUids)) {
        setDraft({ ...draft, cuerpoAncianos: currentUids });
      }
    }
  }, [ancianos, isEditing, draft, setDraft]);

  if (!data) {
    return (
      <Box
        sx={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        Cargando configuración de la congregación…
      </Box>
    );
  }

  const updateDraft = (patch: Partial<ResponsabilidadesType>) => {
    if (draft) setDraft({ ...draft, ...patch });
  };

  // ─── Render functions ───

  const renderReadMode = () => {
    const secCuerpo = (
      <ReadCuerpoAncianos
        uids={ancianos.map((a) => a.uid)}
        resolveName={resolveName}
      />
    );

    const secCargos = (
      <ReadCargos cargos={data.cargosAncianos} resolveName={resolveName} />
    );

    const secDepartamentos = (
      <ReadDepartamentos
        departamentos={data.departamentos}
        resolveName={resolveName}
      />
    );

    if (mobile) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', pb: '40px' }}>
          {[
            { label: 'Cuerpo de Ancianos', content: secCuerpo, icon: IconGroups },
            { label: 'Responsabilidades de Ancianos', content: secCargos, icon: IconAssignment },
            { label: 'Departamentos', content: secDepartamentos, icon: IconCongregation },
          ].map(({ label, content, icon: Icon }) => (
            <Accordion
              key={label}
              defaultExpanded
              sx={{
                borderRadius: 'var(--r-lg) !important',
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { mb: '16px' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'var(--accent-main)' }} />}
                sx={{ backgroundColor: 'var(--accent-100)', py: '4px' }}
              >
                <Stack direction="row" spacing="12px" alignItems="center">
                  <Icon color="var(--accent-main)" width={22} height={22} />
                  <Typography className="h3" color="var(--black)">
                    {label}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: '20px', pb: '20px', px: '12px', backgroundColor: 'var(--white)' }}>
                {content}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '32px', pb: '40px' }}>
        <Box>{secCuerpo}</Box>
        <Box>{secCargos}</Box>
        <Box>{secDepartamentos}</Box>
      </Box>
    );
  };

  const renderEditMode = () => {
    if (!draft) return null;

    const addCargo = () => {
      const newIndex = draft.cargosAncianos.length;
      updateDraft({
        cargosAncianos: [...draft.cargosAncianos, { cargo: '', responsable: '' }]
      });
      setEditCargoIndex(newIndex);
    };

    const addDepartamento = () => {
      const newIndex = draft.departamentos.length;
      updateDraft({
        departamentos: [
          ...draft.departamentos,
          {
            id: crypto.randomUUID(),
            name: '',
            type: 'simple',
            responsable: '',
            updatedAt: new Date().toISOString(),
          } as DepartamentoSimple,
        ],
      });
      setEditDepIndex(newIndex);
    };

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Cuerpo de Ancianos (Read Only View) */}
        <ReadCuerpoAncianos uids={draft.cuerpoAncianos || []} resolveName={resolveName} />

        {/* Cargos */}
        <Box>
          <SectionHeader icon={IconAssignment} title="Responsabilidades de Ancianos" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr' }, gap: '12px' }}>
            {draft.cargosAncianos.map((cargo, i) => (
              <EditSummaryCard
                key={i}
                title={cargo.cargo}
                subtitle={resolveName(cargo.responsable)}
                onClick={() => setEditCargoIndex(i)}
              />
            ))}
          </Box>
          <Button
            variant="secondary"
            onClick={addCargo}
            startIcon={<IconAdd />}
            sx={{ mt: '16px' }}
          >
            Añadir nuevo cargo
          </Button>
        </Box>

        <Divider color="var(--line)" />

        {/* Departamentos */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '16px' }}>
             <SectionHeader icon={IconCongregation} title="Departamentos" />
             {draft.departamentos.length > 1 && (
               <Button
                 variant="tertiary"
                 onClick={() => setReorderOpen(true)}
                 startIcon={<IconReorder color="var(--accent-main)" />}
               >
                 Reordenar
               </Button>
             )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr' }, gap: '12px' }}>
            {draft.departamentos.map((dep, i) => (
              <EditSummaryCard
                key={dep.id}
                title={dep.name}
                subtitle={resolveName(dep.responsable)}
                onClick={() => setEditDepIndex(i)}
              />
            ))}
          </Box>
          <Button
            variant="secondary"
            onClick={addDepartamento}
            startIcon={<IconAdd />}
            sx={{ mt: '16px' }}
          >
            Añadir nuevo departamento
          </Button>
        </Box>

        {/* Drawers */}
        {editCargoIndex !== null && draft.cargosAncianos[editCargoIndex] && (
          <DrawerEditCargo
            open={editCargoIndex !== null}
            cargo={draft.cargosAncianos[editCargoIndex]}
            ancianos={ancianos}
            onClose={() => setEditCargoIndex(null)}
            onSave={(val) => {
              updateDraft({
                cargosAncianos: draft.cargosAncianos.map((c, i) => i === editCargoIndex ? val : c)
              });
            }}
            onDelete={() => {
              updateDraft({
                cargosAncianos: draft.cargosAncianos.filter((_, i) => i !== editCargoIndex)
              });
            }}
          />
        )}

        {editDepIndex !== null && draft.departamentos[editDepIndex] && (
          <DrawerEditDepartamento
            open={editDepIndex !== null}
            departamento={draft.departamentos[editDepIndex]}
            varones={varones}
            onClose={() => setEditDepIndex(null)}
            onSave={(val) => {
              updateDraft({
                departamentos: draft.departamentos.map((d, i) => i === editDepIndex ? val : d)
              });
            }}
            onDelete={() => {
              updateDraft({
                departamentos: draft.departamentos.filter((_, i) => i !== editDepIndex)
              });
            }}
          />
        )}

        {reorderOpen && (
          <ReorderDialog
            open={reorderOpen}
            departamentos={draft.departamentos}
            onClose={() => setReorderOpen(false)}
            onSave={(v) => updateDraft({ departamentos: v })}
          />
        )}
      </Box>
    );
  };

  return isEditing ? renderEditMode() : renderReadMode();
};

export default ResponsabilidadesFeature;
