import { Popper, PopperProps } from '@mui/material';

/**
 * La lista desplegable de un selector (hermanos, estudiantes, oradores…).
 *
 * Pide 320px de ancho mínimo porque la lista lleva dos columnas —el nombre y la
 * última asignación— y con menos se parte en dos líneas. Ese mínimo estaba
 * escrito a mano en cuatro sitios, y era un mínimo a secas: en un móvil de 375,
 * con el campo empezando a media pantalla, la lista se salía por la derecha y
 * quedaba cortada por el canto.
 *
 * Aquí el mínimo se topa con el ancho real de la ventana, y además se le dice a
 * Popper que corrija también en horizontal: por defecto solo evita que se salga
 * por arriba y por abajo (`altAxis` viene apagado), que es justo el eje que no
 * daba problemas.
 */
const OptionsPopper = ({ style, ...props }: PopperProps) => (
  <Popper
    placement="bottom-start"
    {...props}
    modifiers={[
      { name: 'preventOverflow', options: { altAxis: true, padding: 8 } },
      ...(props.modifiers ?? []),
    ]}
    style={{
      minWidth: 'min(320px, calc(100vw - 16px))',
      maxWidth: 'calc(100vw - 16px)',
      ...style,
    }}
  />
);

export default OptionsPopper;
