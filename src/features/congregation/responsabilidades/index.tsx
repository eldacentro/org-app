import { useState } from 'react';
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
} from '@components/icons';
import { responsabilidadesState } from '@states/responsabilidades';
import { personsActiveState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import {
  ResponsabilidadesType,
  AncianoCargo,
  Departamento,
  DepartamentoSimple,
  DepartamentoExtended,
} from '@definition/responsabilidades';
import useBreakpoints from '@hooks/useBreakpoints';
import Typography from '@components/typography';
import Button from '@components/button';
import Dialog from '@components/dialog';

// ─── Person option type ──────────────────────────────────────────────────────

type PersonOption = { uid: string; label: string };

// ─── Hooks for person lists ──────────────────────────────────────────────────

const usePersonOptions = () => {
  const persons = useAtomValue(personsActiveState);
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
      persons
        .filter((p) => {
          const privs = p.person_data.privileges ?? [];
          return privs.some(
            (priv) => !priv._deleted && priv.privilege.value === 'elder'
          );
        })
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
  const selected = options.find((o) => o.uid === value) ?? null;

  return (
    <Autocomplete
      value={selected}
      options={options}
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
  const selected = value
    .map((uid) => options.find((o) => o.uid === uid))
    .filter(Boolean) as PersonOption[];

  return (
    <Autocomplete
      multiple
      value={selected}
      options={options}
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

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      borderBottom: '2px solid var(--accent-200)',
      paddingBottom: '6px',
      marginBottom: '12px',
    }}
  >
    <Typography className="h2" color="var(--accent-dark)">
      {children}
    </Typography>
  </Box>
);

const CardBox = ({ children }: { children: React.ReactNode }) => (
  <Box
    className="big-card-shadow"
    sx={{
      backgroundColor: 'var(--white)',
      border: '1px solid var(--accent-200)',
      borderRadius: 'var(--radius-xl)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    {children}
  </Box>
);

const FieldRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <Box sx={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
    <Typography
      className="label"
      color="var(--accent-dark)"
      sx={{ minWidth: 130 }}
    >
      {label}
    </Typography>
    <Typography className="body-regular">{value}</Typography>
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
  <CardBox>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {uids.map((uid) => (
        <Chip
          key={uid}
          label={resolveName(uid)}
          size="small"
          sx={{
            background: 'var(--accent-150)',
            color: 'var(--accent-dark)',
            fontFamily: 'Figtree, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
          }}
        />
      ))}
    </Box>
  </CardBox>
);

const ReadCargos = ({
  cargos,
  resolveName,
}: {
  cargos: AncianoCargo[];
  resolveName: (u: string) => string;
}) => (
  <CardBox>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {cargos.map((item, i) => (
        <FieldRow key={i} label={item.cargo} value={resolveName(item.responsable)} />
      ))}
    </Box>
  </CardBox>
);

const ReadDepartamentos = ({
  departamentos,
  resolveName,
}: {
  departamentos: Departamento[];
  resolveName: (u: string) => string;
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr' },
      gap: '8px',
    }}
  >
    {departamentos.map((dep) => (
      <CardBox key={dep.id}>
        <Typography className="h3" color="var(--accent-main)">
          {dep.name}
        </Typography>
        <FieldRow label="Responsable:" value={resolveName(dep.responsable)} />
        {dep.auxiliar && (
          <FieldRow label="Auxiliar:" value={resolveName(dep.auxiliar)} />
        )}
        {dep.type === 'extended' &&
          (dep as DepartamentoExtended).members.length > 0 && (
            <>
              <Typography className="label" color="var(--accent-dark)" sx={{ mt: '4px' }}>
                Miembros
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(dep as DepartamentoExtended).members.map((uid) => (
                  <Chip
                    key={uid}
                    label={resolveName(uid)}
                    size="small"
                    sx={{ fontFamily: 'Figtree, sans-serif', fontSize: '12px' }}
                  />
                ))}
              </Box>
            </>
          )}
      </CardBox>
    ))}
  </Box>
);

// ─── Edit views ──────────────────────────────────────────────────────────────

const EditCuerpoAncianos = ({
  uids,
  ancianos,
  onChange,
}: {
  uids: string[];
  ancianos: PersonOption[];
  onChange: (v: string[]) => void;
}) => (
  <CardBox>
    <PersonMultiSelect
      value={uids}
      options={ancianos}
      label="Cuerpo de Ancianos"
      onChange={onChange}
    />
  </CardBox>
);

const EditCargos = ({
  cargos,
  varones,
  onChange,
}: {
  cargos: AncianoCargo[];
  varones: PersonOption[];
  onChange: (v: AncianoCargo[]) => void;
}) => {
  const updateCargo = (i: number, val: string) =>
    onChange(cargos.map((c, idx) => (idx === i ? { ...c, cargo: val } : c)));
  const updateResponsable = (i: number, uid: string) =>
    onChange(cargos.map((c, idx) => (idx === i ? { ...c, responsable: uid } : c)));
  const remove = (i: number) => onChange(cargos.filter((_, idx) => idx !== i));
  const add = () => onChange([...cargos, { cargo: '', responsable: '' }]);

  return (
    <CardBox>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cargos.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <TextField
              value={item.cargo}
              onChange={(e) => updateCargo(i, e.target.value)}
              size="small"
              label="Cargo"
              sx={{ flex: 1 }}
            />
            <PersonSelect
              value={item.responsable}
              options={varones}
              label="Responsable"
              onChange={(uid) => updateResponsable(i, uid)}
            />
            <IconButton size="small" onClick={() => remove(i)} color="error">
              <IconDelete />
            </IconButton>
          </Box>
        ))}
        <Box>
          <Button variant="secondary" onClick={add} startIcon={<IconAdd />}>
            Añadir cargo
          </Button>
        </Box>
      </Box>
    </CardBox>
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
      onChange({ ...dep, type: 'extended', members: [] } as DepartamentoExtended);
    }
  };

  return (
    <CardBox>
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <TextField
          value={dep.name}
          onChange={(e) => updateField('name', e.target.value)}
          size="small"
          label="Nombre del departamento"
          sx={{ flex: 1 }}
        />
        <Chip
          label={isExtended ? 'Extendido' : 'Simple'}
          size="small"
          clickable
          onClick={toggleType}
          sx={{
            background: isExtended ? 'var(--accent-150)' : 'var(--line)',
            color: isExtended ? 'var(--accent-dark)' : 'var(--text-secondary)',
            fontFamily: 'Figtree, sans-serif',
          }}
        />
        <IconButton size="small" onClick={onRemove} color="error">
          <IconDelete />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
          label="Miembros"
          onChange={updateMembers}
        />
      )}
    </CardBox>
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
    <Dialog open={open} onClose={onClose} sx={{ padding: '24px' }}>
      <Typography className="h2">Reordenar departamentos</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', my: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
        {list.map((dep, i) => (
          <Box
            key={dep.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--white)',
              border: '1px solid var(--accent-200)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <Typography className="body-regular" sx={{ flex: 1 }}>
              {dep.name || '(sin nombre)'}
            </Typography>
            <IconButton size="small" onClick={() => moveUp(i)} disabled={i === 0}>
              <IconUp />
            </IconButton>
            <IconButton size="small" onClick={() => moveDown(i)} disabled={i === list.length - 1}>
              <IconDown />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Stack spacing="8px" width="100%">
        <Button variant="main" onClick={() => { onSave(list); onClose(); }}>
          Guardar orden
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
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
  const { mobile } = useBreakpoints();

  const [reorderOpen, setReorderOpen] = useState(false);

  if (!data) {
    return (
      <Box sx={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '16px' }}>
        Cargando…
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
  const secCuerpo = isEditing && draft ? (
    <EditCuerpoAncianos
      uids={draft.cuerpoAncianos}
      ancianos={ancianos}
      onChange={(v) => updateDraft({ cuerpoAncianos: v })}
    />
  ) : (
    <ReadCuerpoAncianos uids={d.cuerpoAncianos} resolveName={resolveName} />
  );

  const secCargos = isEditing && draft ? (
    <EditCargos
      cargos={draft.cargosAncianos}
      varones={varones}
      onChange={(v) => updateDraft({ cargosAncianos: v })}
    />
  ) : (
    <ReadCargos cargos={d.cargosAncianos} resolveName={resolveName} />
  );

  const secDepartamentos = isEditing && draft ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {draft.departamentos.map((dep, i) => (
        <EditDepartamento
          key={dep.id}
          dep={dep}
          varones={varones}
          onChange={(v) => updateDepartamento(i, v)}
          onRemove={() => removeDepartamento(i)}
        />
      ))}
      <Box sx={{ display: 'flex', gap: '8px', mt: '4px' }}>
        <Button variant="secondary" onClick={addDepartamento} startIcon={<IconAdd />}>
          Añadir departamento
        </Button>
        {draft.departamentos.length > 1 && (
          <Button variant="secondary" onClick={() => setReorderOpen(true)} startIcon={<IconReorder color="var(--accent-main)" />}>
            Reordenar
          </Button>
        )}
      </Box>
    </Box>
  ) : (
    <ReadDepartamentos departamentos={d.departamentos} resolveName={resolveName} />
  );

  // ── Render ──
  if (mobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', pb: '32px' }}>
        {isEditing && (
          <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onCancelEdit} disabled={saving} startIcon={<IconClose />}>
              Cancelar
            </Button>
            <Button variant="main" onClick={onSave} disabled={saving} startIcon={<IconSave />}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </Box>
        )}

        {[
          { label: 'Cuerpo de Ancianos', content: secCuerpo },
          { label: 'Responsabilidades de Ancianos', content: secCargos },
          { label: 'Departamentos', content: secDepartamentos },
        ].map(({ label, content }) => (
          <Accordion
            key={label}
            defaultExpanded
            sx={{
              borderRadius: 'var(--radius-xl) !important',
              border: '1px solid var(--accent-200)',
              boxShadow: 'none',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography className="h3" color="var(--accent-dark)">{label}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>{content}</AccordionDetails>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', pb: '32px' }}>
      {/* Cuerpo de Ancianos */}
      <Box>
        <SectionHeader>Cuerpo de Ancianos</SectionHeader>
        {secCuerpo}
      </Box>

      {/* Responsabilidades de Ancianos */}
      <Box>
        <SectionHeader>Responsabilidades de Ancianos</SectionHeader>
        {secCargos}
      </Box>

      {/* Departamentos */}
      <Box>
        <SectionHeader>Departamentos</SectionHeader>
        {secDepartamentos}
      </Box>

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
