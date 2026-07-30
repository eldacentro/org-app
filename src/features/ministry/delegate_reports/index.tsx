import { Box, Collapse, Grid } from '@mui/material';
import { IconExpand } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useDelegateReports from './useDelegateReports';
import TabLabelWithBadge from '@components/tab_label_with_badge';
import ReportItem from './report_item';

const DelegateReports = () => {
  const { t } = useAppTranslation();

  const { publishers, open, handleToggleCollapse } = useDelegateReports();

  if (publishers.length === 0) return <></>;

  return (
    <>
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        onClick={handleToggleCollapse}
        sx={{
          appearance: 'none',
          font: 'inherit',
          color: 'inherit',
          background: 'none',
          border: 'none',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          width: 'fit-content',
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '2px',
            borderRadius: 'var(--shape-xs)',
          },
        }}
      >
        <TabLabelWithBadge
          count={publishers.length}
          label={t('tr_otherPublishers')}
          className="h3"
          badgeColor="var(--accent-dark)"
          color="var(--black)"
        />

        <IconExpand
          color="var(--black)"
          sx={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}
        />
      </Box>

      <Collapse
        in={open}
        timeout="auto"
        unmountOnExit
        sx={{ marginTop: '16px !important' }}
      >
        <Grid container spacing={2}>
          {publishers.map((person) => (
            <ReportItem key={person.person_uid} person={person} />
          ))}
        </Grid>
      </Collapse>
    </>
  );
};

export default DelegateReports;
