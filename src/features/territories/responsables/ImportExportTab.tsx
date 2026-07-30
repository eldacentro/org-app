import { useState } from 'react';
import { Box, Stack, CircularProgress } from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';
import { IconS21Page, IconSpreadsheet, IconMapOverview, IconLightbulb } from '@components/icons';
import { serviceYearRange } from '@services/app/territories';
import { useTerritoryExport, ExcelFilter } from './useTerritoryExport';
import { displaySnackNotification } from '@services/states/app';
import { SectionCard, PillGroup, ToggleRow, PillOption } from './SettingsControls';

// Estaba a 11px, peso 700, en mayúsculas y con 0,6px de espaciado entre
// letras: un tamaño que no existe en la escala, y en mayúsculas cuesta
// leerlo. Es el mismo rótulo de campo que usan Responsabilidades y el resto.
const FieldLabel = ({ children }: { children: string }) => (
  <Typography
    className="label-small-semibold"
    color="var(--ink-3)"
    sx={{ display: 'block', mb: '8px' }}
  >
    {children}
  </Typography>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const ImportExportTab = () => {
  const { exportS13, exportExcel, exportCsv, exportGeoJson, exportKml } = useTerritoryExport();

  const years = Array.from({ length: 5 }).map((_, i) => {
    const ref = new Date();
    ref.setFullYear(ref.getFullYear() - i);
    return serviceYearRange(ref);
  });

  const [yearIdx, setYearIdx] = useState('0');
  const [includeCampaigns, setIncludeCampaigns] = useState(true);
  const [filter, setFilter] = useState<ExcelFilter>('all');
  const [busy, setBusy] = useState(false);

  const run = async <T,>(fn: () => T | Promise<T>, successMsg?: string) => {
    setBusy(true);
    try {
      const result = await fn();
      if (successMsg) displaySnackNotification({ severity: 'success', header: 'Listo', message: successMsg });
      return result;
    } catch (e) {
      console.error(e);
      displaySnackNotification({ severity: 'error', header: 'Error al exportar', message: 'No se pudo generar el archivo. Inténtalo de nuevo.' });
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const yearOptions: PillOption[] = years.map((y, i) => ({ value: String(i), label: y.label }));

  const filterOptions: PillOption[] = [
    { value: 'all', label: 'Todas' },
    { value: 'assigned', label: 'Asignados' },
    { value: 'unassigned', label: 'Sin asignar' },
    { value: 'campaigns', label: 'Campañas' },
  ];

  return (
    <Stack spacing={2.5}>
      {/* ── S-13 ────────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={<IconS21Page width={20} height={20} color="var(--accent-main)" />}
        title="Formulario S-13 (PDF)"
        subtitle="Registro oficial para el superintendente de circuito"
        iconBg="rgba(var(--accent-main-base), 0.1)"
      >
        <Stack spacing={2} sx={{ py: 2 }}>
          <Box>
            <FieldLabel>Año de servicio</FieldLabel>
            <PillGroup
              value={yearIdx}
              onChange={setYearIdx}
              options={yearOptions}
            />
          </Box>

          <ToggleRow
            label="Incluir asignaciones de campaña"
            description="Las campañas especiales se contarán en el registro del S-13"
            checked={includeCampaigns}
            onChange={setIncludeCampaigns}
            divider="top"
          />

          <Box>
            <Button
              variant="main"
              disabled={busy}
              onClick={async () => {
                const ref = new Date();
                ref.setFullYear(ref.getFullYear() - Number(yearIdx));
                const result = await run(
                  () => exportS13(ref, includeCampaigns),
                  'S-13 generado correctamente.'
                );
                if (result && result.continuedTerritories > 0) {
                  displaySnackNotification({
                    severity: 'success',
                    header: 'Se añadieron hojas de continuación',
                    message: `${result.continuedTerritories} territorio(s) tuvieron más de 4 asignaciones este año. Como indica el propio formulario, siguen en una hoja de continuación con la última fecha en que se completaron.`,
                  });
                }
              }}
              sx={{ borderRadius: 'var(--shape-full)', px: 3, gap: 1 }}
            >
              {busy ? <CircularProgress size={16} color="inherit" /> : null}
              {busy ? 'Generando…' : 'Exportar S-13'}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      {/* ── Hoja de cálculo ──────────────────────────────────────────────────── */}
      <SectionCard
        icon={<IconSpreadsheet width={20} height={20} color="var(--green-main)" />}
        title="Hoja de cálculo"
        subtitle="Datos de asignaciones en formato Excel o CSV"
        iconBg="rgba(var(--green-main-base), 0.1)"
      >
        <Stack spacing={2} sx={{ py: 2 }}>
          <Box>
            <FieldLabel>Contenido a exportar</FieldLabel>
            <PillGroup
              value={filter}
              onChange={(v) => setFilter(v as ExcelFilter)}
              options={filterOptions}
            />
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => exportExcel(filter), 'Archivo Excel generado correctamente.')}
              sx={{ borderRadius: 'var(--shape-full)' }}
            >
              Excel (.xlsx)
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => run(() => exportCsv(filter), 'Archivo CSV generado correctamente.')}
              sx={{ borderRadius: 'var(--shape-full)' }}
            >
              CSV (.csv)
            </Button>
          </Stack>
        </Stack>
      </SectionCard>

      {/* ── Geometría ───────────────────────────────────────────────────────── */}
      <SectionCard
        icon={<IconMapOverview width={20} height={20} color="var(--orange-main)" />}
        title="Geometría (mapas)"
        subtitle="Coordenadas y polígonos de los territorios"
        iconBg="rgba(var(--orange-main-base), 0.1)"
      >
        <Stack spacing={2} sx={{ py: 2 }}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(exportKml, 'KML generado correctamente.')}
              sx={{ borderRadius: 'var(--shape-full)' }}
            >
              Exportar KML
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => run(exportGeoJson, 'GeoJSON generado correctamente.')}
              sx={{ borderRadius: 'var(--shape-full)' }}
            >
              Exportar GeoJSON
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              backgroundColor: 'var(--accent-100)',
              borderRadius: 'var(--shape-sm)',
              px: 1.5,
              py: 1.25,
            }}
          >
            <IconLightbulb width={16} height={16} color="var(--ink-2)" />
            <Typography className="label-small-regular" sx={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Para importar desde KML/KMZ, usa el botón{' '}
              <strong>&quot;Importar KML&quot;</strong> en la pestaña{' '}
              <strong>Territorios</strong>.
            </Typography>
          </Box>
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default ImportExportTab;
