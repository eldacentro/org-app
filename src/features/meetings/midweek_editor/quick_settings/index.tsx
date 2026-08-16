import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { QuickSettingsMidweekMeetingProps } from './index.types';
import AuxiliaryClassroom from '@features/congregation/settings/meeting_settings/midweek/auxiliary_classroom';
import AvisarAyudantes from './avisar_ayudantes';
import DayTime from '@features/congregation/settings/meeting_settings/midweek/day_time';
import Divider from '@components/divider';
import LinkedParts from '@features/congregation/settings/meeting_settings/midweek/linked_parts';
import MidweekExactDate from '@features/congregation/settings/meeting_forms/midweek_exact_date';
import QuickSettings from '@features/quick_settings';
import SpecialParts from '@features/congregation/settings/meeting_settings/midweek/special_parts';
import Typography from '@components/typography';

const QuickSettingsMidweekMeeting = ({
  onClose,
  open,
}: QuickSettingsMidweekMeetingProps) => {
  const { t } = useAppTranslation();

  return (
    <QuickSettings title={t('tr_midweekMeeting')} open={open} onClose={onClose}>
      <Stack
        spacing="16px"
        width="100%"
        divider={<Divider color="var(--line)" />}
      >
        <Stack spacing="16px">
          <DayTime />

          <MidweekExactDate />
        </Stack>

        <Stack spacing="16px">
          <AuxiliaryClassroom />
        </Stack>

        {/* Reparto de hojitas: quién recibe mensaje además del estudiante. */}
        <Stack spacing="16px">
          <AvisarAyudantes />
        </Stack>

        {/* El mismo componente que en Ajustes de congregación, como el resto de
            este engranaje: un ajuste, un sitio donde vive, dos puertas para
            llegar. Aquí importa más, porque es donde se ve el hueco vacío. */}
        <Stack spacing="16px">
          <SpecialParts />
        </Stack>

        <Stack spacing="16px">
          <Typography className="body-small-semibold" color="var(--grey-400)">
            {t('tr_linkedParts')}
          </Typography>
          <LinkedParts />
        </Stack>
      </Stack>
    </QuickSettings>
  );
};

export default QuickSettingsMidweekMeeting;
