import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue } from 'jotai';
import { getWeeksInMonth, isValid } from 'date-fns';
import { Box, ClickAwayListener } from '@mui/material';
import { ArrowDropDown, ArrowLeft, ArrowRight } from '@mui/icons-material';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers';
import { IconDate } from '@components/icons';
import { shortDateFormatState } from '@states/settings';
import { CustomDatePickerProps } from './index.types';
import {
  StyleDatePickerActionBar,
  StyleDatePickerDay,
  StyleDatePickerDesktopPaper,
  StyleDatePickerLayout,
  StyleDatePickerPopper,
  StyleDatePickerToolbar,
} from './index.styles';
import ActionBar from './slots/actionBar';
import ButtonField from './view/button';
import InputTextField from './view/input';
import Toolbar from './slots/toolbar';
import Layout from './slots/layout';

const DatePicker = ({
  label,
  value,
  onChange,
  readOnly,
  maxDate,
  minDate,
  disablePast,
  shortDateFormat,
  view,
  hideNav,
  error,
  helperText,
}: CustomDatePickerProps) => {
  const poperRef = useRef<HTMLDivElement>(null);

  const shortDateFormatDefault = useAtomValue(shortDateFormatState);

  const shortDateFormatLocale = shortDateFormat || shortDateFormatDefault;

  const [height, setHeight] = useState(240); // Initial height
  const [open, setOpen] = useState(false);
  const [valueTmp, setValueTmp] = useState<Date | null>(value ?? null);

  const slotFieldProps =
    view === 'button' ? { field: ButtonField } : { textField: InputTextField };

  const changeHeight = (event) => {
    if (getWeeksInMonth(new Date(event), { weekStartsOn: 0 }) === 6) {
      setHeight(290);
    } else {
      setHeight(240);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<Element>) => {
    if (e.key !== 'Enter') return;

    const isValidDate = valueTmp instanceof Date && isValid(valueTmp);

    if (!isValidDate) return;

    onChange?.(valueTmp);
    setOpen(false);
  };

  const handleValueChange = (value: Date | null) => {
    setValueTmp(value);

    const isValidDate = value instanceof Date && isValid(value);

    onChange?.(value);

    if (view === 'input' && !open && isValidDate) {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (valueTmp) {
      if (getWeeksInMonth(valueTmp, { weekStartsOn: 0 }) === 6) {
        setHeight(290);
      } else {
        setHeight(240);
      }
    } else {
      setHeight(240);
    }
  }, [valueTmp]);

  useEffect(() => {
    setValueTmp(value ?? null);
  }, [value]);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ width: '100%' }}>
        {/* Fondo oscuro detrás de la hoja, solo en móvil — sin esto, el
            calendario se sentía como una tarjeta flotando sobre el diálogo
            que ya estaba abierto, en vez de una hoja propia con su propia
            jerarquía visual. Va portado directo al body porque la hoja
            (el Popper) también se renderiza ahí — si quedara dentro del
            árbol normal, un position:fixed adentro de un diálogo con
            transform quedaría atrapado dentro de ese diálogo en vez de
            cubrir toda la pantalla. */}
        {open &&
          createPortal(
            <Box
              onClick={() => setOpen(false)}
              sx={{
                display: 'none',
                '@media (max-width:430px)': {
                  display: 'block',
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.45)',
                  zIndex: 1399,
                },
              }}
            />,
            document.body
          )}
        <MuiDatePicker
          // El DatePicker responsive de MUI elige entre la variante de
          // escritorio (un popper) y la de móvil (un modal por defecto) según
          // `@media (pointer: fine)`. En un teléfono real el puntero es
          // "grueso" (el dedo), así que sin esto MUI mostraba su modal por
          // defecto — que nunca estilizamos — en vez de nuestra hoja
          // rediseñada. Forzamos siempre la variante de escritorio para que
          // nuestro rediseño (la hoja anclada abajo, el toolbar, los estados
          // de día) aplique en cualquier dispositivo, no solo con ratón.
          desktopModeMediaQuery="@media (min-width: 0px)"
          readOnly={readOnly}
          minDate={minDate}
          maxDate={maxDate}
          disablePast={disablePast}
          yearsPerRow={3}
          showDaysOutsideCurrentMonth={true}
          label={label}
          value={valueTmp}
          format={shortDateFormatLocale}
          open={!readOnly && open}
          onChange={handleValueChange}
          onMonthChange={changeHeight}
          onOpen={() => {
            if (readOnly) return;
            setOpen(true);
          }}
          slots={{
            ...slotFieldProps,
            layout: Layout,
            toolbar: () => <Toolbar selected={valueTmp} />,
            actionBar: () => (
              <ActionBar
                onClose={() => setOpen(false)}
                onClear={() => {
                  setOpen(false);
                  setValueTmp(null);
                  onChange?.(null);
                }}
              />
            ),
            openPickerIcon: IconDate,
            leftArrowIcon: hideNav ? () => <></> : ArrowLeft,
            rightArrowIcon: hideNav ? () => <></> : ArrowRight,
            switchViewIcon: hideNav ? () => <></> : ArrowDropDown,
          }}
          slotProps={{
            layout: StyleDatePickerLayout,
            day: StyleDatePickerDay,
            desktopPaper: StyleDatePickerDesktopPaper,
            toolbar: StyleDatePickerToolbar,
            actionBar: StyleDatePickerActionBar,
            popper: {
              onKeyDown: handleKeyDown,
              anchorEl: poperRef.current,
              sx: {
                ...StyleDatePickerPopper,
                '.MuiDateCalendar-viewTransitionContainer': {
                  overflow: 'hidden',
                },
                '.MuiDayCalendar-slideTransition': {
                  minHeight: `${height}px`,
                  '@media (max-width:322px)': {
                    minHeight: `${height - 38}px`,
                  },
                },
              },
            },
            field: {
              className: 'btn-date-picker',
              ref: poperRef,
            },
            textField: {
              value: valueTmp,
              onClick: () => {
                if (readOnly) return;
                setOpen(true);
              },
              onKeyDown: handleKeyDown,
              ref: poperRef,
              error,
              helperText,
            },
          }}
        />
      </Box>
    </ClickAwayListener>
  );
};

export default DatePicker;
