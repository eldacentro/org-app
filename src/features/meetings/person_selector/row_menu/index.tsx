import { ReactNode, useState } from 'react';
import { Menu, MenuItem, Stack } from '@mui/material';
import { IconMore } from '@components/icons';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';

export type AccionDeFila = {
  clave: string;
  icono: ReactNode;
  texto: string;
  onClick: () => void;
  disabled?: boolean;
};

/**
 * Las acciones de una asignación, detrás de un botón de tres puntos.
 *
 * POR QUÉ EXISTE. En una parte de estudiante llegó a haber cuatro controles
 * pegados al campo —historial, hoja S-89, «hojita entregada» y «por cambiar»—
 * y con diez partes por semana eso es una pared de iconos encima del programa.
 * Ninguno dice lo que hace sin pasar el dedo por encima, y todos compiten con
 * lo único que de verdad se lee de un vistazo, que es el nombre.
 *
 * QUÉ SE QUEDA FUERA. La casilla de «hojita entregada» no entra aquí, y no es
 * un olvido: es un ESTADO que se repasa de un vistazo por toda la semana y se
 * marca quince veces seguidas una tarde de reparto. Enterrarla costaría más de
 * lo que limpia. Lo que entra son las acciones que se usan de vez en cuando.
 *
 * Es el mismo menú que la pestaña de Territorios, con el mismo dibujo: un menú
 * es la continuación del control que lo abre, no un diálogo — de ahí
 * `--shape-sm` y no el radio grande de las tarjetas.
 */
const RowMenu = ({
  acciones,
  atencion,
}: {
  acciones: AccionDeFila[];
  /**
   * Que el botón se pinte en naranja.
   *
   * Lo usa la fila cuando algo de dentro pide atención —hoy, que la asignación
   * está marcada por cambiar—, para que el menú no esconda que hay algo. Sin
   * esto, meter cosas en un menú es también meterlas debajo de la alfombra.
   */
  atencion?: boolean;
}) => {
  const [ancla, setAncla] = useState<null | HTMLElement>(null);

  if (acciones.length === 0) return null;

  return (
    <>
      <IconButton
        edge={false}
        sx={{ padding: 0 }}
        aria-label="Acciones de la asignación"
        onClick={(event) => setAncla(event.currentTarget)}
      >
        <IconMore
          width={20}
          height={20}
          color={atencion ? 'var(--orange-dark)' : 'var(--accent-main)'}
        />
      </IconButton>

      <Menu
        anchorEl={ancla}
        open={Boolean(ancla)}
        onClose={() => setAncla(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            style: {
              borderRadius: 'var(--shape-sm)',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--card)',
              minWidth: 248,
            },
          },
        }}
      >
        {acciones.map((accion) => (
          <MenuItem
            key={accion.clave}
            disabled={accion.disabled}
            onClick={() => {
              setAncla(null);
              accion.onClick();
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {accion.icono}
              <Typography className="body-regular">{accion.texto}</Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default RowMenu;
