import { Button } from '@mui/material';

/**
 * Component representing a custom filter chip.
 *
 * @param {{
 *   label: string;
 *   onClick?: VoidFunction;
 *   selected?: boolean;
 * }} props - Props for the CustomFilterChip component.
 * @param {string} props.label - The label text for the chip.
 * @param {VoidFunction} [props.onClick] - Function to handle click event.
 * @param {boolean} [props.selected=false] - Whether the chip is selected or not.
 * @returns {JSX.Element} CustomFilterChip component.
 */
const CustomFilterChip = ({
  label,
  onClick,
  selected = false,
}: {
  label: string;
  onClick?: VoidFunction;
  selected?: boolean;
}) => {
  return (
    <Button
      disableRipple
      onClick={onClick}
      className={selected ? 'body-small-semibold' : 'body-small-regular'}
      sx={{
        fontFeatureSettings: '"cv05"',
        textTransform: 'none',
        padding: '6px 14px',
        color: selected ? 'var(--brand-deep)' : 'var(--ink-2)',
        borderRadius: 'var(--r-sm)',
        border: selected
          ? '1.5px solid var(--brand-deep)'
          : '1px solid var(--line)',
        backgroundColor: selected ? 'var(--brand-tint)' : 'var(--card)',
        minHeight: '34px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxShadow: selected ? 'none' : 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
        '&:hover': {
          color: selected ? 'var(--brand-deep)' : 'var(--ink)',
          backgroundColor: selected ? 'var(--brand-tint)' : 'rgba(0, 0, 0, 0.04)',
          borderColor: selected ? 'var(--brand-deep)' : 'var(--ink-3)',
          '@media (hover: none)': {
            backgroundColor: selected ? 'var(--brand-tint)' : 'var(--card)',
            color: selected ? 'var(--brand-deep)' : 'var(--ink-2)',
            borderColor: selected ? 'var(--brand-deep)' : 'var(--line)',
          },
        },
      }}
    >
      {label}
    </Button>
  );
};

export default CustomFilterChip;
