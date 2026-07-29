/**
 * Props for specifying variant, height, and width.
 */
export type VariantProps = {
  /**
   * The variant of the component.
   * - 'fixed': Fixed variant.
   * - 'standard': Standard variant.
   */
  variant?: 'fixed' | 'standard';

  /**
   * The size of the component.
   */
  size?: number;

  type?: 'circular' | 'lottie';

  /**
   * Qué se está haciendo, bajo el logotipo. Solo para `type: 'lottie'`, que es
   * la pantalla de arranque a pantalla completa.
   */
  message?: string;
};
