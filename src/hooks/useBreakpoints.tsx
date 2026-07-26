import { useMediaQuery, useTheme } from '@mui/material';

const useHookBreakpoints = () => {
  const theme = useTheme();

  const mobile400Down = useMediaQuery(theme.breakpoints.down('mobile400'), {
    noSsr: true,
  });

  const tablet500Down = useMediaQuery(theme.breakpoints.down('tablet500'), {
    noSsr: true,
  });

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

  const tablet688Up = useMediaQuery(theme.breakpoints.up('tablet688'), {
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
    tablet688Up,
    desktopLargeUp,
    touchDevice,
  };
};

export default useHookBreakpoints;
