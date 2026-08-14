/**
 * `localStorage` que no puede dejar la app colgada en el logotipo.
 *
 * En navegación privada de Safari, con el almacenamiento de sitio bloqueado o
 * con ciertas políticas de empresa, lo que lanza `SecurityError` es el ACCESO a
 * `window.localStorage` — el getter, no la llamada a `getItem`. Por eso
 * `localStorage?.getItem(...)` no protege de nada: el `?.` comprueba si el
 * valor es nulo, no si sacar la propiedad revienta.
 *
 * Importa dónde se usa esto: el idioma, el tema y el color se leen en el cuerpo
 * de `main.tsx` y de `getAppLang`, o sea ANTES de que React monte. Un error ahí
 * no lo recoge ninguna pantalla de recuperación —ni el vigilante de 15 s, ni el
 * aviso de disco lleno, que viven dentro de React—: la app se queda en el
 * logotipo latiendo para siempre, sin mensaje y sin nada que tocar.
 *
 * Sin poder guardar se pierde la preferencia entre sesiones. Es infinitamente
 * mejor que no abrir.
 */
export const leerAlmacen = (clave: string): string | null => {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
};

export const escribirAlmacen = (clave: string, valor: string): void => {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    // Silencio a propósito: ver arriba.
  }
};
