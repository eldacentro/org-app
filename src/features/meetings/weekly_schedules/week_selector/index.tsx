import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { WeekSelectorProps } from './index.types';
import useWeekSelector from './useWeekSelector';
import Typography from '@components/typography';

/**
 * La tira de semanas de Programas semanales.
 *
 * No usa `ScrollableTabs` (las pestañas de MUI) a propósito, y merece
 * explicación porque parece un paso atrás:
 *
 * MUI desplaza la tira por su cuenta para dejar la pestaña elegida "a la
 * vista", pero la deja PEGADA AL BORDE derecho. Al entrar, la semana actual
 * quedaba la última visible y no se veía ninguna de las que vienen, que es
 * justo lo que se consulta. Corregirlo después no vale: se comprobó que el
 * centrado se aplica y que MUI lo deshace más tarde (187px → 55px), así que
 * cualquier arreglo dependía de ganarle una carrera con una espera.
 *
 * Con una tira propia no hay carrera: se coloca una vez al abrir y no vuelve a
 * moverse sola. Son unos chips y un `overflow-x`; lo único que aportaban aquí
 * las pestañas de MUI era un comportamiento que había que combatir.
 *
 * Tampoco lleva flechas: las de MUI DESPLAZAN la tira en vez de cambiar de
 * semana, que no es lo que nadie espera de una flecha ahí.
 */
const WeekSelector = (props: WeekSelectorProps) => {
  const { weeksTab, handleWeekChange, currentTab } = useWeekSelector(props);

  const tiraRef = useRef<HTMLDivElement>(null);
  const yaCentrado = useRef(false);

  const index = typeof currentTab === 'number' ? currentTab : -1;

  // Centrar la semana abierta AL ENTRAR, y solo entonces: centrando también al
  // cambiar de semana, la tira se recolocaría con cada toque y parecería que
  // la aplicación se mueve por su cuenta.
  useEffect(() => {
    if (yaCentrado.current || index < 0) return;

    const tira = tiraRef.current;
    if (!tira) return;

    const chip = tira.children[index] as HTMLElement | undefined;
    if (!chip) return;

    const centrado =
      chip.offsetLeft - (tira.clientWidth - chip.clientWidth) / 2;

    // Sin pasarse de los extremos: en las primeras semanas no hay nada que
    // centrar a la izquierda y forzarlo dejaría un hueco en blanco.
    tira.scrollLeft = Math.max(
      0,
      Math.min(centrado, tira.scrollWidth - tira.clientWidth)
    );

    yaCentrado.current = true;
  }, [index]);

  return (
    <Box
      ref={tiraRef}
      className="schedules-view-week-selector"
      sx={{
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        // Sin márgenes negativos: el hueco con la cabecera lo pone el
        // contenedor (16px). Los llevaba para compensar el alto de las
        // pestañas de MUI, y con chips propios sobran y dejaban la tira
        // pegada al titular de la semana.
      }}
    >
      {weeksTab.map((week, i) => {
        const elegida = i === index;

        return (
          <Box
            key={week.label}
            className={week.className}
            role="tab"
            aria-selected={elegida}
            onClick={() => handleWeekChange(i)}
            sx={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 'var(--radius-max)',
              cursor: 'pointer',
              userSelect: 'none',
              // El mismo tratamiento que la pestaña elegida en el resto de la
              // aplicación: fondo tintado y texto oscuro, nunca color pleno,
              // que se reserva para los botones de acción.
              backgroundColor: elegida ? 'var(--accent-150)' : 'transparent',
              transition: 'background-color 0.15s ease',
              '&:hover': {
                backgroundColor: elegida
                  ? 'var(--accent-200)'
                  : 'color-mix(in srgb, var(--accent-150) 38%, transparent)',
              },
            }}
          >
            <Typography
              className={elegida ? 'body-small-semibold' : 'body-small-regular'}
              color={elegida ? 'var(--accent-dark)' : 'var(--grey-350)'}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {week.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default WeekSelector;
