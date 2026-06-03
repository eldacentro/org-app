import React, { useState } from 'react';
import { Box, TextField, IconButton, Divider, Chip } from '@mui/material';
import { useAtomValue } from 'jotai';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { responsabilidadesState } from '@states/responsabilidades';
import { dbResponsabilidadesSave } from '@services/dexie/responsabilidades';
import {
  ResponsabilidadesType,
  AncianoCargo,
  Departamento,
  DepartamentoSimple,
  DepartamentoExtended,
} from '@definition/responsabilidades';
import useCurrentUser from '@hooks/useCurrentUser';

// ─── helpers ────────────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode; }) => (
  <Box
    sx={{
      fontSize: '13px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--accent-main)',
      marginBottom: '8px',
      marginTop: '4px',
    }}
  >
    {children}
  </Box>
);

const Card = ({ children }: { children: React.ReactNode; }) => (
  <Box
    sx={{
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    {children}
  </Box>
);

const Row = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <Box sx={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
    <Box sx={{ minWidth: 160, fontSize: '13px', color: 'var(--accent-dark)', fontWeight: 600 }}>
      {label}
    </Box>
    <Box sx={{ fontSize: '14px', flex: 1 }}>{value}</Box>
  </Box>
);

// ─── read-only views ─────────────────────────────────────────────────────────

const ReadCuerpoAncianos = ({ names }: { names: string[] }) => (
  <Card>
    <SectionTitle>Cuerpo de Ancianos</SectionTitle>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {names.map((name) => (
        <Chip
          key={name}
          label={name}
          size="small"
          sx={{
            background: 'var(--accent-150)',
            color: 'var(--accent-dark)',
            fontFamily: 'Figtree, sans-serif',
            fontSize: '13px',
          }}
        />
      ))}
    </Box>
  </Card>
);

const ReadCargos = ({ cargos }: { cargos: AncianoCargo[] }) => (
  <Card>
    <SectionTitle>Responsabilidades de Ancianos</SectionTitle>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {cargos.map((item, i) => (
        <Row key={i} label={item.cargo} value={item.responsable} />
      ))}
    </Box>
  </Card>
);

const ReadDepartamentos = ({ departamentos }: { departamentos: Departamento[] }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <SectionTitle>Departamentos</SectionTitle>
    {departamentos.map((dep) => (
      <Card key={dep.id}>
        <Box sx={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          {dep.name}
        </Box>
        <Row label="Responsable" value={dep.responsable} />
        {dep.auxiliar && <Row label="Auxiliar" value={dep.auxiliar} />}
        {dep.type === 'extended' && dep.members.length > 0 && (
          <>
            <Box sx={{ fontSize: '12px', color: 'var(--accent-dark)', fontWeight: 600, marginTop: '4px' }}>
              Miembros
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(dep as DepartamentoExtended).members.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  size="small"
                  sx={{ fontFamily: 'Figtree, sans-serif', fontSize: '12px' }}
                />
              ))}
            </Box>
          </>
        )}
      </Card>
    ))}
  </Box>
);

// ─── edit views ──────────────────────────────────────────────────────────────

