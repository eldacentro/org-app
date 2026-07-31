import { Box, Collapse } from '@mui/material';
import {
  IconCongregation,
  IconExpand,
  IconLanguageGroup,
} from '@components/icons';
import { SiblingAssignmentProps } from './index.types';
import useSiblingItem from './useSiblingItem';
import Typography from '@components/typography';

const SiblingAssignment = ({
  children,
  type,
  label,
}: SiblingAssignmentProps) => {
  const { expanded, handleToggle } = useSiblingItem();

  return (
    <>
      <Box
        component="button"
        type="button"
        aria-expanded={expanded}
        sx={{
          appearance: 'none',
          font: 'inherit',
          color: 'inherit',
          border: 'none',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--grey-350)',
          borderRadius: 'var(--shape-xs)',
          padding: '4px 8px',
          cursor: 'pointer',
          '&:focus-visible': {
            outline: '2px solid var(--always-white)',
            outlineOffset: '-3px',
          },
        }}
        onClick={handleToggle}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flex: 1,
          }}
        >
          {type === 'main' ? (
            <IconCongregation color="var(--always-white)" />
          ) : (
            <IconLanguageGroup color="var(--always-white)" />
          )}
          {/* 700, como todas las bandas blancas sobre color de la app
              (`MeetingSection` y las de día de Exhibidores y Salidas). Esta se
              quedaba con el peso propio de la clase `h2-caps`, que es 450, así
              que era la única del mismo dibujo que salía fina. */}
          <Typography
            className="h2-caps"
            color="var(--always-white)"
            align="center"
            sx={{ fontWeight: 700, letterSpacing: '0.5px' }}
          >
            {label}
          </Typography>
        </Box>
        <IconExpand
          color="var(--always-white)"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-medium) var(--ease-emphasized)',
          }}
        />
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </>
  );
};

export default SiblingAssignment;
