import {
  Fragment,
  ReactNode,
  SyntheticEvent,
  useEffect,
  useState,
} from 'react';
import { Box, Tab, Tabs, tabsClasses } from '@mui/material';
import { useBreakpoints } from '@hooks/index';
import { CustomTabPanel } from '@components/tabs';
import { CustomTabProps } from '@components/tabs/index.types';
import { IconChevronLeft, IconChevronRight } from '@components/icons';

/**
 * Component that renders scrollable tabs.
 *
 */
function ScrollableTabs({
  tabs,
  value,
  indicatorMode,
  onChange,
  className,
  variant = 'scrollable',
  minHeight = '48px',
  tabsCountOnScreen = 0,
  hideScrollButtons,
  sx,
}: CustomTabProps) {
  const { tabletDown } = useBreakpoints();

  const [valueOfActivePanel, setValueOfActivePanel] = useState(value ?? false);

  /**
   * Handles tab change event.
   *
   * @param event The event object.
   * @param newValue The new value of the active tab.
   */
  const handleChange = (event: SyntheticEvent, newValue: number) => {
    if (!indicatorMode) {
      event.preventDefault();
    }

    setValueOfActivePanel(newValue);
    onChange?.(newValue);
  };

  useEffect(() => {
    setValueOfActivePanel(value ?? false);
  }, [value]);

  useEffect(() => {
    if (tabs.length === 0 && import.meta.env.DEV) {
      console.warn(
        '[pestañas] se ha montado un ScrollableTabs sin pestañas; la pantalla debería enseñar su propio estado vacío'
      );
    }
  }, [tabs.length]);

  return (
    <Box sx={{ width: '100%', minHeight: tabs.length > 0 && '45px' }}>
      {/* Sin pestañas no se pinta nada.
          Aquí ponía «TAB_DATA_EMPTY» en rojo: un recordatorio de programador
          que se le estaba enseñando al usuario, en quince pantallas, cada vez
          que una lista llegaba vacía. Quien decide qué decir cuando no hay
          nada es la pantalla, que sabe de qué va — no un componente de
          pestañas.
          El aviso sigue existiendo, pero donde tiene que estar: en la consola,
          y solo en desarrollo. */}

      {tabs.length > 0 && (
        <Box>
          <Tabs
            value={valueOfActivePanel}
            onChange={handleChange}
            variant={variant}
            scrollButtons={tabletDown || hideScrollButtons ? false : 'auto'}
            className={className}
            slotProps={{
              indicator: {
                hidden: !indicatorMode,
                // Sin subrayado nunca: lo elegido se marca con el tinte, aquí
                // y en toda la app. `indicatorMode` sigue existiendo porque
                // también decide si el clic hace `preventDefault`, pero ya no
                // pinta nada.
                sx: { backgroundColor: 'transparent', height: 0 },
              },
            }}
            slots={{
              // Los de la app, no los de Material: son los mismos chevrones
              // que usa el resto de la interfaz, con su mismo trazo.
              EndScrollButtonIcon: () => (
                <IconChevronRight
                  color="var(--accent-main)"
                  width={18}
                  height={18}
                />
              ),
              StartScrollButtonIcon: () => (
                <IconChevronLeft
                  color="var(--accent-main)"
                  width={18}
                  height={18}
                />
              ),
            }}
            aria-label="scrollable-auto-tabs"
            sx={{
              [`& .${tabsClasses.scrollButtons}`]: {
                color: 'var(--accent-main)',
                '&.Mui-disabled': { opacity: 0.3 },
              },
              // UN solo dibujo de "elegido" en toda la app: tinte de marca y
              // texto en azul oscuro, el mismo que la tira de semanas.
              //
              // Hubo un momento en que esto tenía dos —subrayado para las
              // pestañas de sección, tinte para elegir un valor— con el
              // argumento de que son trabajos distintos. Pero al aplicarlo a
              // esta app no había forma de clasificar: "Entre semana / Fin de
              // semana" ¿es una sección o es elegir qué reunión configuras?
              // Una regla que no se puede aplicar sin dudar no es una regla.
              '& button.Mui-selected': {
                color: 'var(--state-selected-ink)',
                background: 'var(--state-selected)',
                borderRadius: 'var(--shape-full)',
                fontWeight: 600,
                '&:hover': { background: 'var(--state-selected-strong)' },
              },
              '& .MuiTab-root:not(.Mui-selected)': {
                color: 'var(--ink-3)',
                '&:hover': {
                  background: 'var(--state-hover)',
                  borderRadius: 'var(--shape-full)',
                },
              },
              // Programatically changing color of ripple (wave) when click happens:
              '& span.MuiTouchRipple-rippleVisible': {
                color: 'var(--accent-main)',
              },
              '& span.MuiTouchRipple-root': {
                borderRadius: 'var(--shape-full)',
              },
              '& .MuiSvgIcon-root g path': {
                fill: 'var(--accent-400)',
              },
              '& .Mui-selected > .MuiSvgIcon-root g path': {
                fill: 'var(--accent-dark)',
              },
              '& .MuiTabScrollButton-root': {
                width: 'auto !important',
                height: '36px',
              },
              alignItems: 'center',
              minHeight,
              // Aire alrededor de la píldora. Con el subrayado no hacía falta
              // —se dibujaba en el canto de abajo y no ocupaba alto— pero la
              // píldora sí ocupa, y sin esto toca el borde del contenedor y se
              // ve cortada por arriba.
              padding: '4px 0',
              [`& .${tabsClasses.flexContainer}`]: {
                gap: '4px',
              },
              ...sx,
            }}
          >
            {tabs.map(
              ({ label, icon, className }, index): ReactNode => (
                <Tab
                  label={label}
                  key={index}
                  className={className}
                  icon={icon}
                  iconPosition="end"
                  sx={{
                    minHeight,
                    height: minHeight,
                    width:
                      tabsCountOnScreen !== 0
                        ? `calc(100% / ${tabsCountOnScreen})`
                        : 'auto',
                    minWidth: '20px',
                    // La elegida cambia de PESO, no de tamaño.
                    //
                    // Iba de 16 a 18 al elegirla, y eso en una tira que se
                    // desplaza no es un detalle: la pestaña crece, empuja a
                    // las de al lado y la tira entera se recoloca justo
                    // después de tocarla — en un móvil, debajo del dedo. Y
                    // ninguna otra pestaña de la app cambia de tamaño: se
                    // marcan con el tinte y el peso.
                    // Se veía sobre todo en Plan de evacuación, pero esto lo
                    // usan quince pantallas.
                    fontSize: 16,
                    textTransform: 'none',
                    ':not(&.Mui-selected)': { fontWeight: 400 },
                    '&.Mui-selected': {
                      fontWeight: 600,
                    },
                  }}
                />
              )
            )}
          </Tabs>
        </Box>
      )}

      {tabs.map(
        (tab, i: number): ReactNode => (
          <Fragment key={i}>
            {tab.Component && (
              <CustomTabPanel value={valueOfActivePanel} index={i}>
                {tab.Component}
              </CustomTabPanel>
            )}
          </Fragment>
        )
      )}
    </Box>
  );
}

export default ScrollableTabs;
