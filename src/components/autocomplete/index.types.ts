import { ReactElement, ReactNode } from 'react';
import {
  AutocompleteProps,
  AutocompleteRenderInputParams,
  PaperProps,
  TextFieldProps,
} from '@mui/material';

/**
 * Props type for the Autocomplete component.
 */
export type AutocompletePropsType<T> = Omit<
  AutocompleteProps<
    T,
    boolean | undefined,
    boolean | undefined,
    boolean | undefined
  >,
  'renderInput'
> & {
  /**
   * Icon displayed at the start of the Autocomplete component.
   */
  startIcon?: ReactElement;

  /**
   * Icon displayed at the end of the Autocomplete component.
   */
  endIcon?: ReactElement;

  /**
   * Label text for the Autocomplete component.
   */
  label?: string;

  /**
   * Deja que el valor seleccionado ocupe varias líneas en vez de cortarse.
   *
   * Un `<input>` no parte el texto por naturaleza: lo que no cabe se corta y
   * se pierde. Para un nombre o una fecha da igual, pero para un título largo
   * —los discursos públicos pasan de los 60 caracteres— dejaba al usuario sin
   * ver lo que había elegido. Es opcional a propósito: solo lo usa quien lo
   * necesita, para no cambiar la altura de todos los campos de la aplicación.
   */
  multiline?: boolean;

  /**
   * Function to render the input of the Autocomplete component.
   * @param {AutocompleteRenderInputParams} params - Parameters for rendering the input.
   * @returns {ReactNode} JSX.Element for the input.
   */
  renderInput?: (params: AutocompleteRenderInputParams) => ReactNode;

  optionsHeader?: ReactNode;

  styleIcon?: boolean;

  decorator?: boolean;

  variant?: TextFieldProps['variant'];
};

export type CustomPaperType = PaperProps & {
  optionsHeader: ReactNode;
};