const EditCuerpoAncianos = ({
  names,
  onChange,
}: {
  names: string[];
  onChange: (v: string[]) => void;
}) => {
  const update = (i: number, val: string) => {
    const next = [...names];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => onChange(names.filter((_, idx) => idx !== i));
  const add = () => onChange([...names, '']);

  return (
    <Card>
      <SectionTitle>Cuerpo de Ancianos</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {names.map((name, i) => (
          <Box key={i} sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <TextField
              value={name}
              onChange={(e) => update(i, e.target.value)}
              size="small"
              fullWidth
              placeholder="Nombre del anciano"
              sx={{ fontFamily: 'Figtree, sans-serif' }}
            />
            <IconButton size="small" onClick={() => remove(i)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Box>
          <IconButton size="small" onClick={add} sx={{ color: 'var(--accent-main)' }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
};

const EditCargos = ({
  cargos,
  onChange,
}: {
  cargos: AncianoCargo[];
  onChange: (v: AncianoCargo[]) => void;
}) => {
  const update = (i: number, field: keyof AncianoCargo, val: string) => {
    const next = cargos.map((c, idx) => (idx === i ? { ...c, [field]: val } : c));
    onChange(next);
  };
  const remove = (i: number) => onChange(cargos.filter((_, idx) => idx !== i));
  const add = () => onChange([...cargos, { cargo: '', responsable: '' }]);

  return (
    <Card>
      <SectionTitle>Responsabilidades de Ancianos</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cargos.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <TextField
              value={item.cargo}
              onChange={(e) => update(i, 'cargo', e.target.value)}
              size="small"
              placeholder="Cargo"
              sx={{ flex: 1 }}
            />
            <TextField
              value={item.responsable}
              onChange={(e) => update(i, 'responsable', e.target.value)}
              size="small"
              placeholder="Responsable"
              sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={() => remove(i)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Box>
          <IconButton size="small" onClick={add} sx={{ color: 'var(--accent-main)' }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
};

const EditDepartamento = ({
  dep,
  onChange,
  onRemove,
}: {
  dep: Departamento;
  onChange: (v: Departamento) => void;
  onRemove: () => void;
}) => {
  const isExtended = dep.type === 'extended';

  const updateField = (field: string, val: string) =>
    onChange({ ...dep, [field]: val } as Departamento);

  const updateMembers = (members: string[]) =>
    onChange({ ...dep, members } as DepartamentoExtended);

  const addMember = () =>
    updateMembers([...((dep as DepartamentoExtended).members ?? []), '']);

  const updateMember = (i: number, val: string) => {
    const members = [...(dep as DepartamentoExtended).members];
    members[i] = val;
    updateMembers(members);
  };

  const removeMember = (i: number) =>
    updateMembers((dep as DepartamentoExtended).members.filter((_, idx) => idx !== i));

  const toggleType = () => {
    if (isExtended) {
      const { members: _members, ...rest } = dep as DepartamentoExtended;
      void _members;
      onChange({ ...rest, type: 'simple' } as DepartamentoSimple);
    } else {
      onChange({ ...dep, type: 'extended', members: [] } as DepartamentoExtended);
    }
  };

  return (
    <Card>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          value={dep.name}
          onChange={(e) => updateField('name', e.target.value)}
          size="small"
          placeholder="Nombre del departamento"
          sx={{ flex: 1, mr: 1 }}
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
            mr: 1,
          }}
        />
        <IconButton size="small" onClick={onRemove} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: '8px' }}>
        <TextField
          value={dep.responsable}
          onChange={(e) => updateField('responsable', e.target.value)}
          size="small"
          label="Responsable"
          fullWidth
        />
        <TextField
          value={dep.auxiliar ?? ''}
          onChange={(e) => updateField('auxiliar', e.target.value)}
          size="small"
          label="Auxiliar (opcional)"
          fullWidth
        />
      </Box>
      {isExtended && (
        <Box>
          <Box sx={{ fontSize: '12px', color: 'var(--accent-dark)', fontWeight: 600, mb: '6px' }}>
            Miembros
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(dep as DepartamentoExtended).members.map((m, i) => (
              <Box key={i} sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <TextField
                  value={m}
                  onChange={(e) => updateMember(i, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Nombre del miembro"
                />
                <IconButton size="small" onClick={() => removeMember(i)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box>
              <IconButton size="small" onClick={addMember} sx={{ color: 'var(--accent-main)' }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}
    </Card>
  );
};

const EditDepartamentos = ({
  departamentos,
  onChange,
}: {
  departamentos: Departamento[];
  onChange: (v: Departamento[]) => void;
}) => {
  const update = (i: number, dep: Departamento) =>
    onChange(departamentos.map((d, idx) => (idx === i ? dep : d)));
  const remove = (i: number) => onChange(departamentos.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...departamentos,
      {
        id: crypto.randomUUID(),
        name: '',
        type: 'simple',
        responsable: '',
        updatedAt: new Date().toISOString(),
      } as DepartamentoSimple,
    ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <SectionTitle>Departamentos</SectionTitle>
      {departamentos.map((dep, i) => (
        <EditDepartamento
          key={dep.id}
          dep={dep}
          onChange={(v) => update(i, v)}
          onRemove={() => remove(i)}
        />
      ))}
      <Box>
        <IconButton onClick={add} sx={{ color: 'var(--accent-main)' }}>
          <AddIcon />
        </IconButton>
        <Box component="span" sx={{ fontSize: '13px', color: 'var(--accent-main)', verticalAlign: 'middle' }}>
          Añadir departamento
        </Box>
      </Box>
    </Box>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

const ResponsabilidadesFeature = () => {
  const data = useAtomValue(responsabilidadesState);
  const { isElder, isAdmin } = useCurrentUser();
  const canEdit = isElder || isAdmin;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ResponsabilidadesType | null>(null);
  const [saving, setSaving] = useState(false);

  if (!data) {
    return (
      <Box sx={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '16px' }}>
        Cargando…
      </Box>
    );
  }

  const startEdit = () => {
    setDraft(structuredClone(data));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setIsEditing(false);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await dbResponsabilidadesSave(draft);
      setIsEditing(false);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const d = isEditing && draft ? draft : data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
      {/* Toolbar */}
      {canEdit && (
        <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {!isEditing ? (
            <IconButton
              onClick={startEdit}
              size="small"
              sx={{
                background: 'var(--accent-main)',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 12px',
                gap: '4px',
                '&:hover': { background: 'var(--accent-dark)' },
              }}
            >
              <EditIcon fontSize="small" />
              <Box component="span" sx={{ fontSize: '13px', ml: '4px' }}>
                Editar
              </Box>
            </IconButton>
          ) : (
            <>
              <IconButton
                onClick={cancelEdit}
                size="small"
                disabled={saving}
                sx={{
                  background: 'var(--line)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  gap: '4px',
                }}
              >
                <CancelIcon fontSize="small" />
                <Box component="span" sx={{ fontSize: '13px', ml: '4px' }}>
                  Cancelar
                </Box>
              </IconButton>
              <IconButton
                onClick={save}
                size="small"
                disabled={saving}
                sx={{
                  background: 'var(--accent-main)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  gap: '4px',
                  '&:hover': { background: 'var(--accent-dark)' },
                }}
              >
                <SaveIcon fontSize="small" />
                <Box component="span" sx={{ fontSize: '13px', ml: '4px' }}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Box>
              </IconButton>
            </>
          )}
        </Box>
      )}

      <Divider />

      {/* Sections */}
      {isEditing && draft ? (
        <>
          <EditCuerpoAncianos
            names={draft.cuerpoAncianos}
            onChange={(v) => setDraft({ ...draft, cuerpoAncianos: v })}
          />
          <EditCargos
            cargos={draft.cargosAncianos}
            onChange={(v) => setDraft({ ...draft, cargosAncianos: v })}
          />
          <EditDepartamentos
            departamentos={draft.departamentos}
            onChange={(v) => setDraft({ ...draft, departamentos: v })}
          />
        </>
      ) : (
        <>
          <ReadCuerpoAncianos names={d.cuerpoAncianos} />
          <ReadCargos cargos={d.cargosAncianos} />
          <ReadDepartamentos departamentos={d.departamentos} />
        </>
      )}
    </Box>
  );
};

export default ResponsabilidadesFeature;
