import { Box, Tooltip } from '@mui/material';
import { IconFemale, IconMale } from '@components/icons';
import { PersonComponentProps } from './index.types';
import usePersonComponent from './usePersonComponent';
import Typography from '@components/typography';

const PersonComponent = (props: PersonComponentProps) => {
  const { personData } = usePersonComponent(props);
  const accentColor = props.color || 'var(--brand)';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        width: '100%',
        minHeight: '44px',
        padding: '6px 0px',
      }}
    >
      {props.label && (
        <Typography
          className="body-small-semibold"
          color="var(--grey-500)"
          sx={{ 
            flexShrink: 0, 
            minWidth: '95px', 
            fontSize: '13.5px',
            fontWeight: 600,
            letterSpacing: '0.2px'
          }}
        >
          {props.label}
        </Typography>
      )}
      
      {personData?.name ? (
        <Tooltip title={personData.name} arrow placement="top">
          <Box
            sx={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              borderRadius: 'var(--radius-xl)',
              border: personData.active 
                ? '1.5px solid var(--brand)' 
                : '1px solid var(--line)',
              borderLeft: `4px solid ${accentColor}`,
              backgroundColor: personData.active 
                ? 'var(--brand-tint)' 
                : 'var(--card)',
              padding: '8px 16px',
              flex: 1,
              overflow: 'hidden',
              boxShadow: personData.active ? 'var(--hover-shadow)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              '&:hover': {
                transform: 'translateY(-1.5px)',
                borderColor: personData.active ? 'var(--brand)' : accentColor,
                boxShadow: 'var(--small-card-shadow)',
              },
            }}
          >
            {personData.female ? (
              <IconFemale width={16} height={16} color={accentColor} />
            ) : (
              <IconMale width={16} height={16} color={accentColor} />
            )}
            <Typography 
              className="body-small-semibold" 
              sx={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                fontWeight: 700,
                fontSize: '13.5px',
                color: personData.active ? 'var(--brand-deep)' : 'var(--ink)',
                letterSpacing: '0.1px',
                lineHeight: 1.25,
                wordBreak: 'break-word',
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
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed var(--line)',
            borderLeft: `4px dashed var(--grey-300)`,
            backgroundColor: 'rgba(var(--grey-100-base), 0.03)',
            padding: '8px 16px',
            flex: 1,
            minHeight: '38px',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'var(--grey-350)',
              backgroundColor: 'rgba(var(--grey-100-base), 0.06)',
            }
          }}
        >
          <Typography 
            className="body-small-medium" 
            color="var(--grey-350)" 
            sx={{ 
              fontSize: '13px', 
              fontWeight: 500,
              letterSpacing: '0.5px' 
            }}
          >
            —
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PersonComponent;
