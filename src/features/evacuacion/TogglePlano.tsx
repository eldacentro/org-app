import { Box } from '@mui/material';

export type ModoPlano = '2D' | '3D';

type Props = {
  modo: ModoPlano;
  onChange: (modo: ModoPlano) => void;
};

const opciones: ModoPlano[] = ['2D', '3D'];

const TogglePlano = ({ modo, onChange }: Props) => {
  return (
    <Box
      role="tablist"
      aria-label="Modo de visualización del plano"
      sx={{
        display: 'inline-flex',
        padding: '3px',
        borderRadius: '999px',
        backgroundColor: 'var(--accent-150, #F1F5F9)',
        border: '1px solid var(--accent-200, #E2E8F0)',
        gap: '2px',
      }}
    >
      {opciones.map((opcion) => {
        const activo = opcion === modo;
        return (
          <Box
            key={opcion}
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(opcion)}
            sx={{
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 18px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.15s ease',
              color: activo ? 'var(--always-white, #fff)' : 'var(--grey-400, #475569)',
              backgroundColor: activo ? 'var(--accent-main, #2A7D6F)' : 'transparent',
              boxShadow: activo ? '0 1px 3px rgba(0,0,0,0.18)' : 'none',
            }}
          >
            Vista {opcion}
          </Box>
        );
      })}
    </Box>
  );
};

export default TogglePlano;
