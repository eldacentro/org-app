import { useState, useMemo, useEffect, ElementType } from 'react';
import { Box, Stack, Chip } from '@mui/material';
import { useAtomValue } from 'jotai';
import { ReactSortable } from 'react-sortablejs';
import DragHandle from '@components/drag_handle';
import {
  IconAdd,
  IconGroups,
  IconAssignment,
  IconCongregation,
  IconReorder,
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
import Typography from '@components/typography';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Divider from '@components/divider';

import { PersonOption } from './components';
import DrawerEditCargo from './DrawerEditCargo';
import DrawerEditDepartamento from './DrawerEditDepartamento';
import MeetingSection from '@features/meetings/meeting_section';
import accentSurface from '@components/accent_surface';
import CountBadge from '@components/count_badge';

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
        borderRadius: 'var(--shape-lg)',
        // El relleno separa la caja; el canto sobraba (ver la nota en
        // `my_assignments/assignment_item`). Sube un escalón para que se lea
        // sola.
        backgroundColor: 'var(--accent-150)',
      }}
    >
      <Icon color="var(--accent-main)" width={24} height={24} />
    </Box>
    <Typography className="h2" color="var(--black)">
      {title}
    </Typography>
  </Box>
);

// El nombre del cargo arriba y quién lo lleva debajo, no en dos columnas: con
// `minWidth: 160` para la etiqueta, un cargo largo como "Superintendente de
// Vida y Ministerio Cristianos" dejaba al nombre sin sitio en un móvil.
//
// Y sin nadie asignado se decía en voz alta. Antes la fila salía con el cargo y
// un hueco en blanco detrás, que no distingue "no lo ha rellenado nadie" de
// "esto se ha roto".
const FieldRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', py: '6px' }}>
    <Typography className="label-small-semibold" color="var(--ink-3)">
      {label}
    </Typography>
    <Typography
      className="body-regular"
      color={value ? 'var(--ink)' : 'var(--ink-3)'}
    >
      {value || 'Sin asignar'}
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
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {uids.map((uid) => (
        <Chip
          key={uid}
          label={resolveName(uid)}
          // Un nombre es un RÓTULO, no un botón: no se puede pulsar, así que
          // no crece ni se ilumina al pasar por encima. Llevaba además un
          // degradado —el único de toda la app— y su tipografía escrita a mano.
          sx={{
            backgroundColor: 'var(--state-selected)',
            color: 'var(--state-selected-ink)',
            border: 'none',
            height: '32px',
            borderRadius: 'var(--shape-full)',
          }}
        />
      ))}
      {uids.length === 0 && (
        <Typography color="var(--grey-400)" sx={{ fontStyle: 'italic' }}>
          No se han encontrado ancianos registrados.
        </Typography>
      )}
    </Box>
  </Box>
);

const ReadCargos = ({
  cargos,
  resolveName,
}: {
  cargos: AncianoCargo[];
  resolveName: (u: string) => string;
}) => (
  <Box>
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
  </Box>
);

