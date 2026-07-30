export type ColorPickerProps = {
  /** El color de ahora, en hexadecimal (`#306CB4`). */
  value: string;

  onChange: (color: string) => void;

  /**
   * Qué color se está eligiendo, para quien no ve la pastilla: "Color de la
   * zona Elda - Urbano".
   */
  ariaLabel: string;

  /** Por defecto, la paleta de la app. */
  colors?: string[];

  /** El lado de la pastilla que se ve cerrada. Los de dentro no cambian. */
  size?: number;

  disabled?: boolean;
};
