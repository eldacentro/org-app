import { ReactNode } from 'react';
import { Box } from '@mui/material';
import SearchBar from '@components/search_bar';

/**
 * Vive en `components/` y no dentro de Territorios porque lo usan dos
 * pantallas: las pestañas del panel de responsables y el catálogo de oradores.
 * Un componente que usan dos funcionalidades no puede vivir dentro de una de
 * ellas — la otra tendría que ir a buscarlo ahí dentro, y el día que Territorios
 * se reorganice se lo lleva por delante.
 */

/**
 * La barra de buscar y filtrar.
 *
 * Existe porque cada pestaña se había montado la suya: "Territorios" y
 * "Ubicaciones" con un buscador de píldora dentro de una tarjeta, y
 * "Asignaciones" e "Historial" con un campo de formulario con rótulo, suelto
 * sobre el fondo y con los filtros flotando debajo. Dos dibujos distintos para
 * el mismo trabajo, y se notaba al pasar de una pestaña a la de al lado.
 *
 * Gana el de "Territorios", y no por gusto: el buscador de la app es una
 * píldora —así se distingue de un vistazo de los campos de dato, que son
 * rectángulos de esquina suave (ver `search_bar.styled`)— y la tarjeta agrupa
 * lo que se usa para filtrar, separándolo de los resultados.
 */

type Props = {
  /** Texto actual del buscador. Sin `onBuscar`, no se dibuja buscador. */
  busqueda?: string;
  onBuscar?: (valor: string) => void;
  placeholder?: string;
  /** Acción a la derecha del buscador, si la pestaña tiene alguna. */
  accion?: ReactNode;
  /** Las filas de fichas de filtro (ver `RielChips`). */
  children?: ReactNode;
  /**
   * Pie de la barra: el contador de resultados y el "Quitar filtros". Va
   * dentro de la tarjeta a propósito — habla de los filtros de arriba, no de
   * la lista de abajo.
   */
  pie?: ReactNode;
};

/**
 * Una fila de fichas de filtro.
 *
 * En el móvil se desliza en una sola línea en vez de partirse: con cuatro
 * estados y seis etiquetas, envolviendo se comía media pantalla y dejaba los
 * resultados —que son a lo que se viene— fuera de la vista. Las fichas llegan
 * hasta el borde de la tarjeta (margen negativo + relleno) para que se vea que
 * la fila sigue. De tableta para arriba caben y envuelven como siempre.
 */
export const RielChips = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flexWrap: { mobile: 'nowrap', tablet600: 'wrap' },
      overflowX: { mobile: 'auto', tablet600: 'visible' },
      margin: { mobile: '0 -16px', tablet600: 0 },
      padding: { mobile: '0 16px', tablet600: 0 },
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    }}
  >
    {children}
  </Box>
);

const PanelToolbar = ({
  busqueda,
  onBuscar,
  placeholder,
  accion,
  children,
  pie,
}: Props) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px',
      borderRadius: 'var(--shape-lg)',
      border: '1px solid var(--line)',
      backgroundColor: 'var(--card)',
      boxShadow: 'var(--small-card-shadow)',
    }}
  >
    {onBuscar && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SearchBar
            placeholder={placeholder}
            value={busqueda}
            onSearch={onBuscar}
          />
        </Box>
        {accion}
      </Box>
    )}

    {children}

    {pie}
  </Box>
);

export default PanelToolbar;
