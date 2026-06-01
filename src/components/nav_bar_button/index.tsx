import useBreakpoints from '@hooks/useBreakpoints';
import { NavBarButtonProps } from './index.types';
import Button from '@components/button';
import { Box } from '@mui/material';

/**
 * NavBarButton component
 *
 * Renders a navigation bar button that adapts its appearance
 * based on screen size and props.
 *
 * - On desktop screens (≥ 688px), or when `textImportant` is true,
 *   it renders a full-sized button with text via the Button component.
 * - On smaller screens, it renders a premium pill with icon + label.
 */
const NavBarButton = (props: NavBarButtonProps) => {
  const { tablet688Up } = useBreakpoints();

  const main = props.main || false;
  const textImportant = props.textImportant || false;
  const disabled = props.disabled || false;

  // ── Desktop / textImportant path ─────────────────────────────────
  if (tablet688Up || textImportant) {
    return (
      <Button
        variant={main ? 'main' : 'secondary'}
        color={props.color}
        ariaLabel={props.text}
        onClick={props.onClick}
        startIcon={props.icon}
        disabled={disabled}
      >
        <Box
          component="span"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {props.text}
        </Box>
      </Button>
    );
  }

  // ── Mobile pill path ─────────────────────────────────────────────
  if (disabled) return null;

  const iconColor = main
    ? 'var(--always-white)'
    : props.color
      ? `var(--${props.color}-main)`
      : 'var(--accent-main)';

  return (
    <Box
      role="button"
      aria-label={props.text}
      className={main ? 'nav-action-pill-main' : 'nav-action-pill'}
      onClick={props.onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        px: '12px',
        height: '36px',
        borderRadius: 'var(--radius-l)',
        cursor: 'pointer',
        flexShrink: 0,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), opacity 0.12s ease',
        '&:active': {
          transform: 'scale(0.93)',
          opacity: 0.85,
        },
        '& svg': {
          width: '18px',
          height: '18px',
          flexShrink: 0,
        },
        '& svg, & svg g, & svg g path': {
          fill: iconColor,
        },
      }}
    >
      {props.icon}
      <Box
        component="span"
        className="body-small-semibold"
        sx={{
          color: iconColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '120px',
          lineHeight: 1,
        }}
      >
        {props.text}
      </Box>
    </Box>
  );
};

export default NavBarButton;
