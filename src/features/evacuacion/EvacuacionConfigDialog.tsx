import { useState } from 'react';
import { displaySnackNotification } from '@services/states/app';
import { useConfirm } from '@components/confirm_dialog';
import { Box } from '@mui/material';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import ScrollableTabs from '@components/scrollable_tabs';
import IconButton from '@components/icon_button';
import InfoTip from '@components/info_tip';
import Button from '@components/button';
import TextField from '@components/textfield';
import {
  PlanEvacuacion,
  RolEmergencia,
  EquipoEvacuacion,
  MiembroEquipo,
} from '@definition/evacuacion';
import { COLORES } from './data';
import { dbEvacuacionSaveConfig } from '@services/dexie/evacuacion';
import { IconAdd, IconDelete } from '@components/icons';

interface Props {
  open: boolean;
  onClose: () => void;
  currentPlan: PlanEvacuacion;
  onSave: (newPlan: PlanEvacuacion) => void;
}

const EvacuacionConfigDialog = ({
  open,
  onClose,
  currentPlan,
  onSave,
}: Props) => {
  const [tab, setTab] = useState(0);
  const [plan, setPlan] = useState<PlanEvacuacion>(
    JSON.parse(JSON.stringify(currentPlan))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { confirm, ConfirmDialogNode } = useConfirm();

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const updated = { ...plan, updatedAt: new Date().toISOString(), id: '1' };
      await dbEvacuacionSaveConfig(updated);
      onSave(updated);
      displaySnackNotification({
        severity: 'success',
        header: 'Plan guardado',
        message: 'La configuración de evacuación ha sido guardada.',
      });
      onClose();
    } catch (err) {
      console.error('Error saving evacuacion config', err);
      setSaveError(
        'No se pudieron guardar los cambios. Comprueba tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Mando ----
  const handleMandoChange = (
    index: number,
    field: keyof RolEmergencia,
    value: string | string[]
  ) => {
    const newMando = [...plan.estructuraMando];
    newMando[index] = { ...newMando[index], [field]: value };
    setPlan({ ...plan, estructuraMando: newMando });
  };

  const handleAddRol = () => {
    setPlan({
      ...plan,
      estructuraMando: [
        ...plan.estructuraMando,
        { rol: 'Nuevo Rol', nombre: '', responsabilidades: [] },
      ],
    });
  };

  const handleDeleteRol = async (index: number) => {
    const rol = plan.estructuraMando[index];
    const ok = await confirm({
      title: 'Eliminar rol',
      message: `¿Eliminar el rol "${rol?.rol || 'este rol'}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const newMando = plan.estructuraMando.filter((_, i) => i !== index);
    setPlan({ ...plan, estructuraMando: newMando });
  };

  // ---- Equipos ----
  const handleEquipoChange = (
    index: number,
    field: keyof EquipoEvacuacion,
    value: string | string[] | MiembroEquipo[]
  ) => {
    const newEquipos = [...plan.equipos];
    newEquipos[index] = { ...newEquipos[index], [field]: value };
    setPlan({ ...plan, equipos: newEquipos });
  };

  const handleAddEquipo = () => {
    setPlan({
      ...plan,
      equipos: [
        ...plan.equipos,
        {
          id: `eq-${Date.now()}`,
          nombre: 'Nuevo Equipo',
          // El azul del propio plano, no un índigo suelto de Material que no
          // aparece en ninguna otra parte de la app. Es un dato que se guarda,
          // así que va en hexadecimal a propósito: un `var()` no sobrevive a
          // la base de datos.
          color: COLORES.zonaA,
          miembros: [],
          procedimiento: [],
        },
      ],
    });
  };

  const handleDeleteEquipo = async (index: number) => {
    const equipo = plan.equipos[index];
    const ok = await confirm({
      title: 'Eliminar equipo',
      message: `¿Eliminar el equipo "${equipo?.nombre || 'este equipo'}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const newEquipos = plan.equipos.filter((_, i) => i !== index);
    setPlan({ ...plan, equipos: newEquipos });
  };

  // ---- Normas ----
  const handleNormaChange = (index: number, value: string) => {
    const newNormas = [...plan.reglasEspeciales];
    newNormas[index] = value;
    setPlan({ ...plan, reglasEspeciales: newNormas });
  };

  const handleAddNorma = () => {
    setPlan({ ...plan, reglasEspeciales: [...plan.reglasEspeciales, ''] });
  };

  const handleDeleteNorma = async (index: number) => {
    const norma = plan.reglasEspeciales[index];
    const ok = await confirm({
      title: 'Eliminar norma',
      message: `¿Eliminar la norma "${norma ? norma.slice(0, 60) : 'esta norma'}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const newNormas = plan.reglasEspeciales.filter((_, i) => i !== index);
    setPlan({ ...plan, reglasEspeciales: newNormas });
  };

  return (
    <>
      {ConfirmDialogNode}
      <Dialog open={open} onClose={onClose}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
          }}
        >
          <Box>
            <Typography className="h2" color="var(--ink)">
              Editar el plan de evacuación
            </Typography>
            <Typography className="body-small-regular" color="var(--ink-2)">
              Los textos de esta pantalla salen del documento oficial de la
              congregación. Cámbialos solo cuando cambie el documento.
            </Typography>
          </Box>

          <ScrollableTabs
            value={tab}
            onChange={(value) => setTab(value)}
            tabs={[
              { label: 'Mando' },
              { label: 'Equipos' },
              { label: 'Reglas' },
              { label: 'Ajustes' },
            ]}
          />

          <Box
            sx={{
              minHeight: '280px',
              maxHeight: { mobile: '55vh', tablet: '460px' },
              overflowY: 'auto',
              // Solo se desplaza en vertical. Desbordaba 2px a lo ancho —lo
              // justo para pintar una barra horizontal de lado a lado del
              // diálogo, que parecía un error de maquetación.
              overflowX: 'hidden',
              paddingRight: '4px',
            }}
          >
            {tab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {plan.estructuraMando.map((rol, i) => (
                  <Box
                    key={i}
                    sx={{
                      border: '1px solid var(--line)',
                      p: 2,
                      borderRadius: 'var(--shape-md)',
                      position: 'relative',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        mb: 2,
                      }}
                    >
                      {/* `minWidth: 0` es lo que faltaba: sin él, un hijo flex
                          no baja de su ancho de contenido, así que el campo se
                          negaba a encogerse y su valor salía cortado con puntos
                          suspensivos ("Jefe de Emergenci…") aunque hubiera
                          sitio de sobra en la fila. */}
                      <TextField
                        multiline
                        label="Puesto / título del rol"
                        value={rol.rol}
                        onChange={(e) =>
                          handleMandoChange(i, 'rol', e.target.value)
                        }
                        sx={{ flex: 1, minWidth: 0 }}
                      />
                      <IconButton onClick={() => handleDeleteRol(i)}>
                        <IconDelete color="var(--red-main)" />
                      </IconButton>
                    </Box>

                    <TextField
                      label="Nombre del encargado"
                      value={rol.nombre}
                      onChange={(e) =>
                        handleMandoChange(i, 'nombre', e.target.value)
                      }
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      // La etiqueta hacía dos trabajos —nombrar el campo Y
                      // explicar el formato— y por eso no cabía en un campo de
                      // este ancho. El nombre se queda en la etiqueta; la
                      // instrucción baja al texto de ayuda, que es su sitio.
                      label="Responsabilidades"
                      placeholder="Una por línea"
                      multiline
                      minRows={3}
                      value={rol.responsabilidades.join('\n')}
                      onChange={(e) =>
                        handleMandoChange(
                          i,
                          'responsabilidades',
                          e.target.value.split('\n')
                        )
                      }
                      fullWidth
                    />
                  </Box>
                ))}
                <Button
                  variant="tertiary"
                  onClick={handleAddRol}
                  startIcon={<IconAdd />}
                >
                  Añadir rol
                </Button>
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {plan.equipos.map((equipo, i) => (
                  <Box
                    key={i}
                    sx={{
                      border: '1px solid var(--line)',
                      p: 2,
                      borderRadius: 'var(--shape-md)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <TextField
                        label="Nombre del equipo"
                        value={equipo.nombre}
                        onChange={(e) =>
                          handleEquipoChange(i, 'nombre', e.target.value)
                        }
                        sx={{ flex: 1, mr: 2 }}
                      />
                      <IconButton onClick={() => handleDeleteEquipo(i)}>
                        <IconDelete color="var(--red-main)" />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Color (hex)"
                        value={equipo.color}
                        onChange={(e) =>
                          handleEquipoChange(i, 'color', e.target.value)
                        }
                        sx={{ width: '150px' }}
                      />
                      <TextField
                        label="Zona asignada (opcional)"
                        value={equipo.zona || ''}
                        onChange={(e) =>
                          handleEquipoChange(i, 'zona', e.target.value)
                        }
                        sx={{ flex: 1 }}
                      />
                    </Box>

                    <TextField
                      label="Miembros (nombres separados por comas)"
                      value={equipo.miembros.map((m) => m.nombre).join(', ')}
                      onChange={(e) => {
                        const nombres = e.target.value
                          .split(',')
                          .map((n) => n.trim())
                          .filter((n) => n !== '');
                        const nuevosMiembros = nombres.map((n, idx) => ({
                          ...(equipo.miembros[idx] || {}),
                          nombre: n,
                        }));
                        handleEquipoChange(i, 'miembros', nuevosMiembros);
                      }}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Procedimiento (uno por línea)"
                      multiline
                      minRows={3}
                      value={equipo.procedimiento.join('\n')}
                      onChange={(e) =>
                        handleEquipoChange(
                          i,
                          'procedimiento',
                          e.target.value.split('\n')
                        )
                      }
                      fullWidth
                    />
                  </Box>
                ))}
                <Button
                  variant="tertiary"
                  onClick={handleAddEquipo}
                  startIcon={<IconAdd />}
                >
                  Añadir equipo
                </Button>
              </Box>
            )}

            {tab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {plan.reglasEspeciales.map((norma, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      value={norma}
                      onChange={(e) => handleNormaChange(i, e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <IconButton onClick={() => handleDeleteNorma(i)}>
                      <IconDelete color="var(--red-main)" />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="tertiary"
                  onClick={handleAddNorma}
                  startIcon={<IconAdd />}
                >
                  Añadir norma
                </Button>
              </Box>
            )}

            {tab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography className="h3" color="var(--ink)">
                  Configuración general
                </Typography>
                <TextField
                  label="Tiempo máximo de evacuación (minutos)"
                  type="number"
                  value={plan.tiempoMaximo?.toString() || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') return; // no sobreescribir con 0 si el campo está vacío
                    const n = Number(val);
                    if (!isNaN(n) && n > 0)
                      setPlan({ ...plan, tiempoMaximo: n });
                  }}
                  sx={{ width: { mobile: '100%', tablet: '300px' } }}
                />
              </Box>
            )}
          </Box>

          {saveError && (
            <InfoTip isBig={false} color="error" text={saveError} />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={onClose} variant="tertiary">
              Cancelar
            </Button>
            <Button onClick={handleSave} variant="main" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default EvacuacionConfigDialog;
