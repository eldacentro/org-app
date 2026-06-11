import { useState, useMemo, useEffect, ElementType } from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAtomValue } from 'jotai';
import {
  IconAdd,
  IconDelete,
  IconSave,
  IconClose,
  IconReorder,
  IconUp,
  IconDown,
  IconGroups,
  IconAssignment,
  IconCongregation,
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

// ─── Person option type ──────────────────────────────────────────────────────

type PersonOption = { uid: string; label: string };

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

// ─── PersonSelect ────────────────────────────────────────────────────────────

const PersonSelect = ({
  value,
  options,
  label,
  onChange,
}: {
  value: string;
  options: PersonOption[];
  label: string;
  onChange: (uid: string) => void;
}) => {
  // If the value is a legacy name (not a UID found in options),
  // we create a virtual option so the Autocomplete shows the text.
  const allOptions = useMemo(() => {
    if (value && value !== '' && !options.find((o) => o.uid === value)) {
      return [{ uid: value, label: value }, ...options];
    }
    return options;
  }, [value, options]);

  const selected = allOptions.find((o) => o.uid === value) ?? null;

  return (
    <Autocomplete
      value={selected}
      options={allOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.uid === b.uid}
      onChange={(_, v) => onChange(v?.uid ?? '')}
      size="small"
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={{ flex: 1, fontFamily: 'Figtree, sans-serif' }}
      noOptionsText="Sin resultados"
    />
  );
};

const PersonMultiSelect = ({
  value,
  options,
  label,
  onChange,
}: {
  value: string[];
  options: PersonOption[];
  label: string;
  onChange: (uids: string[]) => void;
}) => {
  // Handle legacy names in multi-select as well
  const allOptions = useMemo(() => {
    const legacy = value.filter((uid) => !options.find((o) => o.uid === uid));
    if (legacy.length > 0) {
      return [...legacy.map((l) => ({ uid: l, label: l })), ...options];
    }
    return options;
  }, [value, options]);

  const selected = value
    .map((uid) => allOptions.find((o) => o.uid === uid))
    .filter(Boolean) as PersonOption[];

  return (
    <Autocomplete
      multiple
      value={selected}
      options={allOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.uid === b.uid}
      onChange={(_, v) => onChange(v.map((o) => o.uid))}
      size="small"
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={{ width: '100%', fontFamily: 'Figtree, sans-serif' }}
      noOptionsText="Sin resultados"
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              label={option.label}
              size="small"
              {...tagProps}
              sx={{ fontFamily: 'Figtree, sans-serif', fontSize: '12px' }}
            />
          );
        })
      }
    />
  );
};

// ─── Section wrapper ─────────────────────────────────────────────────────────

const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: ElementType;
  title: string;
  description?: string;
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
    <SectionHeader
      icon={IconAssignment}
      title="Responsabilidades de Ancianos"
    />
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

// ─── Edit views ──────────────────────────────────────────────────────────────

