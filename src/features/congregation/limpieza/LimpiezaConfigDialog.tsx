import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  MenuItem,
  Typography,
} from '@mui/material';
import Button from '@components/button';
import TextField from '@components/textfield';
import DatePicker from '@components/date_picker';
import { useAtomValue } from 'jotai';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import { dbLimpiezaGetConfig, dbLimpiezaSaveConfig } from '@services/dexie/limpieza';
import { useAppTranslation } from '@hooks/index';
import { LimpiezaConfig } from '@definition/limpieza';
import { FieldServiceGroupType } from '@definition/field_service_groups';

interface Props {
  open: boolean;
  onClose: () => void;
}

const LimpiezaConfigDialog = ({ open, onClose }: Props) => {
  const { t } = useAppTranslation();
  const groups = useAtomValue(fieldServiceGroupsState);
  const activeGroups = React.useMemo(() => {
    return [...groups]
      .filter((g) => g.group_data._deleted !== true)
      .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index);
  }, [groups]);

  const getGroupName = (g: FieldServiceGroupType) => {
    if (!g) return '';
    if (g.group_data.name && g.group_data.name.length > 0) return g.group_data.name;
    return t('tr_groupNumber', { groupNumber: g.group_data.sort_index + 1 });
  };

  const [fechaInicio, setFechaInicio] = useState<Date | null>(new Date());
  const [grupoInicio, setGrupoInicio] = useState<string>('');
  const [gruposParticipantes, setGruposParticipantes] = useState<string[]>([]);
  const [notasGenerales, setNotasGenerales] = useState<string>('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await dbLimpiezaGetConfig();
        if (config) {
          setFechaInicio(new Date(config.fechaInicio));
          setGrupoInicio(config.grupoInicio);
          setGruposParticipantes(config.gruposParticipantes);
          setNotasGenerales(config.notasGenerales || '');
        } else {
          // Default values
          setFechaInicio(new Date());
          setGrupoInicio(activeGroups.length > 0 ? activeGroups[0].group_id : '');
          setGruposParticipantes(activeGroups.map((g) => g.group_id));
          setNotasGenerales('');
        }
      } catch (err) {
        console.error('Error loading limpieza config:', err);
      }
    };

    if (open) {
      loadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!fechaInicio || !grupoInicio) return;

    try {
      // Preserve existing overrides from current config
      const existingConfig = await dbLimpiezaGetConfig();

      const config: LimpiezaConfig = {
        id: '1',
        updatedAt: new Date().toISOString(),
        fechaInicio: fechaInicio.toISOString(),
        grupoInicio,
        gruposParticipantes,
        notasGenerales,
        overrides: existingConfig?.overrides || {},
      };

      await dbLimpiezaSaveConfig(config);
      onClose();
    } catch (err) {
      console.error('Error saving limpieza config:', err);
    }
  };

  const toggleGroup = (groupId: string) => {
    setGruposParticipantes((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configuración de Limpieza</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <DatePicker
            label="Fecha de inicio"
            value={fechaInicio}
            onChange={(newValue) => setFechaInicio(newValue as Date)}
            view="input"
          />

          <TextField
            select
            label="Grupo de inicio"
            value={grupoInicio}
            onChange={(e) => setGrupoInicio(e.target.value)}
          >
            {activeGroups.map((g) => (
              <MenuItem key={g.group_id} value={g.group_id}>
                {getGroupName(g)}
              </MenuItem>
            ))}
          </TextField>

          <FormControl component="fieldset">
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Grupos que participan en la rotación
            </Typography>
            <FormGroup>
              {activeGroups.map((g) => (
                <FormControlLabel
                  key={g.group_id}
                  control={
                    <Checkbox
                      checked={gruposParticipantes.includes(g.group_id)}
                      onChange={() => toggleGroup(g.group_id)}
                    />
                  }
                  label={getGroupName(g)}
                />
              ))}
            </FormGroup>
          </FormControl>

          <TextField
            label="Notas generales"
            multiline
            rows={3}
            value={notasGenerales}
            onChange={(e) => setNotasGenerales(e.target.value)}
            placeholder="Ej: Traer fregonas, revisar aseos, etc."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="secondary">
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="main">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LimpiezaConfigDialog;
