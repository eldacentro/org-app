import { ReactElement } from 'react';
import { SxProps } from '@mui/material';

export type InfoTipProps = {
  /**
   * Indicates whether the information tip is big or not.
   */
  isBig: boolean;
  /**
   * The text content of the information tip.
   */
  text?: string;
  /**
   * The title of the information tip.
   */
  title?: string;
  /**
   * The icon element to display alongside the text.
   */
  icon?: ReactElement;
  /**
   * The color/severity of the information tip. 'white' and 'blue' are the
   * original neutral/decorative tones; 'info'/'success'/'warning'/'error' are
   * the semantic severities (added to replace raw MUI <Alert severity="...">
   * across the app with a single banner component). 'blue' is kept as an
   * alias of 'info' for backward compatibility.
   */
  color?: 'white' | 'blue' | 'info' | 'success' | 'warning' | 'error';
  /**
   * Additional styles for the information tip container.
   */
  sx?: SxProps;
  /**
   * The children elements of the information tip.
   */
  children?: ReactElement;
};
