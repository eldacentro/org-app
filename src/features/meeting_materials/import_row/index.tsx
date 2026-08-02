import { Box } from '@mui/material';
import { IconImportFile } from '@components/icons';
import Typography from '@components/typography';
import IconLoading from '@components/icon_loading';
import { ImportRowProps } from './index.types';

/**
 * Una fila de «importar algo» en Materiales de reunión.
 *
 * Existía cuatro veces con el mismo `sx` copiado —dos en la página y dos más
 * al traer aquí los bosquejos y el cancionero—, y cuatro copias de un estilo
 * son cuatro sitios donde se desalinea. Aquí está una vez.
 *
 * Dos formas de disparar, según lo que haga falta: `onClick` para quien abre
 * el selector de archivo por su cuenta, y `children` para meter un
 * `<input type="file">` transparente encima (que es lo que alcanza el teclado
 * por sí solo, sin necesidad de que la caja sea un botón).
 */
const ImportRow = ({
  icon,
  titulo,
  descripcion,
  isBusy,
  onClick,
  children,
}: ImportRowProps) => {
  const estilo = {
    appearance: 'none',
    font: 'inherit',
    color: 'inherit',
    textAlign: 'left',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    border: '1px solid var(--accent-200)',
    borderRadius: 'var(--shape-sm)',
    backgroundColor: 'var(--accent-100)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color var(--motion-fast) var(--ease-standard)',
    '&:hover': { backgroundColor: 'var(--accent-200)' },
    '&:focus-visible': {
      outline: '2px solid var(--accent-main)',
      outlineOffset: '2px',
    },
  } as const;

  const contenido = (
    <>
      {isBusy ? (
        <IconLoading color="accent" />
      ) : (
        (icon ?? (
          <IconImportFile color="var(--accent-main)" width={22} height={22} />
        ))
      )}
      <Box>
        <Typography className="h4" color="var(--ink)">
          {titulo}
        </Typography>
        <Typography className="label-small-regular" color="var(--ink-2)">
          {descripcion}
        </Typography>
      </Box>
      {children}
    </>
  );

  if (onClick) {
    return (
      <Box
        component="button"
        type="button"
        sx={estilo}
        onClick={onClick}
        disabled={isBusy}
      >
        {contenido}
      </Box>
    );
  }

  return <Box sx={estilo}>{contenido}</Box>;
};

export default ImportRow;