const EditCargos = ({
  cargos,
  ancianos,
  onChange,
}: {
  cargos: AncianoCargo[];
  ancianos: PersonOption[];
  onChange: (v: AncianoCargo[]) => void;
}) => {
  const updateCargo = (i: number, val: string) =>
    onChange(cargos.map((c, idx) => (idx === i ? { ...c, cargo: val } : c)));
  const updateResponsable = (i: number, uid: string) =>
    onChange(
      cargos.map((c, idx) => (idx === i ? { ...c, responsable: uid } : c))
    );
  const remove = (i: number) => onChange(cargos.filter((_, idx) => idx !== i));
  const add = () => onChange([...cargos, { cargo: '', responsable: '' }]);

  return (
    <CardContainer>
      <SectionHeader
        icon={IconAssignment}
        title="Responsabilidades de Ancianos"
      />
      <Stack spacing="16px">
        {cargos.map((item, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              backgroundColor: 'var(--accent-100)',
              padding: '12px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--accent-200)',
            }}
          >
            <TextField
              value={item.cargo}
              onChange={(e) => updateCargo(i, e.target.value)}
              size="small"
              label="Nombre del cargo"
              sx={{ flex: 1, backgroundColor: 'var(--white)', borderRadius: 'var(--r-sm)' }}
            />
            <PersonSelect
              value={item.responsable}
              options={ancianos}
              label="Hno. Responsable"
              onChange={(uid) => updateResponsable(i, uid)}
            />
            <IconButton
              size="medium"
              onClick={() => remove(i)}
              sx={{
                color: 'var(--red-main)',
                backgroundColor: 'var(--white)',
                border: '1px solid var(--red-200)',
                '&:hover': { backgroundColor: 'var(--red-100)' },
              }}
            >
              <IconDelete />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="secondary"
          onClick={add}
          startIcon={<IconAdd />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Añadir nuevo cargo
        </Button>
      </Stack>
    </CardContainer>
  );
};

const EditDepartamento = ({
  dep,
  varones,
  onChange,
  onRemove,
}: {
  dep: Departamento;
  varones: PersonOption[];
  onChange: (v: Departamento) => void;
  onRemove: () => void;
}) => {
  const isExtended = dep.type === 'extended';

  const updateField = (field: string, val: string) =>
    onChange({ ...dep, [field]: val } as Departamento);

  const updateMembers = (members: string[]) =>
    onChange({ ...dep, members } as DepartamentoExtended);

  const toggleType = () => {
    if (isExtended) {
      const { members: _, ...rest } = dep as DepartamentoExtended;
      void _;
      onChange({ ...rest, type: 'simple' } as DepartamentoSimple);
    } else {
      onChange({
        ...dep,
        type: 'extended',
        members: [],
      } as DepartamentoExtended);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        '&:hover': {
          borderColor: 'var(--accent-300)',
          boxShadow: 'var(--shadow-sm)',
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <TextField
          value={dep.name}
          onChange={(e) => updateField('name', e.target.value)}
          size="small"
          label="Nombre del departamento"
          sx={{ flex: 1 }}
        />
        <Chip
          label={isExtended ? 'Estructura Compleja' : 'Estructura Simple'}
          size="small"
          clickable
          onClick={toggleType}
          sx={{
            background: isExtended ? 'var(--accent-main)' : 'var(--line)',
            color: isExtended ? 'var(--always-white)' : 'var(--text-secondary)',
            fontWeight: 600,
            px: '8px',
          }}
        />
        <IconButton
          size="medium"
          onClick={onRemove}
          sx={{
            color: 'var(--red-main)',
            border: '1px solid var(--red-200)',
            '&:hover': { backgroundColor: 'var(--red-100)' },
          }}
        >
          <IconDelete />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <PersonSelect
          value={dep.responsable}
          options={varones}
          label="Responsable"
          onChange={(uid) => updateField('responsable', uid)}
        />
        <PersonSelect
          value={dep.auxiliar ?? ''}
          options={varones}
          label="Auxiliar (opcional)"
          onChange={(uid) => updateField('auxiliar', uid)}
        />
      </Box>

      {isExtended && (
        <PersonMultiSelect
          value={(dep as DepartamentoExtended).members}
          options={varones}
          label="Hermanos que colaboran en este departamento"
          onChange={updateMembers}
        />
      )}
    </Box>
  );
};

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
  onSave,
  onCancelEdit,
  isEditing,
  draft,
  setDraft,
  saving,
}: {
  onSave: () => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  draft: ResponsabilidadesType | null;
  setDraft: (v: ResponsabilidadesType) => void;
  saving: boolean;
}) => {
  const data = useAtomValue(responsabilidadesState);
  const { resolveName, ancianos, varones } = usePersonOptions();
  const { tablet600Down: mobile } = useBreakpoints();

  const [reorderOpen, setReorderOpen] = useState(false);

  // Auto-sync cuerpoAncianos in draft when active elders list changes
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

  const d = isEditing && draft ? draft : data;

  const updateDraft = (patch: Partial<ResponsabilidadesType>) => {
    if (draft) setDraft({ ...draft, ...patch });
  };

  const addDepartamento = () => {
    if (!draft) return;
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
  };

  const updateDepartamento = (i: number, dep: Departamento) => {
    if (!draft) return;
    updateDraft({
      departamentos: draft.departamentos.map((d, idx) => (idx === i ? dep : d)),
    });
  };

  const removeDepartamento = (i: number) => {
    if (!draft) return;
    updateDraft({
      departamentos: draft.departamentos.filter((_, idx) => idx !== i),
    });
  };

  // ── Section content ──
  const secCuerpo = (
    <ReadCuerpoAncianos
      uids={ancianos.map((a) => a.uid)}
      resolveName={resolveName}
    />
  );

  const secCargos =
    isEditing && draft ? (
      <EditCargos
        cargos={draft.cargosAncianos}
        ancianos={ancianos}
        onChange={(v) => updateDraft({ cargosAncianos: v })}
      />
    ) : (
      <ReadCargos cargos={d.cargosAncianos} resolveName={resolveName} />
    );

  const secDepartamentos =
    isEditing && draft ? (
      <CardContainer>
        <SectionHeader icon={IconCongregation} title="Departamentos" />
        <Stack spacing="16px">
          {draft.departamentos.map((dep, i) => (
            <EditDepartamento
              key={dep.id}
              dep={dep}
              varones={varones}
              onChange={(v) => updateDepartamento(i, v)}
              onRemove={() => removeDepartamento(i)}
            />
          ))}
          <Stack direction="row" spacing="12px" sx={{ mt: '8px' }}>
            <Button
              variant="main"
              onClick={addDepartamento}
              startIcon={<IconAdd />}
            >
              Crear nuevo departamento
            </Button>
            {draft.departamentos.length > 1 && (
              <Button
                variant="secondary"
                onClick={() => setReorderOpen(true)}
                startIcon={<IconReorder color="var(--accent-main)" />}
              >
                Reordenar lista
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContainer>
    ) : (
      <ReadDepartamentos
        departamentos={d.departamentos}
        resolveName={resolveName}
      />
    );

  // ── Render ──
  if (mobile) {
    return (
      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: '16px', pb: '40px' }}
      >
        {isEditing && (
          <Box sx={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', px: '8px' }}>
            <Button
              variant="secondary"
              onClick={onCancelEdit}
              disabled={saving}
              startIcon={<IconClose />}
            >
              Cancelar
            </Button>
            <Button
              variant="main"
              onClick={onSave}
              disabled={saving}
              startIcon={<IconSave />}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </Box>
        )}

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

        {isEditing && draft && reorderOpen && (
          <ReorderDialog
            open={reorderOpen}
            departamentos={draft.departamentos}
            onClose={() => setReorderOpen(false)}
            onSave={(v) => updateDraft({ departamentos: v })}
          />
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: '32px', pb: '40px' }}
    >
      <Box>{secCuerpo}</Box>
      <Box>{secCargos}</Box>
      <Box>{secDepartamentos}</Box>

      {isEditing && draft && reorderOpen && (
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

export default ResponsabilidadesFeature;
