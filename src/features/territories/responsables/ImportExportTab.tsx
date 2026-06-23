import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Stack, CircularProgress } from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';
import { serviceYearRange } from '@services/app/territories';
import { useTerritoryExport, ExcelFilter } from './useTerritoryExport';
import { displaySnackNotification } from '@services/states/app';
import MigrationRunner from './MigrationRunner';

// ─── Tipos locales ────────────────────────────────────────────────────────────
type PillOption = { value: string; label: string };

// ─── Componentes de diseño ────────────────────────────────────────────────────

const SectionCard = ({
  icon,
  title,
  subtitle,
  iconBg,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  iconBg: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      borderRadius: '16px',
      border: '1px solid var(--line)',
      backgroundColor: 'var(--card)',
      boxShadow: 'var(--small-card-shadow)',
      overflow: 'hidden',
    }}
  >
    {/* ── Cabecera ── */}
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        px: { mobile: 2, tablet600: 2.5 },
        py: '14px',
        borderBottom: '1px solid var(--line)',
        background: 'linear-gradient(to right, rgba(0,0,0,0.02), transparent)',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)', lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.3 }}>
          {subtitle}
        </Typography>
      </Box>
    </Stack>

    {/* ── Contenido ── */}
    <Box sx={{ px: { mobile: 2, tablet600: 2.5 }, py: 2 }}>{children}</Box>
  </Box>
);

const PillGroup = ({
  value,
  onChange,
  options,
  accent = 'var(--accent-main)',
}: {
  value: string;
  onChange: (val: string) => void;
  options: PillOption[];
  accent?: string;
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <Box
          key={opt.value}
          onClick={() => onChange(opt.value)}
          sx={{
            px: '12px',
            py: '6px',
            borderRadius: '999px',
            border: '1.5px solid',
            borderColor: active ? accent : 'var(--line)',
            backgroundColor: active ? `${accent}15` : 'transparent',
            color: active ? accent : 'var(--ink-2)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: active ? 600 : 400,
            transition: 'all 0.15s ease',
            userSelect: 'none',
            '&:hover': {
              borderColor: active ? accent : 'var(--ink-3)',
              backgroundColor: active ? `${accent}22` : 'var(--bg-hover)',
            },
            '&:active': { transform: 'scale(0.96)' },
          }}
        >
          {opt.label}
        </Box>
      );
    })}
  </Box>
);

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <Box
    onClick={() => onChange(!checked)}
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 2,
      py: '14px',
      cursor: 'pointer',
      borderTop: '0.5px solid var(--line)',
    }}
  >
    <Box sx={{ flex: 1 }}>
      <Typography
        sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}
      >
        {label}
      </Typography>
      {description && (
        <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)', mt: '3px', lineHeight: 1.4 }}>
          {description}
        </Typography>
      )}
    </Box>
    {/* iOS-style toggle */}
    <Box
      sx={{
        width: 44,
        height: 26,
        borderRadius: '13px',
        backgroundColor: checked ? 'var(--green-main)' : 'var(--grey-300)',
        position: 'relative',
        flexShrink: 0,
        mt: '2px',
        transition: 'background 0.22s ease',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 22,
          height: 22,
          borderRadius: '50%',
          backgroundColor: 'var(--white)',
          top: 2,
          left: checked ? 20 : 2,
          boxShadow: '0 1.5px 4px rgba(0,0,0,0.22)',
          transition: 'left 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      />
    </Box>
  </Box>
);

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

  const run = async (fn: () => void | Promise<void>, successMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (successMsg) displaySnackNotification({ severity: 'success', header: 'Listo', message: successMsg });
    } catch (e) {
      console.error(e);
      displaySnackNotification({ severity: 'error', header: 'Error al exportar', message: 'No se pudo generar el archivo. Inténtalo de nuevo.' });
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
        iconBg="rgba(48, 108, 180, 0.1)"
      >
        <Stack spacing={2}>
          <Box>
            <FieldLabel>Año de servicio</FieldLabel>
            <PillGroup
              value={yearIdx}
              onChange={setYearIdx}
              options={yearOptions}
              accent="#306CB4"
            />
          </Box>

          <ToggleRow
            label="Incluir asignaciones de campaña"
            description="Las campañas especiales se contarán en el registro del S-13"
            checked={includeCampaigns}
            onChange={setIncludeCampaigns}
          />

          <Box>
            <Button
              variant="main"
              disabled={busy}
              onClick={() =>
                run(() => {
                  const ref = new Date();
                  ref.setFullYear(ref.getFullYear() - Number(yearIdx));
                  return exportS13(ref, includeCampaigns);
                }, 'S-13 generado correctamente.')
              }
              sx={{ borderRadius: '999px', px: 3, gap: 1 }}
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
        iconBg="rgba(52, 199, 89, 0.1)"
      >
        <Stack spacing={2}>
          <Box>
            <FieldLabel>Contenido a exportar</FieldLabel>
            <PillGroup
              value={filter}
              onChange={(v) => setFilter(v as ExcelFilter)}
              options={filterOptions}
              accent="#34C759"
            />
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => exportExcel(filter), 'Archivo Excel generado correctamente.')}
              sx={{ borderRadius: '999px' }}
            >
              Excel (.xlsx)
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => run(() => exportCsv(filter), 'Archivo CSV generado correctamente.')}
              sx={{ borderRadius: '999px' }}
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
        iconBg="rgba(255, 149, 0, 0.1)"
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(exportKml, 'KML generado correctamente.')}
              sx={{ borderRadius: '999px' }}
            >
              Exportar KML
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => run(exportGeoJson, 'GeoJSON generado correctamente.')}
              sx={{ borderRadius: '999px' }}
            >
              Exportar GeoJSON
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              backgroundColor: 'var(--bg-hover)',
              borderRadius: '10px',
              px: 1.5,
              py: 1.25,
            }}
          >
            <Typography sx={{ fontSize: '14px', flexShrink: 0, mt: '-1px' }}>💡</Typography>
            <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Para importar desde KML/KMZ, usa el botón{' '}
              <strong>&quot;Importar KML&quot;</strong> en la pestaña{' '}
              <strong>Territorios</strong>.
            </Typography>
          </Box>
        </Stack>
      </SectionCard>
      
      {/* ── Herramienta de Migración ── */}
      <MigrationRunner />
    </Stack>
  );
};

export default ImportExportTab;
