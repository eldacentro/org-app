import { ReactNode, SyntheticEvent, useEffect, useState } from 'react';
import { Tabs as MUITabs, Tab, Box } from '@mui/material';
import { TabsPanelProps, CustomTabProps } from './index.types';
import useBreakpoints from '@hooks/useBreakpoints';

/**
 * A custom tab panel component.
 *
 * @param props The props for the TabsPanel component.
 */
export const CustomTabPanel = (props: TabsPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column',
      }}
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ padding: '24px 0', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      )}
    </Box>
  );
};

/**
 * Generate accessibility props for a tab.
 *
 * @param index The index of the tab.
 * @returns Accessibility props for the tab.
 */
const a11yProps = (index: number) => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
};

/**
 * A custom tabs component.
 *
 * @param tabs An array of tabs with label and corresponding component.
 */
const Tabs = ({
  tabs,
  value,
  onChange,
  actionComponent,
  showTabs = true,
}: CustomTabProps) => {
  const [valueOfActivePanel, setValueOfActivePanel] = useState(value || 0);
  const { tabletDown } = useBreakpoints();

  /**
   * Handle tab change event.
   *
   * @param event The event object.
   * @param newValue The new value of the active tab.
   */
  const handleChange = (event: SyntheticEvent, newValue: number) => {
    event.preventDefault();
    setValueOfActivePanel(newValue);

    onChange?.(newValue);
  };

  useEffect(() => {
    setValueOfActivePanel(value || 0);
  }, [value]);

  return (
    <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          flexShrink: 0,
          justifyContent: 'space-between',
          alignItems: tabletDown ? 'stretch' : 'center',
          flexDirection: tabletDown ? 'column' : 'row',
          rowGap: tabletDown ? '16px' : '0px',
        }}
      >
        {showTabs && (
          <MUITabs
            value={valueOfActivePanel}
            onChange={handleChange}
            slotProps={{
              // Sin subrayado: lo elegido se marca con el tinte, el mismo que
              // la tira de semanas y que `scrollable_tabs`.
              indicator: { sx: { backgroundColor: 'transparent', height: 0 } },
            }}
            sx={{
              minHeight: 'unset',
              // Ver el comentario del mismo ajuste en `scrollable_tabs`.
              padding: '4px 0',
              '& .MuiTabs-flexContainer': { gap: '4px' },
              '& button': { minHeight: '40px', textTransform: 'none' },
              '& button.Mui-selected': {
                color: 'var(--state-selected-ink)',
                background: 'var(--state-selected)',
                borderRadius: 'var(--shape-full)',
                fontWeight: 600,
                '&:hover': { background: 'var(--state-selected-strong)' },
              },
              '& button:not(.Mui-selected)': {
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
            }}
          >
            {tabs.map(
              ({ label, className }, index): ReactNode => (
                <Tab
                  label={label}
                  key={index}
                  className={`body-regular ${className ?? ''}`}
                  {...a11yProps(index)}
                />
              )
            )}
          </MUITabs>
        )}
        {actionComponent}
      </Box>

      {tabs.map(
        (tab, i: number): ReactNode => (
          <CustomTabPanel value={valueOfActivePanel} index={i} key={i}>
            {tab.Component}
          </CustomTabPanel>
        )
      )}
    </Box>
  );
};

export default Tabs;
