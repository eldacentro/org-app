import { Box, Tooltip } from '@mui/material';
import { IconFemale, IconMale } from '@components/icons';
import { PersonComponentProps } from './index.types';
import usePersonComponent from './usePersonComponent';
import Typography from '@components/typography';

const PersonComponent = (props: PersonComponentProps) => {
  const { personData } = usePersonComponent(props);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        width: '100%',
        minHeight: '36px',
        padding: '2px 0px',
      }}
    >
      {props.label && (
        <Typography
          className="body-small-regular"
          color="var(--grey-350)"
          sx={{ flexShrink: 0, minWidth: '80px' }}
        >
          {props.label}
        </Typography>
      )}
      
      {personData?.name ? (
        <Tooltip title={personData.name} arrow placement="top">
          <Box
            sx={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              borderRadius: 'var(--radius-s)',
              border: personData.active 
                ? '1px solid var(--accent-main)' 
                : '1px solid transparent',
              backgroundColor: personData.active 
                ? 'var(--accent-150)' 
                : 'var(--grey-50)',
              padding: '4px 8px',
              flex: 1,
              maxWidth: '220px',
              overflow: 'hidden',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {personData.female ? (
              <IconFemale width={16} height={16} color="var(--grey-400)" />
            ) : (
              <IconMale width={16} height={16} color="var(--grey-400)" />
            )}
            <Typography 
              className="body-small-regular" 
              sx={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                fontWeight: personData.active ? 600 : 500,
                color: personData.active ? 'var(--accent-dark)' : 'var(--black)',
              }}
            >
              {personData.name}
            </Typography>
          </Box>
        </Tooltip>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-s)',
            border: '1px dashed var(--grey-300)',
            backgroundColor: 'transparent',
            padding: '4px 8px',
            flex: 1,
            maxWidth: '220px',
          }}
        >
          <Typography className="body-small-regular" color="var(--grey-350)">
            —
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PersonComponent;
