import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import { congIDState } from '@states/settings';
import { territorySettingsState } from '@states/territories';
import { TerritorySettings } from '@definition/territories';
import { saveSettings } from '@services/firebase/territories';
import { SectionCard, PillGroup, ToggleRow } from './SettingsControls';

/** Fila con label encima y contenido (pills, input, etc.) debajo */
const FieldRow = ({
  label,
  description,
  last,
  children,
}: {
  label: string;
  description?: string;
  last?: boolean;
  children: ReactNode;
}) => (
  <Box
    sx={{
      py: '16px',
      borderBottom: last ? 'none' : '0.5px solid var(--line)',
    }}
  >
    <Typography
      sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, mb: '4px' }}
    >
      {label}
    </Typography>
    {description && (
      <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)', mb: '10px', lineHeight: 1.4 }}>
        {description}
      </Typography>
    )}
    {children}
  </Box>
);

/** Stepper numérico de +/– con input directo en el centro */
const NumberStepper = ({
  value,
  onChange,
  min = 0,
  max = 99,
  suffix,
}: {
  value: number | string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) => {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const [localVal, setLocalVal] = useState<string>(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const btnSx = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 300,
    color: 'var(--ink-2)',
    flexShrink: 0,
    userSelect: 'none' as const,
    transition: 'background 0.12s ease',
    '&:active': { backgroundColor: 'rgba(0,0,0,0.07)' },
  };

  const handleMinus = () => {
    const num = Number(localVal);
    if (!isNaN(num)) onChange(clamp(num - 1));
  };

  const handlePlus = () => {
    const num = Number(localVal);
    if (!isNaN(num)) onChange(clamp(num + 1));
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '12px',
        border: '1.5px solid var(--line)',
        backgroundColor: 'var(--bg-hover)',
        overflow: 'hidden',
      }}
    >
      <Box onClick={handleMinus} sx={btnSx}>
        −
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          px: '8px',
          borderLeft: '1px solid var(--line)',
          borderRight: '1px solid var(--line)',
          minWidth: 72,
          justifyContent: 'center',
        }}
      >
        <input
          type="number"
          value={localVal}
          min={min}
          max={max}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => {
            const n = parseInt(localVal, 10);
            if (!isNaN(n)) {
              onChange(clamp(n));
            } else {
              setLocalVal(String(value));
            }
          }}
          style={{
            width: 50,
            textAlign: 'center',
            border: 'none',
            background: 'transparent',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--ink)',
            outline: 'none',
            fontVariantNumeric: 'tabular-nums',
            MozAppearance: 'textfield',
            WebkitAppearance: 'none',
          } as CSSProperties}
        />
        {suffix && (
          <Typography sx={{ fontSize: '12px', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
            {suffix}
          </Typography>
        )}
      </Box>

      <Box onClick={handlePlus} sx={btnSx}>
        +
      </Box>
    </Box>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const ConfiguracionTab = () => {
  const congId = useAtomValue(congIDState);
  const settings = useAtomValue(territorySettingsState);

  const [draft, setDraft] = useState<TerritorySettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setDraft(settings), [settings]);

  // Limpiar el timer al desmontar para evitar setState en componente desmontado
  useEffect(() => {
    const timerRef = savedTimerRef;
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  );

  const set = <K extends keyof TerritorySettings>(key: K, value: TerritorySettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(congId, { ...draft, updatedAt: new Date().toISOString() });
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ pb: 2 }}>
      <Stack spacing={2.5}>
        {/* ── 1 · Asignaciones ──────────────────────────────────────────────── */}
        <SectionCard
          icon="📋"
          title="Ajustes de asignación"
          iconBg="rgba(var(--accent-main-base), 0.1)"
        >
          <FieldRow
            label="Formato de fecha"
            description="Cómo se muestran las fechas en el S-13 y las asignaciones"
          >
            <PillGroup
              value={draft.dateFormat}
              onChange={(v) => set('dateFormat', v)}
              options={[
                { value: 'dd-MM-yyyy', label: 'dd-mm-aaaa' },
                { value: 'dd/MM/yyyy', label: 'dd/mm/aaaa' },
                { value: 'yyyy-MM-dd', label: 'aaaa-mm-dd' },
                { value: 'MM/dd/yyyy', label: 'mm/dd/aaaa' },
              ]}
              accent="var(--accent-main)"
            />
          </FieldRow>
          <ToggleRow
            label="Campañas en estadísticas"
            description="Las asignaciones de campaña se contabilizan en las estadísticas generales"
            checked={draft.statsIncludeCampaigns}
            onChange={(v) => set('statsIncludeCampaigns', v)}
          />
          <ToggleRow
            label="Asignado = trabajado"
            description="Los territorios asignados se consideran automáticamente como trabajados"
            checked={draft.assignedCountsAsWorked}
            onChange={(v) => set('assignedCountsAsWorked', v)}
            divider="none"
          />
        </SectionCard>

        {/* ── 2 · Dashboard ─────────────────────────────────────────────────── */}
        <SectionCard
          icon="📊"
          title="Dashboard y estadísticas"
          iconBg="rgba(var(--green-main-base), 0.1)"
        >
          <FieldRow
            label="Días para territorio atrasado"
            description="Pasados estos días sin trabajar, aparece como atrasado en el dashboard"
          >
            <NumberStepper
              value={draft.daysUntilOverdue}
              onChange={(v) => set('daysUntilOverdue', v)}
              min={30}
              max={730}
              suffix="días"
            />
          </FieldRow>

          <FieldRow
            label="Días hasta el vencimiento"
            description="El territorio puede reasignarse cuando lleve este tiempo asignado"
          >
            <NumberStepper
              value={draft.daysUntilExpiration}
              onChange={(v) => set('daysUntilExpiration', v)}
              min={30}
              max={730}
              suffix="días"
            />
          </FieldRow>

          <FieldRow
            label="Mensaje de territorio atrasado"
            description="Texto que se envía al hermano al notificarle que su territorio está atrasado"
          >
            <TextField
              value={draft.overdueMessage}
              onChange={(e) => set('overdueMessage', e.target.value)}
              multiline
              minRows={2}
              fullWidth
              placeholder="Ej: Hola hermano, tu territorio lleva un tiempo asignado…"
            />
          </FieldRow>

          <FieldRow label="Rango de estadísticas">
            <PillGroup
              value={draft.statsRange}
              onChange={(v) => set('statsRange', v as TerritorySettings['statsRange'])}
              options={[
                { value: 'service_year', label: 'Año servicio' },
                { value: 'one_year', label: '12 meses' },
                { value: 'all', label: 'Todo' },
              ]}
              accent="var(--green-main)"
            />
          </FieldRow>

          <FieldRow label="Agrupación de estadísticas" last>
            <PillGroup
              value={draft.statsGrouping}
              onChange={(v) => set('statsGrouping', v as TerritorySettings['statsGrouping'])}
              options={[
                { value: 'zone', label: 'Por zona' },
                { value: 'none', label: 'Sin agrupar' },
              ]}
              accent="var(--green-main)"
            />
          </FieldRow>
        </SectionCard>

        {/* ── 3 · Vista del territorio ──────────────────────────────────────── */}
        <SectionCard
          icon="🗺"
          title="Vista del territorio"
          subtitle="Secciones expandidas por defecto al abrir un territorio"
          iconBg="rgba(var(--orange-main-base), 0.1)"
        >
          <ToggleRow
            label="Información del territorio"
            checked={draft.expandInfo}
            onChange={(v) => set('expandInfo', v)}
          />
          <ToggleRow
            label="Mapa del territorio"
            checked={draft.expandMap}
            onChange={(v) => set('expandMap', v)}
          />
          <ToggleRow
            label="Imagen del territorio"
            checked={draft.expandImage}
            onChange={(v) => set('expandImage', v)}
          />
          <ToggleRow
            label="Ubicaciones del territorio"
            checked={draft.expandLocations}
            onChange={(v) => set('expandLocations', v)}
            divider="none"
          />
        </SectionCard>

        {/* ── 4 · Publicador ────────────────────────────────────────────────── */}
        <SectionCard
          icon="👤"
          title="Configuración de publicador"
          iconBg="rgba(90, 200, 250, 0.15)"
        >
          <ToggleRow
            label="Publicadores pueden devolver territorios"
            description="Los hermanos podrán marcar sus territorios como terminados desde la app"
            checked={draft.publishersCanReturn}
            onChange={(v) => set('publishersCanReturn', v)}
          />
          <ToggleRow
            label="Ver territorios del grupo"
            description="Los publicadores pueden ver los territorios asignados a hermanos de su grupo"
            checked={draft.publishersCanSeeGroup}
            onChange={(v) => set('publishersCanSeeGroup', v)}
          />
          <ToggleRow
            label="Publicadores pueden añadir ubicaciones"
            description="Los hermanos podrán marcar direcciones 'No visitar' desde el mapa"
            checked={draft.publishersCanAddLocations}
            onChange={(v) => set('publishersCanAddLocations', v)}
            divider="none"
          />
        </SectionCard>

        {/* ── 5 · Ubicaciones ───────────────────────────────────────────────── */}
        <SectionCard
          icon="📍"
          title="Configuración de ubicaciones"
          iconBg="rgba(var(--red-main-base), 0.1)"
        >
          <ToggleRow
            label="Ubicaciones requieren aprobación"
            description="Las direcciones añadidas por publicadores deben ser aprobadas antes de aparecer"
            checked={draft.locationsRequireApproval}
            onChange={(v) => set('locationsRequireApproval', v)}
            divider="none"
          />
        </SectionCard>

        {/* ── Barra de guardar ──────────────────────────────────────────────── */}
        <Box
          sx={{
            position: 'sticky',
            bottom: 16,
            zIndex: 10,
            borderRadius: '16px',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            px: { mobile: 2, tablet600: 2.5 },
            py: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            {hasChanges && !saved && (
              <>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: 'var(--orange-main)',
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: '13px', color: 'var(--ink-2)' }}>
                  Cambios sin guardar
                </Typography>
              </>
            )}
            {saved && (
              <Typography sx={{ fontSize: '13px', color: 'var(--green-main)', fontWeight: 600 }}>
                ✓ Guardado
              </Typography>
            )}
            {!hasChanges && !saved && (
              <Typography sx={{ fontSize: '13px', color: 'var(--ink-2)' }}>
                Todo al día
              </Typography>
            )}
          </Stack>

          <Button
            variant="main"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            disableAutoStretch
            sx={{ borderRadius: '999px', px: 3, flexShrink: 0 }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ConfiguracionTab;
