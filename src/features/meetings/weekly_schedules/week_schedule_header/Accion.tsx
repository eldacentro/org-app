import { ReactElement } from 'react';
import ActionPill from '@components/action_pill';

/**
 * La acción de una pestaña, en la cabecera de la semana.
 *
 * Es la MISMA píldora que el enlace de JW Library y que los botones de la
 * pestaña de la visita — todo eso vive en `ActionPill`. Aquí solo queda que en
 * la cabecera la variante es `solid`: es la acción principal de la pantalla y
 * hay una sola.
 */
const Accion = ({
  icono,
  texto,
  onClick,
}: {
  icono?: ReactElement;
  texto: string;
  onClick: () => void;
}) => (
  <ActionPill label={texto} icon={icono} onClick={onClick} variant="solid" />
);

export default Accion;
