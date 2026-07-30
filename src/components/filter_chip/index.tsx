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
        // El MISMO dibujo de "elegido" que las pestañas, la tira de semanas y
        // el segmented control: tinte de marca y texto en azul oscuro.
        //
        // Este chip tenía el suyo propio —borde de 1,5px, sombra cuando NO
        // estaba elegido, y un hover de negro al 4%— o sea un séptimo dialecto
        // para la misma idea. Y la sombra en el no elegido lo hacía parecer
        // más "botón" que el elegido, que es justo al revés.
        fontFeatureSettings: '"cv05"',
        textTransform: 'none',
        padding: '6px 14px',
        minHeight: '34px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        border: 'none',
        boxShadow: 'none',
        borderRadius: 'var(--shape-full)',
        color: selected ? 'var(--state-selected-ink)' : 'var(--ink-3)',
        backgroundColor: selected ? 'var(--state-selected)' : 'transparent',
        transition:
          'background-color var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard)',
        '&:hover': {
          backgroundColor: selected
            ? 'var(--state-selected-strong)'
            : 'var(--state-hover)',
        },
      }}
    >
      {label}
    </Button>
  );
};

export default CustomFilterChip;
