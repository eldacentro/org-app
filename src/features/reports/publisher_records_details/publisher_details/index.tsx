import { Box, Stack } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import usePublisherDetails from './usePublisherDetails';
import PersonDetails from '@features/persons/person_details';
import TextField from '@components/textfield';
import YearsCount from '../years_count';
import DatePicker from '@components/date_picker';
import Typography from '@components/typography';

const PublisherDetails = () => {
  const { t } = useAppTranslation();

  const { laptopUp } = useBreakpoints();

  const {
    person,
    month,
    birth_date_value,
    age,
    baptism_date_value,
    baptism_years,
    first_report,
    handleChangeFirstReport,
  } = usePublisherDetails();

  return (
    <CardContainer sx={{ flex: 1 }}>
      <Stack spacing="24px">
        <Stack spacing="8px">
          <Typography className="h2">{t('tr_publisherDetails')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_publisherDetailsDesc')}
          </Typography>
        </Stack>

        <PersonDetails className="h2" person={person!} month={month} />

        <Stack spacing="16px">
          <Box sx={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
            <TextField
              label={t('tr_dateOfBirth')}
              value={birth_date_value}
              slotProps={{ input: { readOnly: true } }}
            />
            <YearsCount>{t('tr_userAge', { userAge: age })}</YearsCount>
          </Box>

          {baptism_date_value.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
              <TextField
                label={t('tr_baptismDate')}
                value={baptism_date_value}
                slotProps={{ input: { readOnly: true } }}
              />
              <YearsCount>
                {t('tr_yearsNumber', { yearsCount: baptism_years })}
              </YearsCount>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
            <DatePicker
              label={t('tr_firstReport')}
              value={first_report}
              maxDate={new Date()}
              onChange={handleChangeFirstReport}
            />

            {laptopUp && <Box sx={{ width: '155px' }} />}
          </Box>
        </Stack>
      </Stack>
    </CardContainer>
  );
};

export default PublisherDetails;
