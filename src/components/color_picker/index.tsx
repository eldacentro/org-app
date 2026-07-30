import { useState } from 'react';
import { Box, Popover } from '@mui/material';
import { IconCheck } from '@components/icons';
import { PALETA_COLORES } from './palette';
import { ColorPickerProps } from './index.types';

/**
 * Elegir un color de la paleta de la app.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Los cuatro sitios que dejaban elegir un color —las zonas y las etiquetas de
 * Territorios— usaban `<input type="color">` a pelo. Eran los únicos cuatro de
 * toda la app, y ese control no lo dibuja la app: lo dibuja el sistema. En
 * Chrome sale un recuadro gris con borde; en Safari, una pastilla; en Windows,
 * otra cosa. Y al pulsarlo se abre el selector de color del sistema operativo,
 * con la rueda, los canales RGB y el cuentagotas: mil millones de colores para
 * elegir uno de diez.
 *
 * Porque diez son los que hay. `PALETA_COLORES` ya existía y ya se usaba —para
 * ir proponiendo el siguiente color al crear— pero no se le enseñaba a nadie.
 * Quien abría el selector del sistema se llevaba un color cualquiera, y dos
 * zonas acababan con dos verdes que no se distinguen en el mapa.
 *
 * Así que aquí la paleta ES el selector: diez pastillas, la elegida con su
 * marca. Y son botones de verdad, así que se llega tabulando — al de antes no,
 * porque un `<input type="color">` se alcanza pero lo que abre es una ventana
 * del sistema que ya no controla la app.
 */
const ColorPicker = ({
  value,
  onChange,
  ariaLabel,
  colors = PALETA_COLORES,
  size = 32,
  disabled,
}: ColorPickerProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const handleElegir = (color: string) => {
    onChange(color);
    setAnchor(null);
  };

  return (
    <>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          appearance: 'none',
          padding: 0,
          width: `${size}px`,
          height: `${size}px`,
          flexShrink: 0,
          borderRadius: 'var(--shape-full)',
          backgroundColor: value,
          // El borde no es adorno: sin él, un color claro sobre la tarjeta
          // blanca no tiene canto y no se ve dónde acaba la pastilla.
          border: '1px solid var(--line)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'transform var(--motion-fast) var(--ease-standard)',
          '&:hover': { transform: disabled ? 'none' : 'scale(1.08)' },
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '2px',
          },
        }}
      />

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              marginTop: '8px',
              padding: '16px',
              borderRadius: 'var(--shape-lg)',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-md)',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, auto)',
            gap: '12px',
          }}
        >
          {colors.map((color) => {
            const elegido = color.toLowerCase() === (value ?? '').toLowerCase();

            return (
              <Box
                key={color}
                component="button"
                type="button"
                aria-label={color}
                aria-pressed={elegido}
                onClick={() => handleElegir(color)}
                sx={{
                  appearance: 'none',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--shape-full)',
                  backgroundColor: color,
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition:
                    'transform var(--motion-fast) var(--ease-standard)',
                  '&:hover': { transform: 'scale(1.12)' },
                  '&:focus-visible': {
                    outline: '2px solid var(--accent-main)',
                    outlineOffset: '2px',
                  },
                }}
              >
                {/* La marca va DENTRO de la pastilla y en blanco: los diez
                    colores de la paleta son oscuros de sobra para que se lea
                    encima, y así no hace falta un anillo por fuera que en una
                    rejilla apretada se confunde con la pastilla vecina. */}
                {elegido && (
                  <IconCheck color="var(--white)" width={18} height={18} />
                )}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
};

export default ColorPicker;
