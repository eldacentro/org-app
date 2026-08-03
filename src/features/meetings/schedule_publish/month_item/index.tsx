import { Box, Stack } from '@mui/material';
import { IconPublishedSchedule } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { MonthItemProps } from './index.types';
import useMonthItem from './useMonthItem';
import Checkbox from '@components/checkbox';
import WeekItem from '../week_item';

/**
 * Un mes, con sus semanas dentro.
 *
 * El mes ya no es la decisión: es el atajo. Su casilla marca o desmarca las
 * suyas de una vez —el caso normal sigue siendo un clic— y se queda a medias
 * cuando solo hay algunas, que es justo la señal de que el mes está a mitad de
 * publicar. La marca de «publicado» solo sale cuando lo están todas.
 */
const MonthItem = ({ data, onChange }: MonthItemProps) => {
  const { t } = useAppTranslation();

  const { monthName } = useMonthItem(data.month);

  // Solo hay algo que explicar cuando el mes está partido: unas semanas del
  // histórico y otras no. Es lo que pasa en el mes del corte.
  const mesPartido =
    data.weeks.some((week) => week.isHistoric) &&
    data.weeks.some((week) => !week.isHistoric);

  return (
    <Stack spacing="4px">
      <Stack
        justifyContent="space-between"
        alignItems="center"
        flexDirection="row"
      >
        <Checkbox
          label={monthName}
          checked={data.checked}
          indeterminate={data.indeterminate}
          disabled={data.isHistoric}
          onChange={(e) => onChange(e.target.checked, data.month)}
        />

        {data.published && (
          <Box
            title={t('tr_published')}
            sx={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconPublishedSchedule color="var(--accent-main)" />
          </Box>
        )}
      </Stack>

      <Stack spacing="2px" sx={{ paddingLeft: '16px' }}>
        {data.weeks.map((week) => (
          <WeekItem
            key={week.weekOf}
            data={week}
            onChange={onChange}
            showHistoricNote={mesPartido}
          />
        ))}
      </Stack>
    </Stack>
  );
};

export default MonthItem;
