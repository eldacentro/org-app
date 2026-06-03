import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import usePublisherTabs from './usePublisherTabs';
import ScrollableTabs from '@components/scrollable_tabs';
import Typography from '@components/typography';

const PublisherTabs = () => {
  const { t } = useAppTranslation();

  const { tabs } = usePublisherTabs();

  return (
    <CardContainer sx={{ flex: 1 }}>
      <Stack spacing="24px">
        <Stack spacing="8px">
          <Typography className="h2">{t('tr_publishersRecords')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_reportPageInfo')}
          </Typography>
        </Stack>

        <ScrollableTabs
          indicatorMode
          tabs={tabs}
          value={0}
          sx={{
            '& button.Mui-selected': {
              color: 'var(--accent-main)',
              background: 'unset',
              borderRadius: 'unset',
            },
            '& span.MuiTouchRipple-root': { borderRadius: 'var(--radius-l)' },
          }}
        />
      </Stack>
    </CardContainer>
  );
};

export default PublisherTabs;
