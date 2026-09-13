import { useMediaQuery, useTheme } from '@mui/material';
import { CARRIL_LATERAL_QUERY } from '@constants/pantalla';

const useHookBreakpoints = () => {
  const theme = useTheme();

  const mobile400Down = useMediaQuery(theme.breakpoints.down('mobile400'), {
    noSsr: true,
  });

  const tablet500Down = useMediaQuery(theme.breakpoints.down('tablet500'), {
    noSsr: true,
  });

  /**
   * De 600 para arriba la pantalla es de ANCHO REGULAR: las acciones de la
   * página van en la barra superior y no en la píldora flotante, y la barra
   * superior deja de ser la de tres columnas del móvil.
   *
   * Hasta el 2026-09-13 ese corte estaba en 688 (`tablet688Up`), un número
   * que no salía de ningún sitio. Se bajó por el iPhone Duo: abierto en
   * vertical mide 626, y Apple lo trata como ancho regular en las DOS
   * orientaciones. Con el corte en 688 se giraba el teléfono y la app
   * cambiaba de idioma —píldora abajo en vertical, acciones arriba en
   * horizontal—, que es justo lo que Apple pide no hacer: no decidir por la
   * orientación. 600 es además el corte compacto→mediano de Material, así que
   * no es un número inventado para un aparato.
   */
  const tablet600Up = useMediaQuery(theme.breakpoints.up('tablet600'), {
    noSsr: true,
  });

  const tablet600Down = useMediaQuery(theme.breakpoints.down('tablet600'), {
    noSsr: true,
  });

  const tabletUp = useMediaQuery(theme.breakpoints.up('tablet'), {
    noSsr: true,
  });

  const tabletDown = useMediaQuery(theme.breakpoints.down('tablet'), {
    noSsr: true,
  });

  const laptopDown = useMediaQuery(theme.breakpoints.down('laptop'), {
    noSsr: true,
  });

  const laptopUp = useMediaQuery(theme.breakpoints.up('laptop'), {
    noSsr: true,
  });

  const desktopUp = useMediaQuery(theme.breakpoints.up('desktop'), {
    noSsr: true,
  });

  const desktopLargeUp = useMediaQuery(theme.breakpoints.up('desktopLarge'), {
    noSsr: true,
  });

  /**
   * ¿Es un dispositivo que se toca con el dedo?
   *
   * Hay decisiones de diseño que NO dependen de cuánto mide la pantalla sino
   * de cómo se maneja: el mapa de un territorio se quiere a pantalla completa
   * en cualquier tablet, y en un diálogo en un ordenador. Resolverlo por ancho
   * falla siempre por algún lado — se probó con 480px y se quedó corto, se
   * subió a 768px y también: un iPad Pro de 11" mide 834pt en vertical y 1194
   * en horizontal, así que seguía tratándose como un ordenador.
   *
   * Se usa `any-pointer` y no `pointer` a propósito: `pointer` describe el
   * puntero PRINCIPAL, y un iPad con teclado y trackpad puede decir que el
   * suyo es fino. `any-pointer: coarse` responde a «¿hay algún dedo de por
   * medio?», que es lo que interesa aquí. Un ordenador de sobremesa con ratón
   * sigue diciendo que no.
   */
  const touchDevice = useMediaQuery('(any-pointer: coarse)', { noSsr: true });

  /**
   * ¿Teléfono corto y ancho, sostenido en vertical? Es la pantalla exterior
   * de un iPhone Duo plegado. Ahí la píldora de acciones se vuelve un carril a
   * la derecha, como hace el sistema. La pregunta está escrita una sola vez,
   * en `constants/pantalla`, para el CSS y para esto.
   */
  const carrilLateral = useMediaQuery(CARRIL_LATERAL_QUERY, { noSsr: true });

  return {
    mobile400Down,
    tablet500Down,
    tablet600Up,
    tablet600Down,
    tabletUp,
    tabletDown,
    laptopDown,
    laptopUp,
    desktopUp,
    desktopLargeUp,
    touchDevice,
    carrilLateral,
  };
};

export default useHookBreakpoints;
