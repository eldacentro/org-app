import { useState } from 'react';
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = { ...plan, updatedAt: new Date().toISOString(), id: '1' };
      await dbEvacuacionSaveConfig(updated);
      onSave(updated);
      onClose();
    } catch (err) {
      console.error('Error saving evacuacion config', err);
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

  const handleDeleteRol = (index: number) => {
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

  const handleDeleteEquipo = (index: number) => {
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

  const handleDeleteNorma = (index: number) => {
    const newNormas = plan.normasGenerales.filter((_, i) => i !== index);
    setPlan({ ...plan, normasGenerales: newNormas });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configuración de Evacuación</DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Mando" />
          <Tab label="Equipos" />
          <Tab label="Normas" />
          <Tab label="Ajustes" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, height: '500px' }}>
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {plan.estructuraMando.map((rol, i) => (
              <Box key={i} sx={{ border: '1px solid var(--line)', p: 2, borderRadius: 'var(--radius-l)', position: 'relative' }}>
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
              <Box key={i} sx={{ border: '1px solid var(--line)', p: 2, borderRadius: 'var(--radius-l)' }}>
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
              onChange={(e) => setPlan({ ...plan, tiempoMaximo: Number(e.target.value) })}
              sx={{ width: '300px' }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="secondary">Cancelar</Button>
        <Button onClick={handleSave} variant="main" disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvacuacionConfigDialog;
