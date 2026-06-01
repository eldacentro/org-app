import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useOtherCongregations from './useOtherCongregations';
import CongregationAdd from './congregation_add';
import IncomingCongregation from './congregation_item';
import Typography from '@components/typography';

const OtherCongregations = () => {
  const { t } = useAppTranslation();

  const {
    circuitCongs,
    otherCongs,
    circuitSpeakersCount,
    otherSpeakersCount,
    isAdding,
    handleIsAddingClose,
    currentExpanded,
    handleSetExpanded,
  } = useOtherCongregations();

  return (
    <Box
      sx={{
        flexGrow: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {isAdding && (
        <CongregationAdd open={isAdding} onClose={handleIsAddingClose} />
      )}

      {/* Tu Circuito Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Typography className="h2">{`Tu circuito (${circuitSpeakersCount})`}</Typography>

        {circuitCongs.length === 0 && (
          <Typography
            sx={{
              color: 'var(--grey-400)',
              fontStyle: 'italic',
              paddingLeft: '8px',
            }}
          >
            No hay congregaciones en tu circuito.
          </Typography>
        )}

        {circuitCongs.length > 0 &&
          circuitCongs.map((congregation) => (
            <IncomingCongregation
              key={congregation.id}
              congregation={congregation}
              currentExpanded={currentExpanded}
              onChangeCurrentExpanded={handleSetExpanded}
            />
          ))}
      </Box>

      {/* Otras Congregaciones Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Typography className="h2">{`${t('tr_otherCongregations')} (${otherSpeakersCount})`}</Typography>

        {otherCongs.length === 0 && (
          <Typography
            sx={{
              color: 'var(--grey-400)',
              fontStyle: 'italic',
              paddingLeft: '8px',
            }}
          >
            No hay otras congregaciones fuera de tu circuito.
          </Typography>
        )}

        {otherCongs.length > 0 &&
          otherCongs.map((congregation) => (
            <IncomingCongregation
              key={congregation.id}
              congregation={congregation}
              currentExpanded={currentExpanded}
              onChangeCurrentExpanded={handleSetExpanded}
            />
          ))}
      </Box>
    </Box>
  );
};

export default OtherCongregations;
