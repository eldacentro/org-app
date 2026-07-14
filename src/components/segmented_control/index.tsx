import { Box } from '@mui/material';

type Props = {
  tabs: string[];
  active: number;
  onChange: (idx: number) => void;
};

/** Pill segmented control estilo iOS, reutilizable. */
const SegmentedControl = ({ tabs, active, onChange }: Props) => (
  <Box
    sx={{
      display: 'flex',
      backgroundColor: 'rgba(120,120,128,0.12)',
      borderRadius: '10px',
      p: '3px',
    }}
  >
    {tabs.map((t, i) => (
      <Box
        key={t}
        onClick={() => onChange(i)}
        sx={{
          flex: 1,
          textAlign: 'center',
          py: '6px',
          borderRadius: 'var(--radius-l)',
          backgroundColor: active === i ? '#fff' : 'transparent',
          boxShadow:
            active === i
              ? '0 1px 3px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.05)'
              : 'none',
          color: active === i ? '#000' : 'rgba(60,60,67,0.6)',
          fontWeight: active === i ? 600 : 400,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          letterSpacing: '-0.1px',
        }}
      >
        {t}
      </Box>
    ))}
  </Box>
);

export default SegmentedControl;
