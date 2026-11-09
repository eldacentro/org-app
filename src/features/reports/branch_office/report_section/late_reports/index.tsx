import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { monthNamesState } from '@states/app';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';
import { capitalizarPrimera, personGetDisplayName } from '@utils/common';
import { LateReportsListProps, S1LateReport } from '../index.types';
import ActionPill from '@components/action_pill';
import Divider from '@components/divider';
import Typography from '@components/typography';

// Lo que era la persona en el mes del INFORME, que es el grupo en el que
// cuenta (ver `collectS1Reports`).
const CATEGORY_LABEL = {
  publishers: 'tr_publisher',
  APs: 'tr_AP',
  FRs: 'tr_FR',
} as const;

/**
 * Los informes atrasados que se suman al S-1, con nombre y mes.
 *
 * Antes se sumaban sin decir nada. El secretario veía 38 publicadores donde
 * TsWin daba 34 y no había manera de saber de dónde salían los otros cuatro
 * (eran el historial de dos hermanos recién llegados). Aquí se ven, y el que
 * sea de cuando la persona estaba en otra congregación se aparta con un toque.
 *
 * Debajo, los atrasados que todavía nadie ha verificado: no se suman hasta
 * verificarlos, y antes no aparecían en ningún sitio.
 */
const LateReports = ({
  reports,
  unverified,
  submitted,
  onRecordOnly,
  onVerify,
}: LateReportsListProps) => {
  const { t } = useAppTranslation();

  const monthNames = useAtomValue(monthNamesState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  if (reports.length === 0 && unverified.length === 0) return null;

  // Abre la línea, así que va con mayúscula: «Agosto 2026 · Publicador».
  const monthLabel = (month: string) => {
    const [year, value] = month.split('/');

    return capitalizarPrimera(
      t('tr_monthYear', { month: monthNames[+value - 1] ?? value, year })
    );
  };

  const title = submitted
    ? reports.length === 1
      ? t('tr_lateReportsSentOne')
      : t('tr_lateReportsSentMany', { count: reports.length })
    : reports.length === 1
      ? t('tr_lateReportsIncludedOne')
      : t('tr_lateReportsIncludedMany', { count: reports.length });

  const row = (
    { report, person, category }: S1LateReport,
    action?: { label: string; onClick: () => void }
  ) => (
    <Box
      key={report.report_id}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '8px 0',
      }}
    >
      <Stack spacing="2px" sx={{ minWidth: 0 }}>
        <Typography className="body-regular">
          {personGetDisplayName(person, displayNameEnabled, fullnameOption)}
        </Typography>
        <Typography className="body-small-regular" color="var(--grey-400)">
          {`${monthLabel(report.report_data.report_date)} · ${t(
            CATEGORY_LABEL[category]
          )}`}
        </Typography>
      </Stack>

      {/* Una por fila: `outline`, para que la lista no sea un muro de color
          (DESIGN_SYSTEM §6.2). */}
      {action && (
        <ActionPill
          variant="outline"
          label={action.label}
          onClick={action.onClick}
          sx={{ flexShrink: 0 }}
        />
      )}
    </Box>
  );

  return (
    <Stack spacing="24px">
      {reports.length > 0 && (
        <Stack spacing="12px">
          <Stack spacing="4px">
            <Typography className="h4">{title}</Typography>
            <Typography className="body-small-regular" color="var(--grey-400)">
              {submitted
                ? t('tr_lateReportsSentDesc')
                : t('tr_lateReportsIncludedDesc')}
            </Typography>
          </Stack>

          <Stack divider={<Divider color="var(--line)" />}>
            {reports.map((entry) =>
              row(
                entry,
                submitted
                  ? undefined
                  : {
                      label: t('tr_recordOnly'),
                      onClick: () => onRecordOnly(entry.report),
                    }
              )
            )}
          </Stack>
        </Stack>
      )}

      {unverified.length > 0 && (
        <Stack spacing="12px">
          <Stack spacing="4px">
            <Typography className="h4">
              {unverified.length === 1
                ? t('tr_lateReportsUnverifiedOne')
                : t('tr_lateReportsUnverifiedMany', {
                    count: unverified.length,
                  })}
            </Typography>
            <Typography className="body-small-regular" color="var(--grey-400)">
              {t('tr_lateReportsUnverifiedDesc')}
            </Typography>
          </Stack>

          <Stack divider={<Divider color="var(--line)" />}>
            {unverified.map((entry) =>
              row(entry, {
                label: t('tr_verify'),
                onClick: () => onVerify(entry.report),
              })
            )}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};

export default LateReports;
