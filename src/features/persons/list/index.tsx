import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useList from './useList';
import PersonsListAll from './all_persons';
import PersonsRecent from './recent_persons';
import PersonsEmpty from './persons_empty';
import Tabs from '@components/tabs';
import CountBadge from '@components/count_badge';
import Typography from '@components/typography';

const PersonsList = () => {
  const { t } = useAppTranslation();

  const { persons, activeTab, handleTabChange, personsByView } = useList();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '16px',
      }}
    >
      {/* El número, al lado del título y no dentro de la frase.
          Era "Personas: 100" —el contador metido en el propio rótulo—, y así
          no se puede mirar de un vistazo ni distinguir de lo que lo nombra.
          Es la misma chapa que ya llevaban las pestañas. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Typography className="h2">{t('tr_persons', 'Personas')}</Typography>
        <CountBadge value={persons.length} />
      </Box>

      {personsByView.length === 0 && <PersonsEmpty />}

      {personsByView.length > 0 && (
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          tabs={[
            {
              label: t('tr_personsAll'),
              Component: <PersonsListAll />,
            },
            {
              label: t('tr_recentlyViewed'),
              Component: <PersonsRecent />,
            },
          ]}
        />
      )}
    </Box>
  );
};

export default PersonsList;
