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
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Typography from '@components/typography';

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

  return (
    <Box sx={{ width: '100%', minHeight: tabs.length > 0 && '45px' }}>
      {tabs.length === 0 && (
        <Typography className="body-small-semibold" color="var(--red-main)">
          TAB_DATA_EMPTY
        </Typography>
      )}

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
                sx: {
                  backgroundColor: indicatorMode
                    ? 'var(--accent-main)'
                    : 'transparent',
                  borderRadius: indicatorMode
                    ? 'var(--shape-xs) var(--shape-xs) 0 0'
                    : undefined,
                  height: '3px',
                },
              },
            }}
            slots={{
              EndScrollButtonIcon: ArrowForwardIosIcon,
              StartScrollButtonIcon: ArrowBackIosIcon,
            }}
            aria-label="scrollable-auto-tabs"
            sx={{
              [`& .${tabsClasses.scrollButtons}`]: {
                color: 'var(--accent-main)',
                '&.Mui-disabled': { opacity: 0.3 },
              },
              // DOS lenguajes, y cada uno para un trabajo distinto:
              //
              // - Con subrayado (`indicatorMode`): son pestañas de SECCIÓN, las
              //   que cambian el contenido de la página. El subrayado marca
              //   "estás en esta parte" sin pintar una pastilla.
              // - Sin subrayado: se está ELIGIENDO UN VALOR (una semana, un
              //   año, un modo). Ahí va el tinte, el mismo que el resto de la
              //   app usa para lo elegido.
              //
              // Hasta ahora el tinte se pintaba SIEMPRE, también con subrayado,
              // así que en esos seis sitios salían los dos lenguajes a la vez:
              // pastilla y raya debajo.
              ...(indicatorMode
                ? {
                    '& button.Mui-selected': {
                      color: 'var(--state-selected-ink)',
                      fontWeight: 600,
                    },
                    '& .MuiTab-root:not(.Mui-selected)': {
                      color: 'var(--ink-3)',
                    },
                  }
                : {
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
                  }),
              // Programatically changing color of ripple (wave) when click happens:
              '& span.MuiTouchRipple-rippleVisible': {
                color: 'var(--accent-main)',
              },
              '& span.MuiTouchRipple-root': {
                borderRadius: 'var(--radius-max)',
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
                    fontSize: 16,
                    textTransform: 'none',
                    ':not(&.Mui-selected)': { fontWeight: 400 },
                    '&.Mui-Selected': {
                      fontWeight: 600,
                      fontSize: 18,
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
