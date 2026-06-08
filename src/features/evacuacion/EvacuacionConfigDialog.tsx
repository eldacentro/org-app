import { useState } from 'react';
import { displaySnackNotification } from '@services/states/app';
import { useConfirm } from '@components/confirm_dialog';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import Button from '@components/button';
import TextField from '@components/textfield';
import { PlanEvacuacion, RolEmergencia, EquipoEvacuacion, MiembroEquipo } from '@definition/evacuacion';
import { dbEvacuacionSaveConfig } from '@services/dexie/evacuacion';
import { IconAdd, IconDelete } from '@components/icons';

interface Props {
  open: boolean;
  onClose: () => void;
  currentPlan: PlanEvacuacion;
  onSave: (newPlan: PlanEvacuacion) => void;
}

const EvacuacionConfigDialog = ({ open, onClose, currentPlan, onSave }: Props) => {
  const [tab, setTab] = useState(0);
  const [plan, setPlan] = useState<PlanEvacuacion>(JSON.parse(JSON.stringify(currentPlan)));
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
      displaySnackNotification({ severity: 'success', header: 'Plan guardado', message: 'La configuración de evacuación ha sido guardada.' });
      onClose();
    } catch (err) {
      console.error('Error saving evacuacion config', err);
      setSaveError('No se pudieron guardar los cambios. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Mando ----
  const handleMandoChange = (index: number, field: keyof RolEmergencia, value: string | string[]) => {
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
  const handleEquipoChange = (index: number, field: keyof EquipoEvacuacion, value: string | string[] | MiembroEquipo[]) => {
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
          color: '#3f51b5',
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
    const newNormas = [...plan.normasGenerales];
    newNormas[index] = value;
    setPlan({ ...plan, normasGenerales: newNormas });
  };

  const handleAddNorma = () => {
    setPlan({ ...plan, normasGenerales: [...plan.normasGenerales, ''] });
  };

  const handleDeleteNorma = async (index: number) => {
    const norma = plan.normasGenerales[index];
    const ok = await confirm({
      title: 'Eliminar norma',
      message: `¿Eliminar la norma "${norma ? norma.slice(0, 60) : 'esta norma'}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const newNormas = plan.normasGenerales.filter((_, i) => i !== index);
    setPlan({ ...plan, normasGenerales: newNormas });
  };

  return (
    <>
    {ConfirmDialogNode}
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '20px',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--pop-up-shadow)',
          maxWidth: '900px',
          width: '100%',
        },
      }}
      slotProps={{
        backdrop: {
          style: { backgroundColor: 'var(--accent-dark-overlay)' },
        },
      }}
    >
      <DialogTitle sx={{ color: 'var(--ink)', fontWeight: 700 }}>
        Configuración de Evacuación
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Mando" />
          <Tab label="Equipos" />
          <Tab label="Normas" />
          <Tab label="Ajustes" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, minHeight: '300px', maxHeight: { mobile: '60vh', tablet: '500px' }, overflowY: 'auto' }}>
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {plan.estructuraMando.map((rol, i) => (
              <Box key={i} sx={{ border: '1px solid var(--line)', p: 2, borderRadius: 'var(--r-lg)', position: 'relative' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <TextField
                    label="Puesto / Título del Rol"
                    value={rol.rol}
                    onChange={(e) => handleMandoChange(i, 'rol', e.target.value)}
                    sx={{ flex: 1, mr: 2 }}
                  />
                  <IconButton onClick={() => handleDeleteRol(i)} color="error">
                    <IconDelete />
                  </IconButton>
                </Box>

                <TextField
                  label="Nombre del encargado"
                  value={rol.nombre}
                  onChange={(e) => handleMandoChange(i, 'nombre', e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Responsabilidades (una por línea)"
                  multiline
                  minRows={3}
                  value={rol.responsabilidades.join('\n')}
                  onChange={(e) => handleMandoChange(i, 'responsabilidades', e.target.value.split('\n'))}
                  fullWidth
                />
              </Box>
            ))}
            <Button variant="tertiary" onClick={handleAddRol} startIcon={<IconAdd />}>
              Añadir Rol
            </Button>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {plan.equipos.map((equipo, i) => (
              <Box key={i} sx={{ border: '1px solid var(--line)', p: 2, borderRadius: 'var(--r-lg)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <TextField
                    label="Nombre del Equipo"
                    value={equipo.nombre}
                    onChange={(e) => handleEquipoChange(i, 'nombre', e.target.value)}
                    sx={{ flex: 1, mr: 2 }}
                  />
                  <IconButton onClick={() => handleDeleteEquipo(i)} color="error">
                    <IconDelete />
                  </IconButton>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Color (Hex)"
                    value={equipo.color}
                    onChange={(e) => handleEquipoChange(i, 'color', e.target.value)}
                    sx={{ width: '150px' }}
                  />
                  <TextField
                    label="Zona Asignada (opcional)"
                    value={equipo.zona || ''}
                    onChange={(e) => handleEquipoChange(i, 'zona', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <TextField
                  label="Miembros (Nombres separados por comas)"
                  value={equipo.miembros.map(m => m.nombre).join(', ')}
                  onChange={(e) => {
                    const nombres = e.target.value.split(',').map(n => n.trim()).filter(n => n !== '');
                    const nuevosMiembros = nombres.map((n, idx) => ({
                      ...(equipo.miembros[idx] || {}),
                      nombre: n
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
                  onChange={(e) => handleEquipoChange(i, 'procedimiento', e.target.value.split('\n'))}
                  fullWidth
                />
              </Box>
            ))}
            <Button variant="tertiary" onClick={handleAddEquipo} startIcon={<IconAdd />}>
              Añadir Equipo
            </Button>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {plan.normasGenerales.map((norma, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={norma}
                  onChange={(e) => handleNormaChange(i, e.target.value)}
                  fullWidth
                  size="small"
                />
                <IconButton onClick={() => handleDeleteNorma(i)}>
                  <IconDelete />
                </IconButton>
              </Box>
            ))}
            <Button variant="tertiary" onClick={handleAddNorma} startIcon={<IconAdd />}>
              Añadir Norma
            </Button>
          </Box>
        )}

        {tab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Configuración General</Typography>
            <TextField
              label="Tiempo Máximo de Evacuación (minutos)"
              type="number"
              value={plan.tiempoMaximo?.toString() || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') return; // no sobreescribir con 0 si el campo está vacío
                const n = Number(val);
                if (!isNaN(n) && n > 0) setPlan({ ...plan, tiempoMaximo: n });
              }}
              sx={{ width: { mobile: '100%', tablet: '300px' } }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        {saveError && (
          <Typography variant="caption" sx={{ color: 'var(--red-main)', textAlign: 'center' }}>
            {saveError}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose} variant="secondary">Cancelar</Button>
          <Button onClick={handleSave} variant="main" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default EvacuacionConfigDialog;
