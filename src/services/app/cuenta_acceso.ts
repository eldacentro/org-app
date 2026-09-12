/**
 * Por dónde entra una cuenta en la app, dicho como lo diría una persona.
 *
 * Firebase nombra al proveedor por su dominio. Quien entra con el código que le
 * llega al correo no tiene proveedor —la sesión se abre con un token propio—, y
 * el servidor lo marca 'email'; 'password' es la forma antigua de lo mismo. Las
 * dos se dicen igual, porque para ayudar a un hermano basta con saber que no es
 * Google ni Microsoft sino su correo.
 *
 * Devuelve '' si no se sabe: mejor no decir nada que decir algo falso.
 */
export const comoEntraLaCuenta = (provider?: string): string => {
  switch (provider) {
    case 'google.com':
      return 'con Google';
    case 'microsoft.com':
      return 'con Microsoft';
    case 'yahoo.com':
      return 'con Yahoo';
    case 'apple.com':
      return 'con Apple';
    case 'email':
    case 'password':
      return 'con su correo';
    default:
      return '';
  }
};
