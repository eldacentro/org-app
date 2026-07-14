import { useState } from 'react';
import { Box, Stack, CircularProgress } from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';
import { serviceYearRange } from '@services/app/territories';
import { useTerritoryExport, ExcelFilter } from './useTerritoryExport';
import { displaySnackNotification } from '@services/states/app';
import { SectionCard, PillGroup, ToggleRow, PillOption } from './SettingsControls';

const FieldLabel = ({ children }: { children: string }) => (
  <Typography
    sx={{
      fontSize: '11px',
      fontWeight: 700,
      color: 'var(--ink-2)',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      mb: '8px',
    }}
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
        icon="📄"
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
              accent="var(--accent-main)"
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
                if (result && result.truncatedTerritories > 0) {
                  displaySnackNotification({
                    severity: 'success',
                    header: 'Algunos territorios tienen más de 4 asignaciones',
                    message: `${result.truncatedTerritories} territorio(s) tuvieron más de 4 asignaciones este año de servicio; el S-13 solo tiene espacio para las 4 más recientes de cada uno.`,
                  });
                }
              }}
              sx={{ borderRadius: 'var(--radius-max)', px: 3, gap: 1 }}
            >
              {busy ? <CircularProgress size={16} color="inherit" /> : null}
              {busy ? 'Generando…' : '⬇ Exportar S-13'}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      {/* ── Hoja de cálculo ──────────────────────────────────────────────────── */}
      <SectionCard
        icon="📊"
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
              accent="var(--green-main)"
            />
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => exportExcel(filter), 'Archivo Excel generado correctamente.')}
              sx={{ borderRadius: 'var(--radius-max)' }}
            >
              Excel (.xlsx)
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => run(() => exportCsv(filter), 'Archivo CSV generado correctamente.')}
              sx={{ borderRadius: 'var(--radius-max)' }}
            >
              CSV (.csv)
            </Button>
          </Stack>
        </Stack>
      </SectionCard>

      {/* ── Geometría ───────────────────────────────────────────────────────── */}
      <SectionCard
        icon="🗺"
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
              sx={{ borderRadius: 'var(--radius-max)' }}
            >
              Exportar KML
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => run(exportGeoJson, 'GeoJSON generado correctamente.')}
              sx={{ borderRadius: 'var(--radius-max)' }}
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
              borderRadius: '10px',
              px: 1.5,
              py: 1.25,
            }}
          >
            <Typography sx={{ fontSize: '14px', flexShrink: 0, mt: '-1px' }}>💡</Typography>
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