const ReadDepartamentos = ({
  departamentos,
  resolveName,
}: {
  departamentos: Departamento[];
  resolveName: (u: string) => string;
}) => (
  <Box>
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
            borderRadius: 'var(--shape-md)',
            display: 'flex',
            flexDirection: 'column',
            // La cápsula en vez de la uñita —6px pegados al canto y cortados
            // por la esquina— y sin levantarse al pasar el ratón: la tarjeta no
            // se pulsa, lo que se pulsa es el lápiz de dentro.
            ...accentSurface('var(--accent-main)', { tint: false }),
          }}
        >
          <Box
            sx={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Typography
                className="h3"
                color="var(--black)"
                sx={{ fontWeight: 700 }}
              >
                {dep.name}
              </Typography>
              <IconCongregation
                color="var(--accent-200)"
                width={24}
                height={24}
              />
            </Box>

            <Stack spacing="12px">
              <Box>
                <Typography
                  className="label-small-medium"
                  color="var(--grey-400)"
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: '4px',
                  }}
                >
                  Responsable
                </Typography>
                <Typography
                  className="body-regular-semibold"
                  color="var(--accent-dark)"
                >
                  {resolveName(dep.responsable)}
                </Typography>
              </Box>

              {dep.auxiliar && (
                <Box>
                  <Typography
                    className="label-small-medium"
                    color="var(--grey-400)"
                    sx={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mb: '4px',
                    }}
                  >
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
                    {/* El número, en su chapa. Estaba metido DENTRO del texto
                        —"Equipo (10)"—, que es justo lo que se cambió en los
                        otros cinco contadores de la app: dentro de la frase
                        deja de ser un dato y pasa a ser parte del rótulo. */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        mb: '8px',
                      }}
                    >
                      <Typography
                        className="label-small-medium"
                        color="var(--grey-400)"
                        sx={{
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Equipo
                      </Typography>
                      <CountBadge
                        value={(dep as DepartamentoExtended).members.length}
                        color="var(--grey-400)"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(dep as DepartamentoExtended).members.map((uid) => (
                        <Chip
                          key={uid}
                          label={resolveName(uid)}
                          size="small"
                          sx={{
                            fontSize: '12px',
                            backgroundColor: 'var(--accent-100)',
                            color: 'var(--accent-dark)',
                            borderRadius: 'var(--shape-md)',
                            fontWeight: 500,
                            '&:hover': { backgroundColor: 'var(--accent-200)' },
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
  // Era un `Box` con `onClick`: en modo edición, TODAS las fichas de cargo
  // —coordinador, secretario, los superintendentes— se abrían con el ratón y
  // con el teclado no se llegaba a ninguna. Es la pantalla entera.
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{
      appearance: 'none',
      font: 'inherit',
      color: 'inherit',
      textAlign: 'left',
      width: '100%',
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--shape-lg)',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      transition:
        'border-color var(--motion-fast) var(--ease-standard), background-color var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard)',
      '&:focus-visible': {
        outline: '2px solid var(--accent-main)',
        outlineOffset: '2px',
      },
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
      {/* 'body-small' (sin sufijo) no existe en el sistema tipográfico —
          huérfana, sin ningún estilo. La real más cercana es la regular. */}
      <Typography className="body-small-regular" color="var(--grey-400)">
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
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { maxWidth: '600px', width: '100%', p: '24px' } }}
    >
      <SectionHeader icon={IconReorder} title="Reordenar departamentos" />

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
        {/* Igual que en Documentos: se arrastra por el asa —así la lista
            sigue haciendo scroll con el dedo— y el asa entiende ↑ y ↓ para
            quien va con el teclado, que es lo que hacían las dos flechas que
            había aquí. */}
        <ReactSortable
          list={list}
          setList={setList}
          handle=".scrollable-icon"
          animation={150}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
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
                borderRadius: 'var(--shape-lg)',
                transition:
                  'background-color var(--motion-fast) var(--ease-standard)',
                '&:hover': {
                  backgroundColor: 'var(--accent-150)',
                },
              }}
            >
              <DragHandle
                etiqueta={dep.name || 'este departamento'}
                onSubir={() => moveUp(i)}
                onBajar={() => moveDown(i)}
              />
              <Typography
                className="body-regular-semibold"
                sx={{ flex: 1 }}
                color="var(--black)"
              >
                {dep.name || '(Sin nombre)'}
              </Typography>
            </Box>
          ))}
        </ReactSortable>
      </Box>

      <Stack
        direction="row"
        spacing="12px"
        width="100%"
        justifyContent="flex-end"
      >
        <Button variant="tertiary" onClick={onClose}>
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

  const [abiertas, setAbiertas] = useState<string[]>([
    'Cuerpo de ancianos',
    'Responsabilidades de ancianos',
    'Departamentos',
  ]);

  const alternarSeccion = (label: string) =>
    setAbiertas((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );

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
          color: 'var(--ink-2)',
          fontSize: '13px',
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

    // El MISMO componente de "sección con cabecera de color" que Programas
    // semanales, en móvil y en escritorio. Aquí había un Accordion de MUI
    // montado a mano —la décima forma distinta de hacer una sección plegable en
    // esta app— y, encima, el título se escribía DOS veces: una en la cabecera
    // del acordeón y otra dentro del propio contenido.
    const secciones = [
      { label: 'Cuerpo de ancianos', content: secCuerpo, icon: IconGroups },
      {
        label: 'Responsabilidades de ancianos',
        content: secCargos,
        icon: IconAssignment,
      },
      {
        label: 'Departamentos',
        content: secDepartamentos,
        icon: IconCongregation,
      },
    ];

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          pb: '40px',
        }}
      >
        {secciones.map(({ label, content, icon: Icon }) => (
          <MeetingSection
            key={label}
            part={label}
            color="var(--accent-main)"
            icon={<Icon color="var(--always-white)" width={22} height={22} />}
            expanded={abiertas.includes(label)}
            onToggle={() => alternarSeccion(label)}
          >
            {content}
          </MeetingSection>
        ))}
      </Box>
    );
  };

  const renderEditMode = () => {
    if (!draft) return null;

    const addCargo = () => {
      const newIndex = draft.cargosAncianos.length;
      updateDraft({
        cargosAncianos: [
          ...draft.cargosAncianos,
          { cargo: '', responsable: '' },
        ],
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
        {/* Cuerpo de ancianos (Read Only View) */}
        <ReadCuerpoAncianos
          uids={draft.cuerpoAncianos || []}
          resolveName={resolveName}
        />

        {/* Cargos */}
        <Box>
          <SectionHeader
            icon={IconAssignment}
            title="Responsabilidades de ancianos"
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr' },
              gap: '12px',
            }}
          >
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: '16px',
            }}
          >
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

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { mobile: '1fr', tablet: '1fr 1fr' },
              gap: '12px',
            }}
          >
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
                cargosAncianos: draft.cargosAncianos.map((c, i) =>
                  i === editCargoIndex ? val : c
                ),
              });
            }}
            onDelete={() => {
              updateDraft({
                cargosAncianos: draft.cargosAncianos.filter(
                  (_, i) => i !== editCargoIndex
                ),
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
                departamentos: draft.departamentos.map((d, i) =>
                  i === editDepIndex ? val : d
                ),
              });
            }}
            onDelete={() => {
              updateDraft({
                departamentos: draft.departamentos.filter(
                  (_, i) => i !== editDepIndex
                ),
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
