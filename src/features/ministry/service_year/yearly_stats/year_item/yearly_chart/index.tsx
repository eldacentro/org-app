import { useId } from 'react';
import { Box } from '@mui/material';
import Typography from '@components/typography';
import { useAppTranslation } from '@hooks/index';
import useYearlyChart, { YearlyChartMonth } from './useYearlyChart';

const CHART_W = 360;
const CHART_H = 150;
const BASELINE = CHART_H - 18;
const TOP_PAD = 22;
const BAR_AREA = BASELINE - TOP_PAD;

type BarState = 'ok' | 'below' | 'current' | 'muted';

const barState = (item: YearlyChartMonth): BarState => {
  if (item.isCurrent) return 'current';
  if (item.isAhead) return 'muted';
  if (item.goal === undefined) return 'muted';

  return item.hours >= item.goal ? 'ok' : 'below';
};

/**
 * Gráfica de horas por mes: una barra por mes con el número de horas encima.
 * Todo el color sale de la escala del acento de marca (tokens --accent-N y
 * --brand), que es justo la que cambia con el esquema elegido en "Mi cuenta" (azul,
 * verde, morado, naranja, rojo...) — nunca un verde/ámbar fijo que
 * desentonaría con el tema activo. La distinción "cumplida vs. por debajo"
 * se transmite con intensidad del mismo tono (degradado saturado vs. tinte
 * plano), no cambiando de color.
 */
const YearlyChart = ({ year }: { year: string }) => {
  const { t } = useAppTranslation();
  const { months } = useYearlyChart(year);
  const gradientId = useId();

  if (months.length === 0) return null;

  const maxHours = Math.max(1, ...months.map((m) => Math.max(m.hours, m.goal || 0)));
  const colWidth = CHART_W / months.length;
  const barWidth = Math.min(26, colWidth * 0.5);
  const barRadius = 5;

  const fillFor = (state: BarState) => {
    if (state === 'muted') return 'var(--grey-300)';
    if (state === 'below') return 'var(--accent-300)';

    return `url(#${gradientId}-${state})`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Typography className="body-small-semibold" color="var(--grey-400)">
        {t('tr_yearlyChartTitle', 'Horas por mes')}
      </Typography>

      <Box sx={{ width: '100%' }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          height={CHART_H}
          role="img"
          aria-label={t('tr_yearlyChartTitle', 'Horas por mes')}
        >
          <defs>
            <linearGradient id={`${gradientId}-ok`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-main)" />
              <stop offset="100%" stopColor="var(--brand-deep)" />
            </linearGradient>
            <linearGradient id={`${gradientId}-current`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-200)" />
              <stop offset="100%" stopColor="var(--accent-350)" />
            </linearGradient>
          </defs>

          <line
            x1={0}
            y1={BASELINE}
            x2={CHART_W}
            y2={BASELINE}
            stroke="var(--line)"
            strokeWidth={1}
          />

          {months.map((item, idx) => {
            const x = idx * colWidth + colWidth / 2;
            const barH = item.hours > 0 ? Math.max(3, (item.hours / maxHours) * BAR_AREA) : 0;
            const barY = BASELINE - barH;
            const state = barState(item);

            return (
              <g key={item.month}>
                {item.hours > 0 && (
                  <text
                    x={x}
                    y={barY - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="var(--ink)"
                  >
                    {item.hours}
                  </text>
                )}

                {barH > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={barY}
                    width={barWidth}
                    height={barH}
                    rx={barRadius}
                    fill={fillFor(state)}
                    stroke={state === 'current' ? 'var(--brand)' : 'none'}
                    strokeWidth={state === 'current' ? 1.5 : 0}
                    strokeDasharray={state === 'current' ? '3 2' : undefined}
                  />
                )}

                <text
                  x={x}
                  y={CHART_H - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--grey-400)"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
    </Box>
  );
};

export default YearlyChart;
