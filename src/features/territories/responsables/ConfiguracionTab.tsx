import { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { congIDState } from '@states/settings';
import { territorySettingsState } from '@states/territories';
import { TerritorySettings } from '@definition/territories';
import { saveSettings } from '@services/firebase/territories';

const SectionTitle = ({ children }: { children: string }) => (
  <Typography variant="h6" sx={{ color: 'var(--ink)', mt: 2, mb: 1 }}>
    {children}
  </Typography>
);

const ConfiguracionTab = () => {
  const congId = useAtomValue(congIDState);
  const settings = useAtomValue(territorySettingsState);

  const [draft, setDraft] = useState<TerritorySettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  const set = <K extends keyof TerritorySettings>(
    key: K,
    value: TerritorySettings[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const sw = (key: keyof TerritorySettings, label: string) => (
    <FormControlLabel
      control={
        <Switch
          checked={Boolean(draft[key])}
          onChange={(e) => set(key, e.target.checked as never)}
        />
      }
      label={<Typography variant="body2">{label}</Typography>}
    />
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(congId, { ...draft, updatedAt: new Date().toISOString() });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      <SectionTitle>Ajustes de asignación</SectionTitle>
      <Stack spacing={1.5}>
        <FormControl size="small" sx={{ maxWidth: 220 }}>
          <InputLabel id="date-format">Formato de fecha</InputLabel>
          <Select
            labelId="date-format"
            label="Formato de fecha"
            value={draft.dateFormat}
            onChange={(e) => set('dateFormat', e.target.value)}
          >
            <MenuItem value="dd-MM-yyyy">dd-mm-aaaa</MenuItem>
            <MenuItem value="dd/MM/yyyy">dd/mm/aaaa</MenuItem>
            <MenuItem value="yyyy-MM-dd">aaaa-mm-dd</MenuItem>
            <MenuItem value="MM/dd/yyyy">mm/dd/aaaa</MenuItem>
          </Select>
        </FormControl>
        {sw('statsIncludeCampaigns', 'Las estadísticas incluyen las asignaciones de campaña')}
        {sw('assignedCountsAsWorked', 'Los territorios asignados se consideran como trabajados')}
      </Stack>

      <SectionTitle>Dashboard</SectionTitle>
      <Stack spacing={1.5}>
        <TextField
          label="Días para considerar un territorio atrasado"
          type="number"
          value={String(draft.daysUntilOverdue)}
          onChange={(e) => set('daysUntilOverdue', Number(e.target.value))}
        />
        <TextField
          label="Días hasta el vencimiento del territorio"
          type="number"
          value={String(draft.daysUntilExpiration)}
          onChange={(e) => set('daysUntilExpiration', Number(e.target.value))}
        />
        <TextField
          label="Mensaje de territorio atrasado"
          value={draft.overdueMessage}
          onChange={(e) => set('overdueMessage', e.target.value)}
          multiline
          minRows={2}
        />
        <FormControl size="small">
          <InputLabel id="range">Rango de estadísticas</InputLabel>
          <Select
            labelId="range"
            label="Rango de estadísticas"
            value={draft.statsRange}
            onChange={(e) => set('statsRange', e.target.value as TerritorySettings['statsRange'])}
          >
            <MenuItem value="service_year">Año de servicio actual</MenuItem>
            <MenuItem value="one_year">Un año (12 meses)</MenuItem>
            <MenuItem value="all">Desde el inicio</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="group">Agrupación de estadísticas</InputLabel>
          <Select
            labelId="group"
            label="Agrupación de estadísticas"
            value={draft.statsGrouping}
            onChange={(e) =>
              set('statsGrouping', e.target.value as TerritorySettings['statsGrouping'])
            }
          >
            <MenuItem value="zone">Zona o tipo de territorio</MenuItem>
            <MenuItem value="none">Sin agrupar</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <SectionTitle>Vista del territorio (expandir por defecto)</SectionTitle>
      <Stack>
        {sw('expandInfo', 'Información del territorio')}
        {sw('expandMap', 'Mapa del territorio')}
        {sw('expandImage', 'Imagen del territorio')}
        {sw('expandLocations', 'Ubicaciones del territorio')}
      </Stack>

      <SectionTitle>Configuración de publicador</SectionTitle>
      <Stack>
        {sw('publishersCanReturn', 'Los publicadores pueden devolver los territorios')}
        {sw('publishersCanSeeGroup', 'Los publicadores pueden ver los territorios de su grupo')}
        {sw('publishersCanAddLocations', 'Las direcciones pueden ser agregadas por publicadores')}
      </Stack>

      <SectionTitle>Configuración de ubicación</SectionTitle>
      <Stack>
        {sw(
          'locationsRequireApproval',
          'Las ubicaciones agregadas deben ser aprobadas por los responsables'
        )}
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} alignItems="center">
        <Button variant="main" onClick={handleSave} disabled={saving}>
          Guardar
        </Button>
        {saved && (
          <Typography variant="body2" sx={{ color: 'var(--green-main)' }}>
            ✓ Guardado
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ConfiguracionTab;
