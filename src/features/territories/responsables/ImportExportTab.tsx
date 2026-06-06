import { useState } from 'react';
import {
  Box,
  Stack,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';
import { serviceYearRange } from '@services/app/territories';
import { useTerritoryExport, ExcelFilter } from './useTerritoryExport';

const SectionTitle = ({ children }: { children: string }) => (
  <Typography variant="h6" sx={{ color: 'var(--ink)', mt: 2, mb: 1 }}>
    {children}
  </Typography>
);

const ImportExportTab = () => {
  const { exportS13, exportExcel, exportCsv, exportGeoJson, exportKml } =
    useTerritoryExport();

  // Años de servicio recientes para el selector del S-13.
  const years = Array.from({ length: 5 }).map((_, i) => {
    const ref = new Date();
    ref.setFullYear(ref.getFullYear() - i);
    return serviceYearRange(ref);
  });

  const [yearIdx, setYearIdx] = useState(0);
  const [includeCampaigns, setIncludeCampaigns] = useState(true);
  const [filter, setFilter] = useState<ExcelFilter>('all');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      <SectionTitle>Formulario S-13 (PDF)</SectionTitle>
      <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 1 }}>
        Registro de asignación de territorios para el superintendente de circuito.
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="sy">Año de servicio</InputLabel>
          <Select
            labelId="sy"
            label="Año de servicio"
            value={yearIdx}
            onChange={(e) => setYearIdx(Number(e.target.value))}
          >
            {years.map((y, i) => (
              <MenuItem key={y.label} value={i}>
                {y.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              checked={includeCampaigns}
              onChange={(e) => setIncludeCampaigns(e.target.checked)}
            />
          }
          label={<Typography variant="body2">Incluir campañas</Typography>}
        />
        <Button
          variant="main"
          disabled={busy}
          onClick={() =>
            run(() => {
              const ref = new Date();
              ref.setFullYear(ref.getFullYear() - yearIdx);
              return exportS13(ref, includeCampaigns);
            })
          }
        >
          Exportar S-13
        </Button>
      </Stack>

      <SectionTitle>Hoja de cálculo</SectionTitle>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="filter">Contenido</InputLabel>
          <Select
            labelId="filter"
            label="Contenido"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ExcelFilter)}
          >
            <MenuItem value="all">Todas las asignaciones</MenuItem>
            <MenuItem value="assigned">Solo asignados (abiertos)</MenuItem>
            <MenuItem value="unassigned">Solo sin asignar</MenuItem>
            <MenuItem value="campaigns">Solo campañas</MenuItem>
          </Select>
        </FormControl>
        <Button variant="tertiary" disabled={busy} onClick={() => run(() => exportExcel(filter))}>
          Excel (.xlsx)
        </Button>
        <Button variant="tertiary" disabled={busy} onClick={() => run(() => exportCsv(filter))}>
          CSV (.csv)
        </Button>
      </Stack>

      <SectionTitle>Geometría (mapas)</SectionTitle>
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Button variant="tertiary" disabled={busy} onClick={() => run(exportKml)}>
          Exportar KML
        </Button>
        <Button variant="tertiary" disabled={busy} onClick={() => run(exportGeoJson)}>
          Exportar GeoJSON
        </Button>
      </Stack>
      <Typography variant="caption" color="var(--ink-2)" sx={{ display: 'block', mt: 1 }}>
        Para importar territorios desde KML/KMZ, usa el botón “Importar KML” en la
        pestaña Territorios.
      </Typography>
    </Box>
  );
};

export default ImportExportTab;
